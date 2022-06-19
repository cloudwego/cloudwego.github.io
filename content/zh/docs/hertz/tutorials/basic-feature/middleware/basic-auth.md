---
title: "基本认证"
date: 2022-05-21
weight: 2
description: >

---

在 HTTP 中，基本认证（Basic access authentication）是一种用来允许网页浏览器或其他客户端程序在请求时提供用户名和口令形式的身份凭证的一种登录验证方式。
hertz 也提供了 basic auth 的[实现](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) ，参考了 gin 的[实现](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

使用方法可参考如下 [example](https://github.com/cloudwego/hertz-examples/blob/main/middleware/basicauth/main.go) 以及 gin 的[文档](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

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
		"test1": "value1",
		"test2": "value2",
	}))

	h.GET("/basicAuth", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "hello hertz")
	})

	h.Spin()
}

```
