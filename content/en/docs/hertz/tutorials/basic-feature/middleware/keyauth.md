---
title: "KeyAuth"
date: 2022-09-22
weight: 7
keywords: ["KeyAuth", "token authentication"]
description: "Hertz provides the keyauth extension to help users achieve `token` authentication."
---

Hertz provides the [keyauth](https://github.com/hertz-contrib/keyauth) extension to help users achieve `token` authentication. The implementation of the [keyauth](https://github.com/hertz-contrib/keyauth) extension references the [Fiber](https://github.com/gofiber/fiber) and [Echo](https://github.com/labstack/echo) implementation.

## Install

```shell
go get github.com/hertz-contrib/keyauth
```

## Example

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithContextKey("token"),
		keyauth.WithKeyLookUp("query:token", ""),
	))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

## Config

### WithFilter

The `keyauth` extension provides `WithFilter` to help users set custom filtering logic for skipping the `keyauth` extension, which defaults to `nil` and is not skipped.

Function signatures:

```go
type KeyAuthFilterHandler func(c context.Context, ctx *app.RequestContext) bool
```

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithFilter(func(c context.Context, ctx *app.RequestContext) bool {
			return string(ctx.GetHeader("admin")) == "test"
		}),
	))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithValidator

The `keyauth` extension provides `WithValidator` to help users set custom validation logic for `token` validation, which returns `true` and `nil` by default.

Function signatures:

```go
type KeyAuthValidatorHandler func(context.Context, *app.RequestContext, string) (bool, error)
```

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithValidator(func(ctx context.Context, requestContext *app.RequestContext, s string) (bool, error) {
			if s == "test_admin" {
				return true, nil
			}
			return false, nil
		}),
	))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithSuccessHandler

The `keyauth` extension provides `WithSuccessHandler` to help users set up custom processing logic for verifying that the `token` has passed.

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithSuccessHandler(func(c context.Context, ctx *app.RequestContext) {
			ctx.Next(c)
		}),
	))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithErrorHandler

The `keyauth` extension provides `WithErrorHandler` to help users set up custom handling logic for verifying `token` failures.

Function signatures:

```go
type KeyAuthErrorHandler func(context.Context, *app.RequestContext, error)
```

Default logic:

```go
func errHandler(c context.Context, ctx *app.RequestContext, err error) {
	if err == ErrMissingOrMalformedAPIKey {
		ctx.AbortWithMsg(err.Error(), http.StatusBadRequest)
		return
	}
	ctx.AbortWithMsg(err.Error(), http.StatusUnauthorized)
}
```

### WithKeyLookUp

The `keyauth` extension provides `WithKeyLookUp` to help users set `keyLookup`.

`keyLookup` is used to extract `token` from `source` (supported `sources` include `cookie`, `header`, `param`, `query`, `form`).

The format is `<source>:<token_name>` and default value is`header:Authorization`.

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithKeyLookUp("header:token", "Bearer"),
		))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithContextKey

The `keyauth` extension provides `WithContextKey` to help users set the `key` corresponding to the `token` in the request context.

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/keyauth"
)

func main() {
	h := server.Default()
	h.Use(keyauth.New(
		keyauth.WithContextKey("token"),
	))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```
