---
title: "JWT 认证"
date: 2022-06-09
weight: 3
keywords: ["JWT 认证", "JSON Web Token", "JWT"]
description: "Hertz 提供了 jwt 的实现。"
---

JSON Web Token（JWT）是一个轻量级的认证规范，这个规范允许我们使用 JWT 在用户和服务器之间传递安全可靠的信息。其本质是一个 token，是一种紧凑的 URL 安全方法，用于在网络通信的双方之间传递。
Hertz 也提供了 jwt 的 [实现](https://github.com/hertz-contrib/jwt) ，参考了 gin 的 [实现](https://github.com/appleboy/gin-jwt) 。

## 安装

```shell
go get github.com/hertz-contrib/jwt
```

## 示例代码

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/hertz-contrib/jwt"
)

type login struct {
    Username string `form:"username,required" json:"username,required"`
    Password string `form:"password,required" json:"password,required"`
}

var identityKey = "id"

func PingHandler(ctx context.Context, c *app.RequestContext) {
    user, _ := c.Get(identityKey)
    c.JSON(200, utils.H{
        "message": fmt.Sprintf("username:%v", user.(*User).UserName),
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
        MaxRefresh:  time.Hour,
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
    })
    if err != nil {
        log.Fatal("JWT Error:" + err.Error())
    }

    // When you use jwt.New(), the function is already automatically called for checking,
    // which means you don't need to call it again.
    errInit := authMiddleware.MiddlewareInit()

    if errInit != nil {
        log.Fatal("authMiddleware.MiddlewareInit() Error:" + errInit.Error())
    }

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

### 提示

因为 JWT 的核心是**认证**与**授权**，所以在使用 Hertz 的 jwt 扩展时，不仅需要为 `/login` 接口绑定认证逻辑 `authMiddleware.LoginHandler`。

还要以中间件的方式，为需要授权访问的路由组注入授权逻辑 `authMiddleware.MiddlewareFunc()`。

## 配置

Hertz 通过使用中间件，为路由请求提供了 `jwt` 的校验功能。其中 `HertzJWTMiddleware` 结构定义了 `jwt` 配置信息，并提供了默认配置，用户也可以依据业务场景进行定制。

上述**示例代码**中，只传入了**两项必要的**自定义的配置。关于 `HertzJWTMiddleware` 的更多常用配置如下：

| 参数                          | 介绍                                                                                                                    |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `Realm`                       | 用于设置所属领域名称，默认为 `hertz jwt`                                                                                |
| `SigningAlgorithm`            | 用于设置签名算法，可以是 HS256、HS384、HS512、RS256、RS384 或者 RS512 等，默认为 `HS256`                                |
| `Key`                         | 用于设置签名密钥（必要配置）                                                                                            |
| `KeyFunc`                     | 用于设置获取签名密钥的回调函数，设置后 token 解析时将从 `KeyFunc` 获取 `jwt` 签名密钥                                   |
| `Timeout`                     | 用于设置 token 过期时间，默认为一小时                                                                                   |
| `MaxRefresh`                  | 用于设置最大 token 刷新时间，允许客户端在 `TokenTime` + `MaxRefresh` 内刷新 token 的有效时间，追加一个 `Timeout` 的时长 |
| `Authenticator`               | 用于设置登录时认证用户信息的函数（必要配置）                                                                            |
| `Authorizator`                | 用于设置授权已认证的用户路由访问权限的函数                                                                              |
| `PayloadFunc`                 | 用于设置登陆成功后为向 token 中添加自定义负载信息的函数                                                                 |
| `Unauthorized`                | 用于设置 jwt 验证流程失败的响应函数                                                                                     |
| `LoginResponse`               | 用于设置登录的响应函数                                                                                                  |
| `LogoutResponse`              | 用于设置登出的响应函数                                                                                                  |
| `RefreshResponse`             | 用于设置 token 有效时长刷新后的响应函数                                                                                 |
| `IdentityHandler`             | 用于设置获取身份信息的函数，默认与 `IdentityKey` 配合使用                                                               |
| `IdentityKey`                 | 用于设置检索身份的键，默认为 `identity`                                                                                 |
| `TokenLookup`                 | 用于设置 token 的获取源，可以选择 `header`、`query`、`cookie`、`param`、`form`，默认为 `header:Authorization`           |
| `TokenHeadName`               | 用于设置从 header 中获取 token 时的前缀，默认为 `Bearer`                                                                |
| `WithoutDefaultTokenHeadName` | 用于设置 `TokenHeadName` 为空，默认为 `false`                                                                           |
| `TimeFunc`                    | 用于设置获取当前时间的函数，默认为 `time.Now()`                                                                         |
| `HTTPStatusMessageFunc`       | 用于设置 jwt 校验流程发生错误时响应所包含的错误信息                                                                     |
| `SendCookie`                  | 用于设置 token 将同时以 cookie 的形式返回，下列 cookie 相关配置生效的前提是该值为 `true`，默认为 `false`                |
| `CookieMaxAge`                | 用于设置 cookie 的有效期，默认为 `Timeout` 定义的一小时                                                                 |
| `SecureCookie`                | 用于设置允许不通过 HTTPS 传递 cookie 信息，默认为 `false`                                                               |
| `CookieHTTPOnly`              | 用于设置允许客户端访问 cookie 以进行开发，默认为 `false`                                                                |
| `CookieDomain`                | 用于设置 cookie 所属的域，默认为空                                                                                      |
| `SendAuthorization`           | 用于设置为所有请求的响应头添加授权的 token 信息，默认为 `false`                                                         |
| `DisabledAbort`               | 用于设置在 jwt 验证流程出错时，禁止请求上下文调用 `abort()`，默认为 `false`                                             |
| `CookieName`                  | 用于设置 cookie 的 name 值                                                                                              |
| `CookieSameSite`              | 用于设置使用 `protocol.CookieSameSite` 声明的参数设置 cookie 的 SameSite 属性值                                         |
| `ParseOptions`                | 用于设置使用 `jwt.ParserOption` 声明的函数选项式参数配置 `jwt.Parser` 的属性值                                          |

### Key

用于设置 `token` 的签名密钥。

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    Key: []byte("secret key"),
})
```

### KeyFunc

程序执行时 `KeyFunc` 作为 `jwt.Parse()` 的参数，负责为 token 解析提供签名密钥，通过自定义 `KeyFunc` 的逻辑，可以在解析 token 之前完成一些自定义的操作，如：校验签名方法的有效性。

**注意：`KeyFunc` 只在解析 token 时生效，签发 token 时不生效**

函数签名：

```go
func(t *jwt.Token) (interface{}, error)
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    KeyFunc: func(t *jwt.Token) (interface{}, error) {
        if jwt.GetSigningMethod(mw.SigningAlgorithm) != t.Method {
            return nil, ErrInvalidSigningAlgorithm
        }
        if mw.usingPublicKeyAlgo() {
            return mw.pubKey, nil
        }

        // save token string if valid
        c.Set("JWT_TOKEN", token)

        return mw.Key, nil
    },
})
```

### Authenticator

配合 `HertzJWTMiddleware.LoginHandler` 使用，登录时触发，用于认证用户的登录信息。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext) (interface{}, error)
```

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
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
})
```

### Authorizator

用于设置已认证的用户路由访问权限的函数，如下函数通过验证用户名是否为 `admin`，从而判断是否有访问路由的权限。

如果没有访问权限，则会触发 `Unauthorized` 参数中声明的 jwt 流程验证失败的响应函数。

函数签名：

```go
func(data interface{}, ctx context.Context, c *app.RequestContext) bool
```

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    Authorizator: func(data interface{}, ctx context.Context, c *app.RequestContext) bool {
        if v, ok := data.(*User); ok && v.UserName == "admin" {
            return true
        }

        return false
    }
})

```

### PayloadFunc

用于设置登录时为 `token` 添加自定义负载信息的函数，如果不传入这个参数，则 `token` 的 `payload` 部分默认存储 `token` 的过期时间和创建时间，如下则额外存储了用户名信息。

函数签名：

```go
func(data interface{}) jwt.MapClaims
```

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    PayloadFunc: func(data interface{}) jwt.MapClaims {
        if v, ok := data.(*User); ok {
            return jwt.MapClaims{
                identityKey: v.UserName,
            }
        }
        return jwt.MapClaims{}
    },
})
```

### IdentityHandler

`IdentityHandler` 作用在登录成功后的每次请求中，用于设置从 token 提取用户信息的函数。这里提到的用户信息在用户成功登录时，触发 `PayloadFunc` 函数，已经存入 token 的负载部分。

具体流程：通过在 `IdentityHandler` 内配合使用 `identityKey`，将存储用户信息的 token 从请求上下文中取出并提取需要的信息，封装成 User 结构，以 `identityKey` 为 key，User 为 value 存入请求上下文当中以备后续使用。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext) interface{}
```

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    IdentityHandler: func(ctx context.Context, c *app.RequestContext) interface{} {
        claims := jwt.ExtractClaims(ctx, c)
        return &User{
            UserName: claims[identityKey].(string),
        }
    }
})
```

### Unauthorized

用于设置 jwt 授权失败后的响应函数，如下函数将参数列表中的错误码和错误信息封装成 json 响应返回。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext, code int, message string)
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    Unauthorized: func(ctx context.Context, c *app.RequestContext, code int, message string) {
        c.JSON(code, map[string]interface{}{
            "code":    code,
            "message": message,
        })
    }
})
```

### LoginResponse

用于设置登录的响应函数，作为 `LoginHandler` 的响应结果。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time)
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    LoginResponse: func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time) {
        c.JSON(http.StatusOK, map[string]interface{}{
            "code":   http.StatusOK,
            "token":  token,
            "expire": expire.Format(time.RFC3339),
        })
    }
})
// 在 LoginHandler 内调用
h.POST("/login", authMiddleware.LoginHandler)
```

### LogoutResponse

用于设置登出的响应函数，作为 `LogoutHandler` 的响应结果。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext, code int)
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    LogoutResponse: func(ctx context.Context, c *app.RequestContext, code int) {
        c.JSON(http.StatusOK, map[string]interface{}{
            "code": http.StatusOK,
        })
    }
})
// 在 LogoutHandler 内调用
h.POST("/logout", authMiddleware.LogoutHandler)
```

### RefreshResponse

用于设置 token 有效时长刷新后的响应函数，作为 `RefreshHandler` 的响应结果。

函数签名：

```go
func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time)
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    RefreshResponse: func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time) {
        c.JSON(http.StatusOK, map[string]interface{}{
            "code":   http.StatusOK,
            "token":  token,
            "expire": expire.Format(time.RFC3339),
        })
    },
})
// 在 RefreshHandler 内调用
auth.GET("/refresh_token", authMiddleware.RefreshHandler)
```

### TokenLookup

通过键值对的形式声明 token 的获取源，有四种可选的方式，默认值为 header:Authorization，如果同时声明了多个数据源则以 `,` 为分隔线，第一个满足输入格式的数据源将被选择，如果没有获取到 token 则继续从下一个声明的数据源获取。

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    // - "header:<name>"
    // - "query:<name>"
    // - "cookie:<name>"
    // - "param:<name>"
	// - "form:<name>"
    TokenLookup: "header: Authorization, query: token, cookie: jwt"
})
```

### TimeFunc

用于设置获取当前时间的函数，默认为 time.Now()，在 jwt 校验过程中，关于 token 的有效期的验证需要以 token 创建时间为起点，`TimeFunc` 提供了 jwt 获取当前时间的函数，可以选择覆盖这个默认配置，应对一些时区不同的情况。

函数签名：

```go
func() time.Time
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    TimeFunc: func() time.Time {
        return time.Now()
    }
})
```

### HTTPStatusMessageFunc

一旦 jwt 校验流程产生错误，如 jwt 认证失败、token 鉴权失败、刷新 token 有效时长失败等，对应 error 将以参数的形式传递给 `HTTPStatusMessageFunc`，由其提取出需要响应的错误信息，最终以 string 参数形式传递给 `Unauthorized` 声明的 jwt 验证流程失败的响应函数返回。

函数签名：

```go
func(e error, ctx context.Context, c *app.RequestContext) string
```

默认处理逻辑如下：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    HTTPStatusMessageFunc: func(e error, ctx context.Context, c *app.RequestContext) string {
        return e.Error()
    }
})
```

### Cookie

cookie 相关的配置参数有八个，将 `SendCookie` 设置为 true、`TokenLookup` 设置为 cookie: jwt 后，token 将同时以 cookie 的形式返回，并在接下来的请求中从 HTTP Cookie 获取。

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    SendCookie:        true,
    TokenLookup:       "cookie: jwt",
    CookieMaxAge:      time.Hour,
    SecureCookie:      false,
    CookieHTTPOnly:    false,
    CookieDomain:      ".test.com",
    CookieName:        "jwt-cookie",
    CookieSameSite:    protocol.CookieSameSiteDisabled,
})
```

### ParseOptions

利用 ParseOptions 可以开启相关配置有三个，分别为

- `WithValidMethods`: 用于提供解析器将检查的签名算法，只有被提供的签名算法才被认为是有效的
- `WithJSONNumber`: 用于配置底层 JSON 解析器使用 `UseNumber` 方法
- `WithoutClaimsValidation`: 用于禁用 claims 验证

示例代码：

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    ParseOptions: []jwt.ParserOption{
        jwt.WithValidMethods([]string{"HS256"}),
        jwt.WithJSONNumber(),
        jwt.WithoutClaimsValidation(),
    },
})
```

## 完整示例

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_jwt)
