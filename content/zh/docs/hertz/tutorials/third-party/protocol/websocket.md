---
title: "Websocket"
date: 2022-09-13
weight: 4
keywords: ["WebSocket", "HTTP", "hijack", "TCP"]
description: "Hertz 基于 hijack 的方式实现了对 WebSocket 的支持。"
---

WebSocket 是一种可以在单个 TCP 连接上进行全双工通信，位于 OSI 模型的应用层。WebSocket 使得客户端和服务器之间的数据交换变得更加简单，允许服务端主动向客户端推送数据。在 WebSocket API 中，浏览器和服务器只需要完成一次握手，两者之间就可以创建持久性的连接，并进行双向数据传输。

Hertz 提供了 WebSocket 的支持，参考 [gorilla/websocket](http://github.com/gorilla/websocket) 库使用 `hijack` 的方式在 Hertz 进行了适配，用法和参数基本保持一致。

## 安装

```shell
go get github.com/hertz-contrib/websocket
```

## 示例代码

```go
package main

import (
    "context"
    "flag"
    "html/template"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/websocket"
)

var addr = flag.String("addr", "localhost:8080", "http service address")

var upgrader = websocket.HertzUpgrader{} // use default options

func echo(_ context.Context, c *app.RequestContext) {
    err := upgrader.Upgrade(c, func(conn *websocket.Conn) {
        for {
            mt, message, err := conn.ReadMessage()
            if err != nil {
                log.Println("read:", err)
                break
            }
            log.Printf("recv: %s", message)
            err = conn.WriteMessage(mt, message)
            if err != nil {
                log.Println("write:", err)
                break
            }
        }
    })
    if err != nil {
        log.Print("upgrade:", err)
        return
    }
}

func home(_ context.Context, c *app.RequestContext) {
    c.SetContentType("text/html; charset=utf-8")
    homeTemplate.Execute(c, "ws://"+string(c.Host())+"/echo")
}

func main() {
    flag.Parse()
    h := server.Default(server.WithHostPorts(*addr))
    // https://github.com/cloudwego/hertz/issues/121
    h.NoHijackConnPool = true
    h.GET("/", home)
    h.GET("/echo", echo)
    h.Spin()
}

// 网络客户端代码详见：https://github.com/hertz-contrib/websocket/blob/main/examples/echo/server.go#L64，此处省略
var homeTemplate = ""
```

运行 server：

```shell
go run server.go
```

上述示例代码中，服务器包括一个简单的网络客户端。要使用该客户端，在浏览器中打开 [http://127.0.0.1:8080]()，并按照页面上的指示操作。

## 配置

以下是 Hertz WebSocket 使用过程中可选的配置参数。

这部分将围绕 `websocket.HertzUpgrader` 结构展开说明。

| 参数                | 介绍                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReadBufferSize`    | 用于设置输入缓冲区的大小，单位为字节。如果缓冲区大小为零，那么就使用 HTTP 服务器分配的大小。输入缓冲区大小并不限制可以接收的信息的大小。                                                                                     |
| `WriteBufferSize`   | 用于设置输出缓冲区的大小，单位为字节。如果缓冲区大小为零，那么就使用 HTTP 服务器分配的大小。输出缓冲区大小并不限制可以发送的信息的大小。                                                                                     |
| `WriteBufferPool`   | 用于设置写操作的缓冲池。                                                                                                                                                                                                     |
| `Subprotocols`      | 用于按优先顺序设置服务器支持的协议。如果这个字段不是 nil，那么 Upgrade 方法通过选择这个列表中与客户端请求的协议的第一个匹配来协商一个子协议。如果没有匹配，那么就不协商协议（Sec-Websocket-Protocol 头不包括在握手响应中）。 |
| `Error`             | 用于设置生成 HTTP 错误响应的函数。                                                                                                                                                                                           |
| `CheckOrigin`       | 用于设置针对请求的 Origin 头的校验函数，如果请求的 Origin 头是可接受的，CheckOrigin 返回 true。                                                                                                                              |
| `EnableCompression` | 用于设置服务器是否应该尝试协商每个消息的压缩（RFC 7692）。将此值设置为 true 并不能保证压缩会被支持。                                                                                                                         |

### WriteBufferPool

如果该值没有被设置，则额外初始化写缓冲区，并在当前生命周期内分配给该连接。当应用程序在大量的连接上有适度的写入量时，缓冲池是最有用的。

应用程序应该使用**一个单一**的缓冲池来为不同的连接分配缓冲区。

接口描述：

```go
// BufferPool represents a pool of buffers. The *sync.Pool type satisfies this
// interface.  The type of the value stored in a pool is not specified.
type BufferPool interface {
    // Get gets a value from the pool or returns nil if the pool is empty.
    Get() interface{}
    // Put adds a value to the pool.
    Put(interface{})
}
```

示例代码：

```go
type simpleBufferPool struct {
    v interface{}
}

func (p *simpleBufferPool) Get() interface{} {
    v := p.v
    p.v = nil
    return v
}

func (p *simpleBufferPool) Put(v interface{}) {
    p.v = v
}

var upgrader = websocket.HertzUpgrader{
    WriteBufferPool: &simpleBufferPool{},
}
```

### Subprotocols

WebSocket 只是定义了一种交换任意消息的机制。这些消息是什么意思，客户端在任何特定的时间点可以期待什么样的消息，或者他们被允许发送什么样的消息，完全取决于实现应用程序。

所以你需要在服务器和客户端之间就这些事情达成协议。子协议参数只是让客户端和服务端正式地交换这些信息。你可以为你想要的任何协议编造任何名字。服务器可以简单地检查客户在握手过程中是否遵守了该协议。

### Error

如果 Error 为 nil，则使用 Hertz 提供的 API 来生成 HTTP 错误响应。

函数签名：

```go
func(c *app.RequestContext, status int, reason error)
```

示例代码：

```go
var upgrader = websocket.HertzUpgrader{
    Error: func(c *app.RequestContext, status int, reason error) {
        c.Response.Header.Set("Sec-Websocket-Version", "13")
        c.AbortWithMsg(reason.Error(), status)
    },
}
```

### CheckOrigin

如果 CheckOrigin 为 nil，则使用一个安全的默认值：如果 Origin 请求头存在，并且源主机不等于请求主机头，则返回 false。CheckOrigin 函数应该仔细验证请求的来源，以防止跨站请求伪造。

函数签名：

```go
func(c *app.RequestContext) bool
```

默认实现：

```go
func fastHTTPCheckSameOrigin(c *app.RequestContext) bool {
    origin := c.Request.Header.Peek("Origin")
    if len(origin) == 0 {
        return true
    }
    u, err := url.Parse(b2s(origin))
    if err != nil {
        return false
    }
    return equalASCIIFold(u.Host, b2s(c.Host()))
}
```

### EnableCompression

服务端接受一个或者多个扩展字段，这些扩展字段是包含客户端请求的 `Sec-WebSocket-Extensions` 头字段扩展中的。当 EnableCompression 为 true 时，服务端根据当前自身支持的扩展与其进行匹配，如果匹配成功则支持压缩。

目前仅支持“无上下文接管”模式，详见 `HertzUpgrader.Upgrade` 的实现。

### SetReadTimeout/SetWriteTimeout

当使用 websocket 进行读写的时候，可以通过类似如下方式设置读超时或写超时的时间。

示例代码：

```go
func echo(_ context.Context, c *app.RequestContext) {
    err := upgrader.Upgrade(c, func(conn *websocket.Conn) {
        defer conn.Close()
        // "github.com/cloudwego/hertz/pkg/network"
        conn.NetConn().(network.Conn).SetReadTimeout(1 * time.Second)
        conn.NetConn().(network.Conn).SetWriteTimeout(1 * time.Second)
        ...
    })
    if err != nil {
        log.Print("upgrade:", err)
        return
    }
}
```

## NoHijackConnPool

> Hertz 连接劫持时所使用的 hijack conn 是池化管理的，因此被劫持的连接在 websocket 中使用的时候，不支持异步操作。

劫持的连接仅能被关闭一次，第二次关闭会导致空指针异常。

NoHijackConnPool 将控制是否使用缓存池来获取/释放劫持连接。如果使用池，将提升内存资源分配的性能，但无法避免二次关闭连接导致的异常。

如果很难保证 hijackConn 不会被反复关闭，可以将其设置为 true。

示例代码：

```go
func main() {
    ...
    // https://github.com/cloudwego/hertz/issues/121
    h.NoHijackConnPool = true
    ...
}
```

更多用法示例详见 [examples](https://github.com/hertz-contrib/websocket/tree/main/examples) 。
