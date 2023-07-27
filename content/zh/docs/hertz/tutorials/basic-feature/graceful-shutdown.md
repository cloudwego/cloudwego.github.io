---
title: "优雅退出"
date: 2022-05-23
weight: 11
description: >

---

Hertz 支持优雅退出，优雅退出过程如下：

1. 设置 `engine` 状态为 `closed`
2. 顺序非阻塞触发回调函数 `[]OnShutDown`（与标准包 net/http 一致），`Select` 等待回调函数执行完成或者超时返回
3. `Select` 等待业务协程退出：
   1. 对于 netpoll 网络库，开启默认 1s（netpoll 中设置，暂时不可更改）的 `ticker`，定时查看 `active conn`（业务 handle 退出且连接不处于阻塞读状态）是否为 0；对于 go net 网络库，则关闭监听，不对连接做处理。
   2. 等待超时时间为 `ExitWaitTime` 的 context 触发，默认 5s
4. 注册中心注销对应服务
5. 关闭网络库的信号监听
6. 对处于关闭过程中的请求回包统一带上 `Connection:Close header`

如需修改等待超时时间，可通过 `server.WithExitWaitTime()` 进行配置。

如需注册退出 `hook` 函数，可通过获取到 `Engine` 后进行注册:

```go
h.Engine.OnShutdown = append(h.Engine.OnShutdown, shutDownFunc)
```

Hertz 使用 `waitSignal` 函数作为信号处理的默认实现方式，处理如下:

- 当接收到 `SIGTERM` 系统信号时触发立即退出。
- 当接收到 `SIGHUP|SIGINT` 系统信号时触发优雅退出。

当信号处理的默认实现方式无法满足需求时，可通过 `SetCustomSignalWaiter` 来自定义信号处理方式。

```go
package main

import (
	"github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
	h := server.New()
	h.SetCustomSignalWaiter(func(err chan error) error {
		return nil
	})
	...
}

```

当自定义信号处理函数返回 `error` 时 Hertz 会立即退出，其他情况下则会优雅退出。
