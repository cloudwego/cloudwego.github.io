---
title: "优雅退出"
date: 2022-05-23
weight: 8
description: >

---

Hertz 支持优雅退出，优雅退出过程如下：

1. 设置 `engine` 状态为 `closed`
2. 顺序非阻塞触发回调函数 `[]OnShutDown`（与标准包 net/http 一致）
3. 关闭网络库的信号监听
4. `Select` 等待业务协程退出：
   1. 对于 netpoll 网络库，开启默认1s（netpoll 中设置，暂时不可更改）的 `ticker`，定时查看 `active conn`（业务 handle 退出且连接不处于阻塞读状态）是否为0；对于 go net 网络库，则关闭监听，不对连接做处理。
   2. 等待超时时间为 `ExitWaitTime` 的 context 触发，默认 5s
5. 对处于关闭过程中的请求回包统一带上 `Connection:Close header`

如需修改等待超时时间，可通过 `server.WithExitWaitTime()` 进行配置。

如需注册退出 `hook` 函数，可通过获取到 `Engine` 后进行注册:

```go
h.Engine.OnShutdown = append(h.Engine.OnShutdown, shutDownFunc)
```
