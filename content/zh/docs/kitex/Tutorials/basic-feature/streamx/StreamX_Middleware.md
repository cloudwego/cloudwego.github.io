---
title: "StreamX 流中间件最佳实践"
date: 2025-01-10
weight: 2
keywords: ["流中间件最佳实践"]
description: ""
---

## 中间件类型

### Stream 中间件

**触发时机**：每次创建流时

#### 类型定义
```go
// client: github.com/cloudwego/kitex/pkg/endpoint/cep
type StreamEndpoint func(ctx context.Context) (stream streaming.ClientStream, err error)
type StreamMiddleware func(next StreamEndpoint) StreamEndpoint

// server: github.com/cloudwego/kitex/pkg/endpoint/sep
type StreamEndpoint func(ctx context.Context, stream streaming.ServerStream) (err error)
type StreamMiddleware func(next StreamEndpoint) StreamEndpoint
```

**参数说明**：

- ```stream``` 为单次 RPC 创建的流对象
- Client middleware 内 ```next``` 函数执行后，stream 即完成创建
- Server middleware 内 ```next``` 函数执行后，server handler 即完成处理

### Stream Recv/Send 中间件

**触发时机**：流收发消息时调用

#### 类型定义

```go
// client: github.com/cloudwego/kitex/pkg/endpoint/cep
type StreamRecvEndpoint func(ctx context.Context, stream streaming.ClientStream, message interface{}) (err error)
type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint

// server: github.com/cloudwego/kitex/pkg/endpoint/sep
type StreamRecvEndpoint func(ctx context.Context, stream streaming.ServerStream, message interface{}) (err error)
type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint

// Send middleware 和 Recv middleware 定义类似...
```

**参数说明**：

- stream 直接获取当前的流对象
- res/req 均代表真实请求和响应。
- Next 函数调用前后的行为：

| 中间件类型           | Next 调用前                                                             | Next 调用后                                          |
| -------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| StreamRecvMiddleware | - 数据未真正收，刚调用 stream.Recv() 函数<br><br>- res 参数为空         | - 数据已收到或遇到错误<br><br>- res 参数有真实值     |
| StreamSendMiddleware | - 数据未真正发送，刚调用 stream.Send() 函数<br><br>- req 参数为真实请求 | - 数据发送完成或遇到错误<br><br>- req 参数为真实请求 |

### Unary 中间件

对所有非流式接口，我们额外提供了 ```UnaryMiddleware``` 用于注入仅对所有 unary 方法生效的中间件，该中间件与 kitex 原生支持的 ```WithMiddleware``` 的方法签名完全一致，区别在于后者可以同时对 streaming 方法生效。
```go
type UnaryEndpoint Endpoint
type UnaryMiddleware func(next UnaryEndpoint) UnaryEndpoint

// client.WithUnaryOptions(client.WithUnaryMiddleware(mw))
// server.WithUnaryOptions(server.WithUnaryMiddleware(mw))
```

## 注入中间件

### 注入 client 侧的中间件

```go
import "github.com/cloudwego/kitex/client"

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

### 注入 server 侧的中间件

```go
import "github.com/cloudwego/kitex/server"

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
