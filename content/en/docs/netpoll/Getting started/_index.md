---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
---

> This tutorial gets you started with [Netpoll][Netpoll] through some simple [examples][Examples], includes how to
> use [Server](#1-use-server), [Client](#2-use-dialer) and [nocopy APIs](#3-use-nocopy-api).

## 1. Use Server

[Here][server-example] is a simple server demo, we will explain how it is constructed next.

### 1.1 Create Listener

First we need to get a `Listener`, it can be `net.Listener` or `netpoll.Listener`, which is no difference for server
usage. Create a `Listener` as shown below:

```go
package main

import "net"

func main() {
	listener, err := net.Listen(network, address)
	if err != nil {
		panic("create net listener failed")
	}
	...
}
```

or

```go
package main

import "github.com/cloudwego/netpoll"

func main() {
	listener, err := netpoll.CreateListener(network, address)
	if err != nil {
		panic("create netpoll listener failed")
	}
	...
}
```

### 1.2 New EventLoop

`EventLoop` is an event-driven scheduler, a real NIO Server, responsible for connection management, event scheduling,
etc.

params:

- `OnRequest` and `OnConnect` are interface that users should implement by themselves to process business logic. [Code Comment][eventloop.go] describes their behavior in detail.
- `Option` is used to customize the configuration when creating `EventLoop`, and the following example shows its usage.
  For more details, please refer to [options][netpoll_options.go].

The creation process is as follows:

```go
package main

import (
	"time"
	"github.com/cloudwego/netpoll"
)

var eventLoop netpoll.EventLoop

func main() {
	...
	eventLoop, _ := netpoll.NewEventLoop(
		handle,
		netpoll.WithOnPrepare(prepare),
		netpoll.WithOnConnect(connect),
		netpoll.WithReadTimeout(time.Second),
	)
	...
}
```

### 1.3 Run Server

`EventLoop` provides services by binding `Listener`, as shown below.
`Serve` function will block until an error occurs, such as a panic or the user actively calls `Shutdown`.

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

var eventLoop netpoll.EventLoop

func main() {
	...
	// start listen loop ...
	eventLoop.Serve(listener)
}
```

### 1.4 Shutdown Server

`EventLoop` provides the `Shutdown` function, which is used to stop the server gracefully. The usage is as follows.

```go
package main

import (
	"context"
	"time"
	"github.com/cloudwego/netpoll"
)

var eventLoop netpoll.EventLoop

func main() {
	// stop server ...
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	eventLoop.Shutdown(ctx)
}
```

## 2. Use Dialer

[Netpoll][Netpoll] also has the ability to be used on the Client side. It provides `Dialer`, similar to `net.Dialer`.
Again, [here][client-example] is a simple client demo, and then we introduce it in detail.

### 2.1 The Fast Way

Similar to [Net][net], [Netpoll][Netpoll] provides several public functions for directly dialing a connection. such as:

```go
DialConnection(network, address string, timeout time.Duration) (connection Connection, err error)

DialTCP(ctx context.Context, network string, laddr, raddr *TCPAddr) (*TCPConnection, error)

DialUnix(network string, laddr, raddr *UnixAddr) (*UnixConnection, error)
```

### 2.2 Create Dialer

[Netpoll][Netpoll] also defines the `Dialer` interface. The usage is as follows:
(of course, you can usually use the fast way)

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	// Dial a connection with Dialer.
	dialer := netpoll.NewDialer()
	conn, err := dialer.DialConnection(network, address, timeout)
	if err != nil {
		panic("dial netpoll connection failed")
	}
	...
}
```

## 3. Use Nocopy API

`Connection` provides Nocopy APIs - `Reader` and `Writer`, to avoid frequent copying. Let’s introduce their simple
usage.

```go
package main

type Connection interface {
	// Recommended nocopy APIs
	Reader() Reader
	Writer() Writer
	... // see code comments for more details
}
```

### 3.1 Simple Usage

Nocopy APIs is designed as a two-step operation.

On `Reader`, after reading data through `Next`, `Peek`, `ReadString`, etc., you still have to actively call `Release` to
release the buffer(`Nocopy` reads the original address of the buffer, so you must take the initiative to confirm that
the buffer is no longer used).

Similarly, on `Writer`, you first need to allocate a buffer to write data, and then call `Flush` to confirm that all
data has been written.
`Writer` also provides rich APIs to allocate buffers, such as `Malloc`, `WriteString` and so on.

The following shows some simple examples of reading and writing data. For more details, please refer to
the [code comments][nocopy.go].

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	var conn netpoll.Connection
	var reader, writer = conn.Reader(), conn.Writer()

	// reading
	buf, _ := reader.Next(n)
	... parse the read data ...
	reader.Release()

	// writing
	var write_data []byte
	... make the write data ...
	alloc, _ := writer.Malloc(len(write_data))
	copy(alloc, write_data) // write data
	writer.Flush()
}
```

### 3.2 Advanced Usage

If you want to use the connection to send (or receive) multiple sets of data, then you will face the work of packing and
unpacking the data.

On [net][net], this kind of work is generally done by copying. An example is as follows:

```go
package main

import (
	"net"
)

func main() {
	var conn net.Conn
	var buf = make([]byte, 8192)

	// reading
	for {
		n, _ := conn.Read(buf)
		... unpacking & handling ...
		var i int
		for i = 0; i <= n-pkgsize; i += pkgsize {
			pkg := append([]byte{}, buf[i:i+pkgsize]...)
			go func() {
				... handling pkg ...
			}
		}
		buf = append(buf[:0], buf[i:n]...)
	}

	// writing
	var write_datas <-chan []byte
	... packing write ...
	for {
		pkg := <-write_datas
		conn.Write(pkg)
	}
}
```

But, this is not necessary in [Netpoll][Netpoll], nocopy APIs supports operations on the original address of the buffer,
and realizes automatic recycling and reuse of resources through reference counting.

Examples are as follows(use function `Reader.Slice` and `Writer.Append`):

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func main() {
	var conn netpoll.Connection

	// reading
	reader := conn.Reader()
	for {
		... unpacking & handling ...
		pkg, _ := reader.Slice(pkgsize)
		go func() {
			... handling pkg ...
			pkg.Release()
		}
	}

	// writing
	var write_datas <-chan netpoll.Writer
	... packing write ...
	writer := conn.Writer()
	for {
		select {
		case pkg := <-write_datas:
			writer.Append(pkg)
		default:
			if writer.MallocLen() > 0 {
				writer.Flush()
			}
		}
	}
}
```

[Netpoll]: https://github.com/cloudwego/netpoll
[net]: https://github.com/golang/go/tree/master/src/net
[gopool]: https://github.com/bytedance/gopkg/tree/develop/util/gopool
[Examples]: https://github.com/cloudwego/netpoll-examples
[server-example]: https://github.com/cloudwego/netpoll-examples/blob/main/echo/server.go
[client-example]: https://github.com/cloudwego/netpoll-examples/blob/main/echo/client.go
[netpoll_options.go]: https://github.com/cloudwego/netpoll/blob/main/netpoll_options.go
[nocopy.go]: https://github.com/cloudwego/netpoll/blob/main/nocopy.go
[eventloop.go]: https://github.com/cloudwego/netpoll/blob/main/eventloop.go
