---
title: "基本认证"
date: 2022-10-13
weight: 2
keywords: ["HTTP", "基本认证"]
description: "Hertz 提供了 basic auth 的实现。"
---

在 HTTP 中，基本认证（Basic access authentication）是一种用来允许网页浏览器或其他客户端程序在请求时提供用户名和密码形式的身份凭证的一种登录验证方式。
在基本认证中，请求包含一个格式为 `Authorization: Basic <credentials>` 的头部字段，其中 credentials 是用户名和密码的 Base64 编码，用一个冒号 `:` 连接。

Hertz 也提供了 basic auth 的 [实现](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) ，参考了 gin 的 [实现](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

## 导入

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
```

## 示例代码

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

    h.Use(basic_auth.BasicAuth(map[string]string{
        "username1": "password1",
        "username2": "password2",
    }))

    h.GET("/basicAuth", func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "hello hertz")
    })

    h.Spin()
}
```

## 配置

Hertz 通过使用中间件可以实现让网页浏览器或其他客户端程序在请求时提供用户名和密码形式作为身份凭证进行登录验证，Hertz 提供了两种函数帮助用户快速使用基本认证（Basic access authentication）功能，用户可以根据业务场景自行选择不同的函数进行使用。

上述**示例代码**中，只使用了基本配置函数 `BasicAuth`，扩展配置函数 `BasicAuthForRealm` 的参数配置项如下：

**注意：** `BasicAuth` 是对 `BasicAuthForRealm` 的封装并提供了默认配置项。

| 参数     | 介绍                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| accounts | `Accounts` 被定义为 `map[string]string` 类型，以键值对的形式存储用户名和密码 |
| realm    | 安全域字符串，默认值为 `Authorization Required`                              |
| userKey  | 认证通过后在上下文中设置的用户名所对应的键值，默认值为 `user`                |

### BasicAuth

`basic_auth` 中间件提供了 `BasicAuth` 用于在客户端对服务端发起请求时进行用户名密码形式的身份验证。

函数签名：

```go
func BasicAuth(accounts Accounts) app.HandlerFunc
```

示例代码：

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

    h.Use(basic_auth.BasicAuth(map[string]string{
        "username1": "password1",
        "username2": "password2",
    }))

    h.GET("/basicAuth", func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "hello hertz")
    })

    h.Spin()
}
```

### BasicAuthForRealm

`basic_auth` 中间件提供了 `BasicAuthForRealm` 用于在使用 `BasicAuth` 进行身份验证的基础上提供更多例如 Realm 等的扩展配置。

函数签名：

```go
func BasicAuthForRealm(accounts Accounts, realm, userKey string) app.HandlerFunc
```

示例代码：

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

    // your-realm:   安全域字符串，本例中会以 Www-Authenticate: Basic realm="your-realm" 的形式保存在响应头中
    // your-userKey: 认证通过后会以 userKey 为键 username 为值的形式设置在上下文中
    h.Use(basic_auth.BasicAuthForRealm(map[string]string{
        "username3": "password3",
        "username4": "password4",
    }, "your-realm", "your-userKey"))

    h.GET("/basicAuth", func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "hello hertz")
    })

    h.Spin()
}
```

## 完整示例

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/blob/main/middleware/basicauth/main.go)
