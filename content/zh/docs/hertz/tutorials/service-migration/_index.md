---
title: "迁移到 Hertz"
weight: 7
keywords: ["迁移到 Hertz"]
description: "Hertz 提供了其他框架( FastHTTP、Gin ) 迁移至 Hertz 的能力。"
---

## 迁移脚本

Hertz-contrib 下提供了其他框架( FastHTTP、Gin ) 迁移至 Hertz 的脚本，具体使用方式如下：

```shell
cd your_project_path
sh -c "$(curl -fsSL https://raw.github.com/hertz-contrib/migrate/main/migrate.sh)"
```

脚本处理后，仍有小部分无法自动迁移，需要手动迁移。
迁移小 tip：比如要修改 Header 的 API，那 Header 是在 Request（Response）中，那 Hertz 中的 Api 就是 `ctx.Request.Header.XXX()`，其他 API 同理。为了方便用户使用，Hertz 也在 ctx 上添加了高频使用的 API，比如获取 Body 时使用 `ctx.Body` 就可以，不用使用 `ctx.Request.Body()` 了。

## FastHTTP

### 处理函数

- 相对于 FastHTTP 的 RequestHandler ，Hertz 的 [HandlerFunc](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#HandlerFunc) 接受两个参数：context.Context 和 [RequestContext](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext) 。context.Context 用于解决请求上下文无法按需延长的问题，同时请求上下文不再需要实现上下文接口，降低了维护难度。详细可以参考：[字节跳动开源 Go HTTP 框架 Hertz 设计实践](/zh/blog/2022/06/21/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%BC%80%E6%BA%90-go-http-%E6%A1%86%E6%9E%B6-hertz-%E8%AE%BE%E8%AE%A1%E5%AE%9E%E8%B7%B5/#%E5%BA%94%E7%94%A8%E5%B1%82) 。

- 具体例子如下：

```Go
// fasthttp request handler
type RequestHandler = func(ctx *fasthttp.RequestCtx)

// the corresponding Hertz request handler
type HandlerFunc = func(c context.Context, ctx *app.RequestContext)
```

### UserValue

- Hertz 提供了两个接口来存储 UserValue，分别是请求上下文 RequestContext.Keys 和标准库的 context.Value。requestContext.Keys 在请求中使用，请求结束就会回收。context.Value 不会在请求结束时就回收，可以用于异步场景(如 log，协程等)。

- fasthttp 中 Value 和 UserValue 是等价的，但在 Hertz 中 RequestContext.Keys 和 context.Value 分别对应了不同的接口，两者数据不同。

### 路由

- Hertz 提供了一套完整高效的路由，且提供了 [ctx.Param](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext.Param) 方法来获取路由参数。

- 具体例子如下：

```Go
// fasthttp + fasthttp router example
func Hello(ctx *fasthttp.RequestCtx) {
        fmt.Fprintf(ctx, "Hello, %s!\n", ctx.UserValue("name"))
}

func main() {
        r := router.New()
        r.GET("/hello/{name}", Hello)

        ...
}
```

```Go
// the corresponding hertz example
func Hello(c context.Context, ctx *app.RequestContext) {
        fmt.Fprintf(ctx, "Hello, %s!\n", ctx.Param("name"))
}

func main() {
        r := server.Default()
        r.GET("/hello/:name", Hello)

        ...
}
```

### ListenAndServe

- Hertz 不提供 ListenAndServe 等方法，具体监听端口等参数需要在初始化参数中确定，详细参数参考 [server package - github.com/cloudwego/hertz/pkg/app/server - Go Packages](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app/server#New) 。

```Go
// fasthttp ListenAndServe
func main() {
    ...

    fasthttp.ListenAndServe(":8080", myHandler)
}
```

```Go
// Hertz example
func main() {
     r := server.Default(server.WithHostPorts(":8080"))

     ...

     r.Spin()
}
```

## Gin

### 处理函数

- 相对于 Gin 的 RequestHandler ，Hertz 的 [HandlerFunc](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#HandlerFunc) 接受两个参数：context.Context 和 [RequestContext](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext) context.Context 即 Gin 中的 ctx.Request.Context() 。详细可以参考：[字节跳动开源 Go HTTP 框架 Hertz 设计实践](/zh/blog/2022/06/21/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%BC%80%E6%BA%90-go-http-%E6%A1%86%E6%9E%B6-hertz-%E8%AE%BE%E8%AE%A1%E5%AE%9E%E8%B7%B5/#%E5%BA%94%E7%94%A8%E5%B1%82) 。
- 具体例子如下：

```Go
// Gin request handler
type RequestHandler = func(ctx *gin.Context)

// the corresponding Hertz request handler
type HandlerFunc = func(c context.Context, ctx *app.RequestContext)
```

### 参数绑定

- Hertz 目前只支持 Bind 绑定所有的数据，不支持单独绑定 Query 或是 Body 中的数据，详细内容请参考[绑定与校验](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/#%E6%94%AF%E6%8C%81%E7%9A%84-tag-%E5%8F%8A%E5%8F%82%E6%95%B0%E7%BB%91%E5%AE%9A%E4%BC%98%E5%85%88%E7%BA%A7) 。

### 设置 Response 数据

- Hertz 支持乱序设置 Response 的 Header 和 Body，不像 Gin 必须要求先设置 Header，再设置 Body。
- 具体例子如下：

```Go
// The example is valid on Hertz
func Hello(c context.Context, ctx *app.RequestContext) {
        // First, Set a body
        fmt.Fprintf(ctx, "Hello, World\n")

        // Then, Set a Header
        ctx.Header("Hertz", "test")
}
```

### ListenAndServe

- Hertz 没有实现 [http.Handler](https://pkg.go.dev/net/http#Handler)，不能使用 http.Server 来监听端口。同时，Hertz 具体的监听参数要在初始化参数中确定，详细参数参考 [server package - github.com/cloudwego/hertz/pkg/app/server - Go Packages](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app/server#New)。

```Go
// Gin Run or use http.Server
func main() {
    r := gin.Default()

    ...

    r.Run(":8080")

    // or use http.Server
    srv := &http.Server{
        Addr:    ":8080",
        Handler: r,
    }
}
```

```Go
// Hertz example
func main() {
     r := server.Default(server.WithHostPorts(":8080"))

     ...

     r.Spin()
}
```

## 附录

- [FastHTTP -> Hertz conversion table](https://github.com/hertz-contrib/migrate/blob/main/fasthttp_to_hertz.md)

- [Gin -> Hertz conversion table](https://github.com/hertz-contrib/migrate/blob/main/gin_to_hertz.md)

- [Hertz API Doc](https://pkg.go.dev/github.com/cloudwego/hertz)
