---
title: "CSRF"
date: 2022-12-6
weight: 12
keywords: ["CSRF", "跨站点请求伪造攻击"]
description: "Hertz 提供了 CSRF 中间件，可帮助您防止跨站点请求伪造攻击。"
---

Cross-site request forgery（CSRF）是一种挟制用户在当前已登录的 Web 应用程序上执行非本意的操作的攻击方法。

Hertz 提供了 [CSRF](https://github.com/hertz-contrib/csrf) 中间件，可帮助您防止跨站点请求伪造攻击。

## 安装

```shell
go get github.com/hertz-contrib/csrf
```

## 示例代码

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

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})

	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}

```

## 配置

| 配置项          | 默认值                                                                        | 介绍                                                                                          |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Secret`        | `csrfSecret`                                                                  | 用于生成令牌（必要配置）                                                                      |
| `IgnoreMethods` | "GET", "HEAD", "OPTIONS", "TRACE"                                             | 被忽略的方法将将视为无需 `csrf` 保护                                                          |
| `Next`          | `nil`                                                                         | `Next` 定义了一个函数，当返回真时，跳过这个 `csrf` 中间件。                                   |
| `KeyLookup`     | `header：X-CSRF-TOKEN`                                                        | `KeyLookup` 是一个"<source>：<key>"形式的字符串，用于创建一个从请求中提取令牌的 Extractor。   |
| `ErrorFunc`     | `func(ctx context.Context, c *app.RequestContext) { panic(c.Errors.Last()) }` | 当 `app.HandlerFunc` 返回一个错误时，`ErrorFunc` 被执行                                       |
| `Extractor`     | 基于 KeyLookup 创建                                                           | `Extractor` 返回`csrf token`。如果设置了这个，它将被用来代替基于 `KeyLookup` 的 `Extractor`。 |

### WithSecret

`csrf` 中间件提供了 `WithSecret` 用于帮助用户设置自定义秘钥用于签发 `token`，默认为 `csrfSecret`。

函数签名：

```go
func WithSecret(secret string) Option
```

默认值：`csrfSecret`

示例代码：

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

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})
	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}

```

### WithIgnoredMethods

`csrf` 中间件提供了 `WithIgnoredMethods` 用于帮助用户设置自定义无需保护的方法，默认为 `GET`, `HEAD`, `OPTIONS` 和 `TRACE`。

函数签名：

```go
func WithIgnoredMethods(methods []string) Option
```

默认值：`{"GET", "HEAD", "OPTIONS", "TRACE"}`

示例代码：

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
	h.Use(csrf.New(csrf.WithIgnoredMethods([]string{"GET", "HEAD", "TRACE"})))

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})

	h.OPTIONS("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "success")
	})
	h.Spin()
}
```

### WithErrorFunc

`csrf` 中间件提供了 `WithErrorFunc` 方便用户自定义错误处理逻辑。

函数签名：

```go
func WithErrorFunc(f app.HandlerFunc) Option
```

默认实现：

```go
func(ctx context.Context, c *app.RequestContext) { panic(c.Errors.Last()) }
```

示例代码：

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

func myErrFunc(ctx context.Context, c *app.RequestContext) {
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

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})
	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}
```

### WithKeyLookUp

`csrf` 中间件提供了 `WithKeyLookUp` 帮助用户设置 `keyLookup`。

`csrf` 用于从 `source`(支持的 `source` 包括 `header`、`param`、`query`、`form`) 中提取 `token`。

格式为 `<source>：<key>`，默认值为：`header：X-CSRF-TOKEN`。

函数签名：

```go
func WithKeyLookUp(lookup string) Option
```

默认值：`header：X-CSRF-TOKEN"`

示例代码：

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

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})
	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}

```

### WithNext

`csrf` 中间件提供了 `WithNext` 方便用户自定义设置，以在特定条件下跳过 `csrf` 中间件。

函数签名：

```go
func WithNext(f CsrfNextHandler) Option
```

默认：`nil`

示例代码：

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

	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "success even no csrf-token in header")
	})
	h.Spin()
}
```

### WithExtractor

`csrf` 中间件提供了 `WithExtractor`,供用户通过自定义的方法从请求中获取 `csrf-token`。

函数签名：

```go
func WithExtractor(f CsrfExtractorHandler) Option
```

默认实现：

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

示例代码：

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

func myExtractor(ctx context.Context, c *app.RequestContext) (string, error) {
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

	h.GET("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, csrf.GetToken(ctx))
	})
	h.POST("/protected", func(ctx context.Context, c *app.RequestContext) {
		ctx.String(200, "CSRF token is valid")
	})

	h.Spin()
}
```
