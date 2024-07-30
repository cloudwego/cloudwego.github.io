---
title: "Migration to Hertz"
weight: 7
keywords: ["Migration to Hertz"]
description: "Hertz provides the ability to migrate from other frameworks (FastHTTP, Gin) to Hertz."
---

## Migration Script

The Hertz-contrib repository provides migration scripts for transferring other frameworks (FastHTTP, Gin) to Hertz. The specific usage is as follows:

```shell
cd your_project_path
sh -c "$(curl -fsSL https://raw.github.com/hertz-contrib/migrate/main/migrate.sh)"
```

After the script processing, a small portion may still require manual migration.
Migration Tip: For example, if you need to modify the API for the header, which is located in the request (or response), in Hertz,
the corresponding API is `ctx.Request.Header.XXX()` and other APIs follow a similar pattern. To make it easier for users to use,
Hertz has also added commonly used APIs to ctx, such as using `ctx.Body` to obtain the body, instead of using `ctx.Request.Body()`.

## FastHTTP

### Handler Function

- Compared to FastHTTP's RequestHandler, Hertz's [HandlerFunc](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#HandlerFunc) accepts two parameters: context.Context and
  [RequestContext](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext).
  context.Context is used to address the issue of request context being unable to extend as needed,
  while also reducing the maintenance complexity as the request context no longer needs to implement the context interface.
  For more information, please refer to: [Hertz: Design and Practice of the Go HTTP Framework Open-Sourced by ByteDance](/zh/blog/2022/06/21/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%BC%80%E6%BA%90-go-http-%E6%A1%86%E6%9E%B6-hertz-%E8%AE%BE%E8%AE%A1%E5%AE%9E%E8%B7%B5/#%E5%BA%94%E7%94%A8%E5%B1%82).

- Example as follows:

```Go
// fasthttp request handler
type RequestHandler = func(ctx *fasthttp.RequestCtx)

// the corresponding Hertz request handler
type HandlerFunc = func(ctx context.Context, c *app.RequestContext)
```

### UserValue

- Hertz provides two interfaces, RequestContext.Keys and context.Value, for storing UserValue. RequestContext.Keys is used within a request
  and will be recycled when the request is completed, while context.Value will not be recycled when the request is completed and
  can be used in asynchronous scenarios such as logging and coroutines.

- In fasthttp, Value and UserValue are equivalent, but in Hertz, RequestContext.Keys and context.Value correspond to different interfaces and have different data.

### Router

- Hertz provides a complete and efficient routing system and offers the [ctx.Param](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext.Param) method to retrieve routing parameters.

- Example as follows:

```Go
// fasthttp + fasthttp router example
func Hello(c *fasthttp.RequestCtx) {
    fmt.Fprintf(ctx, "Hello, %s!\n", c.UserValue("name"))
}

func main() {
        r := router.New()
        r.GET("/hello/{name}", Hello)

        ...
}
```

```Go
// the corresponding hertz example
func Hello(ctx context.Context, c *app.RequestContext) {
        fmt.Fprintf(ctx, "Hello, %s!\n", c.Param("name"))
}

func main() {
        r := server.Default()
        r.GET("/hello/:name", Hello)

        ...
}
```

### ListenAndServe

- Hertz does not provide methods such as ListenAndServe. The specific listening port and other parameters need to be determined in the initialization parameters.
  For detailed parameters, please refer to [server package - github.com/cloudwego/hertz/pkg/app/server - Go Packages](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app/server#New).

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

### Handler Function

- Compared to Gin's RequestHandler, Hertz's [HandlerFunc](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#HandlerFunc) accepts two parameters:
  context.Context and [RequestContext](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app#RequestContext), which is equivalent to
  ctx.Request.Context() in Gin. For more details, please refer to: [Hertz: Design and Practice of the Go HTTP Framework Open-Sourced by ByteDance](/zh/blog/2022/06/21/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%BC%80%E6%BA%90-go-http-%E6%A1%86%E6%9E%B6-hertz-%E8%AE%BE%E8%AE%A1%E5%AE%9E%E8%B7%B5/#%E5%BA%94%E7%94%A8%E5%B1%82).
- Example as follows:

```Go
// Gin request handler
type RequestHandler = func(ctx *gin.Context)

// the corresponding Hertz request handler
type HandlerFunc = func(ctx context.Context, c *app.RequestContext)
```

### Parameter Binding

- Hertz currently only supports binding all data with 'Bind', and does not support binding data separately in Query or Body. For more details,
  please refer to [Binding and Validation](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/#%E6%94%AF%E6%8C%81%E7%9A%84-tag-%E5%8F%8A%E5%8F%82%E6%95%B0%E7%BB%91%E5%AE%9A%E4%BC%98%E5%85%88%E7%BA%A7).

### Set Response Data

- Hertz supports setting the Response's Header and Body in any order, unlike Gin which requires setting the Header first before setting the Body.
- Example as follows:

```Go
// The example is valid on Hertz
func Hello(ctx context.Context, c *app.RequestContext) {
        // First, Set a body
        fmt.Fprintf(ctx, "Hello, World\n")

        // Then, Set a Header
        c.Header("Hertz", "test")
}
```

### ListenAndServe

- Hertz does not implement [http.Handler](https://pkg.go.dev/net/http#Handler) and cannot be used with http.Server to listen on a port. Additionally,
  the specific listening parameters for Hertz must be determined in the initialization parameters,
  with detailed parameters referenced in the [server package - github.com/cloudwego/hertz/pkg/app/server - Go Packages](https://pkg.go.dev/github.com/cloudwego/hertz/pkg/app/server#New).

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

## Appendix

- [FastHTTP -> Hertz conversion table](https://github.com/hertz-contrib/migrate/blob/main/fasthttp_to_hertz.md)

- [Gin -> Hertz conversion table](https://github.com/hertz-contrib/migrate/blob/main/gin_to_hertz.md)

- [Hertz API Doc](https://pkg.go.dev/github.com/cloudwego/hertz)
