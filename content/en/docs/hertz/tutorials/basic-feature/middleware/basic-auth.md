---
title: "Basic Auth"
date: 2022-10-13
weight: 2
keywords: ["HTTP", "Basic Auth"]
description: "Hertz provides an implementation of Basic Auth."
---

In HTTP, Basic Access Authentication is a form of login authentication that allows web browsers or other client programs to provide credentials in the form of a username and password upon request.
In basic HTTP authentication, a request contains a header field in the form of `Authorization: Basic <credentials>`, where credentials is the Base64 encoding of ID and password joined by a single colon `:`.

Hertz also provides an [implementation](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) of Basic Auth, referencing gin's [implementation](https://github.com/gin-gonic/gin#using-basicauth-middleware).

## Import

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
```

## Example

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

## Config

Hertz uses basic-auth middleware that allows web browsers or other client programs to provide a username and password form of credentials for login verification upon request.
Hertz provides two functions to help users get started with basic access authentication functions.
Users can choose different functions to use according to their scenarios.

In the **Example** above, only the base config function `BasicAuth` is used, and the extended config function `BasicAuthForRealm` has the following configurable parameters:

**Note:** `BasicAuth` is a wrapper around `BasicAuthForRealm` and provides default configuration options.

| Attribute | Description                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| accounts  | `Accounts` is a defined type of `map[string]string`, store the username and password as key-value pairs.          |
| realm     | Name of realm, the default value is `Authorization Required`.                                                     |
| userKey   | The key corresponding to the username which set in the context after authentication, the default value is `user`. |

### BasicAuth

The `basic_auth` middleware provides `BasicAuth` that web browsers or other client programs need to provide credentials in the form of a username and password upon request.

Function signatures:

```go
func BasicAuth(accounts Accounts) app.HandlerFunc
```

Sample Code:

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

The `basic_auth` middleware provides `BasicAuthForRealm` to provide more configuration extensions such as realm on basis of authentication using `BasicAuth`.

Function signatures:

```go
func BasicAuthForRealm(accounts Accounts, realm, userKey string) app.HandlerFunc
```

Sample Code:

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

    // your-realm:   name of realm, in this case it will be stored in the response header as Www-Authenticate: Basic realm="your-realm"
    // your-userKey: once authenticated, it will be set to the context with userKey as the key and username as the value
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

## Full Example

As for usage, you may refer to hertz [example](https://github.com/cloudwego/hertz-examples/blob/main/middleware/basicauth/main.go)
