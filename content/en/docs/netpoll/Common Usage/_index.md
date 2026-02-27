---
title: "Common Usage"
linkTitle: "Common Usage"
weight: 3
description: >
---

## 1. How to configure the number of pollers ?

`NumLoops` represents the number of `epoll` created by [Netpoll][Netpoll], which has been automatically adjusted
according to the number of P (`runtime.GOMAXPROCS(0)`) by default, and users generally don't need to care.

But if your service has heavy I/O, you may need the following configuration:

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

## 2. How to configure poller's connection loadbalance ?

When there are multiple pollers in Netpoll, the connections in the service process will be loadbalanced to
each poller.

The following strategies are supported now:

1. Random
   - The new connection will be assigned to a randomly picked poller.
2. RoundRobin
   - The new connection will be assigned to the poller in order.

Netpoll uses `RoundRobin` by default, and users can change it in the following ways:

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

## 3. How to configure gopool ?

Netpoll uses gopool as the goroutine pool by default to optimize the `stack growth` problem that
generally occurs in RPC services.

In the project gopool, it explains how to change its configuration, so won't repeat it here.

Of course, if your project does not have a `stack growth` problem, it is best to close gopool as follows:

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.DisableGopool()
}
```

## 4. How to prepare a new connection ?

There are different ways to prepare a new connection on the client and server.

1. On the server side, `OnPrepare` is defined to prepare for the new connection, and it also supports returning
   a `context`, which can be reused in subsequent business processing.
   `WithOnPrepare` provides this registration. When the server accepts a new connection, it will automatically execute
   the registered `OnPrepare` function to complete the preparation work. The example is as follows:

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

2. On the client side, the connection preparation needs to be completed by the user. Generally speaking, the connection
   created by `Dialer` can be controlled by the user, which is different from passively accepting the connection on the
   server side. Therefore, the user not relying on the trigger, just prepare a new connection like this:

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

## 5. How to configure connection timeout ?

Netpoll now supports two timeout configurations:

1. `Read Timeout`
   - In order to maintain the same operating style as `net.Conn`, `Connection.Reader` is also designed to block
     reading. So provide `Read Timeout`.
   - `Read Timeout` has no default value(wait infinitely), it can be configured via `Connection` or `EventLoop.Option`,
     for example:

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

2. `Idle Timeout`
   - `Idle Timeout` utilizes the `TCP KeepAlive` mechanism to kick out dead connections and reduce maintenance
     overhead. When using Netpoll, there is generally no need to create and close connections frequently,
     and idle connections have little effect. When the connection is inactive for a long time, in order to prevent dead
     connection caused by suspended animation, hang of the opposite end, abnormal disconnection, etc., the connection
     will be actively closed after the `Idle Timeout`.
   - The default minimum value of `Idle Timeout` is `10min`, which can be configured through `Connection` API
     or `EventLoop.Option`, for example:

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

## 6. How to configure connection read event callback ?

`OnRequest` refers to the callback triggered by Netpoll when a read event occurs on the connection. On the
Server side, when creating the `EventLoop`, you can register an `OnRequest`, which will be triggered when each
connection data arrives and perform business processing. On the Client side, there is no `OnRequest` by default, and it
can be set via API when needed. E.g:

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

## 7. How to configure the connection close callback ?

`CloseCallback` refers to the callback triggered by Netpoll when the connection is closed, which is used to
perform additional processing after the connection is closed.
Netpoll is able to perceive the connection status. When the connection is closed by peer or cleaned up by
self, it will actively trigger `CloseCallback` instead of returning an error on the next `Read` or `Write`(the way
of `net.Conn`).
`Connection` provides API for adding `CloseCallback`, callbacks that have been added cannot be removed, and multiple
callbacks are supported.

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
