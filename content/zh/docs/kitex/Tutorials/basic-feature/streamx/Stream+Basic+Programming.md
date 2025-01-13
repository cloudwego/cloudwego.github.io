---
title: "StreamX 基础流编程"
date: 2025-01-10
weight: 1
keywords: ["基础流编程"]
description: ""
---

## 选择协议

当前支持：

- **TTHeader Streaming**

  - 传输协议：TTHeader
  - IDL 定义语言 与 序列化协议：Thrift
- **gRPC Streaming**:~~~~  (计划实现)

  - ~~传输协议：gRPC~~
  - ~~IDL 定义语言 与 序列化协议：Protobuf 编码~~

此处选定的协议只影响从 IDL 生成代码，无论哪种协议，以下用法均一致。

## 使用方法

### 生成代码

#### 定义 IDL

##### Thrift

文件 `echo.thrift`:

```go
namespace go echo

service TestService {
    Response PingPong(1: Request req) // PingPong 非流式接口
    
    Response Echo (1: Request req) (streaming.mode="bidirectional"),
    Response EchoClient (1: Request req) (streaming.mode="client"),
    Response EchoServer (1: Request req) (streaming.mode="server"),
}
```

#### 生成代码

为保持与旧流式生成代码的兼容，命令行需加上 `-streamx` flag。

```
kitex -streamx -module <go module> -service P.S.M echo.thrift
```

##### 初始化

#### 创建 Client

```go
// 生成代码目录，streamserver 为 IDL 定义的 service name
import ".../kitex_gen/echo/testservice"
import "github.com/cloudwego/kitex/client/streamxclient"

cli, err := testservice.NewClient(
    "a.b.c",
    streamxclient.WithStreamRecvMiddleware(...),
    streamxclient.WithStreamSendMiddleware(...),
)
```

#### 创建 Server

```go
import ".../kitex_gen/echo/streamserver"
import "github.com/cloudwego/kitex/server/streamxserver"

svr := streamserver.NewServer(
    new(serviceImpl),
    streamxserver.WithStreamRecvMiddleware(...),
    streamxserver.WithStreamSendMiddleware(...),
)
```

### Client Streaming

#### 使用场景

Client 需要发送多份数据给 Server 端，Server 端可以发送一条消息给 Client:

```go
------------------- [Client Streaming] -------------------
--------------- (stream Req) returns (Res) ---------------
client.Send(req)         === req ==>       server.Recv(req)
                             ...
client.Send(req)         === req ==>       server.Recv(req)

client.CloseSend()       === EOF ==>       server.Recv(EOF)
client.Recv(res)         <== res ===       server.SendAndClose(res)
** OR
client.CloseAndRecv(res) === EOF ==>       server.Recv(EOF)
                         <== res ===       server.SendAndClose(res)
```

#### Client 用法

- [**必须**]: client 必须调用 CloseAndRecv() 或者 (CloseSend + Recv)方法，告知 Server 不再有新数据发送。

```go
ctx, cs, err := cli.ClientStream(ctx)
for i := 0; i < 3; i++ {
    err = cs.Send(ctx, req)
}
res, err = cs.CloseAndRecv(ctx)
```

#### Server 用法

- [**必须**]: server 必须在 handler 结束时返回一个 Response，告知 Client 最终结果。

```go

func (si *serviceImpl) ClientStream(
    ctx context.Context, stream streamx.ClientStreamingServer[Request, Response]
) (res *Response, err error) {
    for {
       req, err := stream.Recv(ctx)
       if err == io.EOF {
           res := new(Response)
           return res, nil
       }
       if err != nil {
          return nil, err
       }
    }
}
```

### Server Streaming

#### 使用场景

典型场景：ChatGPT 类型业务

Client 发送一个请求给 Server，Server 发送多个返回给 Client:

```go
------------------- [Server Streaming] -------------------
---------- (Request) returns (stream Response) ----------
client.Send(req)   === req ==>   server.Recv(req)
client.Recv(res)   <== res ===   server.Send(req)
                       ...
client.Recv(res)   <== res ===   server.Send(req)
client.Recv(EOF)   <== EOF ===   server handler return
```

#### Client 用法

- [**必须**]: client 必须判断 io.EOF 错误，并结束循环

```go
ctx, ss, err := cli.ServerStream(ctx, req)
for {
    res, err := ss.Recv(ctx)
    if errors.Is(err, io.EOF) {
       break
    }
}
```

#### Server 用法

```go
func (si *serviceImpl) ServerStream(ctx context.Context, req *Request, stream streamx.ServerStreamingServer[Response]) error {
    for i := 0; i < 3; i++ {
       err := stream.Send(ctx, resp)
       if err != nil {
          return err
       }
    }
    return nil
}
```

### Bidirectional Streaming

#### 使用场景

Client 与 Server 可能需要或者未来有可能需要发送多条消息：

```go
----------- [Bidirectional Streaming] -----------
--- (stream Request) returns (stream Response) ---
* goroutine 1 *
client.Send(req)   === req ==>   server.Recv(req)
                       ...
client.Send(req)   === req ==>   server.Recv(req)
client.CloseSend() === EOF ==>   server.Recv(EOF)

* goroutine 2 *
client.Recv(res)   <== res ===   server.Send(req)
                       ...
client.Recv(res)   <== res ===   server.Send(req)
client.Recv(EOF)   <== EOF ===   server handler return
```

#### Client 用法

- [**必须**]: client 必须在发送结束后调用 CloseSend
- [**必须**]: client 必须在 Recv 时，判断 io.EOF 并结束循环

```go
ctx, bs, err := cli.BidiStream(ctx)
var wg sync.WaitGroup
wg.Add(2)
go func() {
    defer wg.Done()
    for i := 0; i < round; i++ {
       err := bs.Send(ctx, req)
    }
    err = bs.CloseSend(ctx)
}()
go func() {
    defer wg.Done()
    for {
       res, err := bs.Recv(ctx)
       if errors.Is(err, io.EOF) {
          break
       }
    }
}()
wg.Wait()
```

#### Server 用法

- [**必须**]: server 必须在 Recv 时，判断 io.EOF 并结束循环

```go
func (si *serviceImpl) BidiStream(ctx context.Context, stream streamx.BidiStreamingServer[Request, Response]) error {
    for {
       req, err := stream.Recv(ctx)
       if err == io.EOF {
          return nil
       }
       if err != nil {
          return err
       }
       err = stream.Send(ctx, resp)
       if err != nil {
          return err
       }
    }
}
```
