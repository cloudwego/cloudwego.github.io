---
title: "协议扩展"
linkTitle: "协议扩展"
weight: 5
keywords: ["协议扩展", "protocol.Server", "protocol.StreamServer", "HTTP"]
description: "Hertz 提供的协议扩展。"
---

得益于 Hertz 的分层设计，除了 Hertz 框架默认自带的 HTTP1/HTTP2/HTTP3 等协议 server，框架的使用者还可以通过 `protocol.Server` 或 `protocol.StreamServer` 接口自定义协议 server。

## 接口定义

### protocol.Server

该接口可用于实现基于字节流传输的协议 server，如 HTTP1/HTTP2。

> 注意：若使用该接口，底层网络库需实现 [network.Conn](/zh/docs/hertz/tutorials/framework-exten/network-lib/#networkconn) 接口。

```go
type Server interface {
	Serve(c context.Context, conn network.Conn) error
}

type ServerFactory interface {
   New(core Core) (server protocol.Server, err error)
}

// Core is the core interface that promises to be provided for the protocol layer extensions
type Core interface {
   // IsRunning Check whether engine is running or not
   IsRunning() bool
   // A RequestContext pool ready for protocol server impl
   GetCtxPool() *sync.Pool
   // Business logic entrance
   // After pre-read works, protocol server may call this method
   // to introduce the middlewares and handlers
   ServeHTTP(ctx context.Context, c *app.RequestContext)
   // GetTracer for tracing requirement
   GetTracer() tracer.Controller
}
```

### protocol.StreamServer

该接口可用于实现基于流传输的协议 server，如 HTTP3。

> 注意：若使用该接口，底层网络库需实现 [network.streamConn](/zh/docs/hertz/tutorials/framework-exten/network-lib/#networkstreamconn) 接口。

```go
type StreamServer interface {
	Serve(c context.Context, conn network.StreamConn) error
}

type ServerFactory interface {
	New(core Core) (server protocol.Server, err error)
}

// Core is the core interface that promises to be provided for the protocol layer extensions
type Core interface {
   // IsRunning Check whether engine is running or not
   IsRunning() bool
   // A RequestContext pool ready for protocol server impl
   GetCtxPool() *sync.Pool
   // Business logic entrance
   // After pre-read works, protocol server may call this method
   // to introduce the middlewares and handlers
   ServeHTTP(ctx context.Context, c *app.RequestContext)
   // GetTracer for tracing requirement
   GetTracer() tracer.Controller
}
```

## 协议层扩展三要素

以 [protocol.Server](#protocolserver) 接口为例说明协议层扩展的三要素，[protocol.StreamServer](#protocolstreamserver) 接口的扩展与之类似。

### 协议层 server 初始化

前面提到的接口其实就是网络层将数据准备好之后的一个标准回调，即当有新的请求建立连接之后，进入到我们的协议层的处理逻辑。
在这个逻辑中我们可以自定义诸如协议解析方式，引入业务 Handler 执行，数据写回等协议层标准行为。这也是我们的自定义 server 的核心逻辑所在。

```go
type myServer struct{
    xxx
    xxx
}

func (s *myServer)Serve(c context.Context, conn network.Conn) error{
    // 解析协议
	...
    // 转到业务注册的逻辑函数（路由、中间件、Handler）
	...
    // 将数据写回
	...
}
```

定义一个协议处理逻辑就这么简单，不过解析协议、将数据写回这两个步骤通过入参中提供的 `conn` 接口能够轻易达成，但转到业务注册的逻辑函数这一步是如何办到的呢？

### 与上层逻辑交互

一个完整的协议一定少不了引入业务逻辑控制（极少数特殊场景除外），在 Hertz 框架中自定义的协议是如何实现这部分能力的呢？其实，在自定义 server 初始化的过程中，框架已经天然的将这部分能力交给自定义协议 server 了。

```go
type ServerFactory interface {
   New(core Core) (server protocol.Server, err error)
}

// Core is the core interface that promises to be provided for the protocol layer extensions
type Core interface {
   // IsRunning Check whether engine is running or not
   IsRunning() bool
   // A RequestContext pool ready for protocol server impl
   GetCtxPool() *sync.Pool
   // Business logic entrance
   // After pre-read works, protocol server may call this method
   // to introduce the middlewares and handlers
   ServeHTTP(ctx context.Context, c *app.RequestContext)
   // GetTracer for tracing requirement
   GetTracer() tracer.Controller
}
```

自定义 server 只需要按照以上接口实现一个协议 server 生成工厂即可，入参里面的 Core，其实就是包含了引入上层逻辑交互以及其他核心应用层接口的具体实现，在初始化自定义 server 的时候，
正常情况只需要将 Core 保存到 server 中，当需要转到业务逻辑时，通过 Core 即可将流程引导到应用层处理逻辑（路由、中间件、逻辑 Handler），当业务逻辑执行完毕返回后，即可根据业务数据进行进一步的数据包写回。

```go
type myServer struct{
    suite.Core
    xxx
}

func (s *myServer)Serve(c context.Context, conn network.Conn) error{
    // 解析协议
	...
    Core.ServeHTTP(c, ctx)
    // 将数据写回
	...
}
```

至此，一个自定义的协议层 server 就开发完毕了。

### 注册自定义协议 server 到 Hertz 中

按照上述接口完成 server 生成工厂的开发后，将其加载到 Hertz 当中来就非常的容易了，我们在 Hertz 的核心引擎上面天然提供了一个注册自定义协议 server 的接口:

```go
func (engine *Engine) AddProtocol(protocol string, factory suite.ServerFactory) {
   engine.protocolSuite.Add(protocol, factory)
}
```

只需要按照接口指定的参数将我们的自定义 server 生成工厂注册到 engine 上即可。值得注意的一点是，这里注册的 protocol（string）其实和 ALPN 中的协议协商 key 也是一一对应的，
所以，如果是想通过 ALPN 的方式接入自定义的协议 server，直接将 key 指定为对应的 ALPN 协商时的 key 即可。当前 Hertz 默认集成了一个 HTTP1 的协议 server（对应的 key 为"http/1.1"），
如果有自定义 HTTP1 协议处理逻辑的需求，在 `AddProtocol` 时直接将 key 指定为"http/1.1"即可完成覆盖。

## 示例代码

以 [protocol.Server](#protocolserver) 接口为例说明，[protocol.StreamServer](#protocolstreamserver) 接口与之类似。

```go
package main

import (
   "bytes"
   "context"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/app/server"
   "github.com/cloudwego/hertz/pkg/common/errors"
   "github.com/cloudwego/hertz/pkg/common/hlog"
   "github.com/cloudwego/hertz/pkg/network"
   "github.com/cloudwego/hertz/pkg/protocol"
   "github.com/cloudwego/hertz/pkg/protocol/suite"
)

type myServer struct {
   suite.Core
}

func (m myServer) Serve(ctx context.Context, conn network.Conn) error {
   firstThreeBytes, _ := conn.Peek(3)
   if !bytes.Equal(firstThreeBytes, []byte("GET")) {
      return errors.NewPublic("not a GET method")
   }
   c := m.GetCtxPool().Get().(*app.RequestContext)
   defer func() {
      m.GetCtxPool().Put(c)
      conn.Skip(conn.Len())
      conn.Flush()
   }()
   c.Request.SetMethod("GET")
   c.Request.SetRequestURI("/test")
   m.ServeHTTP(c, ctx)
   conn.WriteBinary([]byte("HTTP/1.1 200 OK\n" +
      "Server: hertz\n" +
      "Date: Sun, 29 May 2022 10:49:33 GMT\n" +
      "Content-Type: text/plain; charset=utf-8\n" +
      "Content-Length: 2\n\nok\n"))
   return nil

}

type serverFactory struct {
}

func (s *serverFactory) New(core suite.Core) (server protocol.Server, err error) {
   return &myServer{
      core,
   }, nil
}

func main() {
   h := server.New()
   h.GET("/test", func(ctx context.Context, c *app.RequestContext) {
      hlog.Info("in handler")
   })
   h.AddProtocol("http/1.1", &serverFactory{})
   h.Spin()
}
```
