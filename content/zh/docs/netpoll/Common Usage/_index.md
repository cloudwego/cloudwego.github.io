---
title: "常见用法"
linkTitle: "常见用法"
weight: 3
description: >
---

## 1. 如何配置 poller 的数量 ？

`NumLoops` 表示 [Netpoll][Netpoll] 创建的 `epoll` 的数量，默认已经根据P的数量自动调整(`runtime.GOMAXPROCS(0)`)，用户一般不需要关心。

但是如果你的服务有大量的 I/O，你可能需要如下配置：

```go
package main

import (
	"runtime"
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.SetNumLoops(runtime.GOMAXPROCS(0))
}
```

## 2. 如何配置 poller 的连接负载均衡 ？

当 Netpoll 中有多个 poller 时，服务进程中的连接会负载均衡到每个 poller。

现在支持以下策略：

1. Random
   - 新连接将分配给随机选择的轮询器。
2. RoundRobin
   - 新连接将按顺序分配给轮询器。

Netpoll 默认使用 `RoundRobin`，用户可以通过以下方式更改：

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.SetLoadBalance(netpoll.Random)

	// or
	netpoll.SetLoadBalance(netpoll.RoundRobin)
}
```

## 3. 如何配置 gopool ？

Netpoll 默认使用 gopool 作为 goroutine 池来优化 `栈扩张` 问题（RPC 服务常见问题）。

gopool 项目中已经详细解释了如何自定义配置，这里不再赘述。

当然，如果你的项目没有 `栈扩张` 问题，建议最好关闭 gopool，关闭方式如下：

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.DisableGopool()
}
```

## 4. 如何初始化新的连接 ？

Client 和 Server 端通过不同的方式初始化新连接。

1. 在 Server 端，定义了 `OnPrepare` 来初始化新链接，同时支持返回一个 `context`，可以传递给后续的业务处理并复用。`WithOnPrepare` 提供方法注册。当 Server 接收新连接时，会自动执行注册的 `OnPrepare` 方法来完成准备工作。示例如下：

```go
package main

import (
	"context"
	"github.com/cloudwego/netpoll"
)

func main() {
	// register OnPrepare
	var onPrepare netpoll.OnPrepare = prepare
	evl, _ := netpoll.NewEventLoop(handler, netpoll.WithOnPrepare(onPrepare))
	...
}

func prepare(connection netpoll.Connection) (ctx context.Context) {
	... prepare connection ...
	return
}
```

2. 在 Client 端，连接初始化需要由用户自行完成。 一般来说，`Dialer` 创建的新连接是可以由用户自行控制的，这与 Server 端被动接收连接不同。因此，用户不需要依赖触发器，可以自行初始化，如下所示：

```go
package main

import (
	"context"
	"github.com/cloudwego/netpoll"
)

func main() {
	conn, err := netpoll.DialConnection(network, address, timeout)
	if err != nil {
		panic("dial netpoll connection failed")
	}
	... prepare here directly ...
	prepare(conn)
	...
}

func prepare(connection netpoll.Connection) (ctx context.Context) {
	... prepare connection ...
	return
}
```

## 5. 如何配置连接超时 ？

Netpoll 现在支持两种类型的超时配置：

1. 读超时（`ReadTimeout`）
   - 为了保持与 `net.Conn` 相同的操作风格，`Connection.Reader` 也被设计为阻塞读取。 所以提供了读取超时（`ReadTimeout`）。
   - 读超时（`ReadTimeout`）没有默认值（默认无限等待），可以通过 `Connection` 或 `EventLoop.Option` 进行配置，例如：

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	var conn netpoll.Connection

	// 1. setting by Connection
	conn.SetReadTimeout(timeout)

	// or

	// 2. setting with Option
	netpoll.NewEventLoop(handler, netpoll.WithReadTimeout(timeout))
	...
}
```

2. 空闲超时（`IdleTimeout`）
   - 空闲超时（`IdleTimeout`）利用 `TCP KeepAlive` 机制来踢出死连接并减少维护开销。使用 Netpoll 时，一般不需要频繁创建和关闭连接，所以通常来说，空闲连接影响不大。当连接长时间处于非活动状态时，为了防止出现假死、对端挂起、异常断开等造成的死连接，在空闲超时（`IdleTimeout`）后，netpoll 会主动关闭连接。
   - 空闲超时（`IdleTimeout`）的默认配置为 `10min`，可以通过 `Connection` API 或 `EventLoop.Option` 进行配置，例如：

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	var conn netpoll.Connection

	// 1. setting by Connection
	conn.SetIdleTimeout(timeout)

	// or

	// 2. setting with Option
	netpoll.NewEventLoop(handler, netpoll.WithIdleTimeout(timeout))
	...
}
```

## 6. 如何配置连接的读事件回调 ？

`OnRequest` 是指连接上发生读事件时 Netpoll 触发的回调。在 Server 端，在创建 `EventLoop` 时，可以注册一个`OnRequest`，在每次连接数据到达时触发，进行业务处理。Client端默认没有 `OnRequest`，需要时可以通过 API 设置。例如：

```go
package main

import (
	"context"
	"github.com/cloudwego/netpoll"
)

func main() {
	var onRequest netpoll.OnRequest = handler

	// 1. on server side
	evl, _ := netpoll.NewEventLoop(onRequest, opts...)
	...

	// 2. on client side
	conn, _ := netpoll.DialConnection(network, address, timeout)
	conn.SetOnRequest(handler)
	...
}

func handler(ctx context.Context, connection netpoll.Connection) (err error) {
	... handling ...
	return nil
}
```

## 7. 如何配置连接的关闭回调 ？

`CloseCallback` 是指连接关闭时 Netpoll 触发的回调，用于在连接关闭后进行额外的处理。
Netpoll 能够感知连接状态。当连接被对端关闭或被自己清理时，会主动触发 `CloseCallback`，而不是由下一次调用 `Read` 或 `Write` 时返回错误（`net.Conn` 的方式）。
`Connection` 提供了添加 `CloseCallback` 的 API，已经添加的回调无法删除，支持多个回调。

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	var conn netpoll.Connection

	// add close callback
	var cb netpoll.CloseCallback = callback
	conn.AddCloseCallback(cb)
	...
}

func callback(connection netpoll.Connection) error {
	return nil
}
```
