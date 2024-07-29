---
title: "Websocket"
date: 2022-09-13
weight: 4
keywords: ["WebSocket", "HTTP", "hijack", "TCP"]
description: "Hertz implements support for WebSocket based on hijack."
---

WebSocket is a type of full-duplex communication that can be performed on a single TCP connection and is located at the application layer of the OSI model.
WebSocket makes data exchange between client and server easier, allowing the server to actively push data to the client.
In the WebSocket API, the browser and the server only need to complete a handshake that a persistent connection can be created between the two, and two-way data transmission can be performed.

Hertz provides support for WebSocket and adapts it in Hertz by referring to [gorilla/websocket](https://github.com/gorilla/websocket) using `hijack`.
The usage and parameters are basically the same.

## Install

```shell
go get github.com/hertz-contrib/websocket
```

## Example

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

// Web client code details are available at: https://github.com/hertz-contrib/websocket/blob/main/examples/echo/server.go#L64
var homeTemplate = ""
```

run websocket server:

```shell
go run server.go
```

In the example code above, the server includes a simple web client. To use this client, open [http://127.0.0.1:8080]() in your browser and follow the instructions on the page.

## Config

The following is the optional configuration parameters for using Hertz WebSocket.

This section is organized around the `websocket.HertzUpgrader` structure.

| Parameter           | Introduction                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReadBufferSize`    | Used to set the size of the read buffer in bytes. If the buffer size is zero, then the size allocated by the HTTP server is used. The read buffer size does not limit the size of the messages that can be received.                                                                                                                                                         |
| `WriteBufferSize`   | Used to set the size of the write buffer in bytes. If the buffer size is zero, then the size allocated by the HTTP server is used. The write buffer size does not limit the size of the messages that can be sent.                                                                                                                                                           |
| `WriteBufferPool`   | Used to set the buffer pool for write operations.                                                                                                                                                                                                                                                                                                                            |
| `Subprotocols`      | Used to set the protocols supported by the server in order of preference. If this field is not nil, then the Upgrade method negotiates a sub-protocol by selecting the first match in this list to the protocol requested by the client. If there is no match, then no protocol is negotiated (the Sec-Websocket-Protocol header is not included in the handshake response). |
| `Error`             | Used to set a function the generation of HTTP error responses.                                                                                                                                                                                                                                                                                                               |
| `CheckOrigin`       | Used to set a check function for Origin header for the request. If the Origin header of the request is acceptable, CheckOrigin returns true.                                                                                                                                                                                                                                 |
| `EnableCompression` | Used to set whether the server should attempt to negotiate compression for each message (RFC 7692). Setting this value to true does not guarantee that compression will be supported.                                                                                                                                                                                        |

### WriteBufferPool

If this value is not set, an additional write buffer is initialized and allocated to the connection for the current lifetime. The buffer pool is most useful when the application has a moderate amount of writes on a large number of connections.

Applications should use **a single** buffer pool to allocate buffers for different connections.

Interface Description:

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

Sample Code:

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

WebSocket simply defines a mechanism for exchanging arbitrary messages. What those messages mean, what kind of messages the client can expect at any given point in time, or what kind of messages they are allowed to send, depends entirely on the implementing application.

So you need an agreement between the server and the client about these things. The subprotocol parameters simply allow the client and server to formally exchange this information. You can make up any name for any protocol you want. The server can simply check that the client has followed that protocol during the handshake.

### Error

If Error is nil, then use the API provided by Hertz to generate the HTTP error response.

Function signatures:

```go
func(c *app.RequestContext, status int, reason error)
```

Sample Code:

```go
var upgrader = websocket.HertzUpgrader{
    Error: func(c *app.RequestContext, status int, reason error) {
        c.Response.Header.Set("Sec-Websocket-Version", "13")
        c.AbortWithMsg(reason.Error(), status)
    },
}
```

### CheckOrigin

CheckOrigin returns true if the request Origin header is acceptable. If CheckOrigin is nil, then a safe default is used: return false if the Origin request header is present and the origin host is not equal to request Host header.

A CheckOrigin function should carefully validate the request origin to
prevent cross-site request forgery.

Function signatures:

```go
func(c *app.RequestContext) bool
```

Default Implementation:

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

The server accepts one or more extension fields that are included in the `Sec-WebSocket-Extensions` header field extensions requested by the client. When EnableCompression is true, the server matches the extensions it currently supports with its extensions, and supports compression if the match is successful.

Currently only the "no context takeover" mode is supported, as described in the `HertzUpgrader.Upgrade`.

### SetReadTimeout/SetWriteTimeout

When using websockets for reading and writing, the read timeout or write timeout can be set similarly as follows.

Sample Code:

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

> The hijack conn used for Hertz connection hijacking is pooled and therefore does not support asynchronous operations when the hijacked connection is used in a websocket.

A hijacked connection can only be closed once, and a second closure will result in a null pointer exception.

NoHijackConnPool will control whether invite pool to acquire/release the hijackConn or not.

If cache pooling is used, it will improve the performance of memory resource allocation, but it will not avoid the exception caused by closing the connection twice.

If it is difficult to guarantee that hijackConn will not be closed repeatedly, set it to true.

Sample Code:

```go
func main() {
    ...
    // https://github.com/cloudwego/hertz/issues/121
    h.NoHijackConnPool = true
    ...
}
```

As for usage, you may refer to [examples](https://github.com/hertz-contrib/websocket/tree/main/examples).
