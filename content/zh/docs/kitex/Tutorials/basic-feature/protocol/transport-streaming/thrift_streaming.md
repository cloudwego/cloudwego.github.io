---
title: "Thrift Streaming"
date: 2024-03-06
weight: 2
keywords: ["Kitex", "Streaming", "Thrift"]
description: 本文介绍如何在 Thrift IDL 里定义并使用 Streaming API。
---

## 介绍

许多业务场景（例如 LLM 的流式响应、大量数据传输）需要 Streaming API：先在 client、server instance 之间建立一个 Stream，然后基于该 Stream 进行消息的单向或双向收发。

> 该特性是 Kitex v0.9.0 引入的，但有一些 tracing 相关问题是 v0.9.1 修复的，因此推荐使用新版，正文以新版为准、以简化内容。

### 名词解释

#### PingPong API (KitexThrift)

Kitex 默认的 Thrift API 模式：

- 只支持 PingPong，不支持 Streaming API
- Thrift Payload 可能包含前缀 [TTHeader](/zh/docs/kitex/reference/transport_protocol_ttheader/)、[Framed](https://github.com/apache/thrift/blob/0.13.0/doc/specs/thrift-rpc.md#framed-vs-unframed-transport)，或二者的组合（TTHeader + Framed + Payload）

#### Unary API

> [从 gRPC 借用的词汇](https://grpc.io/docs/what-is-grpc/core-concepts/#unary-rpc)，特指在 Stream 上的 PingPong API。

基于 Stream 的（例如 HTTP2 stream）的 PingPong 请求，Client 发送一个 Message，Server 返回一个 Message，然后关闭 Stream。
**因为有性能损失，不建议使用 Unary API，如无特殊需求请直接使用 KitexThrift PingPong API。**
如确有需要，可通过 Thrift IDL 里的注解开启（详见后文）。

#### Streaming API

Streaming API 分成三类（参考 [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)）。

##### Server Streaming

Client 发送一个 Message，Server 返回多个 Message，然后关闭 Stream。

##### Client Streaming

Client 发送多个 Message，Server 返回一个 Message，然后关闭 Stream。

##### Bidirectional Streaming

Client/Server 的收、发均为独立的流，可根据业务需求，按任意顺序执行 Recv、Send。

## Streaming over HTTP2

该方案是基于 gRPC/HTTP2 实现的，将 Payload 的编码由 Protobuf 替换成 Thrift。

### Getting Started

#### 环境准备

安装支持 Thrift Streaming 的 Kitex (不低于 v0.9.1) 和 Thriftgo （不低于 v0.3.6）：

```bash
go install github.com/cloudwego/thriftgo@latest
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

#### 编写 IDL

Kitex 通过 `streaming.mode` 注解判断方法的 Streaming 类型。

| 取值          | 含义                    | 说明                                                                        |
| ------------- | ----------------------- | --------------------------------------------------------------------------- |
| bidirectional | Bidirectional streaming | 收、发是独立的流，业务可以按需处理                                          |
| client        | Client Side Streaming   | Client 发送多个 Message，Server 返回一个 Message                            |
| server        | Server Side Streaming   | Client 发送一个 Message，Server 返回多个 Message                            |
| unary         | Unary over Streaming    | Client 发送一个 Message，Server 返回一个 Message (不建议使用, 性能损失较大) |
| (其他值)      | 无效，报错              |                                                                             |

注意：

1. Streaming API 有且只有 一个 request 和一个 response，否则 Kitex 会报错
2. **Kitex 支持 在同一个 Service 里同时定义 PingPong API（非Streaming） 和 Streaming API**

   1. Server 会自动探测协议、路由请求

3. 不建议使用 Unary over HTTP2（性能损失较大），建议使用 PingPong API（KitexThrift ）
4. streaming.mode 只能出现最多一次（不支持指定多个值），否则 Kitex 会报错

[示例 IDL](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/api.thrift)（下文的示例均基于该 IDL）：

```thrift
namespace go echo

struct Request {
    1: optional string message,
}

struct Response {
    1: optional string message,
}

service TestService {
    Response Echo (1: Request req) (streaming.mode="bidirectional"),
    Response EchoClient (1: Request req) (streaming.mode="client"),
    Response EchoServer (1: Request req) (streaming.mode="server"),
    // Response EchoUnary (1: Request req) (streaming.mode="unary"), // not recommended

    Response EchoPingPong (1: Request req), // KitexThrift, non-streaming
}
```

#### 生成项目脚手架

对于新增项目，先初始化项目目录：

```bash
mkdir demo-project && cd demo-project

module=demo
go mod init $module
```

Kitex 的使用与原 KitexThrift 项目一致，例如：

```bash
kitex -module $module -service demo-server api.thrift
```

注意：对于现有项目，也需要重新生成代码，并更新 go.mod 里的 Kitex 版本

然后执行：

```bash
go mod tidy
```

#### 编写业务代码

##### 创建 Stream Client（调用端）

注意：

- 对于 Streaming API，需要创建 **StreamClient**
- 创建 StreamClient 时应指定 `streamclient.Option` （不是 client.Option）
- 调用 Streaming API 时应指定 `streamcall.Option` （不是 callopt.Option）

示例代码：

```go
import "github.com/cloudwego/kitex/client/streamclient"
import "github.com/cloudwego/kitex/client/callopt/streamcall"

var streamClient = testservice.MustNewStreamClient(
    "demo-server",                                  // Service Name
    streamclient.WithHostPorts("127.0.0.1:8888"),   // streamclient.Option...
)

stream, err := streamClient.Echo(ctx, streamcall.WithHostPorts("127.0.0.1:8888"))

// business logic
```

##### Bidirectional Streaming API

注意：

1. 请求双方应协商好关闭 Stream 的条件，否则可能导致双方都一直等待下去（goroutine 泄漏）
2. 示例展示了全双工模式（Recv 和 Send 完全独立）

   1. 可按业务需求调整处理逻辑，例如（半双工模式）Server 总是在收到一个 Message 处理完再将结果发送给 Client

###### Server Handler

注意：

1. method handler 结束后，Kitex 会写 Trailer Frame（等同于关闭 stream）；业务代码不需要主动调用 `stream.Close()`
2. 新启动的 goroutine 应当自行 recover
3. 「Recv 返回 `io.EOF`」表示 client 已发送结束

示例代码：[kitex-examples:thrift_streaming/handler.go#L34](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L34)

###### Stream Client

注意：

1. 新启动的 goroutine 应当自行 recover
2. Client 发送结束后应及时调用 stream.Close() 告知 server
3. 「Recv 返回 `io.EOF` 或其他 non-nil error」表示 server 已发送结束（或出错）

   1. 此时 Kitex 才会记录 RPCFinish 事件（Tracer 依赖该事件）
   2. 如 client 和 server 约定了其他结束方式，应主动调用 streaming.FinishStream(stream, err) 记录 RPCFinish 事件

示例代码：[kitex-examples:thrift_streaming/client/demo_client.go#L119](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L119)

##### Server Streaming API

###### Server Handler

注意：method handler 结束后，Kitex 会写 Trailer Frame（等同于关闭 stream）；业务代码不需要主动调用 stream.Close()

示例代码：[kitex-examples:thrift_streaming/handler.go#L94](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L94)

###### Stream Client

注意：「Recv 返回 `io.EOF` 或其他 non-nil error」表示 server 已发送结束（或出错）

1. 此时 Kitex 才会记录 RPCFinish 事件（Tracer 依赖该事件）
2. 如 client 和 server 约定了其他结束方式，应主动调用 streaming.FinishStream(stream, err) 记录 RPCFinish 事件

示例代码：[kitex-examples:thrift_streaming/client/demo_client.go#L185](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L185)

##### Client Streaming API

###### Server Handler

注意：「Recv 返回 `io.EOF`」表示 client 已发送结束

示例代码：[kitex-examples:thrift_streaming/handler.go#L82](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L82)

###### Stream Client

示例代码：[kitex-examples:thrift_streaming/client/demo_client.go#L162](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L162)

#### Options

##### StreamClient Options

Kitex 在设计上区分了 Client（for KitexThrift PingPong API）和 StreamClient（for Streaming API），并且要求 StreamClient 使用另一套 Option（类型不同），避免用户给 StreamClient 指定了不支持的 Option。

注意：

- 如果某个 client/callopt Option 没有对应的 streamclient/streamcall Option（例如 WithRPCTimeout），说明 StreamClient 不支持该能力
- 如果你认为 StreamClient 应当支持该能力，可以[给 Kitex 提 issue](https://github.com/cloudwego/kitex/issues)

###### streamclient.Option

- 在 NewStreamClient 时指定；
- 新增的 Option：
  - `WithRecvMiddleware`、`WithRecvMiddlewareBuilder`：详见 Recv/Send 中间件
  - `WithSendMiddleware`、`WithSendMiddlewareBuilder`：详见 Recv/Send 中间件

示例代码：

```go
import "github.com/cloudwego/kitex/client/streamclient"

var streamClient = testservice.MustNewStreamClient(
    "demo-server",                                  // Service Name
    streamclient.WithHostPorts("127.0.0.1:8888"),   // streamclient.Option...
)
```

###### streamcall.Option

- 在创建 Stream 时指定
- 优先级高于同名（如果有的话）的 streamclient.Option

示例代码：

```go
import "github.com/cloudwego/kitex/client/callopt/streamcall"

stream, err := streamClient.Echo(
    context.Background(),
    streamcall.WithHostPort("127.0.0.1:8888"),
)
```

##### Server Options

由于 Server 支持自动探测协议，可以同时支持 Streaming API 和 KitexThrift API，因此无法像 StreamClient 一样使用不同的 Option 类型。

- 大部分 [Server Option](/zh/docs/kitex/tutorials/options/server_options/) 对 Streaming API 也有效
  - **对于不确定的 Option，请确保在验证有效后再部署到生产环境**
  - 对 Streaming API 无效的 Option 包括：
    - WithReadWriteTimeout
    - WithBoundHandler
    - ...
- 新增 Recv/Send Middleware 相关的几个 Option
  - WithRecvMiddleware、WithRecvMiddlewareBuilder
    - 详见后文「Recv/Send 中间件」
  - WithSendMiddleware、WithSendMiddlewareBuilder
    - 详见后文「Recv/Send 中间件」
  - WithCompatibleMiddlewareForUnary
    - 该 Option 主要是允许 gRPC/Protobuf Streaming 的 Unary API 使用与 PingPong API 相同的 Server Middleware（统一了入参）
    - 对于 Thrift Streaming，用户无需关注（不推荐使用 Unary API，且 Kitex 已默认指定该 Option）

### 服务治理 | Governance

#### 超时 | Timeout

##### 连接超时

支持通过 option 指定：

- streamclient.WithConnectTimeout
- streamcall.WithConnectTimeout （优先级高于前者）

##### 请求超时（不支持）

没有对应的 Option。
对于 Streaming API，[Kitex 的 Timeout 中间件会直接调用 next](https://github.com/cloudwego/kitex/blob/v0.9.1/client/rpctimeout.go#L101)。

##### Stream 超时

可通过 `context.WithTimeout` 或 `context.WithDeadline` 创建带有 Deadline 的 context，并在创建 Stream 时指定该 context，用于控制 Stream 的整体执行时间：

- Kitex Client
  - 通过 header `grpc-timeout` 发送给服务端
  - 超时后 Recv/Send 会直接返回 `rpc error: code = 4 desc = context deadline exceeded`
- Kitex Server
  - 读取 `grpc-timeout` 并设置到 request context 中
  - 超时后 Recv/Send 会直接返回 `rpc error: code = 4 desc = context deadline exceeded`

示例代码：

```go
// inject deadline into context BEFORE creating a stream
ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()

stream, err := cli.Echo(ctx)
```

##### Recv/Send 超时

可使用 Kitex 提供的 `streaming.CallWithTimeout` 方法。

###### Client

注意：

1. 需要 **在创建 Stream 之前** 给 ctx 注入 cancel（用 WithCancel 或 WithTimeout 都可以，取决于需求）
2. 将 cancel 方法作为 `streaming.CallWithTimeout` 的第二个参数

   1. 否则 Send/Recv 可能会长时间阻塞等待（取决于 server 端），导致 goroutine 泄漏

3. Client 端的 `stream.Close()` 的语义是 `CloseSend`，告诉 server 不再会有新消息（server recv 返回 `io.EOF`），并不会结束接收消息，因此不能用于 cancel 方法。

示例代码：

```go
import "github.com/cloudwego/kitex/pkg/streaming"

// Add a cancel func to the context BEFORE creating a stream
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

stream, err := cli.Echo(ctx)
if err != nil {
    // ...
}

// Send with timeout
err = streaming.CallWithTimeout(time.Second, cancel, func() error {
    return stream.Send(&test.Request{Message: "hello"})
})

// Recv with timeout
var resp *test.Response
err = streaming.CallWithTimeout(time.Second, cancel, func() (err error) {
    resp, err = stream.Recv()
    return err
})
```

###### Server

Server 端可以使用 `stream.Close()` 作为 cancel 方法。

示例代码：

```go
var cancel context.CancelFunc = func() {
    stream.Close() // the cancel func in streamContext will be called internally
}

var req *test.EchoRequest
err = streaming.CallWithTimeout(time.Second, cancel, func() (errRecv error) {
    req, errRecv = stream.Recv()
    return errRecv
})
```

#### 熔断 | CircuitBreak

只支持 **创建连接(Stream)时** 的错误率熔断。
不支持 Recv/Send 的熔断。

#### 重试 | Retry (不支持)

不支持重试。

#### Fallback (不支持)

Streaming API 不支持 fallback。

#### 负载均衡 | LoadBalancer

- 仅支持创建 Stream 时（等同于创建网络连接）的负载均衡
- 如已经创建 Stream，后续的 Send/Recv 只会发往该 Stream 的对端
  - 业务需自行处理流量倾斜问题，避免造成负载不均

##### 一致性哈希

注意：由于在中间件中获取的 Request 总是 nil，因此 keyFunc 不能直接读取 request

参考方案：

1. 在创建 Stream 前，先计算好 hashKey，放入 ctx 中
2. 在 keyFunc 里从 ctx 读取并返回

示例代码：

```go
streamClient := testservice.MustNewStreamClient(
    "demo-server",
    streamclient.WithLoadBalancer(loadbalance.NewConsistBalancer(
        loadbalance.NewConsistentHashOption(
            func(ctx context.Context, request interface{}) string {
                hashKey, _ := ctx.Value("MY_HASH_KEY")
                if hashKey == "" {
                    // if necessary, return a random string, but never an empty string
                    panic("invalid hashKey for consistent hash")
                }
                return hashKey
            },
        ),
    ))
)


request := &echo.Request{Message: "hello"}
ctx := context.WithKey(context.background(), "MY_HASH_KEY", keyFunc(request))
stream, err := streamClient.Echo(ctx, request)
```

#### Server 端限流 | Limit (QPS/Concurrency)

- 支持在创建 Stream 时限流
- 创建 Stream 后对 Recv/Send 的调用无限制，需要业务自行实现

### 中间件 | Middleware

#### Client/Server 中间件

##### Client Middleware

说明：

- Client 中间件的执行**仅覆盖「创建 Stream」的环节**（详见后附示意图）
  - Stream 创建完成、返回业务代码后，中间件就执行完成了
- request 总是 nil（包括 Server Streaming API）
- response 总是 \*[streaming.Result](https://github.com/cloudwego/kitex/blob/v0.8.0/pkg/streaming/streaming.go#L67) 类型，该类型包含的 Stream 最终会返回给业务代码
  - 如有需要，可替换该 Stream，加入自定义逻辑（基于 [decorator 模式](https://zh.wikipedia.org/wiki/%E4%BF%AE%E9%A5%B0%E6%A8%A1%E5%BC%8F)）
- 如获取到的 err != nil，说明创建 Stream 失败
- **Client 中间件无法获取到 Recv、Send 的 Message**

###### 执行流示意图：

注意：

- 下图为 Bidirectional API 流程（Client Streaming API 也类似）
- 但 Server Streaming API 略有不同，[在生成代码（kitex_gen）里调用了 Send 及 Close](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/kitex_gen/echo/testservice/testservice.go#L336)，然后才返回业务代码

![image](/img/docs/streaming/kitex_client_execution_flow.png)

###### 获取到的 Request/Response 字段类型

|                  |      request      |      response      |
| :--------------: | :---------------: | :----------------: |
|  Bidirectional   | interface{} = nil | \*streaming.Result |
| Client Streaming | interface{} = nil | \*streaming.Result |
| Server Streaming | interface{} = nil | \*streaming.Result |

注：

1. Server Streaming API 请求也无法在中间件中读取 request，请使用 Client Send Middleware 获取
2. Thrift Streaming Unary API 的参数类型和 PingPong API 一致

###### 识别 Streaming/Non-Streaming 请求

**Client** middleware 可以通过 response 的类型来判断是否是 streaming 请求：

```go
func clientMW(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, resp interface{}) (err error) {
       if _, ok := resp.(*streaming.Result); ok {
          // it's a streaming request
          return next(ctx, req, resp)
       } else {
          // it's a non-streaming request
          return next(ctx, req, resp)
       }
    }
}
```

##### Server Middleware

说明：

- Server 中间件的 next 方法里涵盖了整个 server handler 的处理过程
- request 总是 \*[streaming.Args](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/streaming/streaming.go#L70) 类型，该类型包含的 Stream 最终会返回给业务代码
  - 如有需要，可替换该 Stream，加入自定义逻辑（基于 [decorator 模式](https://zh.wikipedia.org/wiki/%E4%BF%AE%E9%A5%B0%E6%A8%A1%E5%BC%8F)）
- response 总是 nil（包括 Client Streaming API）
- 如获取到的 err != nil，说明内层 Server 中间件或 handler 返回了 error
- **对于 Streaming API（不含Unary），Server 中间件无法获取到 Recv、Send 的 Message**

###### 执行流示意图

- Bidirectional Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_bidirectional.png)

- Server Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_server.png)

- Client Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_client.png)

###### 获取到的 Request/Response 字段类型

|                  |     request      |     response      |
| :--------------: | :--------------: | :---------------: |
|  Bidirectional   | \*streaming.Args | interface{} = nil |
| Client Streaming | \*streaming.Args | interface{} = nil |
| Server Streaming | \*streaming.Args | interface{} = nil |

注意：

1. Server Streaming API 请求也无法在中间件中读取 client request，请使用 Server Recv Middleware 获取
2. Thrift Streaming Unary API 的参数类型和 PingPong API 一致

###### 识别 Streaming/Non-Streaming 请求

Server middleware 应通过 request 参数的类型来判断是否是 Streaming 请求：

```go
func serverMW(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, resp interface{}) (err error) {
       if _, ok := req.(*streaming.Args); ok {
          // it's a streaming request
          return next(ctx, req, resp)
       } else {
          // it's a non-streaming request
          return next(ctx, req, resp)
       }
    }
}
```

#### Recv/Send 中间件

Recv/Send 中间件提供了一种简便的方式，可以在消息的收发之上应用 decorator 模式，增加自定义逻辑。

![image](/img/docs/streaming/kitex_recvsend_middleware.png)

##### Recv Middleware

注意：在 Recv Middleware 中，需要**先调用 next，才能读到 message**。

###### StreamClient

注意：Client Recv 的是 API 的 response 类型。

```go
import (
    "github.com/cloudwego/kitex/client/streamclient"
    "github.com/cloudwego/kitex/pkg/endpoint"
    "github.com/cloudwego/kitex/pkg/klog"
    "github.com/cloudwego/kitex/pkg/streaming"
    "github.com/cloudwego/kitex/pkg/utils/kitexutil"
)

var streamClient = testservice.MustNewStreamClient(
    "demo-server",
    streamclient.WithRecvMiddleware(func(next endpoint.RecvEndpoint) endpoint.RecvEndpoint {
       return func(stream streaming.Stream, resp interface{}) (err error) {
          method, _ := kitexutil.GetMethod(stream.Context())
          err = next(stream, resp)
          klog.Infof("[%s] client recv middleware, err = %v, resp = %v", method, err, resp)
          return err
       }
    }),
)
```

###### Server

注意：Server Recv 的是 API 的 request 类型。

```go
svr := test.NewServer(new(TestServiceImpl),
    server.WithRecvMiddleware(func(next endpoint.RecvEndpoint) endpoint.RecvEndpoint {
       return func(stream streaming.Stream, req interface{}) (err error) {
          method, _ := kitexutil.GetMethod(stream.Context())
          err = next(stream, req)
          klog.Infof("[%s] server recv middleware: <= req = %v, err = %v", method, req, err)
          return err
       }
    }),
)
```

##### Send Middleware

###### StreamClient

注意：Client Send 的是 API 的 request 类型。

```go
import (
    "github.com/cloudwego/kitex/client/streamclient"
    "github.com/cloudwego/kitex/pkg/endpoint"
    "github.com/cloudwego/kitex/pkg/klog"
    "github.com/cloudwego/kitex/pkg/streaming"
    "github.com/cloudwego/kitex/pkg/utils/kitexutil"
)

var streamClient = testservice.MustNewStreamClient(
    "demo-server",
    streamclient.WithSendMiddleware(func(next endpoint.SendEndpoint) endpoint.SendEndpoint {
       return func(stream streaming.Stream, req interface{}) (err error) {
          method, _ := kitexutil.GetMethod(stream.Context())
          err = next(stream, req)
          klog.Infof("[%s] client send middleware, err = %v, req = %v", method, err, req)
          return err
       }
    }),
)
```

###### Server

注意：Server Send 的是 API 的 response 类型。

```go
svr := test.NewServer(new(TestServiceImpl),
    server.WithSendMiddleware(func(next endpoint.SendEndpoint) endpoint.SendEndpoint {
       return func(stream streaming.Stream, resp interface{}) (err error) {
          method, _ := kitexutil.GetMethod(stream.Context())
          err = next(stream, resp)
          klog.Infof("[%s] server send middleware: => resp = %v, err = %v", method, resp, err)
          return err
       }
    }),
)
```

#### 在 Client/Server 和 Recv/Send 中间件之间交换数据

我们可以通过给用于创建 Stream 的 ctx 注入 key，实现在 middleware 之间共享数据的能力。

Kitex 提供了一组简单的工具方法，通过给 ctx 注入一个 sync.Map ，以便在各 middleware 之间交换数据：

- [contextmap.WithContextMap(ctx)](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/utils/contextmap/contextmap.go#L32C6-L32C20)
- [contextmap.GetContextMap(ctx)](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/utils/contextmap/contextmap.go#L37)

注意：因为 Kitex 内部经常需要从 ctx 读取信息（例如 RPCInfo），**每注入一个 key 就增加读取链表的深度，会有一点性能损失**，因此 Kitex 默认不注入该 key

##### Client 示例代码

在 Client Middleware 里，调用 `next` 之前尚未创建 Stream，因此可以通过往 ctx 里注入 map，再调用 `next`，就可以在 Recv/Send middleware 里从 `stream.Context()` 获取，用于读写：

```go
import "github.com/cloudwego/kitex/pkg/utils/contextmap"

streamClient = testservice.MustNewStreamClient(
    "server",
    streamclient.WithHostPorts("127.0.0.1:8888"),
    streamclient.WithMiddleware(func(next endpoint.Endpoint) endpoint.Endpoint {
        return func(ctx context.Context, req, resp interface{}) (err error) {
           // inject sync.Map in client middleware
           ctx = contextmap.WithContextMap(ctx)
           if m, ok := contextmap.GetContextMap(ctx); ok {
              m.Store("hello", "world")
           }
           return next(ctx, req, resp)
        }
    }),
    streamclient.WithRecvMiddleware(func(next endpoint.RecvEndpoint) endpoint.RecvEndpoint {
        return func(stream streaming.Stream, resp interface{}) (err error) {
            // get the map in Recv/Send middleware for read/write
            if m, ok := contextmap.GetContextMap(stream.Context()); ok {
                if value, ok := m.Load("hello"); ok {
                    klog.Infof("[Recv Middleware] hello = %v", value)
                }
            }
            return next(stream, resp)
        }
    }),
)
```

##### Server 示例代码

Server 端与 Client 端不同，进入 Middleware 时已经创建好了 Stream，因此不能在 Server Middleware 里注入，但可以通过如下方式实现：

- 用 `server.WithMetaHandler` Option 指定一个 `MetaHandler`
- 该 `MetaHandler` 需要实现 `StreamingMetaHandler` 接口
- 在该 handler 的 `OnReadStream` 里给 ctx 注入 `sync.Map`，返回新的 ctx

Kitex 提供了一个 customMetaHandler，以便在创建 stream 之前给 ctx 增加一个 key。你只需要在 server 初始化时指定如下 option：

```go
server.WithMetaHandler(remote.NewCustomMetaHandler(remote.WithOnReadStream(
    func(ctx context.Context) (context.Context, error) {
        return contextmap.WithContextMap(ctx), nil
    },
)))
```

注：

1. 完整示例代码可参考：[kitex-tests: TestCustomMetaHandler](https://github.com/cloudwego/kitex-tests/blob/main/thrift_streaming/thrift_test.go#L1090)
2. 如果暂时不想升级到 rc 版，可参考 [customMetaHandler](https://github.com/cloudwego/kitex/blob/v0.9.1-rc1/pkg/remote/custom_meta_handler.go#L29) 实现一个 MetaHandler

### 元数据透传 | Metainfo

请参考：[CloudWeGo 官网 - Kitex - Metainfo](/zh/docs/kitex/tutorials/advanced-feature/metainfo/#kitex-grpc-metadata) 的「gRPC Metadata」一节。

注意：

- metainfo
  - Key 里不能包含小写字母和横线，例如 "Abc", "A-B" 都是无效 key，会被丢弃
- metadata
  - 必须使用 Kitex fork 的这个 pkg：`github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/metadata`
- header & trailer
  - Key 不能包含大写字母，否则会导致客户端报错

### 可观测性 | Observability

#### 基本埋点：RPCStart 和 RPCFinish

- 对于 Server/Bidirectional Streaming API，Kitex Client 将 `Recv()` 收到 non-nil error（`io.EOF` 或其他错误）作为流结束的标志，此时才会记录 RPCFinish 事件
  - 如果业务希望提前结束，应当调用 `streaming.FinishStream(stream, err)` 来产生 RPCFinish 事件
- 对于 Client Streaming API，Kitex Client 将在 CloseAndRecv() 方法返回前自动记录 RPCFinish 事件

Kitex 用户可以通过添加自己的 Tracer，在 Finish() 方法里处理该事件，详见 [Kitex - 可观测性 - 链路追踪 - 自定义 Tracer](/zh/docs/kitex/tutorials/observability/tracing/#%E8%87%AA%E5%AE%9A%E4%B9%89-tracer)

#### 细粒度埋点：StreamSend 和 StreamRecv

如果自定义 Tracer 实现了 [rpcinfo.StreamEventReporter](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/rpcinfo/tracer.go#L31) 接口，Kitex 会注入 Recv、Send 中间件，在每次 Recv、Send 执行完后调用 tracer 的 ReportStreamEvent 方法；
在该方法里，可以获取到本次 Recv、Send 的消息大小：（注意不要另起 goroutine，否则可能读取到的不是本次调用）

- ri.Stats().LastSendSize()
- ri.Stats().LastRecvSize()

具体示例可参考：[kitex-tests: testTracer](https://github.com/cloudwego/kitex-tests/blob/96b97d00bc099eba8bea181decb4d4f9e77df1cb/thrift_streaming/thrift_tracing_test.go#L77)

### 泛化调用 | Generic (暂未支持)

> 计划实现，但暂无明确时间表。

### 注意事项 | Attention

#### Send/Recv 操作的是「本地缓冲区」

gRPC/HTTP2 的实现基于「本地缓冲区」，Send 和 Recv 操作是直接在缓冲区上操作的。
因此需注意以下几点：

1. 「Send 返回 nil」只表明消息放入了本地缓冲区，**不等于**「消息已发送到对端」
2. Send 和 Recv 操作的「耗时」和 PingPong API 的「Latency」含义有显著差别：

   1. 如果对端的 Recv 调用频率更高，那么本地的 Send 通常会立即返回（缓冲区总是有空闲）
   2. 如果对端的 Recv 调用频率更低，那么本地的 Send 可能会阻塞较长时间（等待对方消费腾出缓冲区）
   3. 如果缓冲区里有数据，Recv 调用会立刻返回，否则需要等待对端的 Send

#### Client/Server 中间件无法读到 Request/Response

设计如此。
对于 Client Streaming/Server Streaming，虽然形式上和 PingPong API 类似（有 Request/Response），但是底层实现完全不同，在中间件中是读不到的。
请使用 Recv/Send 中间件处理流上的消息。

#### 采集 RPCFinish：client 请求 Server/Bidirectional API 需调用 Recv 收到 non-nil error

- 对于 Server/Bidirectional Streaming API，Kitex Client 将 Recv() 收到 non-nil error（`io.EOF` 或其他错误）作为流结束的标志，此时才会记录 RPCFinish 事件
  - 如果业务希望提前结束，应当调用 streaming.FinishStream(stream, err) 来产生 RPCFinish 事件
- 对于 Client Streaming API，Kitex Client 将在 CloseAndRecv() 方法返回前自动记录 RPCFinish 事件
- StreamRecv/StreamSend 是在 Recv/Send 调用时实时触发的，不依赖 RPCFinish 事件

#### 业务异常（BizStatusError）：不会被 Client RecvMiddleware 直接感知

业务异常是自定义业务状态码，在框架的链路上不会认为是错误请求，会被封装到 rpcinfo 内部。
因此如果有业务异常，在 Client 的 RecvMiddleware 里 next 返回的 err 为 nil，可用如下代码读取业务异常：

```go
bizErr := rpcinfo.GetRPCInfo(stream.Context()).Invocation().BizStatusErr()
```

## Streaming over TTHeader（规划中）

> 预计相比 HTTP2 能显著提高性能。

## FAQ

### 是否支持 Multi Service（单 Server 多 Service）？

支持，详见 CloudWeGo 官网文档：[Kitex - 单 Server 多 Service](/zh/docs/kitex/tutorials/advanced-feature/multi_service/)。

### Streaming over HTTP2 能否与 gRPC 的其他实现（尤其是其他语言）互通？

不能。
不过如果该 gRPC library 支持二进制泛化调用，可以结合 thrift 编解码器，发送thrift payload 实现互通。

注意: Kitex client 发送的 "content-type" header 值为 "application/grpc+thrift"

### Server Streaming API：client 端如何提前结束 Stream？

通过在发起请求前给 client 的 ctx 注入一个 cancel 方法，可以在需要的时候提前结束请求：

```go
ctx, cancel := context.WithCancel(origCtx) // or WithTimeout/WithDeadline, as needed
defer cancel()

st, err := streamClient.someServerStreamingAPI(ctx, req)

// your business code
// normally you should call st.Recv() until it returns a non-nil error (e.g. io.EOF)

// end the receiving stream prematurely
if someCondition {
    cancel()
    streaming.FinishStream(st, err) // necessary for generating the RPCFinish event here
}
```

补充说明：

- Server Streaming API，client 在发起请求、收到 stream 对象前，就已经关闭了 send stream（[在生成代码里调用的 close](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/kitex_gen/echo/testservice/testservice.go#L336)），因此 client 不能再发送新的消息告知 server，只能用 cancel 的方式提前关闭链接，这样才能让 server 端感知到
- 由于没有用 `st.Recv()` 收到 non-nil error，因此需要手动调用 `streaming.FinishStream(st, err)` 来产生该 stream 对应的 `RPCFinish` 事件
- 对于 Bidirectional Streaming，这种方式也适用，但最好手动调用 `st.Close()` 或向 server 发送先前约定好的消息。无论哪种情况，都不要忘记调用 `streaming.FinishStream`
