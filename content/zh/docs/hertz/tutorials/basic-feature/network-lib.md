---
title: "网络库"
date: 2022-05-20
weight: 4
description: >

---

Hertz 默认集成了 Netpoll 和 Golang 原生网络库两个网络库，用户可以根据自己的场景选择合适的网络库以达到最佳性能。

## 使用方式

对于 Server 来说，默认使用 netpoll，可以通过配置项进行更改：

>注意：netpoll 目前不支持 Windows，Windows 会通过条件编译将网络库自动切换为 go net。

```go
server.New(server.WithTransport(standard.NewTransporter))
server.New(server.WithTransport(netpoll.NewTransporter))
```

对于 Client 来说，可以通过配置项进行更改：

```go
client.NewClient(client.WithDialer(standard.NewDialer()))
client.NewClient(client.WithDialer(netpoll.NewDialer()))
```

## 网络库选择

1. 如果有启动 TLS Server 的需求，请使用 `go net` 网络库。`netpoll` 正在实现对 TLS 的支持。
2. 由于网络库触发模式的不同：`go net` 为 ET 模型，`netpoll` 为 LT 模型，使得两个网络库的适用场景有一些不同。
在 ET 模型下，由框架处理 Read / Write 事件；在 LT 模型下，由网络库处理 Read / Write 事件。
使得在小包场景下，由于更优的调度策略使得 LT 性能更好；在大包场景下，由于读 / 写不受框架层控制，使得大量数据被读入内存而不能及时处理，可能会造成内存压力。

- 在较大 request size 下（request size > 1M），推荐使用 go net 网络库加流式。
- 在其他场景下，推荐使用 netpoll 网络库，会获得极致的性能。
