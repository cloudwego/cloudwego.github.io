---
title: "Request ID"
date: 2022-10-01
weight: 9
keywords: ["Request ID", "X-Request-ID"]
description: "Hertz 提供了可以对 `X-Request-ID` 进行操作的 Request ID 中间件。"
---

`X-Request-ID` 在 HTTP Headers 中是一种非标准响应字段，通常用于关联客户端和服务器之间的 HTTP 请求。
Hertz 也提供了可以对 `X-Request-ID` 进行操作的 [Request ID 中间件](https://github.com/hertz-contrib/requestid)，参考了 gin 的 [实现](https://github.com/gin-contrib/requestid)。

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
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    h.Use(
        // 自定义 request id 生成逻辑
        requestid.New(
            requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
                return "cloudwego.io"
            }),
            // 自定义 request id 响应头键值
            requestid.WithCustomHeaderStrKey("Your-Customised-Key"),
        ),
    )

    // Example ping request.
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        hlog.Info(string(c.Response.Header.Header()))
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

## 配置

Hertz 通过使用中间件，可以在响应头中添加一个键为 `X-Request-ID` 的标识符，如果在请求头中设置了 `X-Request-ID` 字段，则会在响应头中将 `X-Request-ID` 原样返回。
Request ID 中间件提供了默认配置，用户也可以依据业务场景使用 `WithGenerator`，`WithCustomHeaderStrKey`，`WithHandler` 函数对以下配置项进行定制。

| 配置                   | 介绍                                             |
| ---------------------- | ------------------------------------------------ |
| WithGenerator          | 定义生成 Request ID 的函数，默认生成 UUID 标识符 |
| WithCustomHeaderStrKey | 定义 Request ID 的键值，默认为 `X-Request-ID`    |
| WithHandler            | 定义 Request ID 的处理函数                       |

### 初始化 Request ID

`requestid` 中间件提供了 `New` 用于在响应头添加 Request ID 字段。

函数签名：

```go
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

### 自定义 Request ID 键值

`requestid` 中间件提供了 `WithCustomHeaderStrKey` 用于自定义 Request ID 键值。

注意：如果需要在请求头中设置 `X-Request-ID`，则需要保持和自定义响应头键值一致。

函数签名：

```go
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

### 自定义 Request ID 值

`requestid` 中间件提供了 `WithGenerator` 用于自定义 Request ID 值的生成。

函数签名：

```go
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
        requestid.New(requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
            return "cloudwego.io"
        })),
    )

    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

### 自定义 Request ID Handler

`requestid` 中间件提供了 `WithHandler` 用于自定义 Request ID 的处理函数。

函数签名：

```go
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
            requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
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

### 获取 Request ID

`requestid` 中间件提供了 `Get` 用于从请求头中获取 Request ID，它也支持获取使用 `requestid.WithCustomHeaderStrKey` 自定义 Request ID 键值。

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
        requestid.New(requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
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
