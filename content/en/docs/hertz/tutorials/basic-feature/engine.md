---
title: "Engine"
date: 2023-04-10
weight: 2
description: >
---

## server.Hertz

The important methods of registering routes, middleware, starting and stopping services for Hertz are all included in the **core** type `server.Hertz`. It is composed of `route.Engine` and a `signalWaiter`. Here's the definition:

```go
// Hertz is the core struct of hertz.
type Hertz struct {
    *route.Engine
    // Used to receive signals for graceful shutdown
    signalWaiter func(err chan error) error
}
```

### Initializing the Server

Hertz provides two functions in the `server` package to initialize servers: `New` and `Default`.

The default function, `Default` uses the middleware called `Recovery` to prevent service crashes caused by panicking 
during runtime.

```go
// New creates a hertz instance without any default config.
func New(opts ...config.Option) *Hertz {
    options := config.NewOptions(opts)
    h := &Hertz{Engine: route.NewEngine(options)}
    return h
}
```

```go
// Default creates a hertz instance with default middlewares.
func Default(opts ...config.Option) *Hertz {
    h := New(opts...)
     // Uses built-in Recovery middleware based on New method 
     h.Use(recovery.Recovery())
     return h  
}
```

For more information on optional configurations, refer to [Configuration Options](../../reference/config.md).

Example Code

```go
package main

// ...

func main() {
    h := server.New()
    // Use Default
    h := server.Default()
}
```

### Run Service

`Hertz` provides the `Spin` function to start the server.

Unlike the `Run` provided in `route.Engine`, it is generally recommended to use `Spin` unless you have **special** needs when running services.

When using [Service Registration and Discovery](../service-governance/service_discovery.md), `Spin`
will register the service into a registry center when starting up, and use `signalWaiter` to monitor service exceptions. Only by using `Spin` can we support graceful exit.

```go
package main

func main() {
    h := server.New()
    // We usually recommend using Spin 
    h.Spin()
}
```

```go
package main

func main() {
    h: = server.New ()
    // Start with Run function
    if err: = h.Run (); err! = Nil {
        //…
        hlog.Error ("run server failed", err)
    }
}
```
## route.Engine

`route.Engine` is an important part of `server.Hertz`, which contains a large number of commonly used methods in development, and is particularly **important**.

```go
type Engine struct {
    noCopy nocopy.NoCopy //lint:ignore U1000 until noCopy is used

	// engine name
	Name       string
	serverName atomic.Value

	// Options for route and protocol server
	options *config.Options

	// route
	RouterGroup
	trees MethodTrees

	maxParams uint16

	allNoMethod app.HandlersChain
	allNoRoute  app.HandlersChain
	noRoute     app.HandlersChain
	noMethod    app.HandlersChain

	// For render HTML
	delims     render.Delims
	funcMap    template.FuncMap
	htmlRender render.HTMLRender

	// NoHijackConnPool will control whether invite pool to acquire/release the hijackConn or not.
	// If it is difficult to guarantee that hijackConn will not be closed repeatedly, set it to true.
	NoHijackConnPool bool
	hijackConnPool   sync.Pool
	// KeepHijackedConns is an opt-in disable of connection
	// close by hertz after connections' HijackHandler returns.
	// This allows to save goroutines, e.g. when hertz used to upgrade
	// http connections to WS and connection goes to another handler,
	// which will close it when needed.
	KeepHijackedConns bool

	// underlying transport
	transport network.Transporter

	// trace
	tracerCtl   tracer.Controller
	enableTrace bool

	// protocol layer management
	protocolSuite         *suite.Config
	protocolServers       map[string]protocol.Server
	protocolStreamServers map[string]protocol.StreamServer

	// RequestContext pool
	ctxPool sync.Pool

	// Function to handle panics recovered from http handlers.
	// It should be used to generate an error page and return the http error code
	// 500 (Internal Server Error).
	// The handler can be used to keep your server from crashing because of
	// unrecovered panics.
	PanicHandler app.HandlerFunc

	// ContinueHandler is called after receiving the Expect 100 Continue Header
	//
	// https://www.w3.org/Protocols/rfc2616/rfc2616-sec8.html#sec8.2.3
	// https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.1.1
	// Using ContinueHandler a server can make decisioning on whether or not
	// to read a potentially large request body based on the headers
	//
	// The default is to automatically read request bodies of Expect 100 Continue requests
	// like they are normal requests
	ContinueHandler func(header *protocol.RequestHeader) bool

	// Indicates the engine status (Init/Running/Shutdown/Closed).
	status uint32

	// Hook functions get triggered sequentially when engine start
	OnRun []CtxErrCallback

	// Hook functions get triggered simultaneously when engine shutdown
	OnShutdown []CtxCallback

	// Custom Functions
	clientIPFunc  app.ClientIP
	formValueFunc app.FormValueFunc
}
```

### Set Service Name

Sample code:

```go
package main

func main() {
    h := server.New()
    // Used to set the Server field in response header, default is Hertz.
    h.Name = ""
}
```

### Register Middleware

Hertz provides `Use` function for registering middleware into routes.

We support user-defined middleware, and at the same time we also provide some commonly used middleware implementations,
See details [hertz-contrib](https://github.com/hertz-contrib).

The parameter type of `middleware` in the `Use` function must be a http processing function of `app.HandlerFunc`.

```go
type HandlerFunc func (ctx context.Context, c *app.RequestContext)
```

Function signature:

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

Sample code:

```go
package main

// ...

func main() {
    h := server.New()
    // Register built-in Recovery middleware into routes.
    h.Use(recovery.Recovery())
    // Use custom middleware.
    h.Use(exampleMiddleware())
}

func exampleMiddleware() app.handlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // Print logs before executing functions in Next.
        hlog.Info("print before...")
        // Use Next to execute the matching function in route.
        c.Next(ctx)
        // Print logs after executing functions in Next.
        hlog.Ingo("print after...")
    }
}
```

For more examples, see [repository](https://github.com/cloudwego/hertz-examples/tree/main/middleware).

### Service Shutdown

hertz provides the `Shutdown` function for graceful shutdown.

If you are using service registration and discovery, the corresponding data will also be deregistered from the registry when the service exits.

Function signature:

```go
func (engine *Engine) Shutdown(ctx context.Context) (err error)
```

Example code:

```go
package main

// ...

func main() {
    h := server.New()
    // When accessing this path, it triggers the shutdown function to go offline
    h.GET("/shutdown", func(ctx context.Context, c *app.RequestContext) {
        h.ShutDown(ctx)
    })
    h.Spin()
}
```

### Set Hook Function

The corresponding hook functions will be triggered when Engine starts up and shuts down.

`OnRun` and `OnShutdown` are two slices of hook functions used to store hook functions. To avoid affecting existing hook functions,
you need to use the `append` function to add new hooks into slices.

Of course, you can also directly cover original hook functions by setting  `OnRun=[]CtxErrCallback{}`.

For detailed configuration methods, see [Hooks](../hooks).

Function signature:

```go
type CtxCallback func (ctx context.Context)

type CtxErrCallback func (ctx context.Context) error

// Hook Functions triggered during engine startup.
OnRun []CtxErrCallback 

// Hook Functions triggered during engine shutdown.
OnShutdown []CtxCallback 
```

Example code:

```go
package main

func main() {
    h := server.New()
    h.OnRun = append(h.OnRun, func(ctx context.Context) error {
        return nil
    })
    
  	h.OnShutdown = append(h.OnShutdown, func(ctx context.Context) {
        //...
    	})
}
```
### Error Handlers

#### PanicHandler

Used to set the handling function when a program panics, default is `nil`.

**Note**: If both `PanicHandler` and `Recovery` middleware are set at the same time, then the logic in `Recovery` middleware will override that of `PanicHandler`.

Example code:

```go
package main

func main() {
    h := server.New()
    // When panic occurs, the function in PanicHandler will be triggered,
    // returning a 500 status code with error message.
    h.PanicHandler = func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(500, utils.H{
            "message": "panic",
        })
    }
    h.GET("/hello", func(c context.Context, ctx *app.RequestContext) {
        panic("panic")
    })
    h.Spin()
}
```

### Hijack

#### NoHijackConnPool

> The hijacked connection used during Hertz connection hijacking is managed by pool management. Therefore, when the hijacked connection is used for websockets it does not support asynchronous operations.

The hijacked connection can only be closed once; closing it a second time will result in a null pointer exception.

NoHijackConnPool controls whether to use cache pools to obtain/release hijacked connections. Using pools improves performance of memory resource allocation but cannot prevent exceptions caused by closing connections twice.

If it is difficult to ensure that hijackConn won't be closed repeatedly, it can be set as true.

Example code:

```go
package main

func main() {
     // https://github.com/cloudwego/hertz/issues/121
     h.NoHijackConnPool = true
}
```

## Configuration

Here is a collection of configuration options that can be used for the engine.

### Name

Please see [here](#set-service-name).

### Use

Please see [here](#register-middleware).

### NoHijackConnPool

Please see [here](#nohijackconnpool).

### OnRun/OnShutdown

Please see [here](#set-hook-function).

### PanicHandler

Please see [here](#panichandler).

### GetTransporterName

Get the name of the current network library being used. There are currently two options: Go's native `net` and `netpoll`. Linux uses `netpoll` by default, while Windows can only use Go's native `net`.

If you're unsure about how to use one of these network libraries, please refer to [this page](../network-lib)

Function signature:
```go
func (engine *Engine) GetTransporterName() (tName string)

// Deprecated: This only get the global default transporter - may not be the real one used by the engine.
// Use engine.GetTransporterName for the real transporter used.
func GetTransporterName() (tName string)
```

### SetTransporter

`SetTransporter` sets only Engine's global defaults. When initializing Engine, use WithTransporter to set your network library instead.

Function signature:
```go
func SetTransporter(transporter func(options *config.Options) network.Transporter)
```

### IsRunning

Check whether or not Engine has been started.

Function signature:
```go
func (engine *Engine) IsRunning() bool
```

Code example:
```go
package main
 
func main() {
    h := server.New()
	// Check if service is running via /live interface 
    h.GET("/live", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(200, utils.H{
            "isLive": h.IsRunning(),
        })
    })
    h.Spin()
}
```

### IsTraceEnable

Check if tracing is enabled.

Function signature:
```go
func (engine *Engine) IsTraceEnable() bool
```

### GetCtxPool

Get the current Engine's ctxPool.

Function signature:
```go
func (engine *Engine) GetCtxPool() *sync.Pool
```

Code example:
```go
h := server.New()
// Retrieve a ctx from the ctxPool 
h.GetCtxPool().Get().(*app.RequestContext)

// Return a ctx to the pool 
h.GetCtxPool().Put(ctx)
```
