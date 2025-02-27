---
title: "StreamX 流编程常见问题 QA"
date: 2025-01-13
weight: 5
keywords: ["流编程常见问题 QA"]
description: ""
---

## 编程错误导致的问题

### Client 忘记调用 CloseSend

kitex 会在检查用户不再持有 stream 对象时，主动调用一次 CloseSend，避免本端和对端出现流泄漏的情况。

注意，由于检查依赖 GC 时机，所以此时流的延迟监控会显著变大。

### Client 持久化 stream 导致 stream 泄漏

如果用户长期持有 stream 对象，而且不主动调用 stream.CloseSend ，框架会理所应当认为该 stream 还需要被使用，进而不会关闭 stream 以及相关 gorotuine。

### Server 调用 Recv 卡死

如果 client 一直保持一个流活跃，并且一直不调用 CloseSend，stream.Recv() 函数便不会返回。

如果 Server 想要避免 client 用户的错误使用姿势导致自己的问题，可以在 Recv(ctx) 的 ctx 中，定制自己需要的 超时逻辑。例如：

```go
ctx, cancel := context.WithTimeout(ctx, time.Second)
defer cancel()
stream.Recv(ctx)
```

### Server handler 不退出

Server handler 函数退出才标识流的结束，如果用户在这个函数中永远不退出，流也就永远无法结束。
