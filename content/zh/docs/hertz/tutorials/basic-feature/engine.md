---
title: "Engine"
date: 2023-08-18
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

`route.Engine` 为 `server.Hertz` 的重要组成部分，`Engine` 的定义位于 [Engine](https://github.com/cloudwego/hertz/blob/main/pkg/route/engine.go)。

## 配置

|  配置项   | 默认值  | 说明   |
|  :----  | :----  | :---- |
| WithTransport  | network.NewTransporter | 更换底层 transport |
| WithHostPorts  | `:8888` | 指定监听的地址和端口 |
| WithKeepAliveTimeout | 1min | tcp 长连接保活时间，一般情况下不用修改，更应该关注 idleTimeout |
| WithReadTimeout | 3min | 底层读取数据超时时间 |
| WithIdleTimeout | 3min | 长连接请求链接空闲超时时间 |
| WithMaxRequestBodySize | 4 * 1024 * 1024 | 配置最大的请求体大小 |
| WithRedirectTrailingSlash | true | 自动根据末尾的 / 转发，例如：如果 router 只有 /foo/，那么 /foo 会重定向到 /foo/ ；如果只有 /foo，那么 /foo/ 会重定向到 /foo |
| WithRemoveExtraSlash | false | RemoveExtraSlash 当有额外的 / 时也可以当作参数。如：user/:name，如果开启该选项 user//xiaoming 也可匹配上参数 |
| WithUnescapePathValues | true | 如果开启，请求路径会被自动转义（eg. '%2F' -> '/'）。如果 UseRawPath 为 false（默认情况），则 UnescapePathValues 实际上为 true，因为 .URI().Path() 将被使用，它已经是转义后的。设置该参数为 false，需要配合 WithUseRawPath(true) |
| WithUseRawPath | false | 如果开启，会使用原始 path 进行路由匹配 |
| WithHandleMethodNotAllowed | false | 如果开启，当当前路径不能被匹配上时，server 会去检查其他方法是否注册了当前路径的路由，如果存在则会响应"Method Not Allowed"，并返回状态码 405; 如果没有，则会用 NotFound 的 handler 进行处理 |
| WithDisablePreParseMultipartForm | false | 如果开启，则不会预处理 multipart form。可以通过 ctx.Request.Body() 获取到 body 后由用户处理 |
| WithStreamBody | false | 如果开启，则会使用流式处理 body |
| WithNetwork | "tcp" | 设置网络协议，可选：tcp，udp，unix（unix domain socket），默认为 tcp |
| WithExitWaitTime | 5s | 设置优雅退出时间。Server 会停止建立新的连接，并对关闭后的每一个请求设置 Connection: Close 的 header，当到达设定的时间关闭 Server。当所有连接已经关闭时，Server 可以提前关闭 |
| WithTLS | nil | 配置 server tls 能力，详情可见 [TLS](/zh/docs/hertz/tutorials/basic-feature/protocol/tls/) |
| WithListenConfig | nil | 设置监听器配置，可用于设置是否允许 reuse port 等 |
| WithALPN | false | 是否开启 ALPN |
| WithTracer | []interface{}{} | 注入 tracer 实现，如不注入 Tracer 实现，默认关闭 |
| WithTraceLevel | LevelDetailed | 设置 trace level |
| WithWriteTimeout | 无限长 | 写入数据超时时间 |
| WithRedirectFixedPath | false | 如果开启，当当前请求路径不能匹配上时，server 会尝试修复请求路径并重新进行匹配，如果成功匹配并且为 GET 请求则会返回状态码 301 进行重定向，其他请求方式返回 308 进行重定向 |
| WithBasePath | `/` | 设置基本路径，前缀和后缀必须为 `/` |
| WithMaxKeepBodySize | 4 * 1024 * 1024 | 设置回收时保留的请求体和响应体的最大大小。单位：字节 |
| WithGetOnly | false | 如果开启则只接受 GET 请求 |
| WithKeepAlive | true | 如果开启则使用 HTTP 长连接 |
| WithAltTransport | network.NewTransporter | 设置备用 transport |
| WithH2C | false | 设置是否开启 H2C |
| WithReadBufferSize | 4 * 1024 | 设置读缓冲区大小，同时限制 HTTP header 大小 |
| WithRegistry | registry.NoopRegistry, nil | 设置注册中心配置，服务注册信息 |
| WithAutoReloadRender | false, 0 | 设置自动重载渲染配置 |
| WithDisablePrintRoute | false | 设置是否禁用 debugPrintRoute |
| WithOnAccept | nil | 设置在 netpoll 中当一个连接被接受但不能接收数据时的回调函数，在 go net 中在转换 TLS 连接之前被调用 |
| WithOnConnect | nil | 设置 onConnect 函数。它可以接收来自 netpoll 连接的数据。在 go net 中，它将在转换 TLS 连接后被调用 |
| WithDisableHeaderNamesNormalizing|false|设置是否禁用 Request 和 Response Header 名字的规范化 (首字母和破折号后第一个字母大写)|

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

该函数支持服务的优雅退出，优雅退出的详细内容请看 [优雅退出](/zh/docs/hertz/tutorials/basic-feature/graceful-shutdown/)。

在使用 [服务注册发现](/zh/docs/hertz/tutorials/service-governance/service_discovery/) 的功能时，`Spin` 会在服务启动时将服务注册进入注册中心，并使用 `signalWaiter` 监测服务异常。

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

`SetCustomSignalWaiter` 函数用于自定义服务器接收信号后的处理函数，若没有设置自定义函数，Hertz 使用 `waitSignal` 函数作为信号处理的默认实现方式，详细内容请看 [优雅退出](/zh/docs/hertz/tutorials/basic-feature/graceful-shutdown/)。

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

func exampleMiddleware() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 在 Next 中的函数执行之前打印日志
        hlog.Info("print before...")
        // 使用 Next 使得路由匹配的函数执行
        c.Next(ctx)
        // 在 Next 中的函数执行之后打印日志
        hlog.Info("print after...")
    }
}
```

## 流式处理

Hertz 支持 Server 的流式处理，包括流式读和流式写。

> 注意：由于 netpoll 和 go net 触发模式不同，netpoll 流式为“伪”流式（由于 LT 触发，会由网络库将数据读取到网络库的 buffer 中），在大包的场景下（如：上传文件等）可能会有内存问题，推荐使用 go net。

### 流式读

Hertz Server 支持流式读取请求内容。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"), server.WithStreamBody(true), server.WithTransport(standard.NewTransporter))

	h.POST("/bodyStream", handler)

	h.Spin()
}

func handler(ctx context.Context, c *app.RequestContext) {
	// Acquire body streaming
	bodyStream := c.RequestBodyStream()
	// Read half of body bytes
	p := make([]byte, c.Request.Header.ContentLength()/2)
	r, err := bodyStream.Read(p)
	if err != nil {
		panic(err)
	}
	left, _ := ioutil.ReadAll(bodyStream)
	c.String(consts.StatusOK, "bytes streaming_read: %d\nbytes left: %d\n", r, len(left))
}
```

### 流式写

Hertz Server 支持流式写入响应。

提供了两种方式：

1. 用户在 handler 中通过 `ctx.SetBodyStream` 函数传入一个 `io.Reader`，然后按与示例代码（利用 channel 控制数据分块及读写顺序）类似的方式分块读写数据。**注意，数据需异步写入。**
  
    若用户事先知道传输数据的总长度，可以在 `ctx.SetBodyStream` 函数中传入该长度进行流式写，示例代码如 `/streamWrite1`。

    若用户事先不知道传输数据的总长度，可以在 `ctx.SetBodyStream` 函数中传入 -1 以 `Transfer-Encoding: chunked` 的方式进行流式写，示例代码如 `/streamWrite2`。

    示例代码：

    ```go
    func main() {
        h := server.Default(server.WithHostPorts("127.0.0.1:8080"), server.WithStreamBody(true), server.WithTransport(standard.NewTransporter))
    
        h.GET("/streamWrite1", func(c context.Context, ctx *app.RequestContext) {
            rw := newChunkReader()
            line := []byte("line\r\n")
            ctx.SetBodyStream(rw, 500*len(line))
    
            go func() {
                for i := 1; i <= 500; i++ {
                    // For each streaming_write, the upload_file prints
                    rw.Write(line)
                    fmt.Println(i)
                    time.Sleep(10 * time.Millisecond)
                }
                rw.Close()
            }()
    
            go func() {
                <-ctx.Finished()
                fmt.Println("request process end")
            }()
        })
    
        h.GET("/streamWrite2", func(c context.Context, ctx *app.RequestContext) {
            rw := newChunkReader()
            // Content-Length may be negative:
            // -1 means Transfer-Encoding: chunked.
            ctx.SetBodyStream(rw, -1)
    
            go func() {
                for i := 1; i < 1000; i++ {
                    // For each streaming_write, the upload_file prints
                    rw.Write([]byte(fmt.Sprintf("===%d===\n", i)))
                    fmt.Println(i)
                    time.Sleep(100 * time.Millisecond)
                }
                rw.Close()
            }()
    
            go func() {
                <-ctx.Finished()
                fmt.Println("request process end")
            }()
        })
    
        h.Spin()
    }
    
    type ChunkReader struct {
        rw  bytes.Buffer
        w2r chan struct{}
        r2w chan struct{}
    }
    
    func newChunkReader() *ChunkReader {
        var rw bytes.Buffer
        w2r := make(chan struct{})
        r2w := make(chan struct{})
        cr := &ChunkReader{rw, w2r, r2w}
        return cr
    }
    
    var closeOnce = new(sync.Once)
    
    func (cr *ChunkReader) Read(p []byte) (n int, err error) {
        for {
            _, ok := <-cr.w2r
            if !ok {
                closeOnce.Do(func() {
                    close(cr.r2w)
                })
                n, err = cr.rw.Read(p)
                return
            }
    
            n, err = cr.rw.Read(p)
    
            cr.r2w <- struct{}{}
    
            if n == 0 {
                continue
            }
            return
        }
    }
    
    func (cr *ChunkReader) Write(p []byte) (n int, err error) {
        n, err = cr.rw.Write(p)
        cr.w2r <- struct{}{}
        <-cr.r2w
        return
    }
    
    func (cr *ChunkReader) Close() {
        close(cr.w2r)
    }
    
    ```

2. 用户可以在 handler 中使用  `pkg/protocol/http1/resp/writer` 下提供的 `NewChunkedBodyWriter` 方法劫持 response 的 writer，然后使用 `ctx.Write` 函数将分块数据写入 Body 并将分块数据使用 `ctx.Flush` 函数立即发送给客户端。

    示例代码：

    ```go
    h.GET("/flush/chunk", func(c context.Context, ctx *app.RequestContext) {
		// Hijack the writer of response
		ctx.Response.HijackWriter(resp.NewChunkedBodyWriter(&ctx.Response, ctx.GetWriter()))
    
		for i := 0; i < 10; i++ {
			ctx.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
			ctx.Flush()                                                                 // nolint: errcheck
			time.Sleep(200 * time.Millisecond)
		}
	})
    ```

**这两种方式的区别：第一种在执行完 handler 逻辑后再将数据按分块发送给客户端，第二种在 handler 逻辑中就可以将分块数据发送出去。**

更多示例代码可参考 [example](/zh/docs/hertz/tutorials/example/#流式读写)。

## 注册自定义协议

```go
func (engine *Engine) AddProtocol(protocol string, factory interface{})
```

详细信息可见 [注册自定义协议](/zh/docs/hertz/tutorials/framework-exten/protocol/#注册自定义协议-server-到-hertz-中)。

## SetClientIPFunc

该函数的参数 f 会被传递到 `RequestContext.SetClientIPFunc` 函数中，作用及示例代码见 [SetClientIPFunc](/zh/docs/hertz/tutorials/basic-feature/context/request/#setclientipfunc)。

函数签名：

```go
func (engine *Engine) SetClientIPFunc(f app.ClientIP)
```

## SetFormValueFunc

该函数的参数 f 会被传递到 `RequestContext.SetFormValueFunc` 函数中，作用及示例代码见 [SetFormValueFunc](/zh/docs/hertz/tutorials/basic-feature/context/request/#setformvaluefunc)。

函数签名：

```go
func (engine *Engine) SetFormValueFunc(f app.FormValueFunc)
```

## 钩子函数

钩子函数（Hooks）是一个通用的概念，表示某事件触发时所伴随的操作。

Hertz 提供了全局的 Hook 注入能力，用于在服务触发启动后和退出前注入自己的处理逻辑，详细信息可见 [Hooks](/zh/docs/hertz/tutorials/basic-feature/hooks/)。

## Panic 处理函数

用于设置当程序发生 panic 时的处理函数，默认为 `nil`。

>注意：如果同时设置了 `PanicHandler` 和 `Recovery` 中间件，则 `Recovery` 中间件会覆盖 `PanicHandler` 的处理逻辑。

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

## 底层网络库

```go
func (engine *Engine) GetTransporterName() (tName string)
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

### GetTransporterName

获取当前使用的网络库名称，现在有原生的 `go net` 和 `netpoll` 两种。

linux 默认使用 `netpoll`, windows 只能使用 `go net`。

如果对如何使用对应的网络库有疑惑，请查看 [此处](/zh/docs/hertz/tutorials/basic-feature/network-lib/)。

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

## 链路追踪

Hertz 提供了链路追踪的能力，也支持用户自定义链路跟踪，详情可参考 [链路追踪](/zh/docs/hertz/tutorials/observability/tracing/)。

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
