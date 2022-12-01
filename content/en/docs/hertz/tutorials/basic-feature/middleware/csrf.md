---
title: "CSRF"
date: 2022-11-30
weight: 2
description: >

---

Cross-site request forgery（CSRF）is an attack method to coerce users to perform unintended operations on currently logged in Web applications.


Hertz provides [CSRF](https://github.com/hertz-contrib/csrf) middleware that helps you prevent cross-site request forgery attacks.

## Install

``` shell
go get github.com/hertz-contrib/csrf
```

## Example

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/csrf"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.Default()

	store := cookie.NewStore([]byte("secret"))
	h.Use(sessions.Sessions("csrf-session", store))
	h.Use(csrf.New())

	h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})

	h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}

```

## Config

### WithSecret

`csrf` middleware provides `WithSecret` for users to set a custom secret key for issuing `token`, default is `csrfSecret`


Sample Code:

```go

package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("store"))
    h.Use(sessions.Sessions("csrf-session", store))
    h.Use(csrf.New(csrf.WithSecret("your_secret")))

    h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, csrf.GetToken(ctx))
    })
    h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "CSRF token is valid")
    })

    h.Spin()
}

```

### WithIgnoredMethods

The `csrf` middleware provides `WithIgnoredMethods` to help users set up custom Web methods that do not need to be protected, the defaults are `GET`, `HEAD`, `OPTIONS` and `TRACE`.

Sample Code:

```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("secret"))
    h.Use(sessions.Sessions("session", store))
    h.Use(csrf.New(csrf.WithIgnoredMethods([]string{"GET", "HEAD", "TRACE"})))

    h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, csrf.GetToken(ctx))
    })

    h.OPTIONS("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "success")
    })
    h.Spin()
}


```

### WithErrorFunc

The `csrf` middleware provides `WithErrorFunc` to facilitate user-defined error handling logic.

Function signatures:
```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

Default logic:
```go
func(ctx context.Context, c *app.RequestContext) { panic(c.Errors.Last()) }
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
    "net/http"
)

func myErrFunc(c context.Context, ctx *app.RequestContext) {
    if ctx.Errors.Last() == nil {
        fmt.Errorf("myErrFunc called when no error occurs")
    }
    ctx.AbortWithMsg(ctx.Errors.Last().Error(), http.StatusBadRequest)
}

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("store"))
    h.Use(sessions.Sessions("csrf-session", store))
    h.Use(csrf.New(csrf.WithErrorFunc(myErrFunc)))

    h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, csrf.GetToken(ctx))
    })
    h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "CSRF token is valid")
    })

    h.Spin()
}

```

### WithKeyLookUp

The `csrf` middleware provides `WithKeyLookUp` to help users set up `keyLookup`.、

`csrf` is used to extract `token` from `source` (supported `sources` include `header`, `param`, `query`, `form`).

The format is `<source>:<key>` and the default value is :`header:X-CSRF-TOKEN`.

Sample Code:

```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("store"))
    h.Use(sessions.Sessions("csrf-session", store))
    h.Use(csrf.New(csrf.WithKeyLookUp("form:csrf")))

    h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, csrf.GetToken(ctx))
    })
    h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "CSRF token is valid")
    })

    h.Spin()
}

```

### WithNext

The `csrf` middleware provides `WithNext` to facilitate user-defined settings to skip the `csrf` middleware under certain conditions.

Function signatures:
```go
type CsrfNextHandler func(ctx context.Context, c *app.RequestContext) bool
```

Sample Code:

```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func isPostMethod(_ context.Context, ctx *app.RequestContext) bool {
    if string(ctx.Method()) == "POST" {
        return true
    } else {
        return false
    }
}

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("store"))
    h.Use(sessions.Sessions("csrf-session", store))

    //  skip csrf middleware when request method is post
    h.Use(csrf.New(csrf.WithNext(isPostMethod)))

    h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "success even no csrf-token in header")
    })
    h.Spin()
}

```



###  WithExtractor

`csrf` middleware provides `WithExtractor` for the user to get the `csrf-token` from the request via a custom method.

Function signatures:
```go
type CsrfExtractorHandler func(ctx context.Context, c *app.RequestContext) (string, error)
```
Default logic:

```go
func CsrfFromHeader(param string) func(ctx context.Context, c *app.RequestContext) (string, error) {
	return func(ctx context.Context, c *app.RequestContext) (string, error) {
		token := c.GetHeader(param)
		if string(token) == "" {
			return "", errMissingHeader
		}
		return string(token), nil
	}
}
```
Sample Code:

```go
package main

import (
    "context"
    "errors"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/csrf"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func myExtractor(c context.Context, ctx *app.RequestContext) (string, error) {
    token := ctx.FormValue("csrf-token")
    if token == nil {
        return "", errors.New("missing token in form-data")
    }
    return string(token), nil
}

func main() {
    h := server.Default()

    store := cookie.NewStore([]byte("secret"))
    h.Use(sessions.Sessions("csrf-session", store))
    h.Use(csrf.New(csrf.WithExtractor(myExtractor)))

    h.GET("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, csrf.GetToken(ctx))
    })
    h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
        ctx.String(200, "CSRF token is valid")
    })

    h.Spin()
}
```
