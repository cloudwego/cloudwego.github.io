---
title: "KeyAuth"
date: 2022-09-22
weight: 7
keywords: ["KeyAuth", "token 鉴权"]
description: "Hertz 提供了 keyauth 扩展用于帮助用户实现 `token` 鉴权。"
---

Hertz 提供了 [keyauth](https://github.com/hertz-contrib/keyauth) 扩展用于帮助用户实现 `token` 鉴权。 [keyauth](https://github.com/hertz-contrib/keyauth) 扩展的实现参考了 [Fiber](https://github.com/gofiber/fiber) 和 [Echo](https://github.com/labstack/echo) 的实现。

## 安装

```shell
go get github.com/hertz-contrib/keyauth
```

## 示例代码

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
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

## 配置

### WithFilter

`keyauth` 扩展提供了 `WithFilter` 用于帮助用户设置自定义过滤逻辑用于跳过 `keyauth` 扩展，默认为 `nil`，不跳过。

Filter 函数签名如下:

```go
type KeyAuthFilterHandler func(ctx context.Context, c *app.RequestContext) bool
```

示例代码:

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
		keyauth.WithFilter(func(ctx context.Context, c *app.RequestContext) bool {
			return string(ctx.GetHeader("admin")) == "test"
		}),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithValidator

`keyauth` 扩展提供了 `WithValidator` 用于帮助用户设置自定义的校验逻辑用于 `token` 校验，默认返回 `true` 和 `nil`。

Validator 函数签名如下:

```go
type KeyAuthValidatorHandler func(context.Context, *app.RequestContext, string) (bool, error)
```

示例代码:

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
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithSuccessHandler

`keyauth` 扩展提供了 `WithSuccessHandler` 用于帮助用户设置校验 `token` 通过的自定义处理逻辑。

示例代码:

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
		keyauth.WithSuccessHandler(func(ctx context.Context, c *app.RequestContext) {
			c.Next(ctx)
		}),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithErrorHandler

`keyauth` 扩展提供了 `WithErrorHandler` 用于帮助用户设置校验 `token` 失败的自定义处理逻辑。

ErrorHandler 函数签名如下:

```go
type KeyAuthErrorHandler func(context.Context, *app.RequestContext, error)
```

默认处理逻辑如下:

```go
func errHandler(ctx context.Context, c *app.RequestContext, err error) {
	if err == ErrMissingOrMalformedAPIKey {
		ctx.AbortWithMsg(err.Error(), http.StatusBadRequest)
		return
	}
	ctx.AbortWithMsg(err.Error(), http.StatusUnauthorized)
}
```

### WithKeyLookUp

`keyauth` 扩展提供了 `WithKeyLookUp` 帮助用户设置 `keyLookup`。

`keyLookup` 用于从 `source`(支持的 `source` 包括 `cookie`、`header`、`param`、`query`、`form`) 中提取 `token`。

格式为 `<source>:<token_name>`，默认值为:`header:Authorization`。

示例代码:

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
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```

### WithContextKey

`keyauth` 扩展提供了 `WithContextKey` 用于帮助用户设置存储在请求上下文的 `token` 对应的 `key`。

示例代码:

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
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		value, _ := ctx.Get("token")
		ctx.JSON(consts.StatusOK, utils.H{"ping": value})
	})
	h.Spin()
}
```
