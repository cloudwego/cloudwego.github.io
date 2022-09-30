---
title: "Basic Auth"
date: 2022-06-09
weight: 2
description: >

---

## Introduction

In HTTP, Basic Access Authentication is a form of login authentication that allows web browsers or other client programs to provide credentials in the form of a username and password upon request.
In basic HTTP authentication, a request contains a header field in the form of `Authorization: Basic <credentials>`, where credentials is the Base64 encoding of ID and password joined by a single colon `:`.

Hertz also provides an [implementation](https://github.com/cloudwego/hertz/tree/main/pkg/app/middlewares/server/basic_auth) of Basic Auth, referencing gin's [implementation](https://github.com/gin-gonic/gin#using-basicauth-middleware).

## Installation

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/basic_auth"
```

## Sample Code

- Using the basic configuration
```go
h.Use(basic_auth.BasicAuth(map[string]string{
    "username1": "password1",
    "username2": "password2",
}))
```

- Using custom extension configuration
```go
// your-realm:   name of realm, in this case it will be stored in the response header as Www-Authenticate: Basic realm="your-realm"
// your-userKey: once authenticated, it will be set to the context with "userKey" as the key and "username" as the value
h.Use(basic_auth.BasicAuthForRealm(map[string]string{
    "username3": "password3",
    "username4": "password4",
}, "your-realm", "your-userKey"))
```

- Complete Sample Code
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

## Configuration

| Option   | Description                                                                                   | Default                |
| -------- |-----------------------------------------------------------------------------------------------|------------------------|
| accounts | Accounts is an alias to map[string]string, store the username and password as key-value pairs | null                   |
| realm    | name of realm                                                                                 | Authorization Required |
| userKey  | The key corresponding to the username which set in the context after authentication           | user                   |
