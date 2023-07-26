---
title: "流式处理"
date: 2022-05-26
weight: 9
description: >

---

Hertz 同时支持 Server 和 Client 的流式处理，提高框架的可用性。

## Server

开启流式:

```go
import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/network/standard"
    )

func main() {
    h := server.New(
        server.WithStreamBody(),
        server.WithTransport(standard.NewTransporter),
    )
    ...
}
```

由于 netpoll 和 go net 触发模式不同，netpoll 流式为“伪”流式（由于 LT 触发，会由网络库将数据读取到网络库的 buffer 中），在大包的场景下（如：上传文件等）可能会有内存问题，推荐使用 go net，使用方式如上。

## Client

开启流式:

```go
c, err := client.NewClient(client.WithResponseBodyStream(true))
```

由于 client 有复用连接的问题，但是如果使用了流式，那连接就会交由用户处理 ( `resp.BodyStream()` 底层是对 connection 的封装)，这个时候对连接的管理会有一些不同：

1. 如果用户不关闭连接，连接最终会被 GC 关掉，不会造成连接泄漏。但是，由于关闭连接需要等待 2RTT，在高并发情况下可能会出现 fd 被打满导致无法新建连接的情况。
2. 用户可以调用相关接口回收连接，回收后，该连接会放入连接池中复用，资源使用率更好，性能更高。以下几种方式都会回收连接，注意回收只能回收一次。
   1. 显示调用 `protocol.ReleaseResponse(), resp.Reset(), resp.ResetBody()`
   2. 非显示调用：server 侧也会有回收 resp 的逻辑。如果将 client 的 response 赋值给 server 或者直接把 server 的 response 传递给 client 的情况下（如：client 作为反向代理）就不需要显示调用回收的方法了。
