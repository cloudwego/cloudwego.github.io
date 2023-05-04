---
title: "Engine"
date: 2023-04-24
weight: 13
description: >
---

## server.Hertz 和 route.Engine 的关系

Hertz 的路由、中间件的注册，服务启动，退出等重要方法都是包含在 `server.Hertz` 这个**核心**类型之中的。
它由 `route.Engine` 以及 `signalWaiter` 组成。以下是 `Hertz` 的定义:

```go
// Hertz is the core struct of hertz.
type Hertz struct {
*route.Engine
// 用于接收信号以达到优雅退出的目的
signalWaiter func (err chan error) error
}
```

### 初始化服务器

Hertz 在 `server` 包中提供了 `New` 和 `Default` 函数用于初始化服务器。

`Default` 默认使用了 `Recovery` 中间件以保证服务在运行时不会因为 `panic` 导致服务崩溃。

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
    // 在 New 的基础上使用了内置的 Recovery 中间件
    h.Use(recovery.Recovery())
    return h
}
```

若想详细的了解可选的配置项, 可以在[配置说明](../../reference/config.md)中进行查看。

示例代码

```go
package main

// ...

func main() {
    h := server.New()
    // 使用 Default
    h := server.Default()
}
```

### 运行服务

`Hertz` 提供了 `Spin` 函数用于启动服务器。

和 `route.Engine` 中提供的 `Run` 不同, 除非有**特殊**需求，不然一般使用 `Spin` 函数用于运行服务。

在使用[服务注册发现](../service-governance/service_discovery.md)的功能时, `Spin`
会在服务启动时将服务注册进入注册中心，并使用 `signalWaiter` 监测服务异常。
只有使用 `Spin` 来启动服务才能支持[优雅退出](graceful-shutdown.md)的特性。

```go
package main

func main() {
    h := server.New()
    // 我们通常推荐使用 Spin
    h.Spin()
}
```

```go
package main

func main() {
    h := server.New()
    // 使用 Run 函数启动
    if err := h.Run(); err != nil {
        // ...
        hlog.Error("run server failed", err)
    }
}
```

## route.Engine

`route.Engine` 为 `server.Hertz` 的重要组成部分, 其中拥有大量的在开发中常用的方法, 尤为 **重要**

```go
package route

type Engine struct {
    noCopy nocopy.NoCopy //lint:ignore U1000 until noCopy is used
    
    // Engine 名称
    Name       string
    serverName atomic.Value
    
    // 路由和协议服务器的选项
    options *config.Options
    
    // router 前缀树 
    RouterGroup
    trees     MethodTrees
    maxParams uint16
    
    allNoMethod app.HandlersChain
    allNoRoute  app.HandlersChain
    noRoute     app.HandlersChain
    noMethod    app.HandlersChain
    
    // 用于渲染 HTML
    delims     render.Delims
    funcMap    template.FuncMap
    htmlRender render.HTMLRender
    
    // NoHijackConnPool 将控制是否使用缓存池来获取/释放劫持连接
    // 如果很难保证 hijackConn 不会重复关闭，请将其设置为 true
    NoHijackConnPool bool
    hijackConnPool   sync.Pool
    
    // KeepHijackedConns 是一个可选择的禁用连接的选项
    // 在连接的 HijackHandler 返回后由 Hertz 关闭。
    // 这的选项允许保存在 goroutine 中
    // 例如当 hertz 将 http 连接升级为 websocket 时, 
    // 连接会转到另一个处理程序, 该处理程序会在需要时关闭它
    KeepHijackedConns bool
    
    // 底层传输的网络库, 现在有 go net 和 netpoll 两个选择
    transport network.Transporter
    
    // 用于链路追踪
    tracerCtl   tracer.Controller
    enableTrace bool
    
    // 用于管理协议层
    protocolSuite         *suite.Config
    protocolServers       map[string]protocol.Server
    protocolStreamServers map[string]protocol.StreamServer
    
    // RequestContext 连接池
    ctxPool sync.Pool
    
    // 处理从 http 处理程序中恢复的 panic 的函数
    // 它应该用于生成错误页面并返回 http 错误代码 500（内部服务器错误）
    // 处理程序可用于防止服务器因未恢复的 panic 而崩溃
    PanicHandler app.HandlerFunc
    
    // 在收到 Expect 100 Continue Header 后调用 ContinueHandler。
    //
    // https://www.w3.org/Protocols/rfc2616/rfc2616-sec8.html#sec8.2.3
    // https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.1.1
    // 使用 ContinueHandler，服务器可以基于头信息决定是否读取可能较大的请求正文。
    //
    // 默认情况下就像它们是普通请求一样，自动读取 Expect 100 Continue 请求的请求正文，
    ContinueHandler func(header *protocol.RequestHeader) bool
    
    // 用于表示 Engine 状态（Init/Running/Shutdown/Closed）。
    status uint32
    
    // Engine 启动时依次触发的 hook 函数
    OnRun []CtxErrCallback
    
    // Engine 关闭时同时触发的 hook 函数
    OnShutdown []CtxCallback
    
    clientIPFunc  app.ClientIP
    formValueFunc app.FormValueFunc
}
```

### 设置服务名

示例代码

```go
package main

func main() {
    h := server.New()
    // 用于设置 response header 中的 Server 字段, 默认为 Hertz
    h.Name = ""
}
```
### 渲染 template

engine 提供了 `Delims`, `SetFuncMap`, `LoadHTMLGlob`, `LoadHTMLFiles`, `SetHTMLTemplate`, `SetAutoReloadHTMLTemplate` 
等方法用于渲染 HTML或模板文件。

#### Delims

用于设置 template 的分隔符

函数签名:

```go
func (engine *Engine) Delims(left, right string) *Engine 
```
#### SetFuncMap

用于设置 template 的数据源

函数签名:

```go
type FuncMap map[string]interface{}

func (engine *Engine) SetFuncMap(funcMap template.FuncMap) 
```

```go
package main

func main() {
    h := server.New()
    h.SetFuncMap(template.FuncMap{
        "time": time.Now.String(),
    })
}
```
#### LoadHTMLGlob

用于全局加载 template 文件, 可以使用 `*` 通配符来指定模板文件夹

函数签名:

```go
// LoadHTMLGlob loads HTML files identified by glob pattern
// and associates the result with HTML renderer.
func (engine *Engine) LoadHTMLGlob(pattern string) 
```

示例代码:

```go
// 加载 render/html 目录下的所有 html 模板文件
h.LoadHTMLGlob("render/html/*")

// 加载 render/html/index.tmpl 模板文件
h.LoadHTMLGlob("index.tmpl")
```

#### LoadHTMLFiles

用于加载指定的 template 文件, 参数为 string 切片

函数签名:
```go
// LoadHTMLFiles loads a slice of HTML files
// and associates the result with HTML renderer.
func (engine *Engine) LoadHTMLFiles(files ...string) 
```

#### SetHTMLTemplate/SetAutoReloadHTMLTemplate

这两个方法在渲染的内部逻辑使用, 不推荐直接使用

### 注册中间件

Hertz 提供 `Use` 函数用于将中间件注册进入路由。

我们支持用户自定义中间件，与此同时我们也提供了一些常用的中间件实现,
详情见 [hertz-contrib](https://github.com/hertz-contrib)

`Use` 函数中 `middleware`的形参必须为 `app.HandlerFunc` 的 http 处理函数。

```go
type HandlerFunc func (ctx context.Context, c *app.RequestContext)
```

函数签名:

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

示例代码

```go
package main

// ...

func main() {
    h := server.New()
    // 将内置的 Recovery 中间件注册进入路由
    h.Use(recovery.Recovery())
    // 使用自定义的中间件
    h.Use(exampleMiddleware())
}

func exampleMiddleware() app.handlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 在 Next 中的函数执行之前打印日志
        hlog.Info("print before...")
        // 使用 Next 使得路由匹配的函数执行
        c.Next(ctx)
        // 在 Next 中的函数执行之后打印日志
        hlog.Ingo("print after...")
    }
}
```

更多示例详见[仓库](https://github.com/cloudwego/hertz-examples/tree/main/middleware)

### 服务退出

hertz 提供 `Shutdown` 函数用于进行优雅退出。

若是使用了[服务注册与发现](../service-governance/service_discovery.md)的功能, 在服务退出发生时也会从注册中心下线相应数据。

函数签名:

```go
func (engine *Engine) Shutdown(ctx context.Context) (err error)
```

示例代码:

```go
package main

// ...

func main() {
    h := server.New()
    // 在访问该路径时, 会触发 shutdown 函数触发下线
    h.GET("/shutdown", func(ctx context.Context, c *app.RequestContext) {
        h.ShutDown(ctx)
    })
    h.Spin()
}
```

### 设置 hook 函数

在 Engine 启动和关闭时会触发相应的 hook 函数.

`OnRun` 和 `OnShutdown` 是两个 hook 函数的切片, 用于存储 hook 函数, 为了不影响原有的 hook 函数,
在使用时需要使用 `append` 函数将新的 hook 函数添加进入切片.

当然, 也可以直接使用 `OnRun = []CtxErrCallback{}` 的方式来覆盖原有的 hook 函数.

详细设置方式见 [Hooks](../hooks)

函数签名:

```go
type CtxCallback func (ctx context.Context)

type CtxErrCallback func (ctx context.Context) error

// Engine 启动时依次触发的 hook 函数
OnRun []CtxErrCallback

// Engine 关闭时同时触发的 hook 函数
OnShutdown []CtxCallback
```

示例代码:

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

### 错误处理器

#### PanicHandler

用于设置当程序发生 panic 时的处理函数, 默认为 `nil`.

**注意**: 如果同时设置了 `PanicHandler` 和 `Recovery` 中间件, 则 `Recovery` 中间件会覆盖 `PanicHandler` 的处理逻辑.

示例代码:

```go
package main

func main() {
    h := server.New()
    // 在 panic 时, 会触发 PanicHandler 中的函数, 返回 500 状态码并携带错误信息
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

> Hertz 连接劫持时所使用的 hijack conn 是池化管理的，因此被劫持的连接在 websocket 中使用的时候，不支持异步操作。

劫持的连接仅能被关闭一次，第二次关闭会导致空指针异常。

NoHijackConnPool 将控制是否使用缓存池来获取/释放劫持连接。如果使用池，将提升内存资源分配的性能，但无法避免二次关闭连接导致的异常。

如果很难保证 hijackConn 不会被反复关闭，可以将其设置为 true。

示例代码：

```go
package main

func main() {
    // https://github.com/cloudwego/hertz/issues/121
    h.NoHijackConnPool = true
}
```

## 配置

这里是 engine 所涉及的可以使用的配置项集合

### Name

请查看[此处](#设置服务名)

### Use

请查看[此处](#注册中间件)

### NoHijackConnPool

请查看[此处](#nohijackconnpool)

### OnRun/OnShutdown

请查看[此处](#设置-hook-函数)

### PanicHandler

请查看[此处](#panichandler)

### GetTransporterName

获取当前使用的网络库名称, 现在有原生的 `go net` 和 `netpoll` 两种.

linux 默认使用 `netpoll`, windows 只能使用 `go net`.

如果对如何使用对应的网络库有疑惑, 请查看[此处](../network-lib)

函数签名:

```go
func (engine *Engine) GetTransporterName() (tName string)

// Deprecated: This only get the global default transporter - may not be the real one used by the engine.
// Use engine.GetTransporterName for the real transporter used.
func GetTransporterName() (tName string)
```

### SetTransporter

`SetTransporter` 只设置 Engine 的全局默认值。
所以具体在初始化 Engine 时使用 WithTransporter 来设置网络库时会覆盖掉 SetTransporter 的设置。

函数签名:

```go
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

### IsRunning

判断当前 Engine 是否已经启动.

函数签名:

```go
func (engine *Engine) IsRunning() bool
```

代码示例:

```go
package main

func main() {
    h := server.New()
    // 可以通过 /live 接口来判断当前服务的运行状态
    h.GET("/live", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(200, utils.H{
            "isLive": h.IsRunning(),
        })
    })
    h.Spin()
}
```

### IsTraceEnable

判断是否启用了 trace 功能.

函数签名:

```go
func (engine *Engine) IsTraceEnable() bool
```

### GetCtxPool

获取当前 Engine 的 ctxPool.

函数签名:

```go
func (engine *Engine) GetCtxPool() *sync.Pool
```

代码示例:

```go
h := server.New()
// 从 ctxPool 中获取一个 ctx
h.GetCtxPool().Get().(*app.RequestContext)

// 将 ctx 放回 ctxPool
h.GetCtxPool().Put(ctx)
```

### GetServiceName

获取当前 Engine 的服务名.

函数签名:

```go
func (engine *Engine) GetServerName() []byte 
``` 

### NoRoute

用于设置当请求的路由不存在时的处理函数, 默认返回 404 状态码

函数签名:

```go
// NoRoute adds handlers for NoRoute. It returns a 404 code by default.
func (engine *Engine) NoRoute(handlers ...app.HandlerFunc)
```

示例代码:

```go
package main

func main() {
    h := server.New()
    h.NoRoute(func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(404, utils.H{
            "msg": "cannot found resource",
        })
    })
    h.Spin()
}
```

### NoMethod

用于设置当请求的方法不存在时的处理函数，它默认返回一个 405 状态码

函数签名:

```go
// NoMethod adds handlers for NoMethod. It returns a 405 code by default.
// NoMethod sets the handlers called when the HTTP method does not match.
func (engine *Engine) NoMethod(handlers ...app.HandlerFunc) 
```

示例代码:

```go
package main

func main() {
    h := server.New()
    h.NoRoute(func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(405, utils.H{
            "msg": "cannot match HTTP method",
        })
    })
    h.Spin()
}
```

### Delims

请查看[此处](#delims)

### SetFuncMap

请查看[此处](#setfuncmap)

### LoadHTMLGlob

请查看[此处](#loadhtmlglob)

### LoadHTMLFiles

请查看[此处](#loadhtmlfiles)

