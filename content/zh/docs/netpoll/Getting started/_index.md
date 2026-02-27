---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
description: >
---

> 本教程通过一些简单的[示例][Examples]帮助您开始使用 [Netpoll][Netpoll]，包括如何使用 [Server](#1-使用-server)、[Client](#2-使用-dialer) 和 [nocopy API](#3-使用-nocopy-api)。

## 1. 使用 Server

[这里][server-example] 是一个简单的 server 例子，接下来我们会解释它是如何构建的。

### 1.1 创建 Listener

首先我们需要一个 `Listener`，它可以是 `net.Listener` 或者 `netpoll.Listener`，两者都可以，依据你的代码情况自由选择。
创建 `Listener` 的过程如下：

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

或者

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

### 1.2 创建 EventLoop

`EventLoop` 是一个事件驱动的调度器，一个真正的 NIO Server，负责连接管理、事件调度等。

参数说明:

- `OnRequest` 和 `OnConnect` 是用户应该自己实现来处理业务逻辑的接口。 [注释][eventloop.go] 详细描述了它的行为。
- `Option` 用于自定义 `EventLoop` 创建时的配置，下面的例子展示了它的用法。更多详情请参考 [options][netpoll_options.go] 。

创建过程如下：

```go
package main

import (
	"time"
	"github.com/cloudwego/netpoll"
)

var eventLoop netpoll.EventLoop

func main() {
	...
	eventLoop, _ = netpoll.NewEventLoop(
		handle,
		netpoll.WithOnPrepare(prepare),
		netpoll.WithOnConnect(connect),
		netpoll.WithReadTimeout(time.Second),
	)
	...
}
```

### 1.3 运行 Server

`EventLoop` 通过绑定 `Listener` 来提供服务，如下所示。`Serve` 方法为阻塞式调用，直到发生 `panic` 等错误，或者由用户主动调用 `Shutdown` 时触发退出。

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

### 1.4 关闭 Server

`EventLoop` 提供了 `Shutdown` 功能，用于优雅地停止服务器。用法如下：

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

## 2. 使用 Dialer

[Netpoll][Netpoll] 也支持在 Client 端使用，提供了 `Dialer`，类似于 `net.Dialer`。同样的，[这里][client-example] 展示了一个简单的 Client 端示例，接下来我们详细介绍一下：

### 2.1 快速方式

与 [Net][net] 类似，[Netpoll][Netpoll] 提供了几个用于直接建立连接的公共方法，可以直接调用。 如：

```go
DialConnection(network, address string, timeout time.Duration) (connection Connection, err error)

DialTCP(ctx context.Context, network string, laddr, raddr *TCPAddr) (*TCPConnection, error)

DialUnix(network string, laddr, raddr *UnixAddr) (*UnixConnection, error)
```

### 2.2 创建 Dialer

[Netpoll][Netpoll] 还定义了`Dialer` 接口。 用法如下：（通常推荐使用上一节的快速方式）

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

## 3. 使用 Nocopy API

`Connection` 提供了 Nocopy API —— `Reader` 和 `Writer`，以避免频繁复制。下面介绍一下它们的简单用法。

```go
package main

type Connection interface {
	// Recommended nocopy APIs
	Reader() Reader
	Writer() Writer
	... // see code comments for more details
}
```

### 3.1 简单用法

Nocopy API 设计为两步操作。

使用 `Reader` 时，通过 `Next`、`Peek`、`ReadString` 等方法读取数据后，还需要主动调用 `Release` 方法释放 buffer（`Nocopy` 读取 buffer 的原地址，所以您必须主动再次确认 buffer 已经不再使用）。

同样，使用 `Writer` 时，首先需要分配一个 `[]byte` 来写入数据，然后调用 `Flush` 确认所有数据都已经写入。`Writer` 还提供了丰富的 API 来分配 buffer，例如 `Malloc`、`WriteString` 等。

下面是一些简单的读写数据的例子。 更多详情请参考 [说明][nocopy.go] 。

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

### 3.2 高阶用法

如果你想使用单个连接来发送（或接收）多组数据（如连接多路复用），那么你将面临数据打包和分包。在 [net][net] 上，这种工作一般都是通过复制来完成的。一个例子如下：

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

但是，[Netpoll][Netpoll] 不需要这样做，nocopy APIs 支持对 buffer 进行原地址操作（原地址组包和分包），并通过引用计数实现资源的自动回收和重用。

示例如下（使用方法 `Reader.Slice` 和 `Writer.Append`）：

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
