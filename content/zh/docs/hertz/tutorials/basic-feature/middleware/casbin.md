---
title: "Casbin"
date: 2023-02-06
weight: 13
keywords: ["Casbin", "权限管理", "访问控制"]
description: "针对用户的使用场景，提供 Casbin 中间件，对 Hertz 进行了适配。"
---

[Casbin](https://casbin.org/) 是⼀个强⼤的、⾼效的开源访问控制框架，其权限管理机制支持常用的多种 [访问控制模型](https://en.wikipedia.org/wiki/Access_control#Access_control_models)，如 `ACL/RBAC/ABAC` 等。可以实现灵活的访问权限控制。

针对用户的使用场景，提供 [Casbin 中间件](https://github.com/hertz-contrib/casbin)，对 Hertz 进行了适配。

## 安装

```sh
go get github.com/hertz-contrib/casbin
```

## 导入

```go
import "github.com/hertz-contrib/casbin"
```

## 示例代码

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

    // 使用 session 存储用户信息.
    store := cookie.NewStore([]byte("secret"))
    h.Use(sessions.New("session", store))
    auth, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
    if err != nil {
        log.Fatal(err)
    }

    h.POST("/login", func(ctx context.Context, c *app.RequestContext) {
        // 校验用户名和密码.
        // ...

        // 存储用户名 (casbin 访问实体)
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

// subjectFromSession 从 session 中获取访问实体.
func subjectFromSession(ctx context.Context, c *app.RequestContext) string {
    // 获取访问实体
    session := sessions.Default(c)
    if subject, ok := session.Get("name").(string); !ok {
        return ""
    } else {
        return subject
    }
}
```

## 配置

Hertz 通过使用 casbin 中间件，为服务端提供了控制用户访问权限的能力。

使用该拓展时，需要先初始化中间件，然后使用中间件方法进行鉴权操作。

### 初始化中间件

#### NewCasbinMiddleware

通过提供 [Model](https://casbin.org/docs/model-storage) 和 [Policy](https://casbin.org/docs/policy-storage) 相关配置以及 `LookupHandler`（用于获取访问实体）来初始化中间件，

该函数会根据提供的配置自动初始化 `*casbin.Enforcer` 用于鉴权操作。

函数签名如下：

```go
func NewCasbinMiddleware(modelFile string, adapter interface{}, lookup LookupHandler) (*Middleware, error)
```

示例代码：

```go
func exampleLookupHandler(ctx context.Context, c *app.RequestContext) string {
    // 获取访问实体
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

通过提供 [enforcer](https://casbin.org/docs/enforcers) 以及 `LookupHandler`（用于获取访问实体）来初始化中间件。

函数签名如下：

```go
func NewCasbinMiddlewareFromEnforcer(e casbin.IEnforcer, lookup LookupHandler) (*Middleware, error)
```

示例代码：

```go
func exampleLookupHandler(ctx context.Context, c *app.RequestContext) string {
    // 获取访问实体
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

### 中间件方法

中间件方法用来判断用户的具体权限逻辑。

该中间件的方法参数格式如下：

```go
func (m *Middleware) exampleMiddlwareMethod(expression string, opts ...Option) app.HandlerFunc
```

其中包含 **expression** 和 **opts** 两个参数，

参数说明如下：

- **expression**

  表达式含有一个或多个变量，变量之间用空格分隔，表达式的具体格式与 `Logic`（见后文 `选项说明`）相关，

  表达式的计算最终值为 **True** or **False**，**True** 则代表通过鉴权中间件，**False** 则代表没有通过鉴权中间件，

  如 `Logic` 为 **AND** or **OR**，则格式为：

  `"var1 var2 var3 var4"`，比如 `"book:read book:write"`

  如 `Logic` 为 **CUSTOM**，则格式为：

  `"var1 opr1 var2 opr2 var3"`，比如 `"book:read && book:write || book:all"`

- **opts**

  | 选项                            | 介绍                                                                            | 默认值                                                                                                 |
  | ------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
  | `WithLogic`                     | `Logic` 是在 `expression` 中的逻辑操作 (**AND**/**OR**/**CUSTOM**)              | `AND`                                                                                                  |
  | `WithPermissionParser`          | `PermissionParserFunc` 是用于解析 `expression` 中变量得出 `obj` 和 `act` 的函数 | `PermissionParserWithSeparator(":")`                                                                   |
  | `WithPermissionParserSeparator` | `PermissionParserSeparator` 是用于设置 `expression` 中变量内部的分隔符          | `:`                                                                                                    |
  | `WithUnauthorized`              | `Unauthorized` 用于定义未通过授权中间件时的响应体（找不到访问实体）             | `func(ctx context.Context, c *app.RequestContext) {    c.AbortWithStatus(consts.StatusUnauthorized) }` |
  | `WithForbidden`                 | `Forbidden` 用于定义访问到禁止访问资源的响应体（访问实体没有相应权限）          | `func(ctx context.Context, c *app.RequestContext) {    c.AbortWithStatus(consts.StatusForbidden) }`    |

#### RequiresPermissions

寻找访问实体（Subject）及通过方法中提供的参数 **expression** （表达式中变量说明见下）判断访问实体所含有的权限是否满足 expression 中的权限集合的关系。

**expression** 中的变量为 [Model](https://casbin.org/docs/syntax-for-models) 中

```
[request_definition]
r = sub, xxx, xxx
```

**sub** 后面的参数集合，

如：

```
[request_definition]
r = sub, obj, act
```

使用了默认的 `PermissionParser` 时，**expression** 中的变量格式应该是：`"book:read"`。

如：

```
[request_definition]
r = sub, dom, obj, act
```

使用了默认的 `PermissionParser` 时，**expression** 中的变量格式应该是：`"book1.com:book:read"`。

函数签名如下：

```go
func (m *Middleware) RequiresPermissions(expression string, opts ...Option) app.HandlerFunc
```

示例代码：

用户只含有 `book:read` 权限时，

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read"), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:write"), // 不通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### RequiresRoles

寻找访问实体（Subject）及通过方法中提供的参数 `expression`（表达式中变量说明见下）判断访问实体所属的角色是否满足 expression 中的角色集合的关系。

`expression` 中的变量为 [RBAC](https://casbin.org/docs/rbac) 中的 **rule** 集合

函数签名如下：

```go
func (m *Middleware) RequiresRoles(expression string, opts ...Option) app.HandlerFunc
```

示例代码：

用户属于 **user** 和 **reader** 角色时，

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

	h.POST("/book",
		auth.RequiresRoles("user"), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)

    h.POST("/book",
		auth.RequiresRoles("user reader"), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)

    h.POST("/book",
		auth.RequiresRoles("user reader admin"), // 不通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you posted a book successfully")
		},
	)
    ...
}
```

**注意**：此方法当且仅当使用了 Casbin 当中基于角色的访问控制模式（即 RBAC）时使用。

### 选项说明

#### WithLogic

`Logic` 是在 `expression` 中的逻辑操作 (`AND`/`OR`/`CUSTOM`) 。

函数签名：

```go
func WithLogic(logic Logic) Option
```

选项：

```go
const (
	AND Logic = iota
	OR
	CUSTOM
)
```

**AND**

`expression` 中的所有变量进行逻辑与操作。

示例代码：

用户只含有 `book:read` 权限时，

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.AND)), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:write", casbin.WithLogic(casbin.AND)), // 不通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

**OR**

`expression` 中的所有变量进行逻辑或操作

示例代码：

用户只含有 `book:read` 权限时，

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.OR)), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read book:and", casbin.WithLogic(casbin.OR)), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

**CUSTOM**

`expression` 为类 C 表达式。

**注意**：

使用该模式时，不可使用选项 `WithPermissionParser`（执行鉴权逻辑时会产生不可预期的错误），如有定义解析权限字符串之类的需求，建议使用选项 `WithPermissionParserSeparator`。

示例代码：

用户只含有 `book:read` 权限时，

```go
func main(){
    ...
    h := server.Default()

    m, err := casbin.NewCasbinMiddleware("example/config/model.conf", "example/config/policy.csv", subjectFromSession)
	if err != nil {
		log.Fatal(err)
	}

    h.GET("/book",
		m.RequiresPermissions("book:read", casbin.WithLogic(casbin.CUSTOM)), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

	h.GET("/book",
		m.RequiresPermissions("book:read && book:write", casbin.WithLogic(casbin.CUSTOM)), // 不通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

    h.GET("/book",
		m.RequiresPermissions("book:read || book:write", casbin.WithLogic(casbin.CUSTOM)), // 通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)

    h.GET("/book",
		m.RequiresPermissions("!book:read", casbin.WithLogic(casbin.CUSTOM)), // 不通过
		func(ctx context.Context, c *app.RequestContext) {
			c.String(200, "you read the book successfully")
		},
	)
    ...
}
```

#### WithPermissionParser

`PermissionParserFunc` 是用于解析 `RequiresPermissions` 方法中 `expression` 的变量的函数。

函数签名：

```go
func WithPermissionParser(pp PermissionParserFunc) Option
```

示例代码：

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

`PermissionParserSeparator` 是用于设置 `expression` 中变量内部的分隔符。

函数签名：

```go
func WithPermissionParserSeparator(sep string) Option
```

示例代码：

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

`Unauthorized` 用于定义未通过授权中间件时的响应体（找不到访问实体，即 `LookupHandler` 返回的结果为空）。

函数签名：

```go
func WithUnauthorized(u app.HandlerFunc) Option
```

示例代码：

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
			casbin.WithUnauthorized(func(ctx context.Context, c *app.RequestContext) {
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

`Forbidden` 用于定义访问到禁止访问资源的响应体（访问实体没有相应权限）。

函数签名：

```go
func WithForbidden(f app.HandlerFunc) Option
```

示例代码：

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
			casbin.WithForbidden(func(ctx context.Context, c *app.RequestContext) {
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
