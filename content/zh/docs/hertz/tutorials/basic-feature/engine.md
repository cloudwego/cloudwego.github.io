---
title: "Engine"
date: 2023-04-24
weight: 1
description: >
---


`server.Hertz` 是 `Hertz` 的核心类型，它由 `route.Engine` 以及 `signalWaiter` 组成，`Hertz` 服务器的启动、路由注册、中间件注册以及退出等重要方法均包含在 `server.Hertz` 中。以下是 `server.Hertz` 的定义：

```go
type Hertz struct {
    *route.Engine 
    // 用于接收信号以实现优雅退出 
    signalWaiter func (err chan error) error
}
```

`route.Engine` 为 `server.Hertz` 的重要组成部分，以下是 `Engine` 的定义：

```go
type Engine struct {
    //禁止拷贝
    noCopy nocopy.NoCopy 
    
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
    // 例如当 hertz 将 http 连接升级为 websocket 时，
    // 连接会转到另一个处理程序，该处理程序会在需要时关闭它
    KeepHijackedConns bool
    
    // 底层传输的网络库，现在有 go net 和 netpoll 两个选择
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
    
    // 用于表示 Engine 状态（Init/Running/Shutdown/Closed）
    status uint32
    
    // Engine 启动时依次触发的 hook 函数
    OnRun []CtxErrCallback
    
    // Engine 关闭时同时触发的 hook 函数
    OnShutdown []CtxCallback
    
    clientIPFunc  app.ClientIP
    formValueFunc app.FormValueFunc
}
```

## 配置

|  配置名称   | 类型  |  说明  |
|  :----  | :----  | :---- |
| WithTransport  | network.NewTransporter | 更换底层 transport，默认值：netpoll.NewTransporter |
| WithHostPorts  | string | 指定监听的地址和端口 |
| WithKeepAliveTimeout | time.Duration | tcp 长连接保活时间，一般情况下不用修改，更应该关注 idleTimeout。默认值：1min |
| WithReadTimeout | time.Duration | 底层读取数据超时时间。默认值：3min |
| WithIdleTimeout | time.Duration | 长连接请求链接空闲超时时间。默认值：3min |
| WithMaxRequestBodySize | int | 配置最大的请求体大小，默认 4M（4M 对应的填的值是 4\*1024\*1024） |
| WithRedirectTrailingSlash | bool | 自动根据末尾的 / 转发，例如：如果 router 只有 /foo/，那么 /foo 会重定向到 /foo/ ；如果只有 /foo，那么 /foo/ 会重定向到 /foo。默认开启 |
| WithRemoveExtraSlash | bool | RemoveExtraSlash 当有额外的 / 时也可以当作参数。如：user/:name，如果开启该选项 user//xiaoming 也可匹配上参数。默认关闭 |
| WithUnescapePathValues | bool | 如果开启，请求路径会被自动转义（eg. '%2F' -> '/'）。如果 UseRawPath 为 false（默认情况），则 UnescapePathValues 实际上为 true，因为 .URI().Path() 将被使用，它已经是转义后的。设置该参数为 false，需要配合 WithUseRawPath(true)。默认开启 (true) |
| WithUseRawPath | bool | 如果开启，会使用原始 path 进行路由匹配。默认关闭 |
| WithHandleMethodNotAllowed | bool | 如果开启，当当前路径不能被匹配上时，server 会去检查其他方法是否注册了当前路径的路由，如果存在则会响应"Method Not Allowed"，并返回状态码 405; 如果没有，则会用 NotFound 的 handler 进行处理。默认关闭 |
| WithDisablePreParseMultipartForm | bool | 如果开启，则不会预处理 multipart form。可以通过 ctx.Request.Body() 获取到 body 后由用户处理。默认关闭 |
| WithStreamBody | bool | 如果开启，则会使用流式处理 body。默认关闭 |
| WithNetwork | string | 设置网络协议，可选：tcp，udp，unix（unix domain socket），默认为 tcp |
| WithExitWaitTime | time.Duration | 设置优雅退出时间。Server 会停止建立新的连接，并对关闭后的每一个请求设置 Connection: Close 的 header，当到达设定的时间关闭 Server。当所有连接已经关闭时，Server 可以提前关闭。默认 5s |
| WithTLS | tls.Config | 配置 server tls 能力，详情可见 [TLS](/zh/docs/hertz/tutorials/basic-feature/protocol/tls/) |
| WithListenConfig | net.ListenConfig | 设置监听器配置，可用于设置是否允许 reuse port 等 |
| WithALPN | bool | 是否开启 ALPN。默认关闭 |
| WithTracer | tracer.Tracer | 注入 tracer 实现，如不注入 Tracer 实现，默认关闭 |
| WithTraceLevel | stats.Level | 设置 trace level，默认 LevelDetailed |
| WithWriteTimeout | time.Duration | 写入数据超时时间，默认值：无限长 |
| WithRedirectFixedPath | bool | 如果开启，当当前请求路径不能匹配上时，server 会尝试修复请求路径并重新进行匹配，如果成功匹配并且为 GET 请求则会返回状态码 301 进行重定向，其他请求方式返回 308 进行重定向。默认关闭 |
| WithBasePath | string | 设置基本路径，前缀和后缀必须为 `/`。默认为 `/` |
| WithMaxKeepBodySize | int | 设置回收时保留的请求体和响应体的最大大小。单位：字节。默认值：4 * 1024 * 1024 |
| WithGetOnly | bool | 如果开启则只接受 GET 请求。默认关闭 |
| WithKeepAlive | bool | 如果开启则使用 HTTP 长连接。默认开启 |
| WithAltTransport | network.NewTransporter | 设置备用 transport。默认值：netpoll.NewTransporter |
| WithH2C | bool | 设置是否开启 H2C。默认关闭 |
| WithReadBufferSize | int | 设置读缓冲区大小，同时限制 HTTP header 大小。默认值：4 * 1024 |
| WithRegistry | registry.Registry, *registry.Info | 设置注册中心配置，服务注册信息。默认值：registry.NoopRegistry, nil |
| WithAutoReloadRender | bool, time.Duration | 设置自动重载渲染配置。默认值：false, 0 |
| WithDisablePrintRoute | bool | 设置是否禁用 debugPrintRoute。默认不禁用 |
| WithOnAccept | func(conn net.Conn) context.Context | 设置在 netpoll 中当一个连接被接受但不能接收数据时的回调函数，在 go net 中在转换 TLS 连接之前被调用。默认值：nil |
| WithOnConnect | func(ctx context.Context, conn network.Conn) context.Context | 设置 onConnect 函数。它可以接收来自 netpoll 连接的数据。在 go net 中，它将在转换 TLS 连接后被调用。默认值：nil |

Server Connection 数量限制:

* 如果是使用标准网络库，无此限制
* 如果是使用 netpoll，最大连接数为 10000
  （这个是 netpoll 底层使用的 [gopool](https://github.com/bytedance/gopkg/blob/b9c1c36b51a6837cef4c2223e11522e3a647460c/util/gopool/gopool.go#L46)
  ）控制的，修改方式也很简单，调用 gopool 提供的函数即可：`gopool.SetCap(xxx)`(main.go 中调用一次即可)。

Server 侧的配置项均在初始化 Server 时采用 `server.WithXXX` 的方式，如：

```go
func main() {
	h := server.New(server.WithXXXX())
	...
}
```

## 初始化服务

```go
func Default(opts ...config.Option) *Hertz
func New(opts ...config.Option) *Hertz
```

### Default

`Default` 用于初始化服务，默认使用了 `Recovery` 中间件以保证服务在运行时不会因为 `panic` 导致服务崩溃。

函数签名：

```go
func Default(opts ...config.Option) *Hertz
```

示例代码：

```go
func main() {
    h := server.Default()
    h.Spin()
}
```

### New

`New` 用于初始化服务，没有使用默认的 `Recovery` 中间件。

函数签名：

```go
func New(opts ...config.Option) *Hertz
```

示例代码：

```go
func main() {
    h := server.New()
    h.Spin()
}
```

## 服务运行与退出

```go
func (h *Hertz) Spin()
func (engine *Engine) Run() (err error)
func (h *Hertz) SetCustomSignalWaiter(f func(err chan error) error)
```

### Spin

`Spin` 函数用于运行 Hertz 服务器，接收到退出信号后可退出服务。

该函数支持服务的优雅退出，优雅退出的详细内容请看 [优雅退出](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/graceful-shutdown/)。

在使用 [服务注册发现](https://www.cloudwego.io/zh/docs/hertz/tutorials/service-governance/service_discovery/) 的功能时，`Spin` 会在服务启动时将服务注册进入注册中心，并使用 `signalWaiter` 监测服务异常。

函数签名：

```go
func (h *Hertz) Spin()
```

示例代码：

```go
func main() {
    h := server.Default()
    h.Spin()
}
```

### Run

`Run` 函数用于运行 Hertz 服务器，接收到退出信号后可退出服务。

该函数不支持服务的优雅退出，除非有**特殊**需求，不然一般使用 [Spin](#spin) 函数用于运行服务。

函数签名：

```go
func (engine *Engine) Run() (err error)
```

示例代码：

```go
func main() {
    h := server.Default()
    if err := h.Run(); err != nil {
        // ...
    	panic(err)
    }
}
```

### SetCustomSignalWaiter

`SetCustomSignalWaiter` 函数用于自定义服务器接收信号后的处理函数，若没有设置自定义函数，Hertz 使用 `waitSignal` 函数作为信号处理的默认实现方式，详细内容请看[优雅退出](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/graceful-shutdown/)。

函数签名：

```go
func (h *Hertz) SetCustomSignalWaiter(f func(err chan error) error)
```

示例代码：

```go
func main() {
	h := server.New()
	h.SetCustomSignalWaiter(func(err chan error) error {
		return nil
	})
	h.Spin()
}
```

## 设置服务器名

用于设置 response header 中的 Server 字段，默认为 Hertz。

示例代码:

```go
package main

func main() {
    h := server.New()
    h.Name = "server"
}
```

## 中间件

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

### Use

`Use` 函数用于将中间件注册进入路由。

Hertz 支持用户自定义中间件，Hertz 已经实现了一些常用的中间件，详情见 [hertz-contrib](https://github.com/hertz-contrib)。

Hertz 支持的中间件的使用方法包括**全局注册**、**路由组**级别和**单一路由**级别的注册，详情见 [服务端中间件](/zh/docs/hertz/tutorials/basic-feature/middleware/#服务端中间件)。

`Use` 函数中 `middleware` 的形参必须为 `app.HandlerFunc` 的 http 处理函数：

```go
type HandlerFunc func (ctx context.Context, c *app.RequestContext)
```

函数签名：

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

示例代码：

```go
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

## 设置客户端 IP 地址

```go
func (engine *Engine) SetClientIPFunc(f app.ClientIP)
```

### SetClientIPFunc

用于设置客户端 IP 地址。

函数签名：

```go
func (engine *Engine) SetClientIPFunc(f app.ClientIP)
```

示例代码：

```go
func main() {
	h := server.Default()
	h.SetClientIPFunc(func(ctx *app.RequestContext) string {
		return "1.1.1.1"
	})
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		clientIP := ctx.ClientIP() // "1.1.1.1"
	})
}
```

## 自定义函数获取 HTTP 请求表单值

```go
func (engine *Engine) SetFormValueFunc(f app.FormValueFunc)
```

### SetFormValueFunc

根据 key 设置获取 HTTP 请求表单值的函数，支持从 `query` 或 `POST`、`PUT` body 中获取值。

>注意：Hertz 提供了默认的根据 key 获取 HTTP 请求表单值的函数，若有自定义需求，可使用 `SetFormValueFunc`函数。

函数签名：

```go
func (engine *Engine) SetFormValueFunc(f app.FormValueFunc)
```

示例代码：

```go
func main() {
	h := server.Default()
	h.SetFormValueFunc(func(requestContext *app.RequestContext, s string) []byte {
		return []byte(s)
	})
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.FormValue("key") // []byte("key")
	})
}
```

## 钩子函数

钩子函数（Hooks）是一个通用的概念，表示某事件触发时所伴随的操作。

Hertz 提供了全局的 Hook 注入能力，用于在服务触发启动后和退出前注入自己的处理逻辑，详细信息可见 [Hooks](/zh/docs/hertz/tutorials/basic-feature/hooks/)。

## 错误处理

用于设置当程序发生 panic 时的处理函数，默认为 `nil`。

>注意: 如果同时设置了 `PanicHandler` 和 `Recovery` 中间件，则 `Recovery` 中间件会覆盖 `PanicHandler` 的处理逻辑。

示例代码:

```go
func main() {
    h := server.New()
    // 在 panic 时，会触发 PanicHandler 中的函数，返回 500 状态码并携带错误信息
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

## ContinueHandler

在接收到客户端发来的 Expect 100 Continue 头之后调用 ContinueHandler。使用 ContinueHandler，服务器可以决定是否读取可能很大的请求正文，默认情况下会读取。

示例代码：

```go
h := server.Default()
h.ContinueHandler = func(header *protocol.RequestHeader) bool {
	return false
}
```

## 渲染 template

Hertz 提供了 `Delims`, `SetFuncMap`, `LoadHTMLGlob`, `LoadHTMLFiles` 等方法用于渲染 HTML 或模板文件，详细内容可参考 [HTML](/zh/docs/hertz/tutorials/basic-feature/render/#html)。

## NoRoute 与 NoMethod 使用

Hertz 提供了 `NoRoute` 与 `NoMethod` 方法用于全局处理 HTTP 404 与 405 请求，详细内容可参考 [NoRoute 与 NoMethod 使用](/zh/docs/hertz/tutorials/basic-feature/route/#noroute-与-nomethod-使用)。

## 获取路由信息

```go
func (engine *Engine) Routes() (routes RoutesInfo)
func (engine *Engine) PrintRoute(method string)
```

### Routes

`Routes` 函数返回一个按 HTTP 方法划分的包含路由信息（HTTP 方法名，路由路径，请求处理函数名）的切片。

函数签名：

```go
func (engine *Engine) Routes() (routes RoutesInfo)
```

示例代码：

```go
func getHandler() app.HandlerFunc {
	return func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "get handler")
	}
}

func postHandler() app.HandlerFunc {
	return func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "post handler")
	}
}

func main() {
	h := server.Default()
	h.GET("/get", getHandler())
	h.POST("/post", postHandler())
	routesInfo := h.Routes()
	fmt.Printf("%v\n", routesInfo)
	// [{GET /get main.getHandler.func1 0xb2afa0} {POST /post main.postHandler.func1 0xb2b060}]
}
```

### PrintRoute

`PrintRoute` 函数根据 HTTP 方法名打印路由前缀树信息。

函数签名：

```go
func (engine *Engine) PrintRoute(method string)
```

示例代码：

```go
func main() {
	h := server.Default()
	h.GET("/get", getHandler())
	h.GET("/get/user", getHandler())
	h.PrintRoute(consts.MethodGet)
	// node.prefix: /get
	//node.ppath: /get
	//level: 0
	//
	//node.prefix: /user
	//node.ppath: /get/user
	//level: 1
}
```

## 底层网络库

```go
func (engine *Engine) GetTransporterName() (tName string)
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

### GetTransporterName

获取当前使用的网络库名称，现在有原生的 `go net` 和 `netpoll` 两种。

linux 默认使用 `netpoll`, windows 只能使用 `go net`。

如果对如何使用对应的网络库有疑惑，请查看 [此处](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/network-lib/)。

函数签名:

```go
func (engine *Engine) GetTransporterName() (tName string)
```

示例代码：

```go
h := server.New()
tName := h.GetTransporterName()
```

### SetTransporter

`SetTransporter` 用于设置网络库。

>注意：`SetTransporter` 只设置 Engine 的全局默认值，所以在初始化 Engine 时使用 `WithTransporter` 来设置网络库会覆盖掉 `SetTransporter` 的设置。

函数签名:

```go
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

示例代码：

```go
route.SetTransporter(standard.NewTransporter)
```

## 获取服务名

```go
func (engine *Engine) GetServerName() []byte 
```

### GetServerName

获取当前 Engine 的服务名，默认为 hertz。

函数签名：

```go
func (engine *Engine) GetServerName() []byte 
```

示例代码：

```go
h := server.New()
name := h.GetServerName()
fmt.Printf("%s\n", name) // name == "hertz"
```

## 获取服务器配置

```go
func (engine *Engine) GetOptions() *config.Options
```

### GetOptions

获取服务器配置。

函数签名：

```go
func (engine *Engine) GetOptions() *config.Options
```

示例代码：

```go
func main() {
	h := server.New(server.WithHostPorts(":8888"))
	option := h.GetOptions()
	fmt.Printf("%v\n", option.Addr)
	// option.Addr == ":8888"
}
```

## 判断 Engine 是否启动

```go
func (engine *Engine) IsRunning() bool
```

### IsRunning

判断当前 Engine 是否已经启动。

函数签名：

```go
func (engine *Engine) IsRunning() bool
```

示例代码：

```go
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

## 判断是否流式处理请求

```go
func (engine *Engine) IsStreamRequestBody() bool
```

### IsStreamRequestBody

判断是否以流式方式处理请求 body。

函数签名：

```go
func (engine *Engine) IsStreamRequestBody() bool
```

示例代码：

```go
func main() {
	h := server.New(server.WithStreamBody(true))
	isStreamRequestBody := h.IsStreamRequestBody()
	fmt.Printf("%v\n", isStreamRequestBody)
	// isStreamRequestBody == true
}
```

## 获取链路追踪信息

```go
func (engine *Engine) IsTraceEnable() bool
func (engine *Engine) GetTracer() tracer.Controller
```

### IsTraceEnable

判断是否启用了链路追踪功能。

函数签名：

```go
func (engine *Engine) IsTraceEnable() bool
```

示例代码：

```go
h := server.New()
isTraceEnable := h.IsTraceEnable() // false
```

### GetTracer

获取设置的 `tracer.Controller` 接口信息。如何设置链路追踪请参考 [链路追踪](/zh/docs/hertz/tutorials/observability/tracing/)。

函数签名：

```go
func (engine *Engine) GetTracer() tracer.Controller
```

示例代码：

```go
func main() {
	h := server.Default(server.WithTracer(hertztracer.NewTracer(ht, func(c *app.RequestContext) string {
		return "test.hertz.server" + "::" + c.FullPath()
	})))
	h.Use(hertztracer.ServerCtx())
	tracer := h.GetTracer()
}
```

## Hijack

### NoHijackConnPool

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

### HijackConnHandle

设置 Hijack 连接处理函数。

函数签名：

```go
func (engine *Engine) HijackConnHandle(c network.Conn, h app.HijackHandler)
```