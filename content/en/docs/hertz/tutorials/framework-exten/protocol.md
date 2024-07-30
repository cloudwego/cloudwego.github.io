---
title: "Protocol extension"
linkTitle: "Protocol extension"
weight: 5
keywords:
  ["Protocol extension", "protocol.Server", "protocol.StreamServer", "HTTP"]
description: "Protocol extensions provided by Hertz."
---

## Overview

Thanks to the layered design of Hertz, in addition to the HTTP1/HTTP2/HTTP3 protocol server that comes with the Hertz framework by default, users of the framework can also customize the protocol server through the `protocol.Server` or `protocol.StreamServer` interface.

## Interface Definition

### protocol.Server

This interface can be used to implement protocol servers based on byte stream transmission, such as HTTP1/HTTP2.

> Note: If using this interface, the underlying network library needs to implement the [network.Conn](/docs/hertz/tutorials/framework-exten/network-lib/#networkconn) interface.

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

This interface can be used to implement streaming based protocol servers, such as HTTP3.

> Note: If using this interface, the underlying network library needs to implement the [network.streamConn](/docs/hertz/tutorials/framework-exten/network-lib/#networkstreamconn) interface.

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

## Three elements of protocol layer extension

Taking the [protocol.Server](#protocolserver) interface as an example to illustrate the three elements of protocol layer extension, the extension of the [protocol.StreamServer](#protocolstreamserver) interface is similar.

### Protocol layer server initialization

Because the interface mentioned in the overview is actually a standard callback after the data is prepared at the network layer, the processing logic of our protocol layer will only be entered after a new request is established for a connection.

In this logic, we can customize the protocol parsing method, introduce business Handler execution, write data back and other standard behaviors of the protocol layer. This is also the core logic of our custom server.

```go
type myServer struct{
    xxx
    xxx
}

func (s *myServer) Serve (c context.Context, conn network.Conn) error{
    // protocol parsing
	...
    // Go to the logic function of business registration (Route, Middleware, Handler...)
	...
    // write data back
	...
}
```

Defining a protocol processing logic is as simple as that! However, the two steps of parsing the protocol and writing data back can be easily achieved through the `conn` interface provided in the input parameters, but how to go to the logical function of business registration?

### Interaction with upper-level logic

A complete protocol must introduce business logic control (except for very few special situations), so how does the custom protocol in the Hertz framework realize this part of the ability? In fact, in the process of custom server initialization, the framework has naturally handed over this part of the capabilities to the custom protocol server.

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

A custom server only needs to implement a protocol server generation factory according to the above interface. The Core in the parameters actually includes the introduction of upper-layer logic interaction and the specific implementation of other core application layer interfaces. When initializing a custom server, normally you only need to save the Core to the server. When you need to transfer to the business logic, you can guide the process to the application layer processing logic (Route, Middleware, Logic Handler) through the Core. When the business logic is executed and returned, further packets can be written back based on the business data.

```go
type myServer struct{
    suite.Core
    xxx
}

func (s *myServer) Serve (c context.Context, conn network.Conn) error{
    // protocol parsing
	...
    Core.ServeHTTP(c, ctx)
    // write data back
	...
}
```

So far, a custom protocol layer server has been developed.

### Registration of custom protocol server into Hertz

After completing the development of the server generation factory according to the above interface, it is very easy to load it into Hertz. Hertz's core engine naturally provides an interface for registering a custom protocol server:

```go
func (engine *Engine) AddProtocol(protocol string, factory suite.ServerFactory) {
   engine.protocolSuite.Add(protocol, factory)
}
```

It is only necessary to register the user's custom server generation factory with the engine according to the parameters specified by the interface. But it is worth noting that the protocol (string) registered here actually corresponds to the protocol negotiation key in ALPN (Application-Layer Protocol Negotiation), so if you want to access a custom protocol server through ALPN , directly specify the key as the corresponding key during ALPN negotiation. Currently, Hertz integrates an HTTP1 protocol server by default (the corresponding key is "http/1.1"). If you need to customize the HTTP1 protocol processing logic, you can directly specify the key as "http/1.1" within `AddProtocol` to overwrite.

## Sample Code

Taking the [protocol.Server](#protocolserver) interface as an example, the [protocol.StreamServer](#protocolstreamserver) interface is similar.

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
   m.ServeHTTP(ctx, c)
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
