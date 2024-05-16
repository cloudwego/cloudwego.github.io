---
title: "JWT"
date: 2022-06-09
weight: 3
keywords: ["JWT authentication", "JSON Web Token", "JWT"]
description: "Hertz provides an implementation of JWT."
---

JSON Web Token (JWT) is a lightweight authentication specification that allows us to use JWT to deliver secure and reliable information between users and servers. Essentially a token, it is a compact security method for passing between two sides of network communication.
Hertz also provides an [implementation](https://github.com/hertz-contrib/jwt) of JWT, it uses gin [implementation](https://github.com/appleboy/gin-jwt) for reference.

## Install

```shell
go get github.com/hertz-contrib/jwt
```

## Example

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

func PingHandler(c context.Context, ctx *app.RequestContext) {
    user, _ := ctx.Get(identityKey)
    ctx.JSON(200, utils.H{
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

### Note

Two cores of JWT are **Authentication** and **Authorization**.

When using Hertz's jwt extensions, it is necessary to bind `authMiddleware.LoginHandler` to the `/login` interface dealing with user authentication, and inject `authMiddleware.MiddlewareFunc()` for the route group that requires authorized access.

## Config

Hertz provides `jwt` checks for routed requests by using middleware. Custom configuration of the `HertzJWTMiddleware` allows you to define the implementation details of jwt according to different scenarios.

In the **Example** above, only **two necessary** custom configurations are passed in. More common configurations for the `HertzJWTMiddleware` are as follows:

| Parameter                     | Introduction                                                                                                                                                                                |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Realm`                       | The property used to set the name of the realm, the default value is `hertz jwt`                                                                                                            |
| `SigningAlgorithm`            | The property used to set the signature algorithm, which can be HS256, HS384, HS512, RS256, RS384, or RS512, etc. The default value is `HS256`                                               |
| `Key`                         | The property used to set the signature key (required configuration)                                                                                                                         |
| `KeyFunc`                     | The property used to set a callback function to get the signature key, which will get the `jwt` signature key from `KeyFunc` when the token is parsed                                       |
| `Timeout`                     | The property used to set the token expiry time, the default value is one hour                                                                                                               |
| `MaxRefresh`                  | The property used to set the maximum token refresh time, allowing the client to refresh the token within `TokenTime` + `MaxRefresh`, appending a `Timeout` duration                         |
| `Authenticator`               | The property used to set the user information for authentication at login (required configuration)                                                                                          |
| `Authorizator`                | The property used to set the route access rights for authenticated users                                                                                                                    |
| `PayloadFunc`                 | The property used to set additional payload information into the token at login                                                                                                             |
| `Unauthorized`                | The property used to set the response for a failed jwt authentication process                                                                                                               |
| `LoginResponse`               | The property used to set the response for login                                                                                                                                             |
| `LogoutResponse`              | The property used to set the response for logout                                                                                                                                            |
| `RefreshResponse`             | The property used to set the response after the token has been valid for a refreshed period                                                                                                 |
| `IdentityHandler`             | The property used to set the function to get identity information, the function used with `IdentityKey` by default                                                                          |
| `IdentityKey`                 | The property used to set the key to retrieve the identity information, the default key is `identity`                                                                                        |
| `TokenLookup`                 | The property used to set the source of the token, you can choose `header`, `query`, `cookie`, `param`, or `form`, the default value is `header:Authorization`                               |
| `TokenHeadName`               | The property used to set the prefix for getting the token from the header, the default value is `Bearer`                                                                                    |
| `WithoutDefaultTokenHeadName` | The property used to set the `TokenHeadName` to null, the default value is `false`                                                                                                          |
| `TimeFunc`                    | The property used to set a function to get the current time, the default is `time.Now()`                                                                                                    |
| `HTTPStatusMessageFunc`       | The property used to set the error message included in the response when an error occurs in the jwt validation process                                                                      |
| `SendCookie`                  | The property used to set the token to be returned as a cookie at the same time, the following cookie-related configurations work if this property is true, and the default value is `false` |
| `CookieMaxAge`                | The property used to set the validity of the cookie, the default value is one hour as defined by `Timeout`                                                                                  |
| `SecureCookie`                | The property used to set the cookie is not allowed to be passed through HTTPS, the default value is `false`                                                                                 |
| `CookieHTTPOnly`              | The property used to set allows clients to access the cookie for development purposes, the default value is `false`                                                                         |
| `CookieDomain`                | The property used to set the domain to which the cookie belongs, the default value is empty                                                                                                 |
| `SendAuthorization`           | The property used to set the token to be added to the response header of all requests, the default value is `false`                                                                         |
| `DisabledAbort`               | The property used to set the request context to disable `abort()` calls if the jwt authentication process fails, the default value is `false`                                               |
| `CookieName`                  | The property used to set the name of the cookie                                                                                                                                             |
| `CookieSameSite`              | The property used to set the value of the SameSite property of a cookie using the parameters declared in `protocol.CookieSameSite`                                                          |
| `ParseOptions`                | The property used to set the property values of `jwt.Parser` configured as a functional-style options argument declared with `jwt.ParserOption`                                             |

### Key

The property used to set the signature key

Sample Code:

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    Key: []byte("secret key"),
})
```

### KeyFunc

The program executes with `KeyFunc` as a parameter to `jwt.Parse()`, which is responsible for providing the signing key for token parsing. By customizing the logic of `KeyFunc`, you can perform some custom operations before parsing the token, such as checking the validity of the signing method.

**Note: `KeyFunc` only takes effect when the token is parsed, not when the token is issued**

Function signatures:

```go
func(t *jwt.Token) (interface{}, error)
```

Default handling logic:

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

This function works with `HertzJWTMiddleware.LoginHandler` and is triggered on login, to authenticate the user's login information.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext) (interface{}, error)
```

Sample Code:

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

The property used to set the function for authenticated user access to the route. The following function determines whether the user has access to the route by verifying that the username is `admin`.

If access is not available, the response for jwt process authentication failure declared in the `Unauthorized` parameter will be triggered.

Function signatures:

```go
func(data interface{}, ctx context.Context, c *app.RequestContext) bool
```

Sample Code:

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

If this parameter is not passed, the `payload` part of the `token` stores the expiry time and creation time of the `token` by default, while the Sample Code below stores username information additionally.

Function signatures:

```go
func(data interface{}) jwt.MapClaims
```

Sample Code:

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

The `IdentityHandler` function is used to set up the function that extracts the user information from the token in each request after a successful login. The user information mentioned here is already stored in the payload part of the token because the `PayloadFunc` function is triggered when the user successfully logs in.

Specifically: By using `identityKey` within `IdentityHandler`, the token storing the user information is acquired from the request context. And the required information is extracted from it, encapsulated into a User structure, and stored in the request context with `identityKey` as the key and User structure as the value for subsequent use.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext) interface{}
```

Sample Code:

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

The property used to set the response when a jwt authorization fails. The following function returns the error code and error message from the parameter list encapsulated in a JSON response.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext, code int, message string)
```

Default handling logic:

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

The property used to set the login response binding with `LoginHandler`.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time)
```

Default handling logic:

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
// be called within LoginHandler
h.POST("/login", authMiddleware.LoginHandler)
```

### LogoutResponse

The property used to set the logout response binding with `LogoutHandler`.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext, code int)
```

Default handling logic:

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    LogoutResponse: func(ctx context.Context, c *app.RequestContext, code int) {
        c.JSON(http.StatusOK, map[string]interface{}{
            "code": http.StatusOK,
        })
    }
})
// be called within LogoutHandler
h.POST("/logout", authMiddleware.LogoutHandler)
```

### RefreshResponse

The property used to set the refresh response binding with `RefreshHandler`.

Function signatures:

```go
func(ctx context.Context, c *app.RequestContext, code int, token string, expire time.Time)
```

Default handling logic:

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
// be called within RefreshHandler
auth.GET("/refresh_token", authMiddleware.RefreshHandler)
```

### TokenLookup

There are four options for declaring the source of a token as a key-value pair, with the default value being `header:Authorization`. If more than one token source is declared, the first that satisfies the input format is selected, separated by `,`. If the token is not obtained, it will continue to obtain token from the next declared data source.

Sample Code:

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

The property used to set the function to get the current time, which defaults to time.Now(). In the jwt validation process, validation of the token's expiry date needs to start with the time the token was created. `TimeFunc` provides a function for jwt to get the current time, and you can choose to override this default configuration for some cases where the time zone is different.

Function signatures:

```go
func() time.Time
```

Default handling logic:

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    TimeFunc: func() time.Time {
        return time.Now()
    }
})
```

### HTTPStatusMessageFunc

If the jwt validation process generates an error, such as jwt authentication failure, token authentication failure, failure to refresh token validity, etc., the corresponding error is passed as a parameter to `HTTPStatusMessageFunc`, which extracts the error message and then passed as a string parameter to the jwt authentication failure response declared by `Unauthorized`.

Function signatures:

```go
func(e error, ctx context.Context, c *app.RequestContext) string
```

Default handling logic:

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    HTTPStatusMessageFunc: func(e error, ctx context.Context, c *app.RequestContext) string {
        return e.Error()
    }
})
```

### Cookie

There are eight cookie-related configuration parameters. With `SendCookie` set to `true` and `TokenLookup` set to `cookie: jwt`, the token will be returned as a cookie at the same time, and will be fetched from the HTTP cookie in the next request.

Sample Code:

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

There are three related configurations that can be enabled using `ParseOptions`:

- `WithValidMethods`: Used to supply algorithm methods that the parser will check. Only those methods will be considered valid
- `WithJSONNumber`: Used to configure the underlying JSON parser with `UseNumber`
- `WithoutClaimsValidation`: Used to disable claims validation

Sample Code:

```go
authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    ParseOptions: []jwt.ParserOption{
        jwt.WithValidMethods([]string{"HS256"}),
        jwt.WithJSONNumber(),
        jwt.WithoutClaimsValidation(),
    },
})
```

## Full Example

As for usage, you may refer to hertz [example](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_jwt)
