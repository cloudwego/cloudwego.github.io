---
title: "Session扩展"
date: 2022-10-07
weight: 6
description: >

---

Session 是服务器为了保存用户状态而创建的一种特殊的对象。

Hertz 也提供了 Session 的 [实现](https://github.com/hertz-contrib/sessions) ，它参考了 Gin 的 [实现](https://github.com/gin-contrib/sessions) 。

## 安装

下载并安装

```shell
go get github.com/hertz-contrib/sessions
```

导入

```go
import "github.com/hertz-contrib/sessions"
```

## 示例代码

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	h.Use(sessions.Sessions("mysession", store))
	h.GET("/incr", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)
		var count int
		v := session.Get("count")
		if v != nil {
			count = v.(int)
			count++
		}
		session.Set("count", count)
		session.Save()
		c.JSON(200, utils.H{"count": count})
	})
	h.Spin()
}
```

## 配置

Hertz 通过使用中间件，可以对 Session 进行一系列的操作配置。其中 `Session` 接口定义了对 Session 操作配置的主要方法，接口方法的介绍如下：

**注意：** Session 接口对 [gorilla-session](https://github.com/gorilla/sessions) 的方法进行了简单封装。

| 方法       | 函数签名                                          | 介绍                              |
|----------|-----------------------------------------------|---------------------------------|
| ID       | `ID() string`                                 | 用于获取存储时生成的Session ID，它不应该用于用户数据 |
| Get      | `Get(key interface{}) interface{}`            | 用于根据给定的键值参数获取Session值           |
| Set      | `Set(key, val interface{})`                   | 用于设置与给定键值相关联的Session值           |
| Delete   | `Delete(key interface{})`                     | 用于根据给定的键值删除相关联的Session值         |
| Clear    | `Clear()`                                     | 用于删除Session中存储的所有值              |
| AddFlash | `AddFlash(value interface{}, vars ...string)` | 用于向Session添加一条flash message     |
| Flashes  | `Flashes(vars ...string) []interface{}`       | 用于获取Session中的flash message      |
| Options  | `Options(Options)`                            | 用于设置Session的配置                  |
| Save     | `Save() error`                                | 用于保存当前请求期间使用的所有会话               |

### NewStore

`sessions` 中间件提供了 `NewStore` 用于将 Session 存储在 Cookie 或者 Redis 中。

#### Cookie

函数签名：

```go
func NewStore(keyPairs ...[]byte) Store
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	h.Use(sessions.Sessions("mysession", store))
	h.GET("/incr", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)
		var count int
		v := session.Get("count")
		if v == nil {
			count = 0
		} else {
			count = v.(int)
			count++
		}
		session.Set("count", count)
		session.Save()
		c.JSON(200, utils.H{"count": count})
	})
	h.Spin()
}
```

#### Redis

函数签名：

```go
func NewStore(size int, network, addr, passwd string, keyPairs ...[]byte) (Store, error)
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/redis"
)

func main() {
	h := server.Default(server.WithHostPorts(":8000"))
	store, _ := redis.NewStore(10, "tcp", "localhost:6379", "", []byte("secret"))
	h.Use(sessions.Sessions("mysession", store))

	h.GET("/incr", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)
		var count int
		v := session.Get("count")
		if v == nil {
			count = 0
		} else {
			count = v.(int)
			count++
		}
		session.Set("count", count)
		session.Save()
		c.JSON(200, utils.H{"count": count})
	})
	h.Spin()
}
```

### Sessions

`sessions` 中间件提供了 `Sessions` 用于创建单个 Session。

函数签名：

```go
func Sessions(name string, store Store) app.HandlerFunc
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	h.Use(sessions.Sessions("mysession", store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)

		if session.Get("hello") != "world" {
			session.Set("hello", "world")
			session.Save()
		}

		c.JSON(200, utils.H{"hello": session.Get("hello")})
	})
	h.Spin()
}
```

### SessionsMany

`sessions` 中间件提供了 `SessionsMany` 用于创建多个 Session。

函数签名：

```go
func SessionsMany(names []string, store Store) app.HandlerFunc
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	sessionNames := []string{"a", "b"}
	h.Use(sessions.SessionsMany(sessionNames, store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		sessionA := sessions.DefaultMany(c, "a")
		sessionB := sessions.DefaultMany(c, "b")

		if sessionA.Get("hello") != "world!" {
			sessionA.Set("hello", "world!")
			sessionA.Save()
		}

		if sessionB.Get("hello") != "world?" {
			sessionB.Set("hello", "world?")
			sessionB.Save()
		}

		c.JSON(200, utils.H{
			"a": sessionA.Get("hello"),
			"b": sessionB.Get("hello"),
		})
	})
	h.Spin()
}
```

### Default

`sessions` 中间件提供了 `Default` 用于获取单个 Session。

函数签名：

```go
func Default(c *app.RequestContext) Session
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	h.Use(sessions.Sessions("mysession", store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)

		if session.Get("hello") != "world" {
			session.Set("hello", "world")
			session.Save()
		}

		c.JSON(200, utils.H{"hello": session.Get("hello")})
	})
	h.Spin()
}
```

### DefaultMany

`sessions` 中间件提供了 `DefaultMany` 用于根据 Session 名获取 Session。

函数签名：

```go
func DefaultMany(c *app.RequestContext, name string) Session
```

示例代码：
```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/sessions"
	"github.com/hertz-contrib/sessions/cookie"
)

func main() {
	h := server.New(server.WithHostPorts(":8000"))
	store := cookie.NewStore([]byte("secret"))
	sessionNames := []string{"a", "b"}
	h.Use(sessions.SessionsMany(sessionNames, store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		sessionA := sessions.DefaultMany(c, "a")
		sessionB := sessions.DefaultMany(c, "b")

		if sessionA.Get("hello") != "world!" {
			sessionA.Set("hello", "world!")
			sessionA.Save()
		}

		if sessionB.Get("hello") != "world?" {
			sessionB.Set("hello", "world?")
			sessionB.Save()
		}

		c.JSON(200, utils.H{
			"a": sessionA.Get("hello"),
			"b": sessionB.Get("hello"),
		})
	})
	h.Spin()
}
```

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/sessions/tree/main/_example)

