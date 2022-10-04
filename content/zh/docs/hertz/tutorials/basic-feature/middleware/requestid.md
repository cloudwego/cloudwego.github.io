---
title: "Request ID"
date: 2022-10-01
weight: 7
description: >

---

Hertz 框架的 [Request ID 中间件](https://github.com/hertz-contrib/requestid)，参考了gin的[实现](https://github.com/gin-contrib/requestid)，可以在响应头中添加一个键为 `X-Request-ID` 的标识符，如果在请求头中设置了 `X-Request-ID` 属性，则会在响应头中将 `X-Request-ID` 原样返回。

## 安装

下载并安装

```shell
go get github.com/hertz-contrib/requestid
```

导入

```go
import "github.com/hertz-contrib/requestid"
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
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		// 自定义request id生成逻辑
		requestid.New(
			requestid.WithGenerator(func() string {
				return "cloudwego.io"
			}),
			// 自定义request id响应头键值
			requestid.WithCustomHeaderStrKey("your-customised-key"),
		),
	)

	// Example ping request.
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

## 配置

### New

`requestid` 中间件提供了 `New` 用于在响应头添加Request ID字段。

New函数的签名如下：

```go
// Option类型是func(*config)的别名
func New(opts ...Option) app.HandlerFunc
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		requestid.New(),
	)

	// Example ping request.
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### WithCustomHeaderStrKey

`requestid` 中间件提供了 `WithCustomHeaderStrKey` 用于自定义Request ID键值。

注意：如果需要在请求头中设置 `X-Request-ID` ，则需要保持和自定义响应头键值一致。

WithCustomHeaderStrKey函数签名如下：

```go
// Option类型是func(*config)的别名
func WithCustomHeaderStrKey(s HeaderStrKey) Option
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	// define your own header to save request id here
	h.Use(
		requestid.New(
			requestid.WithCustomHeaderStrKey("Your-Header-StrKey"),
		),
	)

	// Example ping request.
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### WithGenerator

`requestid` 中间件提供了 `WithGenerator` 用于自定义Request ID值生成。

WithGenerator函数签名如下：

```go
// Generator类型是func() string的别名
// Option类型是func(*config)的别名
func WithGenerator(g Generator) Option
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		// define your own request id generator here
		requestid.New(requestid.WithGenerator(func() string {
			return "cloudwego.io"
		})),
	)

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### WithHandler

`requestid` 中间件提供了 `WithHandler` 用于自定义Request ID Handler。

WithHandler函数签名如下：

```go
// Handler类型是func(ctx context.Context, c *app.RequestContext, requestID string)的别名
// Option类型是func(*config)的别名
func WithHandler(handler Handler) Option
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	var bar string

	h.Use(
		requestid.New(
			requestid.WithGenerator(func() string {
				return "hello"
			}),
			// define your request id handler here
			requestid.WithHandler(func(ctx context.Context, c *app.RequestContext, requestID string) {
				bar = requestID + " hertz"
			}),
		),
	)

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{
			"ping": "pong",
			"foo":  bar, // hello hertz
		})
	})

	h.Spin()
}
```

### Get

`requestid` 中间件提供了 `Get` 用于从请求头中获取Request ID，它也支持使用 `requestid.WithCustomHeaderStrKey` 自定义Request ID键值。

注意：如果请求头中没有设置Request ID则获取的值为空。

Get函数签名如下：

```go
func Get(c *app.RequestContext) string
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		requestid.New(requestid.WithGenerator(func() string {
			return "cloudwego.io"
		})),
	)

	// You may retrieve request id from header by calling requestid.Get
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{
			"ping":       "pong",
			"request-id": requestid.Get(c),
		})
	})

	h.Spin()
}
```
