---
title: "JWT认证"
date: 2022-06-09
weight: 3
description: >

---

## 简介

JSON Web Token（JWT）是一个轻量级的认证规范，这个规范允许我们使用 JWT 在用户和服务器之间传递安全可靠的信息。其本质是一个 token ，是一种紧凑的 URL 安全方法，用于在网络通信的双方之间传递。
Hertz 也提供了 jwt 的[实现](https://github.com/hertz-contrib/jwt) ，参考了 gin 的[实现](https://github.com/appleboy/gin-jwt) 。

## 配置中间件

Hertz 通过使用中间件，为路由请求提供了 jwt 的校验功能。其中`HertzJWTMiddleware` 结构定义了用户可以传入的自定义 jwt 配置信息，用于定义 jwt 的完整验证逻辑，部分重要参数如下：

| 参数              | 介绍                                                         |
| :---------------- | :----------------------------------------------------------- |
| `Realm`           | 所属领域名称                                                 |
| `Key`             | 签名密钥                                                     |
| `Timeout`         | token 过期时间，默认为一小时                                 |
| `MaxRefresh`      | 最大 token 刷新时间，允许客户端在 `TokenTime` + `MaxRefresh` 内刷新 token 的有效时间，追加一个 `Timeout` 的时长 |
| `IdentityKey`     | 用于检索身份的键                                             |
| `PayloadFunc`     | 登陆时为 token 添加额外的负载信息的函数                      |
| `IdentityHandler` | 用于获取身份信息的函数的函数                                 |
| `Authenticator`   | 登陆时用于认证用户信息的函数                                 |
| `Authorizator`    | 用于授权已认证的用户路由访问权限的函数                       |
| `Unauthorized`    | 用户可以自定义 jwt 授权失败后的回调函数                      |
| `TokenLookup`     | 用于声明 token 的获取源，可以选择 `header`、`query`、`cookie`、`param`，默认为 `header:Authorization` |
| `TokenHeadName`   | 用于配合从 header 中获取 token，默认为 `Bearer`              |
| `TimeFunc`        | 用于提供当前时间的函数，默认为 `time.Now`                    |

示例代码：

```go
package main

import (
   "context"
   "log"
   "time"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/app/server"
   "github.com/hertz-contrib/jwt"
)

type login struct {
   Username string `form:"username,required" json:"username,required"` //lint:ignore SA5008 ignoreCheck
   Password string `form:"password,required" json:"password,required"` //lint:ignore SA5008 ignoreCheck
}

var identityKey = "id"

func PingHandler(c context.Context, ctx *app.RequestContext) {
   ctx.JSON(200, map[string]string{
      "ping": "pong",
   })
}

// User demo
type User struct {
   UserName  string
   FirstName string
   LastName  string
}

func main() {
   h := server.Default()

   // the jwt middleware
   authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
      Realm:       "test zone",
      Key:         []byte("secret key"),
      Timeout:     time.Hour,
      MaxRefresh:  time.Minute,
      IdentityKey: identityKey,
      PayloadFunc: func(data interface{}) jwt.MapClaims {
         if v, ok := data.(*User); ok {
            return jwt.MapClaims{
               identityKey: v.UserName,
            }
         }
         return jwt.MapClaims{}
      },
      IdentityHandler: func(ctx context.Context, c *app.RequestContext) interface{} {
         claims := jwt.ExtractClaims(ctx, c)
         return &User{
            UserName: claims[identityKey].(string),
         }
      },
      Authenticator: func(ctx context.Context, c *app.RequestContext) (interface{}, error) {
         var loginVals login
         if err := c.BindAndValidate(&loginVals); err != nil {
            return "", jwt.ErrMissingLoginValues
         }
         userID := loginVals.Username
         password := loginVals.Password

         if (userID == "admin" && password == "admin") || (userID == "test" && password == "test") {
            return &User{
               UserName:  userID,
               LastName:  "Hertz",
               FirstName: "CloudWeGo",
            }, nil
         }

         return nil, jwt.ErrFailedAuthentication
      },
      Authorizator: func(data interface{}, ctx context.Context, c *app.RequestContext) bool {
         if v, ok := data.(*User); ok && v.UserName == "admin" {
            return true
         }

         return false
      },
      Unauthorized: func(ctx context.Context, c *app.RequestContext, code int, message string) {
         c.JSON(code, map[string]interface{}{
            "code":    code,
            "message": message,
         })
      },
      // TokenLookup is a string in the form of "<source>:<name>" that is used
      // to extract token from the request.
      // Optional. Default value "header: Authorization".
      // Possible values:
      // - "header:<name>"
      // - "query:<name>"
      // - "cookie:<name>"
      // - "param:<name>"
      TokenLookup: "header: Authorization, query: token, cookie: jwt",
      // TokenLookup: "query:token",
      // TokenLookup: "cookie:token",

      // TokenHeadName is a string in the header. Default value is "Bearer"
      TokenHeadName: "Bearer",

      // TimeFunc provides the current time. You can override it to use another time value. This is useful for testing or if your server uses a different time zone than your tokens.
      TimeFunc: time.Now,
   })
   if err != nil {
      log.Fatal("JWT Error:" + err.Error())
   }

   // When you use jwt.New(), the function is already automatically called for checking,
   // which means you don't need to call it again.
   //errInit := authMiddleware.MiddlewareInit()
   //
   //if errInit != nil {
   // log.Fatal("authMiddleware.MiddlewareInit() Error:" + errInit.Error())
   //}

   h.POST("/login", authMiddleware.LoginHandler)

   h.NoRoute(authMiddleware.MiddlewareFunc(), func(ctx context.Context, c *app.RequestContext) {
      claims := jwt.ExtractClaims(ctx, c)
      log.Printf("NoRoute claims: %#v\n", claims)
      c.JSON(404, map[string]string{"code": "PAGE_NOT_FOUND", "message": "Page not found"})
   })

   auth := h.Group("/auth")
   // Refresh time can be longer than token timeout
   auth.GET("/refresh_token", authMiddleware.RefreshHandler)
   auth.Use(authMiddleware.MiddlewareFunc())
   {
      auth.GET("/ping", PingHandler)
   }

   h.Spin()
}
```

完整用法示例详见 [example](https://github.com/hertz-contrib/jwt/blob/main/example/basic/main.go)
