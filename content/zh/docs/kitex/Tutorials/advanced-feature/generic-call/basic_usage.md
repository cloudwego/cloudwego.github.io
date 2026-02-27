---
title: "基本使用"
date: 2025-09-28
weight: 2
keywords: ["generic-call", "HTTP", "Thrift", "Protobuf", "Map", "JSON"]
description: "Kitex 泛化调用完整指南，包括二进制转发、HTTP 映射、Map/JSON 映射和 Protobuf 二进制泛化调用。"
---

> 如果走流式调用，请升级 **github.com/cloudwego/kitex** 至 >= v0.14.1

## 什么是泛化调用
在标准的 Kitex Client -> Kitex Server 请求中，业务代码中可以直接构造一个 Go struct（method的Request），调用 Kitex Client 对应的 method，在方法内部完成序列化，再发送给 Server。

在某些场景下，业务代码获取到的可能是：

- 已经完成编码的二进制数据（例如 proxy）
    - 需要直接将数据转发给目标Server，不需要解码后重新构造

- HTTP Request、Go map、JSON（例如 ApiGateway）
    - 需要将这些数据序列化后的二进制数据发给目标Server

在这些场景下，可能有多个目标下游服务/方法，业务代码无法（或不适合）针对每一个数据构造一个 Go struct ，因此需要借助 Kitex 的泛化调用能力。

## 支持场景
1. **Thrift 二进制转发**：用于流量中转场景
2. **HTTP 映射泛化调用**：用于 API 网关场景（仅支持非流式调用）
3. **Protobuf 二进制泛化调用**
4. **Map-Thrift 映射泛化调用**
5. **JSON 映射泛化调用**：支持映射到 thrift / protobuf

## 使用方式示例

### IDLProvider
泛化调用需要 IDL 的运行时描述 Descriptor 来进行，其由 IDLProvider 来提供。目前 kitex 提供两种 IDLProvider 实现。

#### 解析本地文件
```go
import "github.com/cloudwego/kitex/pkg/generic"

 // 等同于 `kitex -I /idl ./Your_IDL_File_Path`
 p, err := generic.NewThriftFileProvider("./Your_IDL_File_Path", "/idl")
 if err != nil {
     panic(err)
 }
```

#### 解析内存文件（update cloudwego/kitex >= v0.13.0）
```go
// 等同于 `kitex -I . a/a.thrift`
p, err := NewThriftContentWithAbsIncludePathProvider("a/a.thrift", map[string]string{
    "a/a.thrift": `include "../b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})

err = p.UpdateIDL("a/a.thrift", map[string]string{
    "a/a.thrift": `include "b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})
```

`NewThriftContentWithAbsIncludePathProvider` 的第一个参数为主 IDL 文件名，第二个参数是文件名到文件内容的映射。该接口会优先基于主 IDL 文件查找相对路径，如果找不到，再使用绝对路径（即 UpdateIDL 所示的直接查找文件名为 key 的 idl content）获取 idl content。

#### 测试用例
测试用例：https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thriftidl_provider_test.go

### Thrift 二进制泛化 - V2 接口
对于 proxy 类应用，kitex 提供了最佳实践文档，可移步至：[Proxy 应用开发指南](../proxy_application_development/)。

Thrift 二进制泛化调用 v2 接口需满足 cloudwego/kitex >= v0.15.1。

#### 客户端使用
##### 初始化 Client
注意：不要给每个请求创建一个 Client（每个 client 都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

// service 是下游服务名，idlServiceName 是 thrift/pb idl 中定义的 service name
genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGenericV2(idlServiceName),
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

注意，thrift 二进制泛化接口必须指定 IDL service name，它对应于一个 IDL 内部定义的 service，一个 client 只能访问一个特定 IDL service 的 rpc 方法。

如果 client 要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化 client 的流协议是 TTHeaderStreaming，非流式消息则是 Framed 或 TTHeaderFramed。如果需要配置流式方法走 GRPC 协议，而不改变非流式方法的协议，则添加以下 client options：

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### Unary 泛化调用
注意：二进制编码不是对原始的 Thrift 请求参数（样例：api.Request）进行编码，而是封装 method 参数的 KitexArgs（也是从 IDL 生成在 kitex_gen 下的 struct，样例：api.HelloEchoArgs）。

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

// 构造一个请求参数 MethodArgs
// 注：kitex_gen 下生成的类型，MethodArgs 封装了 MethodReq
args := &HelloEchoArgs{Req: &Request{Message: "hello"}}

size := frugal.EncodedSize(args)
buf := dirtmake.Bytes(size, size)
_, err := frugal.EncodeObject(buf, nil, args)

// 从某种方式获得了编码后的 Thrify binary(不包含 thrift header)，直接调用泛化 Client 请求下游
result, err:= genericCli.GenericCall(ctx, methodName, buf)

resp := &HelloEchoResult{}
_, err = frugal.DecodeObject(res.([]byte), resp)
```

##### 流式泛化调用
Kitex 流式接口的二进制 payload 即是原始 request/response 序列化后的值，不包含 Args/Results 结构体，这与 unary 接口存在区别。流式接口提供三种流调用模式，相关详细用法可见：[StreamX 基础流编程](../../basic-feature/streamx/)。

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

req := &Request{Message: "hello"}

size := frugal.EncodedSize(req)
buf := dirtmake.Bytes(size, size)
_, err := frugal.EncodeObject(buf, nil, req)

stream, err := genericCli.BidirectionalStreaming(ctx, methodName)

err = stream.Send(stream.Context(), buf)
rbuf, err := stream.Recv(stream.Context())

resp := &Response{}
_, err = frugal.DecodeObject(rbuf.([]byte), resp)
```

#### 服务端使用
由于 thrift 二进制泛化 v2 接口必须强制指定 idl service name，而 idl service name 须由 ttheader/grpc header/ttstream header 等头部协议携带，framed/buffered 等协议无法携带 idl service name 的流量就无法命中这些指定的 idl service name，这可能导致 server 无法处理这些请求而报错。

因此，对于 thrift 二进制泛化 server，Kitex 框架推荐的用法是使用内置的 UnknownServiceOrMethodHandler。详细用法如下所示：

```go
import (
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

opts := []server.Option{
    server.WithListener(ln),
    server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
    server.WithMetaHandler(transmeta.ServerHTTP2Handler),
}

svr := server.NewServer(opts...)
err := genericserver.RegisterUnknownServiceOrMethodHandler(svr, &genericserver.UnknownServiceOrMethodHandler{
    DefaultHandler:   defaultUnknownHandler,
    StreamingHandler: streamingUnknownHandler,
})
```

`genericserver.UnknownServiceOrMethodHandler` 须由用户按需传入 server handler，如果 server 不接收 streaming/grpc 流量，则只需注入 DefaultHandler，否则还需要注入 StreamingHandler。以上两个 handler 需至少注入一个。

##### DefaultHandler
其中，DefaultHandler 注入的是处理 ping pong 流量（不包含 grpc unary 流量）的 server handler，也就是我们所熟悉的 kitex 标准 rpc 模式，这通常包括 buffered/framed/ttheader 流量，支持 thrift 和 protobuf 消息协议，以下是以 thrift idl 为例的示例用法：

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

func defaultUnknownHandler(ctx context.Context, service, method string, request interface{}) (response interface{}, err error) {
    args := &HelloEchoArgs{}
    if _, err = frugal.DecodeObject(request.([]byte), args); err != nil {
        return nil, err
    }
    req := args.Req
    if req == nil {
        return nil, fmt.Errorf("req is nil")
    }
    resp := runner.ProcessRequest(req)
    result := &HelloEchoResult{Success: resp}
    size := frugal.EncodedSize(result)
    buf := dirtmake.Bytes(size, size)
    _, err = frugal.EncodeObject(buf, nil, result)
    return buf, err
}
```

根据 handler 方法签名，service 即是 IDL 中定义的 service name，如果请求未携带 IDL Service name，则参数值为空。

##### StreamingHandler
StreamingHandler 注入的是所有流式方法（包括 grpc unary 流量）的 server handler，也就是 streaming rpc 模式的流量，这通常包括 grpc/ttstream 流量，支持 thrift 和 protobuf 消息格式，以下是以 thrift 为例的示例用法：

```go
func streamingUnknownHandler(ctx context.Context, service, method string, stream generic.BidiStreamingServer) (err error) {
    for {
        request, err := stream.Recv(ctx)
        if err == io.EOF {
           return nil
        }
        if err != nil {
           return err
        }
        req := &Request{}
        if _, err = frugal.DecodeObject(request.([]byte), req); err != nil {
            return nil, err
        }
        resp := runner.ProcessRequest(req)
        size := frugal.EncodedSize(resp)
        buf := dirtmake.Bytes(size, size)
        _, err = frugal.EncodeObject(buf, nil, resp)
        err = stream.Send(ctx, buf)
        if err != nil {
           return err
        }
    }
}
```

由于缺少 IDL Info，所有二进制泛化 server 拿到的 binary 流量都被视作双向流，用户需要确保实际收发的流模式与 IDL 定义保持一致，否则将导致对端处理报错。

##### Unknown Handler
如果服务本身已经定义了 service，比如通过生成代码的 NewServer 函数创建了 server，或者通过 json/map 等泛化调用接口注入了 service：

```go
svr := servicea.NewServer()
// register multi services
err := serviceb.RegisterService(svr, new(ServiceBImpl))
```

则再次注入 unknown service handler 时，所有原本 client 调用到该 server 时，返回了 "unknown service" 或 "unknown method" 报错的流量，都会被 unknownHandler 接收和处理。

```go
import "github.com/cloudwego/kitex/server/genericserver"

genericserver.RegisterUnknownServiceOrMethodHandler(svr, unknownHandler)
```

### 【废弃】Thrift 二进制泛化
需要用户自行编码，或者接收消息包转发用于流量中转场景。二进制泛化只支持 Framed 或 TTHeader 请求，不支持 Buffered Binary。

注意：不支持 oneway 方法。

#### 调用端使用
##### 初始化 Client
注意：不要给每个请求创建一个 Client（每个 client 都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric(),
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

##### 泛化调用
用法可以参考 https://github.com/cloudwego/kitex/blob/develop/pkg/generic/binary_test/generic_test.go#L117

注意：二进制编码不是对原始的 Thrift 请求参数（样例：api.Request）进行编码，而是封装 method 参数的 KitexArgs（也是从 IDL 生成在 kitex_gen 下的 struct，样例：api.HelloEchoArgs）。

```go
import (
    gopkg "github.com/cloudwego/gopkg/protocol/thrift"
)

// 以下用 kitex 提供的 thrift 编解码包构造一个编码完成的 Thrift binary ([]byte)
// 需要满足 thrift 编码格式 thrift/thrift-binary-protocol.md

// 构造一个请求参数 MethodArgs
// 注：kitex_gen 下生成的类型，MethodArgs 封装了 MethodReq
args := &HelloEchoArgs {
    Req: &Request {
        Message: "hello",
    },
}

var buf []byte
buf, err = gopkg.MarshalFastMsg(methodName, gopkg.CALL, /*seqID*/ 0, args)

// 以上代码仅用于演示如何获取 Thrift Binary
// 二进制泛化调用的实际场景往往是直接获得了 Thrift Binary

// 从某种方式获得了编码后的 Thrify binary，直接调用泛化 Client 请求下游
result, err:= genericCli.GenericCall(ctx, methodName, buf)
```

注：seqID 是请求的序列号，用户在这里设置的 SeqID 不会生效，框架会生成后重置，所以写 0 即可。服务端场景需要主动设置 seqID，具体见服务端部分。

返回的 result 表面类型是 interface{}，实际类型是 []uint8，是 server response 里的 thrift payload，可以解码到 KitexResult 类型。

#### 服务端使用（如需要）
服务端用于只做流量转发的服务。

二进制泛化上游 client 和 下游 server 不需要配套使用，二进制泛化 Server 可以接受正常的 Thrift 请求，但是接受的协议必须是 Framed 或 TTHeader，不支持 Buffered Binary。

原因：二进制泛化不解 Thrift 包，需要有头部的协议来处理。

client 传入正确的 thrift 编码二进制，是可以访问普通的 Thrift server。

注意下面场景的使用方式：
场景：normal client -> [generic server-> generic client]-> normal server，你需要保证 generic server 给上游返回的包 seqID 是一致的，否则会导致上游报错。

处理方式：通过 generic.GetSeqID(buff) 获取上游的 seqID，generic server 收到 generic client 返回的 buff 通过 generic.SetSeqID(seqID, transBuff) 重新设置返回给上游的数据包的 seqID。

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
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
    // thrift 协议二进制格式,参考: thrift/thrift-binary-protocol.md
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
```

### Protobuf 二进制泛化调用
对于 proxy 类应用，kitex 提供了最佳实践文档，可移步至：[Proxy 应用开发指南](../proxy_application_development/)。

Protobuf 二进制泛化调用支持流式和非流式调用，需满足 cloudwego/kitex >= v0.15.1。

#### 调用端使用
##### 初始化 Client
注意：不要给每个请求创建一个 Client（每个 client 都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

g := generic.BinaryPbGeneric(serviceName, packageName)
genericCli, err := genericclient.NewClient(service, g,
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

其中 serviceName 和 packageName 对应 idl 中定义的 service name 和 package name，如以下 pb idl 中的"Mock"和"protobuf/pbapi"。

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

如果 client 要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化 client 的流协议是 TTHeaderStreaming，非流式消息则是 Framed 或 TTHeaderFramed。如果需要配置走 GRPC 协议，则添加以下 client options：

```go
genericclient.NewClient("service", generic.BinaryThriftGeneric(), client.WithTransportProtocol(transport.GRPC))
```

##### 泛化调用
泛化调用传递的 request/response 或者 stream message 都是 protobuf 序列化后的结果，generic client 初始化后，提供 4 种流模式调用方法，streaming 相关详细用法可见：[StreamX 基础流编程](../../basic-feature/streamx/)。

```go
// unary
resp, err := genericCli.GenericCall(ctx, "UnaryTest", buf)
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", buf)
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/binarypb/generic_test.go

#### 服务端使用
由于 protobuf 二进制泛化接口必须指定 idl service name，而 idl service name 须由 ttheader/grpc header/ttstream header 等头部协议携带，framed/buffered 等协议（kitex-protobuf）无法携带 idl service name 的流量就无法命中这些指定的 idl service name，这可能导致 server 无法处理这些请求而报错。

因此，对于 protobuf 二进制泛化 server，推荐的用法是使用内置的 UnknownServiceOrMethodHandler。关于它的用法，可参考 thrift 二进制泛化 - 服务端使用章节，protobuf 与 thrift 用法完全一致，只是消息编码格式有所区别。

#### Unknown Handler
关于 unknown handler，也可参考 thrift 二进制泛化 - unknown handler。

### HTTP 映射泛化调用
~
注意：只支持泛化客户端，将 HTTP Request 转为 Thrift 请求发出，同时会将下游 Thrift 返回转为 HTTP Response。

Kitex 已支持更高性能的泛化调用实现，使用方式见[泛化调用接入 dynamicgo 指南](../generic-call-dynamicgo/)。

#### 泛化调用示例（数据格式为 json）
**YOUR_IDL.thrift**
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

**Request**
类型：*generic.HTTPRequest

**Response**
类型：*generic.HTTPResponse

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径：举例 ./idl/example.thrift
    // includeDirs：指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 http 类型的泛化调用
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
    // 构造 request
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
    customReq, err := generic.FromHTTPRequest(req) // 考虑到业务有可能使用第三方 http request，可以自行构造转换函数
    // customReq *generic.HTTPRequest
    // 由于 http 泛化的 method 是通过 bam 规则从 http request 中获取的，所以填空就行
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // 写回 ResponseWriter，用于 http 网关
}
```

#### 泛化调用示例（数据格式为 protobuf）
用法可以参考：https://github.com/cloudwego/kitex/pull/638/files#diff-bd83f811aba6a67986c66e48a85a0566579ab64757ea75ba8f9a39dcb363d1d5

需要注意以下几点：
- thrift 结构体中通过 api.body 修饰的字段须与 proto 文件对应字段的 id 一一对应，其余字段不与 proto 映射，不做要求；
- 不支持 thrift IDL 默认值中嵌套 struct；
- proto 文件内与 thrift 对应的 method 必须同名。

##### 扩展注解
示例是增加 agw.source='not_body_struct' 注解，表示某个字段本身没有对 HTTP 请求字段的映射，需要遍历其子字段从 HTTP 请求中获取对应的值。使用方式如下：

```thrift
struct Request {
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional CommonParam common_param (agw.source='not_body_struct')
}

struct CommonParam {
    1: optional i64 api_version (api.query = 'api_version')
    2: optional i32 token(api.header = 'token')
}
```

扩展方式如下：

```go
func init() {
    descriptor.RegisterAnnotation(new(agwNotBodyStruct))
}

// 实现 descriptor.Annotation
type agwNotBodyStruct struct {
}

func (a *agwNotBodyStruct) Equal(key, value string) bool {
        return key == "agw.source" && value == "not_body_struct"
}

func (a *agwNotBodyStruct) Handle() interface{} {
        return newNotBodyStruct
}

type notBodyStruct struct{}

var newNotBodyStruct descriptor.NewHTTPMapping = func(value string) descriptor.HTTPMapping {
        return &notBodyStruct{}
}

// get value from request
func (m *notBodyStruct) Request(req *descriptor.HTTPRequest, field *descriptor.FieldDescriptor) (interface{}, bool) {
        // not_body_struct 注解的作用相当于 step into，所以直接返回 req 本身，让当前 filed 继续从 Request 中查询所需的值
        return req, true
}

// set value to response
func (m *notBodyStruct) Response(resp *descriptor.HTTPResponse, field *descriptor.FieldDescriptor, val interface{}) {
}
```

### Map 映射泛化调用
Map 映射泛化调用是指用户可以直接按照规范构造 Map 请求参数或返回，Kitex 会对应完成 Thrift 编解码。

注意：对性能要求比较高的用户可以考虑 [使用 Thrift 动态反射提升泛化调用性能](../generic-call-reflection/)。

#### Map 构造
Kitex 会根据给出的 IDL 严格校验用户构造的字段名和类型，字段名只支持字符串类型对应 Map Key（map key 优先取 json tag 定义的值，其次取字段名，参考 特别说明 - JSON 泛化 一节），字段 Value 的类型映射见下表。

对于返回会校验 Response 的 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 Map Key。

#### 类型映射
Golang 与 Thrift IDL 类型映射如下：

**写映射**

| Golang 类型 | Thrift IDL 类型 |
|-------------|-----------------|
| bool | bool |
| int8, byte | i8, byte |
| int16 | i16 |
| int32 | i32, i16, i8 |
| int64 | i64 |
| float64 | double, i64, i32, i16, i8 |
| string | string,binary |
| []byte | binary,string |
| []interface{} | list/set |
| map[interface{}]interface{} | map |
| map[string]interface{} | struct |
| int32 | enum |

**读映射**

| Thrift IDL 类型 | Golang 类型（read） | 备注 |
|---------------|-------------------|---------|
| bool | bool | |
| i8, | int8 | |
| byte | byte | |
| i16 | int16 | |
| i32 | int32 | |
| i64 | int64 | |
| double | float64 | |
| string | string | |
| binary | []byte | 默认返回的是 String，如果需要返回 []byte, 需要通过 SetBinaryWithByteSlice 设置。 |
| list/set | []interface{} | |
| map | map[interface{}]interface{} | |
| struct | map[string]interface{} | |
| enum | int32 | |

```go
g, err := generic.MapThriftGeneric(p)
err = generic.SetBinaryWithByteSlice(g, true)
```

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
                //注意：传入形如 ([]interface{})(nil) 格式的 value 也会被视为空值进行编码
        }
```

#### 客户端使用
客户端流式调用需满足 cloudwego/kitex >= v0.14.1。

##### Client 初始化
注意：不要给每个请求创建一个 Client（每个 client 都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径：举例 ./idl/example.thrift
    // includeDirs：指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 map 请求和返回类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
}
```

如果 client 要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化 client 的流协议是 TTHeaderStreaming，非流式消息则是 Framed 或 TTHeaderFramed。如果需要配置流式方法走 GRPC 协议，而不改变非流式方法的协议，则添加以下 client options：

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### 泛化调用
泛化调用传递的 request/response 或者 stream message 都是 map[string]interface{} 类型，generic client 初始化后，提供 4 种流模式调用方法，streaming 相关详细用法可见：[StreamX 基础流编程](../../basic-feature/streamx/)。

**Request**
类型：map[string]interface{}

**Response**
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

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/map/client_test.go

#### 服务端使用
服务端使用含流式接口的 map 泛化调用 server，请确保 cloudwego/kitex >= v0.15.1。

**Request**
类型：map[string]interface{}

**Response**
类型：map[string]interface{}

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径：举例 ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 map 请求和返回类型的泛化调用
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    // 旧泛化调用接口，仅支持 ping pong
    svc := genericserver.NewServer(new(GenericServiceImpl), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    // v2 泛化调用接口，支持流式
    svc := genericserver.NewServerV2(utils.ServiceV2Iface2ServiceV2(&GenericServiceImplV2{}), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a map[string]interface{}
}
```

详细用法可参考 https://github.com/cloudwego/kitex-tests/blob/main/generic/map/server.go#L81C6-L81C24

#### 特别说明 - Map 泛化
- 会校验 response 的 field id 和类型并根据 idl 的 field name 生成相应的 map key，这里的 field id 和类型需要和 idl 定义一致，如果不一致会导致未定义行为；
- 如果确认所有 thrift 定义的 map 类型的 key 都是 string 类型，并且不希望使用 map[interface{}]interface{} 类型的参数来构造/解析消息，可以使用 MapThriftGenericForJSON 来构造 generic；

（Kitex v1.17.*~v1.19.*版本引入了 bug，导致这个接口失效了，详见 MapThriftGenericForJSON 不生效）

对于空结构体，泛化调用会默认生成一个 empty map 而不是 empty struct，也就是其子字段不会出现在该 map 中。如果需要在空 map 中同时设置其子字段，可以使用 EnableSetFieldsForEmptyStruct。

### JSON 映射泛化调用
JSON 映射泛化调用是指用户可以直接按照规范构造 JSON String 请求参数或返回，Kitex 会对应完成 Thrift 编解码。

注意：Kitex 已支持更高性能的泛化调用实现，使用方式见[泛化调用接入 dynamicgo 指南](../generic-call-dynamicgo/)。

#### JSON 构造
Kitex 与 MAP 泛化调用严格校验用户构造的字段名和类型不同，JSON 泛化调用会根据给出的 IDL 对用户的请求参数进行转化，无需用户指定明确的类型，如 int32 或 int64。

对于 Response 会校验 Field ID 和类型，并根据 IDL 的 Field Name 生成相应的 JSON Field。

当前支持 Kitex-Thrift 和 Kitex-Protobuf 作为下游进行调用

#### JSON<>Thrift 泛化
##### 类型映射
Golang 与 Thrift IDL 类型映射如下：

| Golang 类型 | Thrift IDL 类型 | 注意 |
|-------------|-----------------|------|
| bool | bool | |
| int8 | i8 | |
| int16 | i16 | |
| int32 | i32 | |
| int64 | i64 | |
| float64 | double | |
| string | string | |
| []byte | binary | binary 构造需要进行 base64 编码 |
| []interface{} | list/set | |
| map[interface{}]interface{} | map | |
| map[string]interface{} | struct | |
| int32 | enum | |

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

```json
{
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

#### 客户端使用
流式调用需满足 cloudwego/kitex >= v0.14.1。

##### Client 初始化
注意：不要给每个请求创建一个 Client（每个 client 都有额外的资源消耗），建议在进程启动时给每个下游服务创建一个；或者有一个 Client Pool，根据下游服务做索引。

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径：举例 ./idl/example.thrift
    // includeDirs：指定 include 路径，默认用当前文件的相对路径寻找 include
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 JSON 请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
}
```

如果 client 要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化 client 的流协议是 TTHeaderStreaming，非流式消息则是 Framed 或 TTHeaderFramed。如果需要配置流式方法走 GRPC 协议，而不改变非流式方法的协议，则添加以下 client options：

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### 泛化调用
泛化调用传递的 request/response 或者 stream message 都是 JSON string 类型，generic client 初始化后，提供 4 种流模式调用方法，streaming 相关详细用法可见：[StreamX 基础流编程](../../basic-feature/streamx/)。

**Request**
类型：JSON string

**Response**
类型：JSON string

```go
// unary
resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}") // resp is a JSON string
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", "{\"Msg\": \"hello\"}")
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

详细用法示例：https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxjson/generic_test.go

#### 服务端使用
服务端使用含流式接口的 json 泛化调用 server，请确保 cloudwego/kitex >= v0.15.1。

**Request**
类型：JSON string

**Response**
类型：JSON string

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // 本地文件 idl 解析
    // YOUR_IDL_PATH thrift 文件路径：举例 ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // 构造 JSON 请求和返回类型的泛化调用
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    // 旧泛化调用接口，仅支持 ping pong
    svc := genericserver.NewServer(new(GenericServiceImpl), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    // v2 泛化调用接口，支持流式
    svc := genericserver.NewServerV2(utils.ServiceV2Iface2ServiceV2(&GenericServiceImplV2{}), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a JSON string
}
```

详细用法可参考 https://github.com/cloudwego/kitex-tests/blob/main/generic/json/server.go#L84

#### 特别说明
由于 JSON 泛化目前使用的是 gjson，根据 IDL 对用户的 request 请求的每个字段依次进行强转（https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thrift/write.go#L130），所以当用户字段类型传错的时候会用默认值替代。例如：IDL 中"test"字段要求是 i64，但是 request 里面的{"test":"abc"}，这种情况目前不会报错，而是修改为{"test":0}。该问题会在切换到 dynamicgo 时限制更加严格。

通过设置环境变量可以选择是否全局开启使用 go.tag 的值作为 json 的 key，同样适用于 Map 泛化调用。

```bash
# 使用原始 Key 作为 JSON 泛化或 Map 泛化调用的 Key，关闭 go.tag 的 Key 的使用
KITEX_GENERIC_GOTAG_ALIAS_DISABLED = True
```

从 cloudwego/kitex@v0.12.0 版本开始，go.tag 可以通过 generic.WithGoTagDisabled option 来禁用。这允许单独对 client/server 泛化调用指定是否禁用 go.tag 注解。

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
目前只针对 KitexProtobuf 协议。传入 IDL Provider 与可选 Option 参数，返回 Protobuf JSON 泛化调用对象，Option 参数详见泛化调用接入 DynamicGo 指南。

##### 类型映射
Golang 与 Proto IDL 类型映射如下：

此外还支持 JSON 中的 lists 与 dictionaries，将其映射为 protobuf 中的 repeated V 与 map<K,V>。不支持 protobuf 中的特殊类型，如 Enum，oneof。

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
        "github.com/cloudwego/kitex/pkg/transmeta"
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
        opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
        opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler))

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
        "github.com/cloudwego/kitex/pkg/transmeta"
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
        opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
        opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler))

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

### 性能压测对比
以下测试结果以多重嵌套的复杂结构体作为压测 payload，并发数控制在 100，server 分配 4 核 Intel(R) Xeon(R) Gold 5118 CPU @ 2.30GHz，压测代码链接。

| 泛化类型 | TPS | TP99 | TP999 | Server CPU AVG | Client CPU AVG | 吞吐差异(对比不走泛化) |
|---------|-----|------|-------|----------------|----------------|---------------------------------------------|
| 不走泛化 | 147006 | 1.60ms | 3.45ms | 391.48 | 544.83 | 0% |
| map 泛化 | 78104 | 3.58ms | 21.88ms | 392.62 | 509.70 | -47% |
| json 泛化-No dynamicgo | 19647 | 21.49ms | 61.52ms | 392.20 | 494.30 | -86% |
| http 泛化-No dynamicgo | 136093 | 2.57ms | 5.18ms | 369.61 | 1329.26 | -8% |

Json / http 泛化支持使用 dynamicgo 获取更高性能，以下是 2k qps，100 并发，10k 包大小下的性能测试结果。服务器分配 4 核 Intel (R) Xeon (R) Gold 5118 CPU @2.30GHz。

| 泛化类型 | With dynamicgo | TPS | TP99 | TP999 | 吞吐差异 |
|---------|---------------|-----|------|-------|---------------------|
| json generic | no | 2466.90 | 141.38ms | 206.25ms | 0% |
| | yes | 9179.28 | 34.75ms | 80.75ms | +272% |
| http generic | no | 8338.20 | 90.92ms | 139.31ms | 0% |
| | yes | 27243.95 | 9.57ms | 23.76ms | +227% |

注：以上测试过程中，map/json 泛化同时在 client/server 处开启，http 泛化只支持客户端故只在 client 端开启。由于压测只限制了 server 的 CPU 上限，对比结果时，请同时关注 client cpu 开销。

### FAQ

**Q：泛化调用必须要引用 IDL 吗？**

- 二进制流转发：不需要
- HTTP/Map/JSON：需要

因为请求中只有字段名称，需要 IDL 提供「字段名 -> 字段 ID」的映射关系，序列化后的 thrift binary 里只有字段 ID。

**Q：使用二进制流转发，框架会做相应的打点上报吗?**

会的

**Q: "missing version in Thrift Message"**

说明传入的不是 Thrift 正确编码后的 buff，确认使用方式。

注意：二进制编码不是对原始的 Thrift 请求（样例：api.Request）参数编码，是 method 参数封装的 XXXArgs（样例：api.HelloEchoArgs）

**Q: 支持 protobuf 吗?**

目前 map 泛化已支持，json 泛化计划支持

**Q：HTTP 泛化调用如何检查注解 key 是否规范?**

可以使用 pkg/generic/thrift/parse.go 下的 Parse 方法检查，如果不是 BAM 规范中的 key 会返回 error。

**Q：泛化调用是否支持 idl 中定义的默认值？**

Kitex map/http/json 泛化支持在读时设置 idl 中定义的默认值，如以下示例中的 idl 文件：

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

- 对于 map 泛化，会自动添加以上字段名为 key，默认值作为 value 的 k-v 对；
- 对于 json 泛化，会在编码得到的 json 串中包含定义了默认值的 k-v 对；
- 对于 http 泛化，会在 response 注解所在字段处设置默认值。

**Q：optional 修饰的字段生成类型带了指针，map 泛化的 value 是否需要也用指针？**

不需要。

**Q：idl 文件中定义了多个 service，泛化调用时怎么处理？**

每个泛化客户端/服务端默认使用最后一个 service 定义，可以通过下列代码来指定解析特定 service：

```go
import "github.com/cloudwego/kitex/pkg/generic"

path := "json_test/idl/example_multi_service.thrift"
opts := []ThriftIDLProviderOption{WithIDLServiceName("ExampleService")}
p, err := NewThriftFileProviderWithOption(path, opts)
```

**Q: 服务端报错 "[ReadString] the string size greater than buf length"**

可能是 client 和 server 的 idl 有差异，例如字段类型不一致。

**Q：map 泛化调用 byte 类型字段在 writeInt8 函数 panic**

```
github.com/cloudwego/kitex/pkg/generic/thrift.writeInt8(...)
        /.../github.com/cloudwego/kitex@v0.4.4/pkg/generic/thrift/write.go:312 +0xb4
```

原因：thriftgo 对齐 apache thrift 的实现，会将 IDL 中的 byte 类型字段都转成 go 中的 int8 类型，所以旧版本 cloudwego/kitex（<0.6.0) 在 writeInt8 中没有针对 byte 类型做适配。

建议：

- client 端：
升级新版本：cloudwego/kitex >= 0.6.0 （或）
保留旧版本：在构造 map 时使用 int(byteVal) 给该字段赋值。
- server 端：将该 int8 字段转成 byte 类型（如果存在值 > 127 的情况）

注：byte 和 int8 互相转换不会损失精度。

**Q: binary generic-server: "invalid trans buffer in binaryThriftCodec Unmarshal" ?**

二进制泛化的 server 接收的包必须带头部 size，因为二进制泛化并不会解析 Thrift 包，没有头部 size 的包无法正常处理。

如果遇到此问题，上游 client 需要配置传输协议 framed 或 ttheader，见如何指定传输协议。

**Q：如何在一个 server 下对不同 idl service 注入不同的 generic 实现？**

支持除了 BinaryThriftGeneric 以外的所有泛化调用类型，BinaryThriftGeneric 只支持通过 genericserver.NewServer 或 genericserver.NewServerWithServiceInfo 启用。

```go
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
