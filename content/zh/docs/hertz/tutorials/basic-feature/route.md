---
title: "路由"
date: 2022-09-06
weight: 2
description: >

---

## 路由注册

Hertz 提供了 `GET`、`POST`、`PUT`、`DELETE`、`ANY` 等方法用于注册路由。

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
	// ...
	v2 := h.Group("/v2")
	v2.PUT("/put", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "put")
	})
	v2.DELETE("/delete", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "delete")
	})
	// ...
	h.Spin()
}


```

## 路由类型

Hertz 支持丰富的路由类型用于实现复杂的功能，包括静态路由、参数路由、通配路由。

路由的优先级:`静态路由` > `命名路由` > `通配路由`

### 静态路由
具体示例见上文

### 参数路由
Hertz 支持使用 `:name` 这样的命名参数设置路由，并且命名参数只匹配单个路径段。

如果我们设置`/user/:name`路由，匹配情况如下

|  path   |   |
|  ----  | ----  |
| /user/gordon  | 匹配 |
| /user/you  | 匹配 |
| /user/gordon/profile  | 不匹配 |
|  /user/  | 不匹配 |

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
Hertz 支持使用 `*filepath` 这样的通配参数设置路由，并且通配参数会匹配所有内容。

如果我们设置`/src/*filepath`路由，匹配情况如下

|  path   |   |
|  ----  | ----  |
| /src/  | 匹配 |
| /src/somefile.go   | 匹配 |
| /src/subdir/somefile.go  | 不匹配 |


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
更详细的示例参考[example](https://github.com/cloudwego/hertz-examples/tree/main/route)
