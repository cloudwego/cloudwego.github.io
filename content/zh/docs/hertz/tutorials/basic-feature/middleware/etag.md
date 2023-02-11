---
title: "Etag"
date: 2023-02-11
weight: 14
description: >
---

`etag`（实体标签）HTTP响应头是一个资源的特定版本的标识符。它让缓存更有效，节省带宽，因为如果内容没有改变，网络服务器不需要重新发送完整的响应。此外，`etag` 有助于防止资源的同时更新互相覆盖（"半空碰撞"）。
## 安装

```shell
go get github.com/hertz-contrib/etag
```

## 导入

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

| 配置           | 默认值   | 介绍                                   |
|-------------|-------|--------------------------------------|
| WithWeak    | false | Enable weak validator |
| WithNext | nil   | Defines a function to skip etag middleware when return is true |
|WithGenerator   | nil   | Custom etag generation logic |



### WithWeak
`etag` 中间件提供`WithWeak`,调用后将在`etag`的前面加上`weak`的前缀.

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
`etag` 中间件提供`WithNext`,当调用 `next` 函数返回值为 `true` 时，跳过 `etag` 中间件。

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

`etag` 中间件提供`WithGenerator`供用户自定义 `etag` 生成器。

**注意**：当与 `WithWeak` 一起使用时，不应该在你的自定义 `etag` 上添加一个弱的前缀。

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

完整用法示例详见 [etag/example](https://github.com/hertz-contrib/etag/tree/main/example)
