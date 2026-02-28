---
title: "StreamX 流元消息透传最佳实践"
date: 2025-01-10
weight: 3
keywords: ["流元消息透传最佳实践"]
description: ""
---

## 前言

消息透传总体用法与 [Metainfo](/zh/docs/kitex/tutorials/advanced-feature/metainfo/) 相似，区别在于每一个 stream 只有在**创建时才能透传元信息**，发送消息无法透传。

## 使用指南

### Client 透传元消息

```go
ctx = metainfo.WithPersistentValue(ctx, "k1", "v1")
ctx = metainfo.WithValue(ctx, "k2", "v2")

stream, err := cli.EchoClient(ctx)
```

> 如果使用 gRPC streaming，请确保 key 是大写，使用 _ 而不是 -，否则将被丢弃。TTHeader streaming 不做此要求。

### Server 接收元消息

```go
func (s *streamingService) EchoClient(ctx context.Context,
    stream echo.TestService_EchoClientServer) (err error) {
   
   v, ok := metainfo.GetPersistentValue(ctx, "k1")
   // v == "v1"
   v, ok = metainfo.GetValue(ctx, "k2")
   // v == "v2"
}
```

### Server 反向透传元消息

反向透传引入了一个新的概念，Header 和 Trailer ，任何完整数据流必定包含 Header(头包) 和 Trailer(尾包)，使用这两个帧来反向透传信息。

```go
import "github.com/cloudwego/kitex/pkg/streaming"

func (s *streamingService) EchoClient(ctx context.Context,
    stream echo.TestService_EchoClientServer) (err error) {
    
    // SetTrailer set 的 trailer 会在 server handler 结束后发送
    err := stream.SetTrailer(streaming.Trailer{"t1": "v1"})
    // 立刻发送 Header
    err = stream.SendHeader(streaming.Header{"h1": "v1"})
    if err != nil {
        return err
    }
    // 发送正常数据
    err = stream.Send(ctx, resp)
}
```

### Client 接收反向透传的元消息

```go
stream, err := cli.EchoClient(ctx)

// Header/Trailer 函数会一直阻塞到对端发送了 Header/Trailer 为止，或中间发生了错误
hd, err := stream.Header()
// hd["h1"] == "v1"
tl, err := stream.Trailer()
// tl["t1"] == "v1"
```

## FAQ

### 为什么反向透传接口与 PingPong 的反向透传不一致

因为流的概念与 PingPong 不同，流下，Header 是可以独立单独发送的，也就是说我 Server 可以在第一秒发送 Header， 过 10s 后发送 Data， 再过 1s 后发送 Trailer。

与此同时，客户端也可以选择是否要调用 `.Header()` 或 `.Trailer()` 来阻塞。

所以传统 ctx 的语义无法满足流的反向透传功能了。正向透传依然与原先的 PingPong 保持一致。
