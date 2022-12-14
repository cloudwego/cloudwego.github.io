---
title: "迁移文档"
linkTitle: "迁移文档"
weight: 4
description: >

---

# Hertz 迁移文档

## 迁移脚本

Hertz-contrib 下提供了其他框架( FastHTTP ) 迁移至 Hertz 的脚本，具体使用方式如下

```shell
cd your_project_path
sh -c "$(curl -fsSL https://raw.github.com/hertz-contrib/migrate/main/migrate.sh)"
```

脚本处理后，仍有小部分无法自动迁移，需要手动迁移，迁移注意事项如下

## FastHTTP

### 处理函数

- 相对于 FastHTTP 的 RequestHandler ，Hertz 的 [HandlerFunc](https://pkg.go.dev/github.com/cloudwego/hertz@v0.4.1/pkg/app#HandlerFunc) 接受两个参数：context.Context 和 [RequestContext](https://pkg.go.dev/github.com/cloudwego/hertz@v0.4.1/pkg/app#RequestContext) 。context.Context 用于解决请求上下文无法按需延长的问题，同时请求上文不再需要实现上下文接口，降低了维护难度。详细可以参考：[字节跳动开源 Go HTTP 框架 Hertz 设计实践](https://www.cloudwego.io/zh/blog/2022/06/21/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%BC%80%E6%BA%90-go-http-%E6%A1%86%E6%9E%B6-hertz-%E8%AE%BE%E8%AE%A1%E5%AE%9E%E8%B7%B5/#%E5%BA%94%E7%94%A8%E5%B1%82)

- 具体例子如下：

```Go
// fasthttp request handler
type RequestHandler = func(ctx *fasthttp.RequestCtx)

// the corresponding hertz request handler
type HandlerFunc = func(c context.Context, ctx *app.RequestContext)
```

### UserValue

- Hertz 提供了两个接口来存储 UserValue，分别是请求上下文 RequestContext.Keys 和标准库的 RequestContext.Value。requestContext.Keys 在请求中使用，请求结束就会回收。context.Value 不会在请求结束的回收，可以用于异步场景(如 log，协程等)。

- fasthttp 中 Value 和 UserValue 是等价的，但在 Hertz 中 RequestContext.Keys 和 context.Value 分别对应了不同的接口，两者数据不同。

### 路由

- Hertz 提供了一套完整高效的路由，且提供了 [ctx.Param](https://pkg.go.dev/github.com/cloudwego/hertz@v0.4.1/pkg/app#RequestContext.Param) 方法来获取路由参数。

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

- Hertz 不提供 ListenAndServe 等方法，具体监听端口等参数需要在初始化参数中确定，详细参数参考 [server package - github.com/cloudwego/hertz/pkg/app/server - Go Packages](https://pkg.go.dev/github.com/cloudwego/hertz@v0.4.1/pkg/app/server#New)

```Go
// fasthttp ListenAndServe
func main() {
    ...

    fasthttp.ListenAndServe(":8080", myHandler)
}
```

```Go
// hertz example
func main() {
     r := server.Default(server.WithHostPorts(":8080"))

     ...

     r.Spin()
}
```

## 附录

### [FastHTTP -> Hertz conversion table](https://github.com/hertz-contrib/migrate/blob/main/fasthttp_to_hertz.md)

### [Hertz API Doc](https://pkg.go.dev/github.com/cloudwego/hertz)
