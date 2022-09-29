---
title: "基本认证"
date: 2022-05-21
weight: 2
description: >

---

## 简介

在 HTTP 中，基本认证（Basic access authentication）是一种用来允许网页浏览器或其他客户端程序在请求时提供用户名和密码形式的身份凭证的一种登录验证方式。
在基本认证中，请求包含一个格式为 `Authorization: Basic <credentials>` 的头部字段，其中 credentials 是用户名和密码的 Base64 编码，用一个冒号`:`连接。

hertz 也提供了 basic auth 的[实现](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) ，参考了 gin 的[实现](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

## 安装

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
```

## 示例代码

- 使用基本配置
```go
h.Use(basic_auth.BasicAuth(map[string]string{
    "username1": "password1",
    "username2": "password2",
}))
```

- 自定义扩展配置
```go
// your-realm:   安全域字符串，本例中会以 Www-Authenticate: Basic realm="your-realm" 的形式保存在响应头中
// your-userKey: 认证通过后会以 "userKey" 为键 "username" 为值的形式设置在上下文中
h.Use(basic_auth.BasicAuthForRealm(map[string]string{
    "username3": "password3",
    "username4": "password4",
}, "your-realm", "your-userKey"))
```

- 完整代码示例
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

| 选项       | 描述                                                         | 默认值                 |
|----------| ------------------------------------------------------------ | ---------------------- |
| accounts | Accounts类型是map[string]string的别名，以键值对的形式存储用户名和密码 | 无                     |
| realm    | 安全域字符串                                                 | Authorization Required |
| userKey  | 认证通过后在上下文中设置的用户名所对应的键值                 | user                   |

