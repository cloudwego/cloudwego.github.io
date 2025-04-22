---
title: "StreamX Middleware"
date: 2025-01-13
weight: 2
keywords: ["Stream Middleware"]
description: ""
---

## Middleware Type

### Stream Middleware

**Trigger timing**: Called when stream is created

#### Type definition
```go
// client: github.com/cloudwego/kitex/pkg/endpoint/cep
type StreamEndpoint func(ctx context.Context) (stream streaming.ClientStream, err error)
type StreamMiddleware func(next StreamEndpoint) StreamEndpoint

// server: github.com/cloudwego/kitex/pkg/endpoint/sep
type StreamEndpoint func(ctx context.Context, stream streaming.ServerStream) (err error)
type StreamMiddleware func(next StreamEndpoint) StreamEndpoint
```

**Parameter description**:

- ```stream``` is the stream object created for a single RPC
- After the ```next``` function is executed in the client middleware, the stream is created
- After the ```next``` function is executed in the Server middleware, the server handler completes processing.

### Stream Recv/Send Middleware

**Trigger timing** : Called when streaming messages

#### Type definition

```go
// client: github.com/cloudwego/kitex/pkg/endpoint/cep
type StreamRecvEndpoint func(ctx context.Context, stream streaming.ClientStream, message interface{}) (err error)
type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint

// server: github.com/cloudwego/kitex/pkg/endpoint/sep
type StreamRecvEndpoint func(ctx context.Context, stream streaming.ServerStream, message interface{}) (err error)
type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint

// similar to send middleware ...
```

**Parameter description**:

- Directly obtain the current stream object
- Res/req both represent real requests and responses.
- Behavior before and after calling the Next function:

| Middleware type      | Before calling Next                                                                                                   | After calling Next                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| StreamRecvMiddleware | - The data is not really collected, just called the stream.Recv () function.<br><br>- Res parameter is empty          | - Data received or encountered an error<br><br>- The res parameter has a real value                |
| StreamSendMiddleware | - The data was not actually sent, just called the stream.Send () function<br><br>- The req parameter is a real request | - Data transmission completed or encountered an error<br><br>- The req parameter is a real request |

### Unary Middlware

For all non-streaming interfaces, we additionally provide ```UnaryMiddleware``` for injecting middleware that only works on all unary methods.

It is identical to the ```WithMiddleware``` natively supported by kitex, with the difference that the latter can also work on streaming methods.
```go
type UnaryEndpoint Endpoint
type UnaryMiddleware func(next UnaryEndpoint) UnaryEndpoint

// client.WithUnaryOptions(client.WithUnaryMiddleware(mw))
// server.WithUnaryOptions(server.WithUnaryMiddleware(mw))
```

## Inject Middlewares

### Inject client-side middlewares

```go
import "github.com/cloudwego/client"

cli, err := xxx.NewClient(
    "a.b.c",
    client.WithStreamOptions(
        client.WithStreamMiddleware(func (next cep.StreamEndpoint) cep.StreamEndpoint {
            return func (ctx context.Context) (stream streaming.ClientStream, err error) {
                ri := rpcinfo.GetRPCInfo(stream.Context())
                println("create stream, method: ", ri.Invocation().MethodName())
                return next(ctx)
            }
        }),
        client.WithStreamSendMiddleware(func (next cep.StreamSendEndpoint) cep.StreamSendEndpoint {
            return func (ctx context.Context, stream streaming.ClientStream, message interface{}) (err error) {
                ri := rpcinfo.GetRPCInfo(stream.Context())
                println("stream send message, method: ", ri.Invocation().MethodName())
                return next(ctx, stream, message)
            }
        }),
        client.WithStreamRecvMiddleware(func (next cep.StreamRecvEndpoint) cep.StreamRecvEndpoint {
            return func (ctx context.Context, stream streaming.ClientStream, message interface{}) (err error) {
                ri := rpcinfo.GetRPCInfo(stream.Context())
                println("stream recv message, method: ", ri.Invocation().MethodName())
                return next(ctx, stream, message)
            }
        }),
    ),
)
```

### Inject server-side middlewares

```go
import "github.com/cloudwego/server"

svr, err := xxx.NewServer(
    //...
    server.WithStreamOptions(
        server.WithStreamMiddleware(func(next sep.StreamEndpoint) sep.StreamEndpoint {
            return func(ctx context.Context, st streaming.ServerStream) (err error) {
                ri := rpcinfo.GetRPCInfo(ctx)
                println("create stream, method: ", ri.Invocation().MethodName())
                return next(ctx, st)
            }
        }),
        server.WithStreamRecvMiddleware(func(next sep.StreamRecvEndpoint) sep.StreamRecvEndpoint {
            return func(ctx context.Context, stream streaming.ServerStream, message interface{}) (err error) {
                ri := rpcinfo.GetRPCInfo(ctx)
                println("stream recv message, method: ", ri.Invocation().MethodName())
                return next(ctx, stream, message)
            }
        }), 
        server.WithStreamSendMiddleware(func(next sep.StreamSendEndpoint) sep.StreamSendEndpoint {
            return func(ctx context.Context, stream streaming.ServerStream, message interface{}) (err error) {
                ri := rpcinfo.GetRPCInfo(ctx)
                println("stream send message, method: ", ri.Invocation().MethodName())
                return next(ctx, stream, message)
            }
        }), 
    ),
)
```
