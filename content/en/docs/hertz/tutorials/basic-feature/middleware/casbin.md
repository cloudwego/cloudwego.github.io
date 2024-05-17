---
title: "Casbin"
date: 2023-02-06
weight: 13
keywords: ["Casbin", "access control"]
description: "According to the user's use scenario, we provide Casbin Middleware that adapted to Hertz."
---

[Casbin](https://casbin.org/) is a powerful and efficient open-source access control library that supports various [access control models](https://en.wikipedia.org/wiki/Access_control#Access_control_models) ( such as `ACL/RBAC/ABAC`) for enforcing authorization across the board.

According to the user's use scenario, we provide [Casbin Middleware](https://github.com/hertz-contrib/casbin) that adapted to Hertz.

## Install

```shell
go get github.com/hertz-contrib/casbin
```

## Import

```go
import "github.com/hertz-contrib/casbin"
```

## Example

```go
package main

import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/casbin"
    "github.com/hertz-contrib/sessions"
    "github.com/hertz-contrib/sessions/cookie"
)

func main() {
    h := server.Default()

    // using sessions to store user info.
    store := cookie.NewStore([]byte("secret"))
    h.Use(sessions.New("session", store))
    auth, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
    if err != nil {
        log.Fatal(err)
    }

    h.POST("/login", func(ctx context.Context, c *app.RequestContext) {
        // verify username and password.
        // ...

        // store username (casbin subject) in session
        session := sessions.Default(c)
        session.Set("name", "alice")
        err := session.Save()
        if err != nil {
            log.Fatal(err)
        }
        c.String(200, "you login successfully")
    })

    h.GET("/book", auth.RequiresPermissions("book:read", casbin.WithLogic(casbin.AND)), func(ctx context.Context, c *app.RequestContext) {
        c.String(200, "you read the book successfully")
    })

    h.POST("/book", auth.RequiresRoles("user", casbin.WithLogic(casbin.AND)), func(ctx context.Context, c *app.RequestContext) {
        c.String(200, "you posted a book successfully")
    })

    h.Spin()
}

// subjectFromSession get subject from session.
func subjectFromSession(ctx context.Context, c *app.RequestContext) string {
    // get subject from session.
    session := sessions.Default(c)
    if subject, ok := session.Get("name").(string); !ok {
        return ""
    } else {
        return subject
    }
}
```

## Config

By Casbin Middleware, hertz is capable of controlling user access permissions.

use this extension, you need to initialize middleware and use method that provided by this middleware to authorize.

### Initialize middleware

#### NewCasbinMiddleware

You need to provide [Model](https://casbin.org/docs/model-storage), [Policy](https://casbin.org/docs/policy-storage) and `LookupHandler` (handler that get subject) to initialize middleware.

This function will initialize `*casbin.Enforcer` by provided configs to perform authentication operation.

The function signature is as follows:

```go
func NewCasbinMiddleware(modelFile string, adapter interface{}, lookup LookupHandler) (*Middleware, error)
```

Sample code:

```go
func exampleLookupHandler(ctx context.Context, c *app.RequestContext) string {
    // get subject from session
    session := sessions.Default(c)
    if subject, ok := session.Get("name").(string); !ok {
        return ""
    } else {
        return subject
    }
}

func main() {
	...
    casbinMiddleware, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", exampleLookupHandler)
    if err != nil {
        log.Fatal(err)
    }
    ...
}
```

#### NewCasbinMiddlewareFromEnforcer

You need to provide [enforcer](https://casbin.org/docs/enforcers) and `LookupHandler` (handler that get subject) to initialize middleware.

The function signature is as follows:

```go
func NewCasbinMiddlewareFromEnforcer(e casbin.IEnforcer, lookup LookupHandler) (*Middleware, error)
```

Sample code:

```go
func exampleLookupHandler(ctx context.Context, c *app.RequestContext) string {
    // get subject from session
    session := sessions.Default(c)
    if subject, ok := session.Get("name").(string); !ok {
        return ""
    } else {
        return subject
    }
}

func main() {
	...
	enforcer, err := casbinsdk.NewEnforcer("example/config/model.conf", "example/config/policy.csv")
	if err != nil{
		log.Fatal(err)
	}

    casbinMiddleware, err := casbin.NewCasbinMiddlewareFromEnforcer(enforcer, exampleLookupHandler)
    if err != nil {
        log.Fatal(err)
    }
    ...
}
```

### Middleware method

middleware provide methods that perform authentication operation.

method parameter format is as follows:

```go
func (m *Middleware) exampleMiddlwareMethod(expression string, opts ...Option) app.HandlerFunc
```

it contains **expression** and **opts** two params.

parameters descriptions is as follows:

- **expression**

  expression has one or more params, each param is divided by space, the expression format is related to `Logic` (see option description),

  the calculated final value of the expression is either **True** or **False**, **True** represents for has passed casbin middleware,

  **False** represents for has not passed casbin middleware.

  If `Logic` is **AND** or **OR**, the format is:

  `"var 1 var2 var3 var4"`, like `"book:read book:write"`

  If `Logic` is **CUSTOM**, the format is :

  `"var1 opr1 var2 opr2 var3"` like `"book:read && book:write || book:all"`

- **opts**

  | Option                          | Description                                                                                                                             | Default                                                                                                |
  | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
  | `WithLogic`                     | `Logic` is the logical operation (**AND**/**OR**/**CUSTOM**) used in permission checks that multiple permissions or roles are specified | `AND`                                                                                                  |
  | `WithPermissionParser`          | `PermissionParserFunc` is used for parsing the permission to extract object and action usually                                          | `PermissionParserWithSeparator(":")`                                                                   |
  | `WithPermissionParserSeparator` | `PermissionParserSeparator` is used to set separator that divide permission to object and action usually                                | `:`                                                                                                    |
  | `WithUnauthorized`              | `Unauthorized` defined the response body for unauthorized responses                                                                     | `func(ctx context.Context, c *app.RequestContext) {    c.AbortWithStatus(consts.StatusUnauthorized) }` |
  | `WithForbidden`                 | `Forbidden` defines the response body for forbidden responses                                                                           | `func(ctx context.Context, c *app.RequestContext) {    c.AbortWithStatus(consts.StatusForbidden) }`    |

#### RequiresPermission

Use **Subject** (provided by `LookupHandler`) and **expression** (see the following text) to check subject is whether satisfies the permission list relationship.

vars inside **expression** is param list behind **sub** in [Model](https://casbin.org/docs/syntax-for-models) :

```
[request_definition]
r = sub, xxx, xxx
```

like:

```
[request_definition]
r = sub, dom, obj, act
```

when use default `PermissionParser`, **expression** format should be like `"book:read"`.

like:

```
[request_definition]
r = sub, dom, obj, act
```

when use default `PermissionParser`, **expression** format should be like `""book1.com:book:read`.

The function signature is as follows:

```go
func (m *Middleware) RequiresPermissions(expression string, opts ...Option) app.HandlerFunc
```

Sample code:

when user has `book:read` permission,

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read"), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:write"), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### RequiresRoles

Use **Subject** (provided by `LookupHandler`) and **expression** (see the following text) to check roles to which the user belongs is whether satisfies the role list relationship.

The function signature is as follows:

```go
func (m *Middleware) RequiresRoles(expression string, opts ...Option) app.HandlerFunc
```

Sample code:

when user has role of **user** and **reader**,

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.POST("/book",
		auth.RequiresRoles("user"), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)

    h.POST("/book",
		auth.RequiresRoles("user reader"), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)

    h.POST("/book",
		auth.RequiresRoles("user reader admin"), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)
    ...
}
```

**Attention**: This method is only valid when use **RBAC**.

### Options description

#### WithLogic

`Logic` is the logical operation (**AND**/**OR**/**CUSTOM**) used in permission checks that multiple permissions or roles are specified.

The function signature is as follows:

```go
func WithLogic(logic Logic) Option
```

option:

```go
const (
	AND Logic = iota
	OR
	CUSTOM
)
```

**AND**

all variables in `expression` will perform **Logic AND** operation.

Sample code:

when user has `book:read` permission,

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.AND)), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:write", casbin.WithLogic(casbin.AND)), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

**OR**

all variables in `expression` will perform **Logical OR** operation.

Sample code:

when user has `book:read` permission,

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.OR)), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:and", casbin.WithLogic(casbin.OR)), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

**CUSTOM**

`expression` will be parsed like C-like artithmetic/string expression。

**Attention**:

when using `CUSTOM`, use `WithPermissionParser` Option is forbidden, it is suggested using `WithPermissionParserSeparator` Option instead.

Sample code:

when user has `book:read` permission,

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.CUSTOM)), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read && book:write", casbin.WithLogic(casbin.CUSTOM)), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

    h.GET("/book",
		m.RequiresPermissions("book:read || book:write", casbin.WithLogic(casbin.CUSTOM)), // passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

    h.GET("/book",
		m.RequiresPermissions("!book:read", casbin.WithLogic(casbin.CUSTOM)), // not passed
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### WithPermissionParser

`PermissionParserFunc` is used for parsing the permission to extract object and action usually.

The function signature is as follows:

```go
func WithPermissionParser(pp PermissionParserFunc) Option
```

Sample code:

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.GET("/book",
		m.RequiresPermissions("book-read",
			casbin.WithPermissionParser(func(str string) []string {
				return strings.Split(str, "-")
			}),
		),
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### WithPermissionParserSeparator

`PermissionParserSeparator` is used to set separator that divide permission to object and action usually.

The function signature is as follows:

```go
func WithPermissionParserSeparator(sep string) Option
```

Sample code:

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.GET("/book",
		m.RequiresPermissions("book-read",
			casbin.WithPermissionParserSeparator("-"),
		),
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### WithUnauthorized

`Unauthorized` defined the response body for unauthorized responses.

The function signature is as follows:

```go
func WithUnauthorized(u app.HandlerFunc) Option
```

Sample code:

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.GET("/book",
          m.RequiresPermissions("book:read",
			casbin.WithUnauthorized(func(c context.Context, ctx *app.RequestContext) {
				ctx.AbortWithStatus(consts.StatusUnauthorized)
			}),
		),
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### WithForbidden

`Forbidden` defines the response body for forbidden responses.

The function signature is as follows:

```go
func WithForbidden(f app.HandlerFunc) Option
```

Sample code:

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.GET("/book",
          m.RequiresPermissions("book:read",
			casbin.WithForbidden(func(c context.Context, ctx *app.RequestContext) {
				ctx.AbortWithStatus(consts.StatusForbidden)
			}),
		),
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```
