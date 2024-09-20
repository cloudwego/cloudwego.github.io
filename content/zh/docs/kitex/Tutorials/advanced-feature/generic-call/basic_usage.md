---
title: "基本使用"
date: 2024-01-24
weight: 2
keywords: ["generic-call", "HTTP", "Thrift"]
description: "泛化调用基本使用"
---

## IDL Provider

泛化调用虽不需要基于 IDL 生成代码，但通常需要提供 IDL，再根据 IDL 由提供的如 JSON、Map 这类的数据结构来构建对应的 RPC 请求数据结构。（**二进制泛化调用除外**）

Kitex 中对 IDL Provider 定义了如下接口：

```go
// DescriptorProvider provide service descriptor
type DescriptorProvider interface {
    Closer
    // Provide return a channel for provide service descriptors
    Provide() <-chan *descriptor.ServiceDescriptor
}
```

该接口的使用在后文**基本使用**中介绍，此处仅需了解**如何创建**即可。

目前 Kitex 提供了两种 IDL Provider 实现，使用者可以选择指定 IDL 路径，也可以选择传入 IDL 内容。当然也可以根据需求自行扩展 `generic.DescriptorProvider` 接口。

### 基于本地文件解析 IDL

#### Thrift

提供了两个方法用于基于本地文件解析 IDL，使用方法相同，需要传入 IDL 路径以及 IDL 中引用的其他 IDL 路径。

```go
p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
if err != nil {
    panic(err)
}

p, err := generic.NewThriftFileProviderWithDynamicGo("./YOUR_IDL_PATH")
if err != nil {
    panic(err)
}
```

`generic.NewThriftFileProviderWithDynamicGo` 在处理 RPC 数据时接入了 [dynamicgo](https://github.com/cloudwego/dynamicgo) 用于提高性能。详情见[接入 dynamicgo 指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/)。

#### Protobuf

提供了一个方法解析本地 `proto` 文件，需要传入 IDL 路径，`context.Context` 以及可选 `option` 参数，参数详情见 [dynamicgo proto idl](https://github.com/cloudwego/dynamicgo/blob/main/proto/idl.go)

```go
p, err := NewPbFileProviderWithDynamicGo("./YOUR_IDL_PATH", context.Background())
if err != nil {
    panic(err)
}
```

### 基于内存解析 IDL

也可以直接传入 IDL 内容进行解析，IDL 中引用的其他 IDL 需要构造 map 传入，Key 为所引用 IDL 的 Path，Value 为 IDL 内容。

#### Thrift

简单示例（为最小化展示 Path 构造，并非真实的 IDL）：

```go
content := `
namespace go kitex.test.server
include "x.thrift"
include "../y.thrift"

service InboxService {}
`
path := "a/b/main.thrift"
includes := map[string]string{
   path:           content,
   "x.thrift": "namespace go kitex.test.server",
   "../y.thrift": `
   namespace go kitex.test.server
   include "z.thrift"
   `,
}

p, err := generic.NewThriftContentProvider(content, includes)
if err != nil {
    panic(err)
}

p, err := generic.NewThriftContentProviderWithDynamicGo(content, includes)
if err != nil {
    panic(err)
}
```

`generic.NewThriftContentProviderWithDynamicGo` 在处理 RPC 数据时接入了 [dynamicgo](https://github.com/cloudwego/dynamicgo) 用于提高性能。详情见[接入 dynamicgo 指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/)。

#### Protobuf

简单示例（为最小化展示 Path 构造，并非真实的 IDL）：

```go
content := `
syntax = "proto3";
package kitex.test.server;
option go_package = "test";

import "x.proto"

service Echo{}
`

path := "a/b/main.proto"
includes := map[string]string{
		path: content,
		"x.proto": `syntax = "proto3";
					package kitex.test.server;
					option go_package = "test";
					`,
}
p, err := NewPbContentProvider(content, includes)
if err != nil {
	panic(err)
}
```

#### 支持绝对路径的 include path 寻址

目前仅 Thrift 支持此功能。

若为方便构造 IDL Map，也可以通过 `generic.NewThriftContentWithAbsIncludePathProvider` 或 `generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo` 使用绝对路径作为 Key。

```go
content := `
namespace go kitex.test.server
include "x.thrift"
include "../y.thrift"

service InboxService {}
`

path := "a/b/main.thrift"
includes := map[string]string{
   path:           content,
   "a/b/x.thrift": "namespace go kitex.test.server",
   "a/y.thrift": `
   namespace go kitex.test.server
   include "z.thrift"
   `,
   "a/z.thrift": "namespace go kitex.test.server",
}

p, err := generic.NewThriftContentWithAbsIncludePathProvider(content, includes)
if err != nil {
    panic(err)
}

p, err := generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo(content, includes)
if err != nil {
    panic(err)
}
```

`generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo` 在处理 RPC 数据时接入了 [dynamicgo](https://github.com/cloudwego/dynamicgo) 用于提高性能。详情见[接入 dynamicgo 指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/)。

Ktiex 中使用 `generic.Generic` 接口表示泛化调用，不同泛化调用类型有不同实现。在创建客户端或服务端时都需要传入 `Generic` 实例。

## 客户端接口

### 创建客户端

泛化调用客户端接口均位于 `github.com/cloudwego/client/genericclient` 包下。

#### NewClient

函数签名：`func NewClient(destService string, g generic.Generic, opts ...client.Option) (Client, error)`

说明：传入目标服务名，Generic 对象与可选 Option 参数，返回泛化调用客户端。Option 参数详见 [Client Option](/zh/docs/kitex/tutorials/options/client_options/)

#### NewClientWithServiceInfo

函数签名：`func NewClientWithServiceInfo(destService string, g generic.Generic, svcInfo *serviceinfo.ServiceInfo, opts ...client.Option) (Client, error)`

说明：传入目标服务名，Generic 对象，自定义服务信息与可选 Option 参数，返回泛化调用客户端。Option 参数详见 [Client Option](/zh/docs/kitex/tutorials/options/client_options/)。

## 服务端接口

### 泛化调用服务对象

Kitex 中定义了 `generic.Service` 接口表示泛化调用服务。

```go
// Service generic service interface
type Service interface {
    // GenericCall handle the generic call
    GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error)
}
```

只要实现 `GenericCall` 方法即可当作泛化调用服务实例用于创建泛化调用服务端。

### 创建服务端

泛化调用服务端接口均位于 `github.com/cloudwego/server/genericserver` 包下。

#### NewServer

函数签名：`func NewServer(handler generic.Service, g generic.Generic, opts ...server.Option) server.Server`

说明：传入泛化调用服务实例，Generic 对象与可选 Option 参数，返回 Kitex 服务端。

#### NewServerWithServiceInfo

函数签名：`func NewServerWithServiceInfo(handler generic.Service, g generic.Generic, svcInfo *serviceinfo.ServiceInfo, opts ...server.Option) server.Server`

说明：传入泛化调用服务实例，Generic 对象，自定义服务信息与可选 Option 参数，返回 Kitex 服务端。

## 泛化调用场景

Kitex 支持以下场景的泛化调用：

1. Thrift：

   - 二进制泛化调用
   - HTTP 映射泛化调用
   - Map 映射泛化调用
   - JSON 映射泛化调用

2. Protobuf
   - JSON 映射泛化调用
   - Protobuf -> Thrift 泛化调用

### Generic

```go
type Generic interface {
    Closer
    // PayloadCodec return codec implement
    PayloadCodec() remote.PayloadCodec
    // PayloadCodecType return the type of codec
    PayloadCodecType() serviceinfo.PayloadCodec
    // RawThriftBinaryGeneric must be framed
    Framed() bool
    // GetMethod to get method name if need
    GetMethod(req interface{}, method string) (*Method, error)
}
```

`Generic` 核心方法为编解码实现，不同 `Generic` 实现通过使用不同的编解码来区分。不同编解码器均在 `thriftCodec` 基础上扩展其实现。

### 二进制泛化调用

应用场景：如中台服务，可以通过二进制流转发将收到的原始 Thrift 协议包发给目标服务。

提供以下方法创建二进制泛化调用 `Generic` 实例。

#### BinaryThriftGeneric

函数签名：`func BinaryThriftGeneric() Generic`

说明：返回二进制泛化调用对象。

### HTTP 泛化调用

应用场景：如 API 网关，可以将 HTTP 请求解析后通过 RPC 请求后台服务。

提供以下方法创建 HTTP 泛化调用 `Generic` 实例。

#### HTTPThriftGeneric

函数签名：`func HTTPThriftGeneric(p DescriptorProvider, opts ...Option) (Generic, error)`

说明：传入 IDL Provider 与可选 Option 参数，返回 HTTP 泛化调用对象，Option 参数详见下文。

#### HTTPPbThriftGeneric

函数签名：`func HTTPPbThriftGeneric(p DescriptorProvider, pbp PbDescriptorProvider) (Generic, error)`

说明：传入 Thrift IDL Provider 与 Protobuf IDL Provider，返回可解析 Body 数据类型为 Protobuf 的 HTTP 请求，调用 Thrift 服务的泛化调用对象。

### JSON 泛化调用

应用场景：如接口测试平台，解析用户构造的 JSON 数据后发送请求到 RPC 服务并获取响应结果。

提供以下方法创建 JSON 泛化调用 `Generic` 实例。

#### JSONThriftGeneric

函数签名：`func JSONThriftGeneric(p DescriptorProvider, opts ...Option) (Generic, error)`

说明：传入 IDL Provider 与可选 Option 参数，返回 Thrift JSON 泛化调用对象，Option 参数详见下文。

#### MapThriftGenericForJSON

函数签名：`func MapThriftGenericForJSON(p DescriptorProvider) (Generic, error)`

说明：传入 IDL Provider，返回 Thrift JSON 泛化调用对象，底层使用 Map 泛化调用实现。

#### JSONPbGeneric

函数签名：`func JSONPbGeneric(p PbDescriptorProviderDynamicGo, opts ...Option) (Generic, error)`

说明：目前只针对 KitexProtobuf 协议。传入 IDL Provider 与可选 Option 参数，返回 Protobuf JSON 泛化调用对象，Option 参数详见下文。

### Map 泛化调用

应用场景：动态调整参数场景、快速原型开发阶段验证部分功能。

提供以下方法创建 Map 泛化调用 `Generic` 实例。

#### MapThriftGeneric

函数签名：`func MapThriftGeneric(p DescriptorProvider) (Generic, error)`

说明：传入 IDL Provider，返回 Map 泛化调用对象

### Option

Kitex 提供 Option 参数用于在创建 Generic 时自定义配置，包括以下参数

#### WithCustomDynamicGoConvOpts

函数签名：`func WithCustomDynamicGoConvOpts(opts *conv.Options) Option`

说明：启用 `dynamicgo` 时自定义 `conv.Option` 配置，配置详情见 [dynamicgo conv](https://github.com/cloudwego/dynamicgo/tree/main/conv)。接入 dynamicgo 详情见[接入 dynamicgo 指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/)。

#### UseRawBodyForHTTPResp

函数签名：`func UseRawBodyForHTTPResp(enable bool) Option`

说明：在 HTTP 映射泛化调用中，设置是否将响应结果设置为 `HTTPResponse.RawBody`。 如果禁用此功能，则响应结果将仅存储到 `HTTPResponse.Body` 中

## Thrift 使用示例

### 二进制泛化调用

#### 客户端

使用客户端二进制泛化调用需要将请求参数使用 [Thrift 编码格式](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message)进行编码。

> **注意**：二进制编码不是对原始的 Thrift 请求参数编码，是 method 参数封装的 **XXXArgs**。可以参考 [测试用例](https://github.com/cloudwego/kitex/blob/develop/pkg/generic/generic_test.go)。

Kitex 提供了 thrift 编解码包`github.com/cloudwego/kitex/pkg/utils.NewThriftMessageCodec`。

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/pkg/utils.NewThriftMessageCodec"
)

func NewGenericClient(destServiceName string) genericclient.Client {
    genericCli := genericclient.NewClient(destServiceName, generic.BinaryThriftGeneric())
    return genericCli
}

func main(){
    rc := utils.NewThriftMessageCodec()
		buf, err := rc.Encode("Test", thrift.CALL, 100, args)
		// generic call
  	genericCli := NewGenericClient("actualServiceName")
		resp, err := genericCli.GenericCall(ctx, "actualMethod", buf)
}
```

#### 服务端

二进制泛化调用的客户端和服务端**并不是配套**使用的，客户端只要传入**正确的 Thrift 二进制编码格式**的参数，可以请求普通 Thrift 接口服务。

二进制泛化 Server 只支持 Framed 或 TTHeader 请求，不支持 Bufferd Binary，需要 Client 通过 Option 指定，如：`client.WithTransportProtocol(transport.Framed)`。

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    g := generic.BinaryThriftGeneric()
    svr := genericserver.NewServer(&GenericServiceImpl{}, g)
    err := svr.Run()
    if err != nil {
        panic(err)
    }
}

type GenericServiceImpl struct {}

// GenericCall ...
func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
    // request is thrift binary
    reqBuf := request.([]byte)
    // e.g.
    fmt.Printf("Method: %s\n", method))
    result := xxx.NewMockTestResult()
    result.Success = &resp
    respBuf, err = rc.Encode(mth, thrift.REPLY, seqID, result)

    return respBuf, nil
}
```

### HTTP 映射泛化调用

HTTP 泛化调用即根据 HTTP Request 构造 Thrift 接口参数后发起泛化调用，目前只针对客户端，要求 Thrift IDL 遵从接口映射规范，具体规范见 [Thrift-HTTP 映射的 IDL 规范](https://www.cloudwego.cn/zh/docs/kitex/tutorials/advanced-feature/generic-call/thrift_idl_annotation_standards/)。

#### IDL 示例

```thrift
namespace go http

struct ReqItem {
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

struct RspItem {
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

#### 泛化调用示例

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 http 类型的泛化调用
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g	)
    if err != nil {
        panic(err)
    }
    // 构造 request（用于测试），实际应用可以直接使用原始的 HTTP Request
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
    // Kitex 泛化目前直接支持的是标准库中的 http.Request，使用 hertz 需要通过做一个请求转换
    // httpReq, err := adaptor.GetCompatRequest(hertzReqCtx)
    req.Header.Set("token", "1")
    customReq, err := generic.FromHTTPRequest(req) // 考虑到业务有可能使用第三方 http request，可以自行构造转换函数
    // customReq *generic.HttpRequest
    // 由于 http 泛化的 method 是通过[Thrift-HTTP 映射的 IDL 规范]从 http request 中获取的，所以填空就行
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // 写回 ResponseWriter，用于 http 网关
}
```

#### 注解扩展

比如增加一个 `xxx.source='not_body_struct'` 注解，表示某个字段本身没有对 HTTP 请求字段的映射，需要遍历其子字段从 HTTP 请求中获取对应的值。

使用方式如下：

```thrift
struct Request {
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional CommonParam common_param (xxx.source='not_body_struct')
}

struct CommonParam {
    1: optional i64 api_version (api.query = 'api_version')
    2: optional i32 token(api.header = 'token')
}
```

扩展方式如下：

```go
func init() {
        descriptor.RegisterAnnotation(new(notBodyStruct))
}

// 实现 descriptor.Annotation
type notBodyStruct struct {
}

func (a * notBodyStruct) Equal(key, value string) bool {
        return key == "xxx.source" && value == "not_body_struct"
}

// Handle 目前支持四种类型：HttpMapping, FieldMapping, ValueMapping, Router
func (a * notBodyStruct) Handle() interface{} {
        return newNotBodyStruct
}

type notBodyStruct struct{}

var newNotBodyStruct descriptor.NewHTTPMapping = func(value string) descriptor.HTTPMapping {
        return &notBodyStruct{}
}

// get value from request
func (m *notBodyStruct) Request(req *descriptor.HttpRequest, field *descriptor.FieldDescriptor) (interface{}, bool) {
        // not_body_struct 注解的作用相当于 step into，所以直接返回 req 本身，让当前 filed 继续从 Request 中查询所需要的值
        return req, true
}

// set value to response
func (m *notBodyStruct) Response(resp *descriptor.HTTPResponse, field *descriptor.FieldDescriptor, val interface{}) {
}
```

### Map 映射泛化调用

Map 映射泛化调用是指用户可以直接按照规范构造 Map 参数，Kitex 会对应完成 Thrift 编解码。

Kitex 会根据给出的 IDL 严格校验用户构造的字段名和类型，字段名只支持字符串类型对应 Map Key，字段 Value 的类型映射见类型映射表。

对于Response会校验 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 Map Key。

#### 类型映射

Golang 与 Thrift IDL 类型映射如下：

| **Golang 类型**             | **Thrift IDL 类型** |
| --------------------------- | ------------------- |
| bool                        | bool                |
| int8                        | i8                  |
| int16                       | i16                 |
| int32                       | i32                 |
| int64                       | i64                 |
| float64                     | double              |
| string                      | string              |
| []byte                      | binary              |
| []interface{}               | list/set            |
| map[interface{}]interface{} | map                 |
| map[string]interface{}      | struct              |
| int32                       | enum                |

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

构造请求如下：

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
        }
```

#### 示例 IDL

`base.thrift`：

```thrift
base.thrift
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

`example_service.thrift`：

```thrift
example_service.thrift
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

#### 客户端

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 map 类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g)
    if err != nil {
        panic(err)
    }
    // 'ExampleMethod' 方法名必须包含在 idl 定义中
  	// resp 类型为 map[string]interface{}
    resp, err := cli.GenericCall(ctx, "ExampleMethod", map[string]interface{}{
        "Msg": "hello",
    })
}
```

#### 服务端

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 map 请求和返回类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := genericserver.NewServer(new(GenericServiceImpl), g)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
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

### JSON 映射泛化调用

JSON 映射泛化调用是指用户可以直接按照规范构造 JSON String 请求参数或返回，Kitex 会完成对应协议编解码。

JSON 与 MAP 泛化调用严格校验用户构造的字段名和类型不同，JSON 泛化调用会根据给出的 IDL 对用户的请求参数进行转化，无需用户指定明确的类型，如 int32 或 int64。

对于 Response 会校验 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 JSON Field。

#### 类型映射

Golang 与 Thrift IDL 类型映射如下：

| **Golang 类型**             | **Thrift IDL 类型** |
| --------------------------- | ------------------- |
| bool                        | bool                |
| int8                        | i8                  |
| int16                       | i16                 |
| int32                       | i32                 |
| int64                       | i64                 |
| float64                     | double              |
| string                      | string              |
| ~~[]byte~~                  | ~~binary~~          |
| []interface{}               | list/set            |
| map[interface{}]interface{} | map                 |
| map[string]interface{}      | struct              |
| int32                       | enum                |

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
req := {
  "Msg": "hello",
  "I8": 1,
  "I16": 1,
  "I32": 1,
  "I64": 1,
  "Map": "{\"hello\":\"world\"}",
  "Set": ["hello", "world"],
  "List": ["hello", "world"],
  "ErrorCode": 1,
  "Info": "{\"Map\":\"{\"hello\":\"world\"}\", \"ID\":232324}"

}
```

#### 示例 IDL

`base.thrift`：

```
base.thrift
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

`example_service.thrift`：

```
example_service.thrift
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

#### 客户端

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径: 举例 ./idl/example.thrift
    // includeDirs: 指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 JSON 请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g)
    if err != nil {
        panic(err)
    }
    // 'ExampleMethod' 方法名必须包含在 idl 定义中
    // resp 类型为 JSON string
    resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}")

}
```

#### 服务端

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 JSON 请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := genericserver.NewServer(new(GenericServiceImpl), g)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
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

## Protobuf 使用示例

### JSON 映射泛化调用

JSON 映射泛化调用是指用户可以直接按照规范构造 JSON String 请求参数或返回，Kitex 会完成对应协议编解码。

#### 类型映射

Golang 与 Proto IDL 类型映射如下：

| **Protocol Buffers 类型** | **Golang 类型** |
| ------------------------- | --------------- |
| float                     | float32         |
| double                    | float64         |
| int32                     | int32           |
| int64                     | int64           |
| uint32                    | uint32          |
| uint64                    | uint64          |
| sint32                    | int32           |
| sint64                    | int64           |
| fixed32                   | uint32          |
| fixed64                   | uint64          |
| sfixed32                  | int32           |
| sfixed64                  | uint64          |
| bool                      | bool            |
| string                    | string          |
| bytes                     | byte[]          |

此外还支持 JSON 中的 lists 与 dictionaries，将其映射为 protobuf 中的 `repeated V` 与 `map<K,V>` 。不支持 protobuf 中的特殊类型，如 `Enum`，`oneof`。

#### 示例 IDL

```proto
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

#### 客户端

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

#### 服务端

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
