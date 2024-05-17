---
title: "CSRF"
date: 2022-12-6
weight: 12
keywords: ["CSRF", "cross-site request forgery attacks"]
description: "Hertz provides CSRF middleware to help you prevent cross-site request forgery attacks."
---

Cross-site request forgery (CSRF) is a method of attack that holds a user hostage to perform an unintended action on a currently logged-in Web application.

Hertz provides [CSRF](https://github.com/hertz-contrib/csrf) middleware to help you prevent cross-site request forgery attacks.

## Install

```shell
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
	h.Use(sessions.New("csrf-session", store))
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

| Option        | Default                                                                      | Description                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Secret        | "csrfSecret"                                                                 | Secret used to generate token.                                                                                                      |
| IgnoreMethods | "GET", "HEAD", "OPTIONS", "TRACE"                                            | Ignored methods will be considered no protection required.                                                                          |
| Next          | nil                                                                          | Next defines a function to skip this middleware when returned true.                                                                 |
| KeyLookup     | "header:X-CSRF-TOKEN"                                                        | KeyLookup is a string in the form of "<source>:<key>" that is used to create an Extractor that extracts the token from the request. |
| ErrorFunc     | func(ctx context.Context, c \*app.RequestContext) { panic(c.Errors.Last()) } | ErrorFunc is executed when an error is returned from app.HandlerFunc.                                                               |
| Extractor     | Default will create an Extractor based on KeyLookup.                         | Extractor returns the csrf token. If set this will be used in place of an Extractor based on KeyLookup.                             |

### WithSecret

The `csrf` middleware provides `WithSecret` to help users set a custom secret key for issuing `token`, which is `csrfSecret` by default.

Function Signature:

```go
func WithSecret(secret string) Option
```

Default：`csrfSecret`

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
	h.Use(sessions.New("csrf-session", store))
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

The `csrf` middleware provides `WithIgnoredMethods` to help users set up custom methods that do not need to be protected, the defaults are `GET`, `HEAD`, `OPTIONS` and `TRACE`.

Function Signature:

```go
func WithIgnoredMethods(methods []string) Option
```

Default: `{"GET", "HEAD", "OPTIONS", "TRACE"}`

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
	h.Use(sessions.New("session", store))
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

Function Signature:

```go
func WithErrorFunc(f app.HandlerFunc) Option
```

Default:

```go
func(ctx context.Context, c *app.RequestContext) { panic(c.Errors.Last()) }
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/csrf"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"

)

func myErrFunc(c context.Context, ctx *app.RequestContext) {
    if ctx.Errors.Last() == nil {
        err := fmt.Errorf("myErrFunc called when no error occurs")
        ctx.String(400, err.Error())
        ctx.Abort()
    }
	ctx.AbortWithMsg(ctx.Errors.Last().Error(), http.StatusBadRequest)
}

func main() {
	h := server.Default()

	store := cookie.NewStore([]byte("store"))
	h.Use(sessions.New("csrf-session", store))
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

The `csrf` middleware provides `WithKeyLookUp` to help users set `keyLookup`.

`csrf` is used to extract `token` from `source` (supported `sources` include `header`, `param`, `query`, `form`).

The format is `<source>:<key>` and the default value is :`header:X-CSRF-TOKEN`.

Function Signature:

```go
func WithKeyLookUp(lookup string) Option
```

Default: `header:X-CSRF-TOKEN"`

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
	h.Use(sessions.New("csrf-session", store))
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

Function Signature:

```go
func WithNext(f CsrfNextHandler) Option
```

Default:`nil`

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
	h.Use(sessions.New("csrf-session", store))

	//  skip csrf middleware when request method is post
	h.Use(csrf.New(csrf.WithNext(isPostMethod)))

	h.POST("/protected", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(200, "success even no csrf-token in header")
	})
	h.Spin()
}
```

### WithExtractor

The `csrf` middleware provides `WithExtractor` for the user to get the `csrf-token` from the request via a custom method.

Function Signature:

```go
func WithExtractor(f CsrfExtractorHandler) Option
```

Default:

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
	h.Use(sessions.New("csrf-session", store))
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
