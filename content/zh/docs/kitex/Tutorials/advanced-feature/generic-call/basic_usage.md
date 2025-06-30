---
title: "基本使用"
date: 2024-01-24
weight: 2
keywords: ["generic-call", "HTTP", "Thrift"]
description: "泛化调用基本使用"
---

> 如果走流式调用，请升级 **github.com/cloudwego/kitex** 至 >= v0.14.1

## 什么是泛化调用
在标准的 Kitex Client -> Kitex Server 请求中，业务代码中可以直接构造一个 Go  struct（method的Request），调用 Kitex Client 对应的 method，在方法内部完成序列化，再发送给 Server。

在某些场景下，业务代码获取到的可能是：

- 已经完成编码的二进制数据（例如 proxy）
    - 需要直接将数据转发给目标Server，不需要解码后重新构造

- HTTP Request、Go map、JSON（例如 ApiGateway）
    - 需要将这些数据序列化后的二进制数据发给目标Server

在这些场景下，可能有多个目标下游服务/方法，业务代码无法（或不适合）针对每一个数据构造一个 Go struct ，因此需要借助 Kitex 的泛化调用能力。

## 支持场景
1. Thrift 二进制转发：用于流量中转场景（仅支持非流式调用）

2. HTTP映射泛化调用：用于API网关场景（仅支持非流式调用）

3. Protobuf 二进制泛化调用 （支持流式和非流式）

4. Map - Thrift 映射泛化调用 （支持流式和非流式）

5. JSON映射泛化调用（支持流式和非流式，支持映射 thrift / protobuf ）

## 使用方式示例

### IDLProvider
泛化调用需要 IDL 的运行时描述 Descriptor 来进行，其由 IDLProvider 来提供。目前 kitex 提供两种IDLProvider 实现

#### 解析本地文件
```go
import "github.com/cloudwego/kitex/pkg/generic"
 
 // equals to `kitex -I /idl ./Your_IDL_File_Path`
 p, err := generic.NewThriftFileProvider("./Your_IDL_File_Path", "/idl")
 if err != nil {
     panic(err)
 }
```

#### 解析内存文件 (update cloudwego/kitex >= v0.13.0)


```go
// equals to `kitex -I . a/a.thrift`
p, err := NewThriftContentWithAbsIncludePathProvider("a/a.thrift", map[string]string{
    "a/a.thrift": `include "../b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})

err = p.UpdateIDL("a/a.thrift", map[string]string{
    "a/a.thrift": `include "b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})
```

`NewThriftContentWithAbsIncludePathProvider`的第一个参数为主IDL文件名，第二个参数是文件名到文件内容的映射。该接口会优先基于主IDL文件查找相对路径，如果找不到，再使用绝对路径（即`UpdateIDL`所示的直接查找文件名为key的idl content）获取idl content。



#### Testcase
Test case: https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thriftidl_provider_test.go

### Thrift 二进制流转发
需要用户自行编码，或者接收消息包转发用于流量中转场景。二进制泛化只支持 Framed 或 TTHeader 请求，不支持 Buffered Binary。

注意：不支持 oneway 方法

#### 调用端使用
1. 初始化Client

注意：**不要**给每个请求创建一个 Client（每个client都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func NewGenericClient(service string) genericclient.Client {
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

2. 泛化调用

用法可以参考 https://github.com/cloudwego/kitex/blob/develop/pkg/generic/binary_test/generic_test.go#L117

注意： 
- 二进制编码不是对原始的 Thrift 请求参数（样例：[api.Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L12)）进行编码，而是封装 method 参数的 **KitexArgs**（也是从 IDL 生成在 kitex_gen 下的 struct，样例：[api.HelloEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L461)）。

```go
import (
    "github.com/cloudwego/kitex/pkg/utils"
    gopkg "github.com/cloudwego/gopkg/protocol/thrift"
)

// 以下用 kitex 提供的 thrift 编解码包构造一个编码完成的 Thrift binary ([]byte)
// 需要满足 thrift 编码格式 [thrift/thrift-binary-protocol.md](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message)

// 构造一个请求参数 MethodArgs 
// 注：kitex_gen 下生成的类型，MethodArgs 封装了 MethodReq，[点击](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/hello/kitex_gen/api/hello.go#L461)可查看示例
args := &HelloEchoArgs{
    Req: &Request {
        Message: "hello",
    },
}

var buf []byte
buf, err := gopkg.MarshalFastMsg(methodName, gopkg.CALL, /*seqID*/ 0, args)

// 以上代码**仅用于演示**如何获取 Thrift Binary
// 二进制泛化调用的实际场景往往是直接获得了 Thrift Binary

// 从某种方式获得了编码后的 Thrify binary，直接调用泛化 Client 请求下游
result, err:= genericCli.GenericCall(ctx, methodName, buf)
```

注：

1. seqID 是请求的序列号，用户在这里设置的 SeqID 不会生效，框架会生成后重置，所以写0即可，服务端场景需要主动设置 seqID，具体见服务端部分

2. 返回的 result 表面类型是 `interface{}`，实际类型是 `[]uint8`，是 server response 里的 thrift payload，可以解码到 `KitexResult` 类型。

#### 服务端使用（如需要）
1. 服务端用于只做流量转发的服务
    - 二进制泛化上游 client 和 下游 server **不需要配套** 使用，二进制泛化 Server 可以接受正常的 Thrift 请求，但是接受的协议必须是Framed 或 TTHeader，**不支持 Buffered Binary**
        - 原因：二进制泛化不解 Thrift 包，需要有头部的协议来处理
    - client 传入**正确的thrift编码二进制**，是可以访问普通的 Thrift server。

2. 注意下面场景的使用方式：
   场景：normal client -> [generic server-> generic client]-> normal server，你需要保证generic server给上游返回的包seqID是一致的，否则会导致上游报错

   **处理方式**：通过generic.GetSeqID(buff) 获取上游的seqID，generic server收到generic client 返回的 buff 通过generic.SetSeqID(seqID, transBuff) 重新设置返回给上游的数据包的seqID。

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

var genericCli genericclient.Client

func main() {
    genericCli = NewGenericClient("targetServiceName")
    g := generic.BinaryThriftGeneric()
    svr := bgeneric.NewServer(&GenericServiceImpl{}, g)
    err := svr.Run()
    if err != nil {
            panic(err)
    }
}

type GenericServiceImpl struct {}

// GenericCall ...
func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
    // thrift 协议二进制格式,参考: [thrift/thrift-binary-protocol.md](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message)
    reqBuf := request.([]byte)
    // method 方法名是已经解析好的
    // e.g. 
    seqID, err := generic.GetSeqID(reqBuf)
    if err != nil {
        // 理论上不可能，请求包不合法
    }
    // 假如是代理场景 - 请求目标下游
    respBuf, err:= genericCli.GenericCall(ctx, methodName, reqBuf)
    // 执行 handler 逻辑
    // 构造一个 respBuf：1. 序列化下游的返回 2. // 也可以是二进制泛化调用的返回, 满足"请求透传"的需求
    generic.SetSeqID(seqID, respBuf)
    return respBuf, nil
}

func NewGenericClient(service string) genericclient.Client {
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

### HTTP映射泛化调用


注意：

1. 只支持泛化客户端，将 HTTP Request 转为Thrift 请求发出，同时会将下游Thrift返回转为HTTP Response。

2. Kitex 已支持更高性能的泛化调用实现，使用方式见[泛化调用接入 dynamicgo 指南](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/) 。

#### 泛化调用示例（数据格式为json）
`YOUR_IDL.thrift`

```thrift
namespace go http

struct ReqItem{
    1: optional i64 id(go.tag = "json:\"id\"")
    2: optional string text
}

struct BizRequest {
    1: optional i64 v_int64(api.query = 'v_int64', api.vd = "$>0&&$<200")
    2: optional string text(api.body = 'text')
    3: optional i32 token(api.header = 'token')
    4: optional map<i64, ReqItem> req_items_map (api.body='req_items_map')
    5: optional ReqItem some(api.body = 'some')
    6: optional list<string> req_items(api.query = 'req_items')
    7: optional i32 api_version(api.path = 'action')
    8: optional i64 uid(api.path = 'biz')
    9: optional list<i64> cids(api.query = 'cids')
    10: optional list<string> vids(api.query = 'vids')
}

struct RspItem{
    1: optional i64 item_id
    2: optional string text
}

struct BizResponse {
    1: optional string T                             (api.header= 'T') 
    2: optional map<i64, RspItem> rsp_items           (api.body='rsp_items')
    3: optional i32 v_enum                       (api.none = '')
    4: optional list<RspItem> rsp_item_list            (api.body = 'rsp_item_list')
    5: optional i32 http_code                         (api.http_code = '') 
    6: optional list<i64> item_count (api.header = 'item_count')
}

service BizService {
    BizResponse BizMethod1(1: BizRequest req)(api.get = '/life/client/:action/:biz', api.baseurl = 'ib.snssdk.com', api.param = 'true')
    BizResponse BizMethod2(1: BizRequest req)(api.post = '/life/client/:action/:biz', api.baseurl = 'ib.snssdk.com', api.param = 'true', api.serializer = 'form')
    BizResponse BizMethod3(1: BizRequest req)(api.post = '/life/client/:action/:biz/other', api.baseurl = 'ib.snssdk.com', api.param = 'true', api.serializer = 'json')
}
```

- Request

类型：*generic.HTTPRequest

- Response

类型：*generic.HTTPResponse



```go
package main

import (
    bgeneric "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定include路径，默认用当前文件的相对路径寻找include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造http类型的泛化调用
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("service", g, opts...)
    if err != nil {
        panic(err)
    }
    // 构造request
    body := map[string]interface{}{
                "text": "text",
                "some": map[string]interface{}{
                        "id":   1,
                        "text": "text",
                },
                "req_items_map": map[string]interface{}{
                        "1": map[string]interface{}{
                                "id":   1,
                                "text": "text",
                        },
                },
        }
    data, err := json.Marshal(body)
    if err != nil {
        panic(err)
    }
    url := "http://example.com/life/client/1/1?v_int64=1&req_items=item1,item2,itme3&cids=1,2,3&vids=1,2,3"
    req, err := http.NewRequest(http.MethodGet, url, bytes.NewBuffer(data))
    if err != nil {
        panic(err)
    }
    req.Header.Set("token", "1")
    customReq, err := generic.FromHTTPRequest(req) // 考虑到业务有可能使用第三方http request，可以自行构造转换函数
    // customReq *generic.HttpRequest
    // 由于http泛化的method是通过bam规则从http request中获取的，所以填空就行
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // 写回ResponseWriter，用于http网关
}
```

#### 泛化调用示例（数据格式为protobuf）
用法可以参考：https://github.com/cloudwego/kitex/pull/638/files#diff-bd83f811aba6a67986c66e48a85a0566579ab64757ea75ba8f9a39dcb363d1d5

**需要注意以下几点：**

1. thrift结构体中通过api.body修饰的字段须与proto文件对应字段的id一一对应，其余字段不与proto映射，不做要求；

2. 不支持thrift IDL默认值中嵌套struct；

3. proto文件内与thrift对应的method必须同名。

扩展注解示例是增加 api.source='not_body_struct' 注解，表示某个字段本身没有对 HTTP 请求字段的映射，需要遍历其子字段从 HTTP 请求中获取对应的值。使用方式如下：

```thrift
struct Request {
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional CommonParam common_param (api.source='not_body_struct')
}

struct CommonParam {
    1: optional i64 api_version (api.query = 'api_version')
    2: optional i32 token(api.header = 'token')
}
```

扩展方式如下：


```go
func init() {
        descriptor.RegisterAnnotation(new(apiNotBodyStruct))
}

// 实现descriptor.Annotation
type apiNotBodyStruct struct {
}

func (a *apiNotBodyStruct) Equal(key, value string) bool {
        return key == "api.source" && value == "not_body_struct"
}

func (a *apiNotBodyStruct) Handle() interface{} {
        return newNotBodyStruct
}

type notBodyStruct struct{}

var newNotBodyStruct descriptor.NewHTTPMapping = func(value string) descriptor.HTTPMapping {
        return &notBodyStruct{}
}

// get value from request
func (m *notBodyStruct) Request(req *descriptor.HttpRequest, field *descriptor.FieldDescriptor) (interface{}, bool) {
        // not_body_struct注解的作用相当于 step into，所以直接返回req本身，让当前filed继续从Request中查询所需要的值
        return req, true
}

// set value to response
func (m *notBodyStruct) Response(resp *descriptor.HTTPResponse, field *descriptor.FieldDescriptor, val interface{}) {
}
```

### Protobuf 二进制泛化调用
Potobuf 二进制泛化调用支持流式和非流式调用，当前仅支持在 client 侧使用，需满足cloudwego/kitex >= v0.14.1。



#### 调用端使用
1. 初始化Client

注意：**不要**给每个请求创建一个 Client（每个client都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。



```go
import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func NewGenericClient(service string) genericclient.Client {
    g := generic.BinaryPbGeneric(serviceName, packageName)
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

其中`serviceName`和`packageName`对应idl中定义的service name和package name，如以下 pb idl 中的`"Mock"`和`"protobuf/pbapi"`。

```protobuf
syntax = "proto3";
package pbapi;

option go_package = "protobuf/pbapi";

message MockReq {
  string message = 1;
}

message MockResp {
  string message = 1;
}

service Mock {
  rpc UnaryTest (MockReq) returns (MockResp) {}
  rpc ClientStreamingTest (stream MockReq) returns (MockResp) {}
  rpc ServerStreamingTest (MockReq) returns (stream MockResp) {}
  rpc BidirectionalStreamingTest (stream MockReq) returns (stream MockResp) {}
}
```

如果client要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化client的流协议是`TTHeaderStreaming`，非流式消息则是`Framed`或`TTHeaderFramed`，**如果需要配置走GRPC协议，则添加以下client options**：

```thrift
genericclient.NewClient("service", generic.BinaryThriftGeneric(), client.WithTransportProtocol(transport.GRPC))
```

2. 泛化调用

泛化调用传递的 request/response 或者 stream message 都是 protobuf 序列化后的结果，generic client初始化后，提供4种流模式调用方法，streaming相关详细用法可见： [StreamX 基础流编程](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/)。



```thrift
// unary
resp, err := genericCli.GenericCall(ctx, "UnaryTest", buf)
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", buf)
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxbinarypb/generic_test.go

### Map映射泛化调用
Map 映射泛化调用是指用户可以直接按照规范构造 Map 请求参数或返回，Kitex 会对应完成 Thrift 编解码。

#### Map 构造
Kitex 会根据给出的 IDL 严格校验用户构造的字段名和类型，字段名只支持字符串类型对应 Map Key（map key优先取json tag定义的值，其次取字段名，参考 **特别说明 - JSON泛化** 一节），字段 Value 的类型映射见下表。

对于返回会校验 Response的 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 Map Key。

#### 类型映射
Golang 与 Thrift IDL 类型映射如下：

**写映射**

| **golang 类型**<br> | **thrift idl 类型**<br>     | 
| --- |---------------------------| 
| bool<br> | bool<br>                  | 
| int8, byte<br> | i8, byte<br>              | 
| int16<br> | i16<br>                   | 
| int32<br> | i32, i16, i8<br>          | 
| int64<br> | i64<br>                   | 
| float64<br> | double, i64, i32, i16, i8<br> | 
| string<br> | string,binary<br>         | 
| []byte<br> | binary,string<br>         | 
| []interface{} <br> | list/set<br>              | 
| map[interface{}]interface{}<br> | map<br>                   | 
| map[string]interface{}<br> | struct<br>                | 
| int32<br> | enum<br>                  | 

**读映射**

| **thrift idl 类型**<br> | **golang 类型（read）**<br>         | **备注**<br> | 
|-----------------------|---------------------------------| --- | 
| bool<br>              | bool<br>                        | <br> | 
| i8, <br>              | int8<br>                        | <br> | 
| byte<br>              | byte<br>                        | <br> | 
| i16<br>               | int16<br>                       | <br> | 
| i32<br>               | int32<br>                       | <br> | 
| i64<br>               | int64<br>                       | <br> | 
| double<br>            | float64<br>                     | <br> | 
| string<br>            | string<br>                      | <br> | 
| binary<br>            | []byte<br>                      | 默认返回的是 String，如果需要返回 []byte, 需要通过 [SetBinaryWithByteSlice](https://github.com/cloudwego/kitex/blob/develop/pkg/generic/generic.go#L159) 设置。<br>g, err := generic.MapThriftGeneric(p)<br>err = generic.SetBinaryWithByteSlice(g, true)<br> | 
| list/set<br>          | []interface{} <br>              | <br> | 
| map<br>               | map[interface{}]interface{}<br> | <br> | 
| struct<br>            | map[string]interface{}<br>      | <br> | 
| enum<br>              | int32<br>                       | <br> | 

#### 数据示例
以下面的 IDL 为例：

```thrift
enum ErrorCode {
    SUCCESS = 0
    FAILURE = 1
}

struct Info {
    1: map<string,string> Map
    2: i64 ID
}

struct EchoRequest {
    1: string Msg
    2: i8 I8
    3: i16 I16
    4: i32 I32
    5: i64 I64
    6: binary Binary
    7: map<string,string> Map
    8: set<string> Set
    9: list<string> List
    10: ErrorCode ErrorCode
    11: Info Info

    255: optional Base Base
}
```

构造请求如下

```go
req := map[string]interface{}{
                "Msg":    "hello",
                "I8":     int8(1),
                "I16":    int16(1),
                "I32":    int32(1),
                "I64":    int64(1),
                "Binary": []byte("hello"),
                "Map": map[interface{}]interface{}{
                        "hello": "world",
                },
                "Set":       []interface{}{"hello", "world"},
                "List":      []interface{}{"hello", "world"},
                "ErrorCode": int32(1),
                "Info": map[string]interface{}{
                        "Map": map[interface{}]interface{}{
                                "hello": "world",
                        },
                        "ID": int64(232324),
                },
                //注意：传入形如 **([]interface{})(nil) **格式的value也会被视为空值进行编码
        }
```

`base.thrift`

```cpp
namespace py base
namespace go base
namespace java com.bytedance.thrift.base

struct TrafficEnv {
    1: bool Open = false,
    2: string Env = "",
}

struct Base {
    1: string LogID = "",
    2: string Caller = "",
    3: string Addr = "",
    4: string Client = "",
    5: optional TrafficEnv TrafficEnv,
    6: optional map<string, string> Extra,
}

struct BaseResp {
    1: string StatusMessage = "",
    2: i32 StatusCode = 0,
    3: optional map<string, string> Extra,
}
```

`YOUR_IDL.thrift`

```thrift
include "base.thrift"
namespace go kitex.test.server

struct ExampleReq {
    1: required string Msg,
    255: base.Base Base,
}
struct ExampleResp {
    1: required string Msg,
    255: base.BaseResp BaseResp,
}
service ExampleService {
    ExampleResp ExampleMethod(1: ExampleReq req),
}
```

#### 客户端使用（支持流式和非流式调用）
流式调用需满足 cloudwego/kitex >= v0.14.1。



1. Client 初始化

注意：**不要**给每个请求创建一个 Client（每个client都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。



```go
package main

import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定include路径，默认用当前文件的相对路径寻找include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造map 请求和返回类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g)
    if err != nil {
        panic(err)
    }
}
```

如果client要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化client的流协议是`TTHeaderStreaming`，非流式消息则是`Framed`或`TTHeaderFramed`，**如果需要配置流式方法走GRPC协议，而不改变非流式方法的协议，则添加以下client options**：

```thrift
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

2. 泛化调用

泛化调用传递的 request/response 或者 stream message 都是 map[string]interface{} 类型，generic client初始化后，提供4种流模式调用方法，streaming相关详细用法可见： [StreamX 基础流编程](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/)。



- **Request**

类型：map[string]interface{}

- **Response**

类型：map[string]interface{}

```go
// uanry
resp, err := cli.GenericCall(ctx, "ExampleMethod", map[string]interface{}{
    "msg": "hello", // keys should be the same as defined in json tag
}) // resp is a map[string]interface{}

// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", map[string]interface{}{
    "msg": "hello", // keys should be the same as defined in json tag
})
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxmap/generic_test.go

#### 服务端使用（仅支持非流式请求）
- **Request**

类型：map[string]interface{}

- **Response**

类型：map[string]interface{}



```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造map请求和返回类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := bgeneric.NewServer(new(GenericServiceImpl), g, opts...)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a map[string]interface{}
}

type GenericServiceImpl struct {
}

func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        m := request.(map[string]interface{})
        fmt.Printf("Recv: %v\n", m)
        return  map[string]interface{}{
            "Msg": "world",
        }, nil
}
```

#### 特别说明 - Map泛化
1. 会校验response的field id和类型并根据idl的field name生成相应的map key，这里的field id和类型需要和idl定义一致，如果不一致会导致未定义行为；

2. 如果确认所有thrift定义的map类型的key都是string类型，并且不希望使用map[interface{}]interface{}类型的参数来构造/解析消息，可以使用`MapThriftGenericForJSON`来构造generic；



1. 对于**空结构体**，泛化调用会默认生成一个 empty map 而不是 empty struct，也就是**其子字段不会出现在该map中**。如果需要在空map中同时设置其子字段，可以使用设置 [EnableSetFieldsForEmptyStruct](https://github.com/cloudwego/kitex/pull/1265/files#diff-605c96e826099f4fa61d7d4a328caa529da4097e99585917afa3c38cf291eb7bR206)。

#### Map映射泛化序列化（一般不用关注）
主要接口：

- 序列化

```go
func (m *WriteStruct) Write(ctx context.Context, out bufiox.Writer, msg interface{}, method string, isClient bool, requestBase *base.Base) error
```

- 反序列化

```go
func (m *ReadStruct) Read(ctx context.Context, method string, isClient bool, dataLen int, in bufiox.Reader) (interface{}, error)
```

- 用例

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/gopkg/bufiox"
    "github.com/cloudwego/gopkg/protocol/thrift/base"
    "github.com/cloudwego/kitex/pkg/generic/thrift"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定include路径，默认用当前文件的相对路径寻找include
    p, err := generic.NewThriftFileProvider("YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }

    // 根据 p 获取一个reader writer
    var (
        rw         = thrift.NewStructReaderWriter(<-p.Provide())
        buf []byte = nil // 建议为nil
        req        = map[string]interface{}{"Msg": "hello"}
        w          = bufiox.NewBytesWriter(&buf)
    )

    // 序列化请求
    err = rw.Write(context.Background(), w, req, "ExampleMethod", true, &base.Base{LogID: "1"})
    if err != nil {
        panic(err)
    }

    w.Flush() // 重要！！！
    fmt.Println("buf:", buf, len(buf), cap(buf))

    // 反序列化请求
    // 如果是反序列化响应， 则 isClient = true
    r := bufiox.NewBytesReader(buf)
    req2, err := rw.Read(context.Background(), "ExampleMethod", false, len(buf), r)
    if err != nil {
        panic(err)
    }

    // req2: map[Base:map[Addr: Caller: Client: LogID:1] Msg:hello]
    fmt.Println("req2:", req2)
}
```

Map 泛化序列化中，序列化请求后**需要调用** `w.Flush()` 。若初始 len(buf)>len(序列化后的消息)，则消息体会位于 buf 的末尾，建议 buf 初始为 `nil`。

### JSON 映射泛化调用
JSON 映射泛化调用是指用户可以直接按照规范构造 JSON String 请求参数或返回，Kitex 会对应完成 Thrift 编解码。

注意：Kitex 已支持更高性能的泛化调用实现，使用方式见[泛化调用接入 dynamicgo 指南](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/) 。


#### **JSON 构造**
Kitex 与 MAP 泛化调用严格校验用户构造的字段名和类型不同，JSON 泛化调用会根据给出的 IDL 对用户的请求参数进行转化，无需用户指定明确的类型，如 int32 或 int64。

对于 Response 会校验 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 JSON Field。

当前支持 **Kitex-Thrift** 和 **Kitex-Protobuf** 作为下游进行调用

#### JSON<>Thrift 泛化
##### **类型映射**
Golang 与 Thrift IDL 类型映射如下：

| Golang 类型<br> | Thrift IDL 类型<br> | 注意<br> | 
| --- | --- | --- | 
| bool<br> | bool<br> | <br> | 
| int8<br> | i8<br> | <br> | 
| int16<br> | i16<br> | <br> | 
| int32<br> | i32<br> | <br> | 
| int64<br> | i64<br> | <br> | 
| float64<br> | double<br> | <br> | 
| string<br> | string<br> | <br> | 
| []byte<br> | binary<br> | binary 构造需要进行 base64 编码<br>[泛化调用 binary 类型兼容性](https://bytedance.feishu.cn/docx/doxcnxkmeIRGVe6K5M0vVIAN5be)<br> | 
| []interface{}<br> | list/set<br> | <br> | 
| map[interface{}]interface{}<br> | map<br> | <br> | 
| map[string]interface{}<br> | struct<br> | <br> | 
| int32<br> | enum<br> | <br> | 

##### 数据示例
以下面的 IDL 为例：

```thrift
enum ErrorCode {
    SUCCESS = 0
    FAILURE = 1
}

struct Info {
    1: map<string,string> Map
    2: i64 ID
}

struct EchoRequest {
    1: string Msg
    2: i8 I8
    3: i16 I16
    4: i32 I32
    5: i64 I64
    6: map<string,string> Map
    7: set<string> Set
    8: list<string> List
    9: ErrorCode ErrorCode
   10: Info Info

    255: optional Base Base
}
```

构造请求如下：

```go
req := "{
  \"Msg\": \"hello\",
  \"I8\": 1,
  \"I16\": 1,
  \"I32\": 1,
  \"I64\": 1,
  \"Map\": \"{\"hello\":\"world\"}\",
  \"Set\": [\"hello\", \"world\"],
  \"List\": [\"hello\", \"world\"],
  \"ErrorCode\": 1,
  \"Info\": \"{\"Map\":\"{\"hello\":\"world\"}\", \"ID\":232324}\"
}"
```

示例 IDL ：

`base.thrift`

```thrift
namespace py base
namespace go base
namespace java com.xxx.thrift.base

struct TrafficEnv {
    1: bool Open = false,
    2: string Env = "",
}

struct Base {
    1: string LogID = "",
    2: string Caller = "",
    3: string Addr = "",
    4: string Client = "",
    5: optional TrafficEnv TrafficEnv,
    6: optional map<string, string> Extra,
}

struct BaseResp {
    1: string StatusMessage = "",
    2: i32 StatusCode = 0,
    3: optional map<string, string> Extra,
}
```

`example_service.thrift`

```go
include "base.thrift"
namespace go kitex.test.server

struct ExampleReq {
    1: required string Msg,
    255: base.Base Base,
}
struct ExampleResp {
    1: required string Msg,
    255: base.BaseResp BaseResp,
}
service ExampleService {
    ExampleResp ExampleMethod(1: ExampleReq req),
}
```

##### 客户端使用（支持流式和非流式调用）
流式调用需满足 cloudwego/kitex >= v0.14.1。



1. Client 初始化

注意：**不要**给每个请求创建一个 Client（每个client都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。



```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
     bgeneric "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定include路径，默认用当前文件的相对路径寻找include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造JSON 请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("service", g, opts...)
    if err != nil {
        panic(err)
    }
}
```

如果client要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化client的流协议是`TTHeaderStreaming`，非流式消息则是`Framed`或`TTHeaderFramed`，**如果需要配置流式方法走GRPC协议，而不改变非流式方法的协议，则添加以下client options**：

```thrift
cli, err := bgeneric.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

2. 泛化调用

泛化调用传递的 request/response 或者 stream message 都是 JSON string 类型，generic client初始化后，提供4种流模式调用方法，streaming相关详细用法可见： [StreamX 基础流编程](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/)。



- **Request**

类型：JSON string

- **Response**

类型：JSON string

```thrift
// unary
resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}") // resp is a JSON string
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest" "{\"Msg\": \"hello\"}")
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxjson/generic_test.go

##### **服务端使用（仅支持非流式请求）**
- **Request**

类型：JSON string

- **Response**

类型：JSON string



```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // 本地文件idl解析
    // YOUR_IDL_PATH thrift文件路径: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造JSON请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := bgeneric.NewServer(new(GenericServiceImpl), g, opts...)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a JSON string
}

type GenericServiceImpl struct {
}

func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        // use jsoniter or other json parse sdk to assert request 
        m := request.(string)
        fmt.Printf("Recv: %v\n", m)
        return  "{\"Msg\": \"world\"}", nil
}
```

##### 特别说明
- 由于JSON泛化目前使用的是gjson，根据IDL对用户的request请求的每个字段依次进行强转（https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thrift/write.go#L130），所以当用户字段类型传错的时候会用默认值替代。例如：IDL中"test"字段要求是i64，但是request里面的{"test":"abc"}，这种情况目前不会报错，而是修改为{"test":0}。该问题会在切换到 dynamicgo 时限制更加严格。

- 通过设置环境变量可以选择是否全局开启使用`go.tag`的值作为json的key，同样适用于Map泛化调用。

```
# 使用原始Key作为JSON泛化或Map泛化调用的Key，关闭go.tag的Key的使用
KITEX_GENERIC_GOTAG_ALIAS_DISABLED = True
```

- 从 cloudwego/kitex@v0.12.0 版本开始，go.tag 可以通过`generic.WithGoTagDisabled` option来禁用。这允许单独对client/server泛化调用指定是否禁用go.tag注解。

示例：
```go
// when you use ThriftFileProvider
p, err := generic.NewThriftFileProviderWithOption(path, []generic.ThriftIDLProviderOption{generic.WithGoTagDisabled(true)})

// when you use ThriftContentProvider
p, err := generic.NewThriftContentProvider(serviceContent, includes, generic.WithGoTagDisabled(true))

// when you use ThriftContentWithAbsIncludePathProvider
p, err := generic.NewThriftContentWithAbsIncludePathProvider(path, includes, generic.WithGoTagDisabled(true))
```

#### JSON<>Protobuf 泛化
目前只针对 **KitexProtobuf 协议**。传入 IDL Provider 与可选 Option 参数，返回 Protobuf JSON 泛化调用对象，Option 参数详见泛化调用接入DynamicGo指南。

##### 类型映射
Golang 与 Proto IDL 类型映射如下：

| Protocol Buffers 类型	| Golang 类型 |
| --- | --- |
| float | 	float32|
| double	| float64|
| int32	| int32|
| int64	| int64|
| uint32	| uint32|
| uint64	| uint64 |
| sint32	| int32|
| sint64	| int64|
| fixed32	| uint32|
| fixed64	| uint64|
| sfixed32	| int32|
| sfixed64	| uint64|
| bool	| bool|
| string	| string|
| bytes	| byte[]|

此外还支持 JSON 中的 lists 与 dictionaries，将其映射为 protobuf 中的 `repeated V` 与 `map<K,V>` 。不支持 protobuf 中的特殊类型，如 `Enum`，`oneof`。

##### 示例 IDL
```protobuf
syntax = "proto3";
package api;
// The greeting service definition.
option go_package = "api";

message Request {
  string message = 1;
}

message Response {
  string message = 1;
}

service Echo {
  rpc EchoPB (Request) returns (Response) {}
}
```

##### 客户端
```go
package main

import (
        "context"
        dproto "github.com/cloudwego/dynamicgo/proto"
        "github.com/cloudwego/kitex/client"
        "github.com/cloudwego/kitex/client/genericclient"
        "github.com/cloudwego/kitex/pkg/generic"
        "github.com/cloudwego/kitex/pkg/klog"
        "github.com/cloudwego/kitex/transport"
)

const serverHostPort = "127.0.0.1:9999"

func main() {
        var err error

        path := "./YOUR_IDL_PATH"

        // 创建 Pb IDL Provider
        dOpts := dproto.Options{}
        p, err := generic.NewPbFileProviderWithDynamicGo(path, context.Background(), dOpts)
        if err != nil {
                panic(err)
        }

        // 创建 Generic 客户端
        g, err := generic.JSONPbGeneric(p)
        if err != nil {
                panic(err)
        }

        var opts []client.Option
        opts = append(opts, client.WithHostPorts(serverHostPort))
        opts = append(opts, client.WithTransportProtocol(transport.TTHeader))

        cli, err := genericclient.NewClient("server_name_for_discovery", g, opts...)
        if err != nil {
                panic(err)
        }

        jReq := `{"message": "hello"}`

        ctx := context.Background()

  // JRsp 类型为 JSON string
        jRsp, err := cli.GenericCall(ctx, "EchoPB", jReq)
        klog.CtxInfof(ctx, "genericJsonCall: jRsp(%T) = %s, err = %v", jRsp, jRsp, err)
}
```

##### 服务端
```go
package main

import (
        "context"
        dproto "github.com/cloudwego/dynamicgo/proto"
        "github.com/cloudwego/kitex/pkg/generic"
        "github.com/cloudwego/kitex/pkg/klog"
        "github.com/cloudwego/kitex/server"
        "github.com/cloudwego/kitex/server/genericserver"
        "net"
)

const serverHostPort = "127.0.0.1:9999"

func WithServiceAddr(hostPort string) server.Option {
        addr, _ := net.ResolveTCPAddr("tcp", hostPort)
        return server.WithServiceAddr(addr)
}

type GenericEchoImpl struct{}

func (g *GenericEchoImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        buf := request.(string)
        return buf, nil
}

func main() {
        var opts []server.Option
        opts = append(opts, WithServiceAddr(serverHostPort))

        path := "./YOUR_IDL_PATH"

        dOpts := dproto.Options{}
        p, err := generic.NewPbFileProviderWithDynamicGo(path, context.Background(), dOpts)

        if err != nil {
                panic(err)
        }
        g, err := generic.JSONPbGeneric(p)

        opts = append(opts, WithServiceAddr(serverHostPort))

        svr := genericserver.NewServer(new(GenericEchoImpl), g, opts...)

        if err := svr.Run(); err != nil {
                klog.Infof(err.Error())
        }
}
```

## 性能压测对比
以下测试结果以多重嵌套的复杂结构体作为压测 payload，并发数控制在100，server 分配4核`Intel(R) Xeon(R) Gold 5118 CPU @ 2.30GHz`，压测代码[链接](https://github.com/cloudwego/kitex-benchmark/pull/57/files)。

| **泛化类型**<br> | **TPS**<br><br> | **TP99**<br><br> | **TP999**<br><br> | **Server CPU AVG**<br> | **Client CPU AVG**<br> | **吞吐差异(对比不走泛化)**<br> | 
| --- | --- | --- | --- | --- | --- | --- | 
| **不走泛化**<br> | 147006<br> | 1.60ms<br> | 3.45ms<br> | 391.48<br> | 544.83<br> | 0%<br> | 
| **map泛化**<br> | 78104<br> | 3.58ms<br> | 21.88ms<br> | 392.62<br> | 509.70<br> | -47%<br> | 
| **json泛化-No dynamicgo**<br> | 19647<br> | 21.49ms<br> | 61.52ms<br> | 392.20<br> | 494.30<br> | -86%<br> | 
| **http泛化-No dynamicgo**<br> | 136093<br> | 2.57ms<br> | 5.18ms<br> | 369.61<br><br> | 1329.26<br> | -8%<br> | 

Json / http 泛化支持使用dynamicgo获取更高性能，以下是2k qps，100并发，10k包大小下的性能测试结果。服务器分配4核 `Intel (R) Xeon (R) Gold 5118 CPU @2.30GHz`。

| **泛化类型**<br> | **With dynamicgo**<br> | **TPS**<br> | **TP99**<br> | **TP999**<br> | **Throughput differences**<br> | 
| --- | --- | --- | --- | --- | --- | 
| **json generic**<br> | no<br> | 2466.90<br> | 141.38ms<br> | 206.25ms<br> | 0%<br> | 
| <br> | yes<br> | 9179.28<br> | 34.75ms<br> | 80.75ms<br> | +272%<br> | 
| **http generic**<br><br> | no<br> | 8338.20<br> | 90.92ms<br> | 139.31ms<br> | 0%<br> | 
| <br> | yes<br> | 27243.95<br> | 9.57ms<br> | 23.76ms<br> | +227%<br> | 



## FAQ
### Q：泛化调用必须要引用 IDL 吗？
- 二进制流转发：不需要

- HTTP/MAP/JSON：需要
    - 因为请求中只有字段名称，需要 IDL 提供 「字段名 -> 字段 ID」的映射关系，序列化后的 thrift binary 里只有字段 ID。

### Q：使用二进制流转发，框架会做相应的打点上报吗?

会的

### Q:  “missing version in Thrift Message”

说明传入的不是Thrift正确编码后的buff，确认使用方式。

注意：二进制编码不是对原始的 Thrift 请求（样例：[api.Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L12)）参数编码，是 method 参数封装的**XXXArgs**（样例：[api.HelloEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L461)）

### Q: 支持 protobuf 吗?

目前 map 泛化已支持，json 泛化计划支持

### Q：泛化调用是否支持 idl 中定义的默认值？
Kitex map/http/json泛化支持在读时设置idl中定义的默认值，如以下示例中的idl文件：

```thrift
struct BaseElem {
        1: optional i32 a,
}

struct Request {
    1: optional byte a = 0,
    2: optional i32 b = 0,
    3: optional double c = 5.1,
    4: optional string d = "123",
    5: optional list< BaseElem> e = [{"a":34}]
    5: optional map<i32, BaseElem> f = {12: {"a": 34}}
}
```

编码含以上默认值的请求至对端时，

- 对于map泛化，会自动添加以上字段名为key，默认值作为value的k-v对；

- 对于json泛化，会在编码得到的json串中包含定义了默认值的k-v对；

- 对于http泛化，会在response注解所在字段处设置默认值。

### Q：optional 修饰的字段生成类型带了指针，map 泛化的 value 是否需要也用指针？
不需要。

### Q：idl 文件中定义了多个service，泛化调用时怎么处理？
每个泛化客户端/服务端默认使用最后一个service定义，可以通过下列代码来指定解析特定 service：

```go
import "github.com/cloudwego/kitex/pkg/generic"

path := "json_test/idl/example_multi_service.thrift"
opts := []ThriftIDLProviderOption{WithIDLServiceName("ExampleService")}
p, err := NewThriftFileProviderWithOption(path, opts)
```

### Q: 服务端报错 "[ReadString] the string size greater than buf length"
可能是 client 和 server 的 idl 有差异，例如字段类型不一致。

### Q：map 泛化调用 byte 类型字段在 writeInt8 函数 panic
> github.com/cloudwego/kitex/pkg/generic/thrift.writeInt8(...)
>         /.../github.com/cloudwego/kitex@v0.4.4/pkg/generic/thrift/write.go:312 +0xb4

**原因**：thriftgo 对齐 apache thrift 的实现，会将 IDL 中的 byte 类型字段都转成 go 中的 int8 类型，所以旧版本 cloudwego/kitex（<0.6.0) 在 `writeInt8` 中没有针对 byte 类型做适配。

**建议**：

1. client 端：
    - 升级新版本：kitex >= 0.6.0 （或）
    - 保留旧版本：在构造 map 时使用 `int(byteVal)` 给该字段赋值。

2. server 端：将该 int8 字段转成 byte 类型（如果存在值 > 127的情况）

注：byte 和 int8 互相转换不会损失精度。

### Q:  binary generic-server: "invalid trans buffer in binaryThriftCodec Unmarshal" ?

二进制泛化的server接收的包必须带头部size，因为二进制泛化并不会解析Thrift包，没有头部size的包无法正常处理。

如果遇到此问题，上游 client 需要配置传输协议 framed 或 ttheader 见[如何指定传输协议](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/protocol/transport_protocol/) 。

### Q：如何在一个 server 下对不同 idl service 注入不同的 generic 实现？

支持**除了 BinaryThriftGeneric 以外**的所有泛化调用类型， BinaryThriftGeneric 只支持通过 `genericserver.NewServer` 或 `genericserver.NewServerWithServiceInfo` 启用.

```
func runServer(ln net.Listener) error {
    svr := server.NewServer()

    p, err := generic.NewThriftFileProvider("idl/tenant.thrift")
    if err != nil {
       panic(err)
    }
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
       panic(err)
    }
    svr.RegisterService(generic.ServiceInfoWithGeneric(g), &MapGenericServiceImpl{})

    p, err = generic.NewThriftFileProvider("idl/echo.thrift")
    if err != nil {
       panic(err)
    }
    g, err = generic.JSONThriftGeneric(p)
    if err != nil {
       panic(err)
    }

    svr.RegisterService(generic.ServiceInfoWithGeneric(g), &JsonGenericServiceImpl{})
    
    return svr.Run()
}
```
