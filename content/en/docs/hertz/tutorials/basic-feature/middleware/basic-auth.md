---
title: "Basic Auth"
date: 2022-06-09
weight: 2
description: >

---

In HTTP, Basic Access Authentication is a form of login authentication that allows web browsers or other client programs to provide credentials in the form of a username and password upon request.
Hertz also provides an [implementation](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) of Basic Auth, referencing gin's [implementation](https://github.com/gin-gonic/gin#using-basicauth-middleware).

As for usage, you may refer to hertz [example](https://github.com/cloudwego/hertz-examples/blob/main/middleware/basicauth/main.go) and gin [documentaion](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

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
