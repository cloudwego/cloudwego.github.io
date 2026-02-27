---
title: "ETag"
date: 2023-02-11
weight: 14
keywords: ["ETag"]
description: "Hertz 提供了可以对 `ETag` 进行操作的 ETag 中间件。"
---

`ETag` HTTP 响应头是资源的特定版本的标识符。这可以让缓存更高效，并节省带宽，因为如果内容没有改变，Web 服务器不需要发送完整的响应。而如果内容发生了变化，使用 `ETag` 有助于防止资源的同时更新相互覆盖（“空中碰撞”）。
Hertz 也提供了可以对 `ETag` 进行操作的 [ETag 中间件](https://github.com/hertz-contrib/etag)，参考了 fiber 的 [实现](https://github.com/gofiber/fiber/tree/master/middleware/etag)。

## 安装

下载并安装

```shell
go get github.com/hertz-contrib/etag
```

导入

```go
import "github.com/hertz-contrib/etag"
```

## 示例代码

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New())
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

## 配置

| 配置          | 默认值 | 介绍                                                       |
| ------------- | ------ | ---------------------------------------------------------- |
| WithWeak      | false  | 使用弱验证器                                               |
| WithNext      | nil    | 定义一个 Next 函数，当返回值为 `true` 时跳过 `etag` 中间件 |
| WithGenerator | nil    | 自定义 ETag 生成逻辑                                       |

### WithWeak

`etag` 中间件提供了 `WithWeak`，用于使用弱验证器。

函数签名：

```go
func WithWeak() Option
```

示例代码：

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithWeak()))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

### WithNext

`etag` 中间件提供了 `WithNext`，当定义的 Next 函数返回值为 `true` 时，跳过 `etag` 中间件。

函数签名：

```go
func WithNext(next NextFunc) Option
```

示例代码：

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithNext(
        func(ctx context.Context, c *app.RequestContext) bool {
            if string(c.Method()) == http.MethodPost {
                return true
            } else {
                return false
            }
        },
    )))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

### WithGenerator

`etag` 中间件提供 `WithGenerator`，以供用户自定义 ETag 的生成逻辑。

**注意**：当与 `WithWeak` 一起使用时，不应该在你的自定义 ETag 前添加 `W/` 前缀。

函数签名：

```go
func WithGenerator(gen Generator) Option
```

示例代码：

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithGenerator(
        func(ctx context.Context, c *app.RequestContext) []byte {
            return []byte("my-custom-etag")
        },
    )))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

## 完整示例

完整用法示例详见 [etag/example](https://github.com/hertz-contrib/etag/tree/main/example)
