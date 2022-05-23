---
title: "基本认证"
date: 2022-05-21
weight: 2
description: >

---

在 HTTP 中，基本认证（Basic access authentication）是一种用来允许网页浏览器或其他客户端程序在请求时提供用户名和口令形式的身份凭证的一种登录验证方式。
hertz 也提供了 basic auth 的[实现](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) ，参考了 gin 的[实现](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。使用方法可参考如下 example 以及 gin 的[文档](https://github.com/gin-gonic/gin#using-basicauth-middleware) 。

```go
package main

import (
   "context"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/app/middlewares/basic_auth"
   "github.com/cloudwego/hertz/pkg/app/server"
   "github.com/cloudwego/hertz/pkg/common/utils"
)

func main() {
   var secrets = utils.H{
      "foo":    utils.H{"email": "foo@bar.com", "phone": "123433"},
      "austin": utils.H{"email": "austin@example.com", "phone": "666"},
      "lena":   utils.H{"email": "lena@guapa.com", "phone": "523443"},
   }
   h := server.Default()

   authorized := h.Group("/admin", basic_auth.BasicAuth(basic_auth.Accounts{
      "foo":    "bar",
      "austin": "1234",
      "lena":   "hello2",
      "manu":   "4321",
   }))
   authorized.GET("/secrets", func(c context.Context, ctx *app.RequestContext) {
      // get user, it was set by the BasicAuth middleware
      var user string
      if u, ok := ctx.Get(basic_auth.AuthUserKey); !ok {
         ctx.AbortWithStatus(401)
      } else {
         user = u.(string)
      }

      if secret, ok := secrets[user]; ok {
         ctx.JSON(200, utils.H{"user": user, "secret": secret})
      } else {
         ctx.JSON(200, utils.H{"user": user, "secret": "NO SECRET :("})
      }
   })

   h.Spin()
}
```
