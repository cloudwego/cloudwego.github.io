---
title: "CSRF"
date: 2022-11-30
weight: 7
description: >

---

Cross-site request forgery（CSRF）是一种挟制用户在当前已登录的Web应用程序上执行非本意的操作的攻击方法。

Hertz 提供了 [CSRF](https://github.com/hertz-contrib/csrf) 中间件,可帮助您防止跨站点请求伪造攻击。

## 安装

``` shell
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

## 配置

### WithSecret

`csrf` 中间件提供了 `WithSecret` 用于帮助用户设置自定义秘钥用于签发 `token` ，默认为 `csrfSecret`。


示例代码:

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

`csrf` 中间件提供了 `WithIgnoredMethods` 用于帮助用户设置自定义无需保护的方法，默认为 `GET`, `HEAD`, `OPTIONS` 和 `TRACE`。


示例代码:

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
`csrf` 中间件提供了 `WithErrorFunc` 方便用户自定义错误处理逻辑。

函数签名：
```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

默认处理逻辑：
```go
func(ctx context.Context, c *app.RequestContext) { panic(c.Errors.Last()) }
```

示例代码:

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

`csrf` 中间件提供了 `WithKeyLookUp` 帮助用户设置 `keyLookup`。

`csrf` 用于从 `source`(支持的 `source` 包括 `header` 、`param`、`query`、`form`) 中提取 `token`。

格式为 `<source>:<key>`，默认值为:`header:X-CSRF-TOKEN`。

示例代码:

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

`csrf` 中间件提供了 `WithNext` 方便用户自定义设置，以在特定条件下跳过 `csrf`中间件。

函数签名：
```go
type CsrfNextHandler func(ctx context.Context, c *app.RequestContext) bool
```

示例代码:

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

`csrf` 中间件提供了 `WithExtractor`,供用户通过自定义的方法从请求中获取`csrf-token`。

函数签名：
```go
type CsrfExtractorHandler func(ctx context.Context, c *app.RequestContext) (string, error)
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
示例代码:

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

