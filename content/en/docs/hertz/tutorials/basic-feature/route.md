---
title: "route"
date: 2022-09-06
weight: 2
description: >

---

## Route Registration

Hertz provides methods like `GET`, `POST`, `PUT`, `DELETE`, `ANY` for registering routes.

Sample Code:
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

## Group

Hertz provides the capability of `Group`, which are used to support route grouping functionality, and the middleware can also register with `Group`.


Sample Code:
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
	h.GET("/get", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "get")
	})
	h.POST("/post", func(ctx context.Context, c *app.RequestContext) {
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

## Route Types

Hertz supports a variety of route types for complex functions, including static route, parametric route, and wildcard route.

Priority of the route: `static route` > `parametric route` > `wildcard route`

### Static Route
See above for specific examples.

### Parametric Route
Hertz supports the use of named parameters such as `:name` to set routes, and named parameters match only a single path segment.

If we set the route `/user/:name`, the match is as follows

|  path   |   |
|  ----  | ----  |
| /user/gordon  | matched |
| /user/you  | matched |
| /user/gordon/profile  | mismatched |
|  /user/  | mismatched |

Sample Code:
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

### Wildcard Route
Hertz supports routing with wildcard parameters such as `*filepath`, and the wildcard parameter will match all contents of the current path segment.

If we set the route `/src/*filepath`, the match is as follows

|  path   |   |
|  ----  | ----  |
| /src/  | matched |
| /src/somefile.go   | matched |
| /src/subdir/somefile.go  | mismatched |


Sample Code:
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
Refer to the [example](https://github.com/cloudwego/hertz-examples/tree/main/route) for more detailed examples.
