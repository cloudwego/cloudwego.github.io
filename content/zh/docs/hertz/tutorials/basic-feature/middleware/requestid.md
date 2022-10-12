---
title: "Request ID"
date: 2022-10-01
weight: 7
description: >

---

`X-Request-ID` 是一种HTTP非标准响应字段，通常用来关联客户端和服务器之间的HTTP请求。
Hertz 也提供了 Request ID 的[实现](https://github.com/hertz-contrib/requestid)，参考了gin的[实现](https://github.com/gin-contrib/requestid)。

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

Hertz通过使用中间件，可以在响应头中添加一个键为 `X-Request-ID` 的标识符，如果在请求头中设置了 `X-Request-ID` 字段，则会在响应头中将 `X-Request-ID` 原样返回。
其中 `config` 结构体定义了 Request ID 的配置信息，并提供了默认配置，用户也可以依据业务场景进行定制。

上述**示例代码**中，只传入了两项自定义的配置。关于 `config` 的更多常用配置如下：

| 参数        | 介绍                                 |
|-----------|------------------------------------|
| generator | 定义生成Request ID的函数，默认生成uuid标识符      |
| headerKey | 定义Request ID的键值，默认为 `X-Request-ID` |
| handler   | 定义Request ID的处理函数                  |

### New

`requestid` 中间件提供了 `New` 用于在响应头添加Request ID字段。

函数签名：

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

函数签名：

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

函数签名：

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

函数签名：

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

函数签名：

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

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/requestid/tree/main/example)
