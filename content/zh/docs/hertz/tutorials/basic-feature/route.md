---
title: "路由"
date: 2022-09-06
weight: 2
description: >

---

## 路由注册

Hertz 提供了 `GET`、`POST`、`PUT`、`DELETE`、`ANY` 等方法用于注册路由。


| 方法  | 介绍  |
| ------------ | ------------ |
|  `Hertz.GET`   |  用于注册 HTTP Method 为 GET 的方法    |
|  `Hertz.POST` |  用于注册 HTTP Method 为 POST 的方法  |
|  `Hertz.DELETE` |  用于注册 HTTP Method 为 DELETE 的方法  |
|  `Hertz.PUT` |  用于注册 HTTP Method 为 PUT 的方法  |
|  `Hertz.PATCH` |  用于注册 HTTP Method 为 PATCH 的方法  |
|  `Hertz.HEAD` |  用于注册 HTTP Method 为 HEAD 的方法  |
|  `Hertz.OPTIONS` |  用于注册 HTTP Method 为 OPTIONS 的方法  |
|  `Hertz.Handle` |  这个方法支持用户手动传入 HTTP Method 用来注册方法，当用于注册普通的 HTTP Method 方法时和上述的方法作用是一致的，并且这个方法同时也支持用于注册自定义 HTTP Method 方法 |
|  `Hertz.Any` |  用于注册所有 HTTP Method 方法    |
|  `Hertz.StaticFile/Static/StaticFS` |  用于注册静态文件  |

示例代码:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main(){
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	h.StaticFS("/", &app.FS{Root: "./", GenerateIndexPages: true})

	h.GET("/get", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "get")
	})
	h.POST("/post", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "post")
	})
	h.PUT("/put", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "put")
	})
	h.DELETE("/delete", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "delete")
	})
	h.PATCH("/patch", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "patch")
	})
	h.HEAD("/head", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "head")
	})
	h.OPTIONS("/options", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "options")
	})
	h.Any("/ping_any", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "any")
	})
	h.Handle("LOAD","/load", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "load")
	})
	h.Spin()
}

```

## 路由组

Hertz 提供了路由组( `Group` )的能力，用于支持路由分组的功能，同时中间件也可以注册到路由组上。


示例代码:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main(){
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))
	v1 := h.Group("/v1")
	v1.GET("/get", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "get")
	})
	v1.POST("/post", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "post")
	})
	v2 := h.Group("/v2")
	v2.PUT("/put", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "put")
	})
	v2.DELETE("/delete", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "delete")
	})
	h.Spin()
}


```

在路由组中使用中间件

如下示例在路由组中使用 `BasicAuth` 中间件。

示例代码 1:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))
	// use middleware
	v1 := h.Group("/v1", basic_auth.BasicAuth(map[string]string{"test": "test"}))

	v1.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK,"ping")
	})
	h.Spin()
}
```

示例代码 2:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))
	v1 := h.Group("/v1")
	// use `Use` method
	v1.Use(basic_auth.BasicAuth(map[string]string{"test": "test"}))
	v1.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK,"ping")
	})
	h.Spin()
}
```

## 路由类型

Hertz 支持丰富的路由类型用于实现复杂的功能，包括静态路由、参数路由、通配路由。

路由的优先级:`静态路由` > `命名路由` > `通配路由`

### 静态路由

具体示例可参见上文

### 参数路由
Hertz 支持使用 `:name` 这样的命名参数设置路由，并且命名参数只匹配单个路径段。

如果我们设置`/user/:name`路由，匹配情况如下

|  路径   | 是否匹配  |
|  ----  | ----  |
| /user/gordon  | 匹配 |
| /user/you  | 匹配 |
| /user/gordon/profile  | 不匹配 |
|  /user/  | 不匹配 |

通过使用 `RequestContext.Param` 方法，我们可以获取路由中携带的参数。

示例代码:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main(){
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))
	// This handler will match: "/hertz/version", but will not match : "/hertz/" or "/hertz"
	h.GET("/hertz/:version", func(ctx context.Context, c *app.RequestContext) {
		version := c.Param("version")
		c.String(consts.StatusOK, "Hello %s", version)
	})
	h.Spin()
}


```

### 通配路由
Hertz 支持使用 `*path` 这样的通配参数设置路由，并且通配参数会匹配所有内容。

如果我们设置`/src/*path`路由，匹配情况如下

|  路径   | 是否匹配  |
|  ----  | ----  |
| /src/  | 匹配 |
| /src/somefile.go   | 匹配 |
| /src/subdir/somefile.go  | 匹配 |

通过使用 `RequestContext.Param` 方法，我们可以获取路由中携带的参数。

示例代码:
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main(){
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))
	// However, this one will match "/hertz/v1/" and "/hertz/v2/send"
	h.GET("/hertz/:version/*action", func(ctx context.Context, c *app.RequestContext) {
		version := c.Param("version")
		action := c.Param("action")
		message := version + " is " + action
		c.String(consts.StatusOK, message)
	})
	h.Spin()
}


```
完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/route)


## 注意

### 使用匿名函数与装饰器注册路由

在使用匿名函数或装饰器注册路由时，如果我们使用 `RequestContext.HandlerName()` 获取 handler 名称则会获取到错误的名称。

这里需要使用 Hertz 提供的 `GETEX`、`POSTEX`、`PUTEX`、`DELETEEX`、`HEADEX`、`AnyEX`、`HandleEX` 方法并手动传入 handler 名称注册路由，使用 `app.GetHandlerName` 获取 handler 名称。

示例代码:

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default()
	h.AnyEX("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, app.GetHandlerName(ctx.Handler()))
	}, "ping_handler")
	h.Spin()
}
```


### 获取路由注册信息

Hertz 提供了 `Routes` 获取注册的路由信息供用户使用。

路由信息结构:

```go
// RouteInfo represents a request route's specification which contains method and path and its handler.
type RouteInfo struct {
    Method      string   // http method
    Path        string   // url path
    Handler     string   // handler name
    HandlerFunc app.HandlerFunc
}

// RoutesInfo defines a RouteInfo array.
type RoutesInfo []RouteInfo
```

示例代码:

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default()
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
	routeInfo := h.Routes()
	hlog.Info(routeInfo)
	h.Spin()
}
```

### NoRoute 与 NoMethod 使用

Hertz 提供了 `NoRoute` 与 `NoMethod` 方法用于全局处理 HTTP 404 与 405 请求。
当使用 `NoMethod` 时需要与 `WithHandleMethodNotAllowed` 配合使用。

示例代码：
```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default(server.WithHandleMethodNotAllowed(true))
	h.POST("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
	// set NoRoute handler
	h.NoRoute(func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "no route")
	})
	// set NoMethod handler
	h.NoMethod(func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "no method")
	})

	h.Spin()
}

```
