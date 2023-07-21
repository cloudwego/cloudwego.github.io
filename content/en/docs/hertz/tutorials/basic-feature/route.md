---
title: "Route"
date: 2022-09-06
weight: 2
description: >

---

## Route Registration

Hertz provides methods like `GET`, `POST`, `PUT`, `DELETE`, `ANY` for registering routes.

| Method  | Introduce                                                                                                                                                                                             |
| ------------ |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|  `Hertz.GET`   | The method used to register the HTTP Method as GET                                                                                                                                                    |
|  `Hertz.POST` | The method used to register the HTTP Method as POST                                                                                                                                                   |
|  `Hertz.DELETE` | The method used to register the HTTP Method as DELETE                                                                                                                                                 |
|  `Hertz.PUT` | The method used to register the HTTP Method as PUT                                                                                                                                                    |
|  `Hertz.PATCH` | The method used to register the HTTP Method as PATCH                                                                                                                                                  |
|  `Hertz.HEAD` | The method used to register the HTTP Method as HEAD                                                                                                                                                   |
|  `Hertz.OPTIONS` | The method used to register the HTTP Method as OPTIONS                                                                                                                                                |
|  `Hertz.Handle` | The method supports to register a HTTP Method flexibly, which is the same as the above method when used to register a normal HTTP Method, and it also supports the registration of custom HTTP Method |
|  `Hertz.Any` | The method for registering all HTTP Methods                                                                                                                                                           |
|  `Hertz.StaticFile/Static/StaticFS` | For registering static files                                                                                                                                                                          |

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

Use middleware with route group

The following example uses the `BasicAuth` middleware in a route group.

Sample Code 1:

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

	// or use `Use` method
	//v1.Use(basic_auth.BasicAuth(map[string]string{"test": "test"}))
	v1.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK,"ping")
	})
	h.Spin()
}
```

Sample Code 2:

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

By using the `RequestContext.Param` method, we can get the parameters carried in the route.

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
| /src/subdir/somefile.go  | matched |

By using the `RequestContext.Param` method, we can get the parameters carried in the route.

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

## Note

### Use anonymous function or decorator to register routes

When register route with anonymous function or decorator, if we use `RequestContext.HandlerName()` to get the handler name, we will get the wrong name.

You need to use the `GETEX`, `POSTEX`, `PUTEX`, `DELETEEX`, `HEADEX`, `AnyEX`, `HandleEX` methods provided by Hertz and manually pass in the handler name to register the route. use `app.GetHandlerName` to get the handler name.

Sample Code:

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

### Get route info

Hertz provides `Routes` to get the registered route information.

Route information struct:

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

Sample Code:

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

### NoRoute And NoMethod

Hertz provides `NoRoute` and `NoMethod` methods for global handling of HTTP 404 and 405 requests. Use `NoMethod` in conjunction with `WithHandleMethodNotAllowed`.

Sample Code:

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

### Redirect tail slash

By default, Hertz automatically forwards requests based on the `/` at the end of the path. If the router only has `/foo/`, then the request for `/foo` will be automatically redirected to `/foo/`; if the router only has `/foo`, then `/foo/` will be redirected to `/foo`.

The `307 Temporary Redirect` status code is triggered by any of the request methods other than `GET` and the `301 Moved Permanently` status code is triggered by the `GET` request.

You can cancel it in the configuration as follows:

````go
package main

import "github.com/cloudwego/hertz/pkg/app/server"

func main() {
    h := server.New(server.WithRedirectTrailingSlash(false))
	...
}
````

For more configuration-related information: https://www.cloudwego.io/docs/hertz/reference/config/

