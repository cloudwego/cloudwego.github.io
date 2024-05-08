---
title: "Thrift Streaming"
date: 2024-03-09
weight: 2
keywords: ["Kitex", "Streaming", "Thrift"]
description: This article describes how to define and use the Streaming API in Thrift IDL.
---

## Introduction

Many business scenarios \(such as LLM's streaming response and large-scale data transmission\) require a Streaming API: first establish a stream between client and server instances, and then send and receive messages unidirectionally or bidirectionally based on this stream.

> This feature is introduced in Kitex `v0.9.0`, but there's some issues related to the tracing which is fixed in `v0.9.1`. You're recommended to use the new version, and this doc is based on the new version to avoid trivial descriptions.

### Glossary

#### PingPong API \(KitexThrift\)

Kitex's default mode of Thrift APIs.

- Only support Ping-Pong request/response \(no Streaming\).
- Thrift Payload may have prefixed [TTHeader](/docs/kitex/reference/transport_protocol_ttheader/)、[Framed](https://github.com/apache/thrift/blob/0.13.0/doc/specs/thrift-rpc.md#framed-vs-unframed-transport)，or their combination \(TTHeader + Framed + Payload\).

#### Unary API

> [Concept borrowed from GRPC](https://grpc.io/docs/what-is-grpc/core-concepts/#unary-rpc), specifically referring to Ping-Pong API on a stream.

In a stream-based \(such as HTTP2 stream\) Ping-Pong request, the client sends a Message, the server returns a Message, and then closes the stream.
**Since there will be performance losses, it's not recommended to use Unary APIs without special requirements. Please just use the KitexThrift API.**
If there's really a need, you can enable it with an annotation in your Thrift IDL.

#### Streaming API

There are 3 kinds of Streaming APIs \(referring to [grpc core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)\).

##### Server Streaming

The client sends a message, the server returns multiple messages, and then closes the stream.
It's suitable for LLM scenarios.

##### Client Streaming

The client sends multiple messages, the server returns one message, and then closes the stream.

##### Bidirectional Streaming

The sending and receiving of Client/Server are independent, which can be organized in arbitrary order.

## Streaming over HTTP2

This scheme is based on GRPC/HTTP2 implementation, replacing the encoding of Payload from Protobuf to Thrift.

### Getting Started

#### Preparation

Install Kitex >= v0.9.1 and Thriftgo >= v0.3.6 which support Thrift Streaming.

```bash
go install github.com/cloudwego/thriftgo@latest
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

#### Compose Thrift IDL

Kitex determines the Streaming type of a method through the `streaming.mode` annotation.

| Value         | Meaning                      | Extra Note                                                                                     |
| ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| bidirectional | Bidirectional streaming      | The sending and receiving of Client/Server are independent                                     |
| client        | Client Side Streaming        | The client sends multiple messages, the server returns one message                             |
| server        | Server Side Streaming        | The client sends a message, the server returns multiple messages                               |
| unary         | Unary over Streaming         | Client sends a Message, the Server returns a Message (Not recommended due to performance loss) |
| \(other\)     | Invalid, leading to an error |                                                                                                |

NOTE：

1. Streaming API should have exactly one request and one response, otherwise Kitex will report an error.
2. **Kitex supports both PingPong APIs (non-streaming) and Streaming APIs in the same Service**
   1. Kitex server will automatically detect the protocol and route requests
3. Unary over HTTP2 is not recommended due to performance loss; just use PingPong APIs
4. `streaming.mode` can appear at most once, otherwise kitex will report an error

[Example IDL](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/api.thrift) \(The following examples are based on this IDL\):

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

#### Scaffold Generation

For new projects, first initialize the project directory:

```bash
mkdir demo-project && cd demo-project

module=demo
go mod init $module
```

The use of Kitex is just the same as before, for example:

```bash
kitex -module $module -service demo-server api.thrift
```

Note: For existing projects, you also need to regenerate the code and update the kitex version in your `go.mod`.

Then run:

```bash
go mod tidy
```

#### Write business code

##### Create Stream Client \(for the caller side\)

NOTE:

- You need to create **StreamClient** for calling a Streaming API
- `streamclient.Option` \(not client.Option\) is used for creating a StreamClient
- `streamcall.Option` \(not callopt.Option\) is used for a Streaming API call

Example code:

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

NOTE：

1. The caller and callee should negotiate a way to finish the Stream, otherwise it may cause both parties to wait forever \(goroutine leak\).
2. The example shows full duplex mode \(Recv and Send are completely independent\).
   1. The processing logic can be adjusted according to business needs, for example \(half-duplex mode\), the server always receives a message and processes it before sending the result to the client.

###### Server Handler

NOTE:

1. Kitex will send the trailer frame \(which means the stream is closed\) after the method handler returns; there's no need for biz code to call stream.Close() manually.
2. Newly started goroutines should have panic-recover logic in business code
3. `io.EOF` returned by Recv call indicates that the client has finished sending

Example code: [kitex-examples:thrift_streaming/handler.go#L34](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L34)

###### Stream Client

Note:

1. Newly started goroutines should have panic-recover logic in business code
2. After the client finishes sending, it should promptly call stream.Close\(\) to inform the server.
3. A non-nil error \(including `io.EOF`\) returned by `Recv` indicates that the server has finished sending \(or encountered an error\)

   1. It's when Kitex records the `RPCFinish` event \(Tracer depends on this event\).
   2. If the client and server have another termination method, `streaming.FinishStream(stream, err)` should be called manually to record the RPCFinish event.

Example code: [kitex-examples:thrift_streaming/client/demo_client.go#L119](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L119)

##### Server Streaming API

###### Server Handler

Note: Kitex will send the trailer frame \(which means the stream is closed\) after the method handler returns; there's no need for biz code to call `stream.Close()` manually.

Example code: [kitex-examples:thrift_streaming/handler.go#L94](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L94)

###### Stream Client

Note: A non-nil error \(including `io.EOF`\) returned by `Recv` indicates that the server has finished sending \(or encountered an error\)

1. It's when Kitex records the `RPCFinish` event \(Tracer depends on this event\).
2. If the client and server have another termination method, `streaming.FinishStream(stream, err)` should be called manually to record the RPCFinish event.

Example code: [kitex-examples:thrift_streaming/client/demo_client.go#L185](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L185)

##### Client Streaming API

###### Server Handler

Note: `io.EOF` returned by Recv call indicates that the client has finished sending

Example code: [kitex-examples:thrift_streaming/handler.go#L82](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/handler.go#L82)

###### Stream Client

Example code: [kitex-examples:thrift_streaming/client/demo_client.go#L162](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/client/demo_client.go#L162)

#### Options

##### StreamClient Options

Kitex distinguishes between **Client** \(for KitexThrift PingPong API\) and **StreamClient** \(for Streaming API\) in design, and requires **StreamClient** to use another set of Options \(of different types\) to avoid users specifying unsupported Options for StreamClient.

NOTE:

- If a client/callopt Option does not have a corresponding streamclient/streamcall Option \(such as `WithRPCTimeout`\), it means that StreamClient does not support this capability.
- If you think StreamClient should support this capability, you can [submit an issue to Kitex](https://github.com/cloudwego/kitex/issues).

###### streamclient.Option

- Specified in `NewStreamClient`
- New Options:
  - `WithRecvMiddleware`、`WithRecvMiddlewareBuilder`: details in "Recv/Send Middleware"
  - `WithSendMiddleware`、`WithSendMiddlewareBuilder`: details in "Recv/Send Middleware"

Example code:

```go
import "github.com/cloudwego/kitex/client/streamclient"

var streamClient = testservice.MustNewStreamClient(
    "demo-server",                                  // Service Name
    streamclient.WithHostPorts("127.0.0.1:8888"),   // streamclient.Option...
)
```

###### streamcall.Option

- Specified when creating Stream.
- The priority is higher than the `streamclient.Option` with the same name \(if exists\).

Example code：

```go
import "github.com/cloudwego/kitex/client/callopt/streamcall"

stream, err := streamClient.Echo(
    context.Background(),
    streamcall.WithHostPort("127.0.0.1:8888"),
)
```

##### Server Options

> Due to the Server's support for automatic detection protocols, it can support both Streaming API and KitexThrift API, so it's impractical to use different Option types like StreamClient.

- Most [Server Option](/docs/kitex/tutorials/options/server_options/)\(s\) are applicable to Streaming APIs
  - **For uncertain options, validate before deploying to the production environment**
  - Options not applicable to Streaming APIs include:
    - `WithReadWriteTimeout`
    - `WithBoundHandler`
    - ...
- New options related to Recv/Send Middleware:
  - `WithRecvMiddleware`、`WithRecvMiddlewareBuilder`
  - `WithSendMiddleware`、`WithSendMiddlewareBuilder`
  - `WithCompatibleMiddlewareForUnary`
    - It's mainly for GRPC/Protobuf Streaming, to make the type of middleware parameters of Unary API requests the same as that of PingPong API requests.
    - It's specified by default for Thrift Streaming, but you're not recommended to use Unary API.

### Governance

#### Timeout

##### Connection Timeout

It can be specified with the following options:

- `streamclient.WithConnectTimeout`
- `streamcall.WithConnectTimeout` \(higher priority\)

##### RPC Timeout \(not supported\)

There is no corresponding option.
For the Streaming API, Kitex's Timeout Middleware will [do nothing but just call next](https://github.com/cloudwego/kitex/blob/v0.9.1/client/rpctimeout.go#L101).

##### Stream Timeout

To control the timeout for the whole stream, please create a context object with deadline by `context.WithTimeout` or `context.WithDeadline` , and create a stream with this context object.

- Kitex Client
  - A header `grpc-timeout` will be sent to the server
  - After deadline, Recv/Send will return an error `rpc error: code = 4 desc = context deadline exceeded`
- Kitex Server
  - The value in header `grpc-timeout` will be set as the deadline in the request context
  - After deadline, Recv/Send will return an error `rpc error: code = 4 desc = context deadline exceeded`

Example code:

```go
// inject deadline into context BEFORE creating a stream
ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()

stream, err := cli.Echo(ctx)
```

##### Recv/Send Timeout

Kitex provides a helper function `streaming.CallWithTimeout` for this.

###### Client

NOTE:

1. Create a context with `cancel` **BEFORE creating a Stream** \(e.g. by WithCancel or WithTimeout\)
2. Set the `cancel` func as the 2nd param for `streaming.CallWithTimeout`

3. Otherwise Send/Recv may block for a long timeout \(depending on the server side\) which may cause goroutine leak.

4. The semantic of `stream.Close()` on the client side is `CloseSend`, informing the server that there will be no new messages (the server `Recv` call returns `io.EOF`), and does not close the receiving end, so it cannot be used as the cancel method.

Example code:

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

`stream.Close()` can be used as cancel func (with a simple encapsulation).

Example code:

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

#### CircuitBreak

Only supports the error rate fuse when **creating a connection \(stream\)**.
No support for circuitbreaker on Recv/Send calls.

#### Retry \(Not Supported\)

Retry are not supported.

#### Fallback \(Not Supported\)

Streaming API has no fallback support.

#### LoadBalancer

- Load Balance is only supported when creating a Stream \(equivalent to creating a network connection\).
- Subsequent Send/Recv calls will only be with the opposite end of the Stream
  - It's the user's responsibility to deal with uneven load caused by Recv/Send on certain streams.
    - Take file transmission as an example, one stream for a 1KB file \(only one Send needed\) and one stream for a 1GB file \(\)

##### Consistent Hash

Note: Since the Request obtained in a client middleware is always nil, your `keyFunc` cannot directly read the request.

Workaround:

1. Before creating the Stream, calculate the hash value of your request and set it in ctx
2. Read the hash value in your `keyFunc` from ctx

Example code:

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

#### Server Limit \(QPS/Concurrency\)

- Support limiting when creating a stream.
- After creating a Stream, there are no restrictions on subsequent Recv/Send calls, which has to be implemented by the business itself.

### Middleware

#### Client/Server Middleware

##### Client Middleware

NOTE:

- Client middleware only covers the **process of "creating a stream"**
  - After creating the stream and returning to business code, all client middlewares are already executed
- The request parameter is always nil /(even for Server Streaming API requests/)
- The response parameter is always of type \*[streaming.Result](https://github.com/cloudwego/kitex/blob/v0.8.0/pkg/streaming/streaming.go#L67), containing the `Stream` finally returned to user code
  - If there's a need, you can replace the Stream object with your own implementation using the [decorator pattern](https://zh.wikipedia.org/wiki/%E4%BF%AE%E9%A5%B0%E6%A8%A1%E5%BC%8F)
- If the error returned is not nil, it means Kitex fails to create a stream
- **Client Middleware can NOT obtain the message for Recv and Send calls.**

###### Execution Flow Diagram

Note:

- Below shows the flow of Bidirectional Streaming APIs (and Client Streaming APIs are similar)
- But Server Streaming APIs are different: [Send and Close are called in kitex_gen \(generated code\)](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/kitex_gen/echo/testservice/testservice.go#L336), before returning to user code.

![image](/img/docs/streaming/kitex_client_execution_flow.png)

###### Request/Response types obtained

|                  |      request      |      response      |
| :--------------: | :---------------: | :----------------: |
|  Bidirectional   | interface{} = nil | \*streaming.Result |
| Client Streaming | interface{} = nil | \*streaming.Result |
| Server Streaming | interface{} = nil | \*streaming.Result |

Note:

1. Request message is also not available in client middleware for Server Streaming API requests. Please use Client Send Middleware instead.
2. For Thrift Streaming Unary APIs, it's just the same as PingPong APIs.

###### Identifying Streaming/Non-Streaming Requests

**Client** middlewares should rely on the type of `response` to determine whether it's a streaming request:

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

NOTE:

- The `next` method of Server Middleware covers the entire processing process of the server handler
- The request parameter is always of type \*[streaming.Args](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/streaming/streaming.go#L70), containing the Stream finally returned to user code
  - If there's a need, you can replace the Stream object with your own implementation using the [decorator pattern](https://zh.wikipedia.org/wiki/%E4%BF%AE%E9%A5%B0%E6%A8%A1%E5%BC%8F)
- The response parameter is always nil \(even for Client Streaming API requests\)
- If the error returned is not nil, it means some inner middleware or the handler fails.
- **For Streaming APIs \(not including Unary\), Server Middleware can NOT obtain the message processed by Recv and Send calls.**

###### Execution Flow Diagram

- Bidirectional Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_bidirectional.png)

- Server Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_server.png)

- Client Streaming API

![image](/img/docs/streaming/kitex_server_execution_flow_client.png)

###### Request/Response field types obtained

|                  |     request      |     response      |
| :--------------: | :--------------: | :---------------: |
|  Bidirectional   | \*streaming.Args | interface{} = nil |
| Client Streaming | \*streaming.Args | interface{} = nil |
| Server Streaming | \*streaming.Args | interface{} = nil |

Note:

1. The client request message is also not available in server middleware for Server Streaming API requests. Please use Server Recv Middleware instead.
2. For Thrift Streaming Unary APIs, it's just the same as PingPong APIs.

###### Identifying Streaming/Non-Streaming Requests

**Server** middlewares should rely on the type of `request` to determine whether it's a streaming request:

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

Note: for Thrift Streaming Unary APIs, it's just the same as PingPong APIs.

#### Recv/Send Middleware

Messages can be intercepted with Recv/Send Middleware.

![image](/img/docs/streaming/kitex_recvsend_middleware.png)

##### Recv Middleware

NOTE: in Recv Middleware, **`next` should be called before reading the message**

###### StreamClient

NOTE: for client, the message type for a `Recv` call should be the API's **response** type defined in IDL

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

NOTE: for server, the message type for a `Recv` call should be the API's **request** type defined in IDL

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

NOTE: for client, the message type for a `Send` call should be the API's **request** type defined in IDL

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

NOTE: for server, the message type for a `Send` call should be the API's **response** type defined in IDL

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

#### Sharing Data Between Client/Server and Recv/Send Middlewares

By injecting keys into the ctx used to create the stream, we can share data between middlewares.

Kitex provides a set of helper functions to inject a `sync.Map` for sharing data between middlewares:

- [contextmap.WithContextMap(ctx)](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/utils/contextmap/contextmap.go#L32C6-L32C20)
- [contextmap.GetContextMap(ctx)](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/utils/contextmap/contextmap.go#L37)

Note: Kitex often needs to read information from ctx internally \(say, RPCInfo\), and ctx is a linked list, **injecting a key means adding a list node, which may cause performance loss.** Therefore, Kitex does not inject this key by default.

##### Example code for Client

In Client Middleware, the stream has not been created before calling `next`, so you can inject the sync.Map into ctx and then call `next`, then the map can be obtained from `stream.Context()` in Recv/Send middleware for reading and writing.

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

##### Example code for Server

The server side is different from the client side.
Before entering a server middleware, the stream has already been created, so it's impossible to inject a key inside a server middleware.
However, it can be achieved in the following way:

- Specify a `MetaHandler` with `server.WithMetaHandler` Option
- This `MetaHandler` should implement the interface `StreamingMetaHandler`
- In the function `OnReadStream`, inject `sync.Map` into ctx, and return the new ctx object.

Kitex provides a customMetaHandler making it quite easy to add a key to the context before creating a stream. You only need to specify the following option when initializing a server:

```go
server.WithMetaHandler(remote.NewCustomMetaHandler(remote.WithOnReadStream(
    func(ctx context.Context) (context.Context, error) {
        return contextmap.WithContextMap(ctx), nil
    },
)))
```

Note:

1. Full example code in: [kitex-tests: TestCustomMetaHandler](https://github.com/cloudwego/kitex-tests/blob/main/thrift_streaming/thrift_test.go#L1090)
2. If you don't want to use the RC tag for now, you may implement your MetaHandler according to [customMetaHandler](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/remote/custom_meta_handler.go#L29)

### Metainfo

Please refer to the "Kitex gRPC Metadata" section in [CloudWeGo - Kitex - Metainfo](/docs/kitex/tutorials/advanced-feature/metainfo/#kitex-grpc-metadata).

NOTE

- metainfo
  - Keys with lowercase letters or hyphen will be dropped, e.g. "Hello", "HELLO-WORLD"
- metadata
  - **MUST** use this kitex forked pkg: **github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/metadata**
- header & trailer
  - Keys with capital letters will cause errors on the client side

### Observability

#### Basic Events: RPCStart & RPCFinish

- For Server/Bidirectional Streaming APIs: Kitex Client will not record the RPCFinish event until `Recv()` receives a non-nil error \(`io.EOF` or other errors\).
  - If you wish to finish stream early, please remember to manually call `streaming.FinishStream(stream, err)` to propagate the RPCFinish event.
- For Client Streaming APIs: Kitex Client will record the RPCFinish event at the end of the `CloseAndRecv()` call.

Kitex users can add customized Tracers to deal with those events in the `Finish()` method. Refer to [Kitex - Tracing - Custom Tracer](/docs/kitex/tutorials/observability/tracing/#customize-tracer) for more details.

#### Detailed Events: StreamSend & StreamRecv

If at least one Tracer implements the interface [rpcinfo.StreamEventReporter](https://github.com/cloudwego/kitex/blob/v0.9.1/pkg/rpcinfo/tracer.go#L31), Kitex will inject the corresponding Recv/Send middleware for to call the tracer's `ReportStreamEvent` after the execution of each Recv/Send call.
The message size of current Recv/Send can be obtained by (note: do not call it in another goroutine, otherwise you may get the size of some other call):

- `ri.Stats().LastSendSize()`
- `ri.Stats().LastRecvSize()`

You can find an example here: [kitex-tests: testTracer](https://github.com/cloudwego/kitex-tests/blob/96b97d00bc099eba8bea181decb4d4f9e77df1cb/thrift_streaming/thrift_tracing_test.go#L77).

### Generic \(Not implemented yet\)

> Planned, no fixed schedule yet.

### Attention

#### Send/Recv are actually operating on the local buffer

GRPC/HTTP2 is implemented with a "local buffer", where Send/Recv operations are performed.
Therefore you should be aware of:

1. "Send returns nil" only means the message is appended to the local buffer, which **DOES NOT** indicate the message is received by the opposite end;
2. The time consumed by Send/Recv operations differs significantly with the "Latency" of a Ping-Pong API:
   1. If the Recv call frequency at the opposite end is higher, then the local Send will usually return immediately \(the buffer is always free\).
   2. If the Recv call frequency of the opposite end is lower, the local Send may be blocked for some time \(waiting for the other end to consume and free up the buffer\).
   3. If there is message(s) available in the buffer, the Recv call will return immediately, otherwise you need to wait for the other end's Send.

#### Client/Server Middleware unable to get the Request/Response

It's BY DESIGN.
Although for Client Streaming/Server Streaming requests, it seems to have a Request/Response just like the PingPong API, the underlying implementation is completely different, and they cannot be read in Client/Server Middleware.
Please use Recv/Send Middleware to process messages on the stream.

#### RPCFinish: client for Server/Bidirectional API should call Recv until receiving a non-nil error

- For Server/Bidirectional Streaming APIs: Kitex Client will not record the RPCFinish event until `Recv()` receives a non-nil error \(`io.EOF` or other errors\).
  - If you wish to finish stream early, please remember to manually call `streaming.FinishStream(stream, err)` to propagate the RPCFinish event.
- For Client Streaming APIs: Kitex Client will record the RPCFinish event at the end of the `CloseAndRecv()` call.
- StreamRecv/StreamSend events are emitted realtime which do not rely on RPCFinish events.

#### BizStatusError: not directly visible in Client RecvMiddleware

Business exception \(BizStatusError\) is a custom business status code, which will not be considered an error internally by the framework and will be encapsulated inside rpcinfo.
Therefore, if there is a business exception, the error returned by next in Client RecvMiddleware will be nil.
The following code can be used to read the business exception:

```go
bizErr := rpcinfo.GetRPCInfo(stream.Context()).Invocation().BizStatusErr()
```

## Streaming over TTHeader（Planned）

> Expected to have much better performance than HTTP2

## FAQ

### Is Multi-Service supported \(One server, multi services\) ?

Yes.
Please refer to the CloudWeGo documentation: [Kitex - Single Server Multi Service](/docs/kitex/tutorials/advanced-feature/multi_service/).

### Is "Streaming over HTTP2" interoperable with other grpc implementations ?

No.
But if the grpc implementation has a generic interface, you can send thrift payload with a thrift encoder/decoder, which is equivalent.

Note: the "content-type" header sent by Kitex client is "application/grpc+thrift".

### Server Streaming API：How to end the stream prematurely at client side?

By injecting a cancel into the client request's ctx, the stream can be ended prematurely when needed:

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

Note:

- For Server Streaming API requests: before business code gets the stream returning by a client call, the sending stream is [already closed in the generated code](https://github.com/cloudwego/kitex-examples/blob/v0.3.1/thrift_streaming/kitex_gen/echo/testservice/testservice.go#L336); therefore, the client is unable to send new messages to the server and what it can do is to end the connection prematurely to inform the server
- Since `st.Recv()` does not receive a non-nil error, `streaming.FinishStream(st, err)` should be called manually to generate the stream's `RPCFinish` event.
- For Bidirectional Streaming APIs, this way is also applicable, but it's better to call the `st.Close()` manually or to send a previously negotiated message to the server. Don't forget to call `streaming.FinishStream` in either case.
