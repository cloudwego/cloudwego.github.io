---
title: "中间件概览"
date: 2022-05-20
weight: 6
description: >

---

Hertz中间件的种类是多种多样的，简单分为两大类：

- 服务端中间件
- 客户端中间件

## 服务端中间件

Hertz 服务端中间件是 HTTP 请求－响应周期中的一个函数，提供了一种方便的机制来检查和过滤进入应用程序的 HTTP 请求， 例如记录每个请求或者启用CORS。

|![middleware](/img/docs/hertz_middleware.png )|
|:--:|
|图1：中间件调用链|

中间件可以在请求更深入地传递到业务逻辑之前或之后执行：

- 中间件可以在请求到达业务逻辑之前执行，比如执行身份认证和权限认证，当中间件只有初始化（pre-handle）相关逻辑，且没有和 real handler 在一个函数调用栈中的需求时，中间件中可以省略掉最后的`.Next`，如图1的中间件 B。
- 中间件也可以在执行过业务逻辑之后执行，比如记录响应时间和从异常中恢复。如果在业务 handler 处理之后有其它处理逻辑（ post-handle ），或对函数调用链（栈）有强需求，则必须显式调用`.Next`，如图1的中间件 C。

### 实现一个中间件

```go
// 方式一
func MyMiddleware() app.HandlerFunc {
  return func(ctx context.Context, c *app.RequestContext) {
    // pre-handle
    // ...
    c.Next(ctx)
  }
}

// 方式二
func MyMiddleware() app.HandlerFunc {
  return func(ctx context.Context, c *app.RequestContext) {
    c.Next(ctx) // call the next middleware(handler)
    // post-handle
    // ...
  }
}
```

中间件会按定义的先后顺序依次执行，如果想快速终止中间件调用，可以使用以下方法，注意**当前中间件仍将执行**。

- `Abort()`：终止后续调用
- `AbortWithMsg(msg string, statusCode int)`：终止后续调用，并设置 response中body，和状态码
- `AbortWithStatus(code int)`：终止后续调用，并设置状态码

### Server 级别中间件

Server 级别中间件会对整个server的路由生效

```go
h := server.Default()
h.Use(GlobalMiddleware())
```

### 路由组级别中间件

路由组级别中间件对当前路由组下的路径生效

```go
h := server.Default()
group := h.Group("/group")
group.Use(GroupMiddleware())
```

或者

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func GroupMiddleware() []app.HandlerFunc {
	return []app.HandlerFunc{func(ctx context.Context, c *app.RequestContext) {
		fmt.Println("group middleware")
		c.Next(ctx)
	}}
}

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8888"))

	group := h.Group("/group", append(GroupMiddleware(),
        func(ctx context.Context, c *app.RequestContext) {
            fmt.Println("group middleware 2")
            c.Next(ctx)
        })...)
	// ...
	h.Spin()
}
```

### 单一路由级别中间件

单一路由级别中间件只对当前路径生效

```go
package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func PathMiddleware() []app.HandlerFunc {
	return []app.HandlerFunc{func(ctx context.Context, c *app.RequestContext) {
		fmt.Println("path middleware")
		c.Next(ctx)
	}}
}

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8888"))

	h.GET("/path", append(PathMiddleware(),
		func(ctx context.Context, c *app.RequestContext) {
			c.String(http.StatusOK, "path")
		})...)

	h.Spin()
}
```

> 如果你使用hz工具和IDL开发项目、router文件夹下会自动根据服务和方法生成路由组中间件和单一方法中间件模板，你可以在其中添加相应的逻辑，定制自己的个性化中间件。

### 使用默认中间件

Hertz 框架已经预置了常用的 recover 中间件，使用 `server.Default()` 默认可以注册该中间件。

### 常用中间件

Hertz 提供了常用的 BasicAuth、CORS、JWT等中间件，更多实现可以在 [hertz-contrib](https://github.com/hertz-contrib) 查找，其他中间件如有需求，可提 [issue](https://github.com/cloudwego/hertz/issues/) 告诉我们。

## 客户端中间件

客户端中间件可以在请求发出之前或获取响应之后执行：

- 中间件可以在请求发出之前执行，比如统一为请求添加签名或其他字段。
- 中间件也可以在收到响应之后执行，比如统一修改响应结果适配业务逻辑。

### 实现一个中间件

客户端中间件实现和服务端中间件不同。Client 侧无法拿到中间件 index 实现递增，因此 Client 中间件采用提前构建嵌套函数的形式实现，在实现一个中间件时，可以参考下面的代码。

```go
func MyMiddleware(next client.Endpoint) client.Endpoint {
  return func(ctx context.Context, req *protocol.Request, resp *protocol.Response) (err error) {
    // pre-handle
    // ...
    err = next(ctx, req, resp)
    if err != nil {
      return
    }
    // post-handle
    // ...
  }
}
```

> 注意：必须执行 `next` 方法才能继续调用后续中间件。如果想停止中间件调用，在 `next` 之前返回就可以了。

### 注册一个中间件

注册中间件的方式和 Server 相同

```go
c, err := client.NewClient()
c.Use(MyMiddleware)
```

### 完整示例

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/protocol"
)

func MyMiddleware(next client.Endpoint) client.Endpoint {
	return func(ctx context.Context, req *protocol.Request, resp *protocol.Response) (err error) {
		// pre-handle
		// ...
		fmt.Println("before request")

		req.AppendBodyString("k1=v1&")

		err = next(ctx, req, resp)
		if err != nil {
			return
		}
		// post-handle
		// ...
		fmt.Println("after request")

		return nil
	}
}

func main() {
	client, _ := client.NewClient()
	client.Use(MyMiddleware)
	statusCode, body, err := client.Post(context.Background(),
		[]byte{},
		"http://httpbin.org/redirect-to?url=http%3A%2F%2Fhttpbin.org%2Fpost&status_code=302",
		&protocol.Args{})
	fmt.Printf("%d, %s, %s", statusCode, body, err)
}
```

> 中间件可能执行不止一次，比如发生跳转等，需要考虑幂等性
