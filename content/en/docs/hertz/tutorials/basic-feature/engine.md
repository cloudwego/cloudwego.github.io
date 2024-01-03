---
title: "Engine"
date: 2023-08-18
weight: 1
description: >
---


`Server.Hertz` is the core type of `Hertz`, consisting of `route.Engine` and `signalWaiter`. The important methods for starting, registering routes, registering middleware, and exiting the `Hertz` server are all included in `server.Hertz`. The following is the definition of `server.Hertz`:

```go
type Hertz struct {
    *route.Engine 
    // used to receive signal for elegant exit
    signalWaiter func (err chan error) error
}
```

`Route.Engine` is an important component of `server.Hertz`, and the definition of `Engine` is located in [Engine](https://github.com/cloudwego/hertz/blob/main/pkg/route/engine.go).

## Config

|  **Option**   | **Default**  |  **Description**  |
|  :----  | :----  | :---- |
| WithTransport  | network.NewTransporter | Replace the transport |
| WithHostPorts  | `:8888` | Specify the listening address and port |
| WithKeepAliveTimeout | 1min | Set the keep-alive time of tcp persistent connection, generally no need to modify it, you should more pay attention to idleTimeout rather than modifying it |
| WithReadTimeout | 3min | The timeout of data reading |
| WithIdleTimeout | 3min | The free timeout of the request link for persistent connection |
| WithMaxRequestBodySize | 4 * 1024 * 1024 | Max body size of a request |
| WithRedirectTrailingSlash | true | Whether to redirect with the / which is at the end of the router automatically. For example： If there is only /foo/ in the router, /foo will be redirected to /foo/. And if there is only /foo in the router, /foo/ will be redirected to /foo |
| WithRemoveExtraSlash | false | RemoveExtraSlash makes the parameter still valid when it contains an extra /. For example, if WithRemoveExtraSlash is true user//xiaoming can match the user/:name router |
| WithUnescapePathValues | true | If true, the request path will be escaped automatically (eg. '%2F' -> '/'). If UseRawPath is false (the default), UnescapePathValues is true, because  URI().Path() will be used and it is already escaped. To set WithUnescapePathValues to false, you need to set WithUseRawPath to true |
| WithUseRawPath | false | If true, the original path will be used to match the route |
| WithHandleMethodNotAllowed | false | If true when the current path cannot match any method, the server will check whether other methods are registered with the route of the current path, and if exist other methods, it will respond "Method Not Allowed" and return the status code 405; if not, it will use the handler of NotFound to handle it |
| WithDisablePreParseMultipartForm | false | If true, the multipart form will not be preprocessed. The body can be obtained via ctx.Request.Body() and then can be processed by user |
| WithStreamBody | false | If true, the body will be handled by stream processing |
| WithNetwork | "tcp" | Set the network protocol, optional: tcp，udp，unix(unix domain socket) |
| WithExitWaitTime | 5s | Set the graceful exit time. the Server will stop connection establishment for new requests and set the Connection: Close header for each request after closing. When the set time is reached, Server will to be closed. the Server can be closed early when all connections have been closed |
| WithTLS | nil | Configuring server tls capabilities, For detailed information, please refer to [TLS](/zh/docs/hertz/tutorials/basic-feature/protocol/tls/) |
| WithListenConfig | nil | Set the listener configuration. Can be used to set whether to allow reuse ports, etc.|
| WithALPN | false | Whether to enable ALPN |
| WithTracer | []interface{}{} | Inject tracer implementation, if not inject Tracer, default: close. |
| WithTraceLevel | LevelDetailed | Set trace level |
| WithWriteTimeout | infinite | The timeout of data writing |
| WithRedirectFixedPath | false | If enabled, if the current request path does not match, the server will try to repair the request path and re-match, if the match is successful and the request is a GET request, it will return status code 301 for redirect, other requests will return 308 for redirect |
| WithBasePath | `/` | Set the base path, which must be prefixed and suffixed with `/` |
| WithMaxKeepBodySize | 4 * 1024 * 1024 | Sets the maximum size of the request body and response body to be retained during reclaim. Unit: Byte |
| WithGetOnly | false | If enabled, only GET requests are accepted |
| WithKeepAlive | true | If enabled, use HTTP keepalive |
| WithAltTransport | network.NewTransporter | Set up the alternate transport |
| WithH2C | false | Sets whether H2C is enabled |
| WithReadBufferSize | 4 * 1024 | Set the read buffer size while limiting the HTTP header size |
| WithRegistry | registry.NoopRegistry, nil | Setup registry configuration, service registration information |
| WithAutoReloadRender | false, 0 | Set up the automatic reload rendering configuration |
| WithDisablePrintRoute | false | Sets whether debugPrintRoute is disabled |
| WithOnAccept | nil | Set the callback function when a new connection is accepted but cannot receive data in netpoll. In go net, it will be called before converting tls connection |
| WithOnConnect | nil | Set the onConnect function. It can received data from connection in netpoll. In go net, it will be called after converting tls connection |
| WithDisableHeaderNamesNormalizing|false|Sets whether or not to disable Request and Response Header name normalization (capitalization of the first letter and the first letter after a dash)|

Server Connection limitation:

* If you are using the standard network library, there is no such restriction.
* If netpoll is used, the maximum number of connections is 10000 (this is
  the [gopool](https://github.com/bytedance/gopkg/blob/b9c1c36b51a6837cef4c2223e11522e3a647460c/util/gopool/gopool.go#L46))
  used at the bottom of netpoll. Yes, the modification method is also very simple, just call the function provided by
  gopool: `gopool.SetCap(xxx)` (you can call it once in main.go).

The configuration items on the server side are initialized using the `server.WithXXX` method, such as:

```go
func main() {
	h := server.New(server.WithXXXX())
	...
}
```

## Initial Service

```go
func Default(opts ...config.Option) *Hertz
func New(opts ...config.Option) *Hertz
```

### Default

`Default` is used to initialize the service, and the `Recovery` middleware is used by default to ensure that the service will not crash during runtime due to `panic`.

Function Signature:

```go
func Default(opts ...config.Option) *Hertz
```

Example Code:

```go
func main() {
    h := server.Default()
    h.Spin()
}
```

### New

`New` is used to initialize service and does not use the default `Recovery` middleware.

Function Signature:

```go
func New(opts ...config.Option) *Hertz
```

Example Code:

```go
func main() {
    h := server.New()
    h.Spin()
}
```

## Service Run and Exit

```go
func (h *Hertz) Spin()
func (engine *Engine) Run() (err error)
func (h *Hertz) SetCustomSignalWaiter(f func(err chan error) error)
```

### Spin

The `Spin` function is used to run the Hertz server and can exit the service upon receiving an exit signal.

This function supports graceful shutdown of services. For detailed information on graceful shutdown, please refer to [graceful-shutdown](/docs/hertz/tutorials/basic-feature/graceful-shutdown/).

When using the function of [service_discovery](/docs/hertz/tutorials/service-governance/service_discovery/), `Spin` will register the service into the registry when it is started, and use `signalWaiter` to monitor service exceptions.

Function Signature:

```go
func (h *Hertz) Spin()
```

Example Code:

```go
func main() {
    h := server.Default()
    h.Spin()
}
```

### Run

The `Run` function is used to run the Hertz server and can exit the service upon receiving an exit signal.

This function does not support graceful shutdown of service. Unless there are **special** requirements, the [Spin](#spin) function is generally used to run service.

Function Signature:

```go
func (engine *Engine) Run() (err error)
```

Example Code:

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

The `SetCustomimSignalWaiter` function is used to customize the processing function of the server after receiving signals. If no custom function is set, Hertz uses the `waitSignal` function as the default implementation method for signal processing. For more details, please refer to [graceful-shutdown](/docs/hertz/tutorials/basic-feature/graceful-shutdown/).

Function Signature:

```go
func (h *Hertz) SetCustomSignalWaiter(f func(err chan error) error)
```

Example Code:

```go
func main() {
	h := server.New()
	h.SetCustomSignalWaiter(func(err chan error) error {
		return nil
	})
	h.Spin()
}
```

## Middleware

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

### Use

The `Use` function is used to register the middleware into the router.

Hertz supports user-defined middleware, and has implemented some commonly used middleware. Please refer to [hertz contrib](https://github.com/hertz-contrib) for details.

The usage methods of middleware supported by Hertz include **global registration**, **routing group** level, and **single routing** level registration. For details, please refer to [server-side-middleware](/docs/hertz/tutorials/basic-feature/middleware/#server-side-middleware).

The formal parameter of `middleware` in the `Use` function must be the http processing function of `app.HandlerFunc`:

```go
type HandlerFunc func (ctx context.Context, c *app.RequestContext)
```

Function Signature:

```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

Example Code:

```go
func main() {
    h := server.New()
    // Register built-in Recovery middleware into routes.
    h.Use(recovery.Recovery())
    // Use custom middleware.
    h.Use(exampleMiddleware())
}

func exampleMiddleware() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // Print logs before executing functions in Next.
        hlog.Info("print before...")
        // Use Next to execute the matching function in route.
        c.Next(ctx)
        // Print logs after executing functions in Next.
        hlog.Info("print after...")
    }
}
```

## Streaming

Hertz supports server streaming processing, including streaming read and streaming write.

> Note: Due to the different triggering modes between netpoll and go net, netpoll streaming is "pseudo" (due to LT triggering, data will be read into the buffer of the network library by the network library). In scenarios with large packets (such as uploading files), there may be memory issues, and it is recommended to use go net.

### Streaming Write

Hertz Server supports streaming read request content.

Example Code:

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

### Streaming Read

Hertz Server supports streaming write responses.

Two methods are provided:

1. The user passes in a `io.Reader` through the `ctx.SetBodyStream` function in the handler, and then reads and writes data in blocks in a similar manner to the example code (using channel to control data partitioning and read/write order) **Note that data needs to be written asynchronously**.

    If the user knows the total length of the transmitted data in advance, they can pass in the length in the `ctx.SetBodyStream` function for streaming writing, as shown in the example code `/streamWrite1`.

    If the user does not know the total length of the transmitted data in advance, they can pass in -1 in the `ctx.SetBodyStream` function to write the stream in the form of `Transfer-Encoding: chunked`, as shown in the example code `/streamWrite2`.

    Example Code:

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

2. Users can use the `NewChunkedBodyWriter` method provided under `pkg/protocol/http1/resp/writer` in the handler to hijack the response writer, and then use the `ctx.Write` function to write the partitioned data to the body and immediately send it to the client using the `ctx.Flush` function.

    Example Code:

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

**The difference between these two methods: the first method sends the data to the client in blocks after executing the handler logic, and the second method can send the partitioned data out in the handler logic.**

For more example code, please refer to [example](/docs/hertz/tutorials/example/#streaming-readwrite).

## Register Custom Protocol

```go
func (engine *Engine) AddProtocol(protocol string, factory interface{})
```

Detailed information can be found in [registration-of-custom-protocol-server-into-hertz](/docs/hertz/tutorials/framework-exten/protocol/#registration-of-custom-protocol-server-into-hertz).

## SetClientIPFunc

The parameter f of this function will be passed to the `RequestContext.SetClientIPFunc` function. The function and example code are shown in [SetClientIPFunc](/docs/hertz/tutorials/basic-feature/context/request/#setclientipfunc).

Function Signature:

```go
func (engine *Engine) SetClientIPFunc(f app.ClientIP)
```

## SetFormValueFunc

The parameter f of this function will be passed to the `RequestContext.SetFormValueFunc` function. The function and example code are shown in [SetFormValueFunc](/docs/hertz/tutorials/basic-feature/context/request/#setformvaluefunc).

Function Signature:

```go
func (engine *Engine) SetFormValueFunc(f app.FormValueFunc)
```

## Hooks

Hook function is a general concept that represents the operations that accompany an event when it is triggered.

Hertz provides global Hook injection capabilities for injecting its own processing logic after service triggering and before exiting. For detailed information, please refer to [Hooks](/docs/hertz/tutorials/basic-feature/hooks/).

## PanicHandler

Used to set the handler function when panic occurs in the program, default to `nil`.

> Note: If both `PanicHandler` and `Recovery` middleware are set, the `Recovery` middleware will override the handler logic of `PanicHandler`.

Example Code:

```go
func main() {
    h := server.New()
    // When in Panic, the function in PanicHandler will be triggered, returning a 500 status code and carrying error information
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

Call ContinueHandler after receiving the Expect 100 Continue header sent by the client. Using ContinueHandler, the server can decide whether to read potentially large request bodies, which will be read by default.

Example Code:

```go
h := server.Default()
h.ContinueHandler = func(header *protocol.RequestHeader) bool {
	return false
}
```

## Rendering Template

Hertz provides methods such as `Delims`, `SetFuncMap`, `LoadHTMLGlob`, and `LoadHTMLFiles` for rendering HTML or template files. For detailed information, please refer to [HTML](/docs/hertz/tutorials/basic-feature/render/#html).

## Using NoRoute and NoMethod

Hertz provides `NoRoute` and `NoMethod` methods for global processing of HTTP 404 and 405 requests. For detailed information, please refer to [NoRoute And NoMethod](/docs/hertz/tutorials/basic-feature/route/#noroute-and-nomethod).

## Get Route Information

```go
func (engine *Engine) Routes() (routes RoutesInfo)
```

### Routes

The `Routes` function returns a slice divided by HTTP methods that contains routing information (HTTP method name, routing path, request handler function name).

Function Signature:

```go
func (engine *Engine) Routes() (routes RoutesInfo)
```

Example Code:

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

## Transporter

```go
func (engine *Engine) GetTransporterName() (tName string)
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

### GetTransporterName

Obtain the name of the currently used network library, which now has two native options: `go net` and `netpoll`.

Linux uses `netpoll` by default, while Windows can only use `go net`.

If you have any doubts about how to use the corresponding network library, please refer to [here](/docs/hertz/tutorials/basic-feature/network-lib/).

Function Signature:

```go
func (engine *Engine) GetTransporterName() (tName string)
```

Example Code:

```go
h := server.New()
tName := h.GetTransporterName()
```

### SetTransporter

`SetTransporter` is used to set network library.

> Note: `SetTransporter` only sets the global default values of the Engine, so using `WithTransporter` to set the network library when initializing the Engine will overwrite the settings of `SetTransporter`.

Function Signature:

```go
func SetTransporter(transporter func (options *config.Options) network.Transporter)
```

Example Code:

```go
route.SetTransporter(standard.NewTransporter)
```

## Tracing

Hertz provides the capability of link tracking and also supports user-defined link tracking. For details, please refer to [tracking](/docs/hertz/tutorials/observability/tracing/).

## Hijack

### NoHijackConnPool

> The hijacked connection used during Hertz connection hijacking is managed by pool management. Therefore, when the hijacked connection is used for websockets it does not support asynchronous operations.

The hijacked connection can only be closed once; closing it a second time will result in a null pointer exception.

NoHijackConnPool controls whether to use cache pools to obtain/release hijacked connections. Using pools improves performance of memory resource allocation but cannot prevent exceptions caused by closing connections twice.

If it is difficult to ensure that hijackConn won't be closed repeatedly, it can be set as true.

Example Code:

```go
package main

func main() {
    // https://github.com/cloudwego/hertz/issues/121
    h.NoHijackConnPool = true
}
```

### HijackConnHandle

Set the Hijack connection processing function.

Function Signature:

```go
func (engine *Engine) HijackConnHandle(c network.Conn, h app.HijackHandler)
```
