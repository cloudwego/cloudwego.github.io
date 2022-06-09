---
title: "中间件概览"
date: 2022-05-20
weight: 2
description: >

---

## Server
|![middleware](/img/docs/hertz_middleware.png )|
|:--:|
|Figure 1: middleware call chain|

### 实现一个中间件
Hertz 有两种方式实现中间件：
- 当中间件只有初始化（pre-handle）相关逻辑，且没有和 real handler 在一个函数调用栈中的需求时，中间件中可以省略掉最后的`.Next`，如图1的中间件 B。
- 如果在业务 handler 处理之后有其它处理逻辑（ post-handle ），或对函数调用链（栈）有强需求，则必须显示调用`.Next`，如图1的中间件 C。
```go
// 方式一
func MyMiddleware() app.HandlerFunc {
  return func(ctx context.Context, c *app.RequestContext) {
  // pre-handle
  ...
  }
}

// 方式二
func MyMiddleware() app.HandlerFunc {
  return func(ctx context.Context, c *app.RequestContext) {
    // pre-handle
    ...

    c.Next(ctx) // call the next middleware(handler)
    // post-handle
    ...

  }
}
```

如果想快速终止中间件调用，可以使用以下方法，注意当前中间件仍将执行。
- Abort()：终止后续调用
- AbortWithMsg(msg string, statusCode int)：终止后续调用，并设置 response中body，和状态码
- AbortWithStatus(code int)：终止后续调用，并设置状态码

### 注册一个中间件
```go
h := server.Default()
h.Use(MyMiddleware())
```

Hertz 框架目前支持在 Server、路由组、单一路由上注册中间件，使用 Use 方法即可注册。

### 使用默认中间件
Hertz 框架已经预置了常用的 recover 中间件，使用 `server.Default()` 默认可以注册该中间件。

### 常用中间件
Hertz 提供了常用的 BasicAuth、CORS、JWT、Swagger 等中间件，其他中间件如有需求，可提 issue 告诉我们。

## Client

### 实现一个中间件
Client 的中间件实现和 Server 不同。Client 侧无法拿到中间件 index 实现递增，因此 Client 中间件采用提前构建嵌套函数的形式实现中间件，在实现一个中间件时，可以参考下面的代码。
```go
func MyMiddleware(next client.Endpoint) client.Endpoint {
  return func(ctx context.Context, req *protocol.Request, resp *protocol.Response) (err error) {
    // pre-handle
    ...
    err = next(ctx, req, resp)
    if err != nil {
      return
    }
    // post-handle
    ...
  }
}
```

注意：必须执行 `next` 方法才能继续调用后续中间件。如果想停止中间件调用，在 `next` 之前返回就可以了。

### 注册一个中间件
注册中间件的方式和 Server 相同
```go
c, err := client.NewClient()
c.Use(MyMiddleware)
```
