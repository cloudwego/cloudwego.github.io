---
title: "Session 扩展"
date: 2022-10-07
weight: 6
keywords: ["Session"]
description: "Hertz 提供了 Session 的实现。"
---

Session 是服务器为了保存用户状态而创建的一种特殊的对象。

Hertz 也提供了 Session 的 [实现](https://github.com/hertz-contrib/sessions)，它参考了 Gin 的 [实现](https://github.com/gin-contrib/sessions)。

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
	h.Use(sessions.New("mysession", store))
	h.GET("/incr", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)
		var count int
		v := session.Get("count")
		if v != nil {
			count = v.(int)
			count++
		}
		session.Set("count", count)
		_ = session.Save()
		c.JSON(200, utils.H{"count": count})
	})
	h.Spin()
}
```

## 配置

Hertz 通过使用中间件，可以对 Session 进行一系列的操作配置。其中 `Session` 接口定义了对 Session 操作配置的主要方法，接口方法的介绍如下：

**注意：** Session 接口对 [gorilla-session](https://github.com/gorilla/sessions) 的方法进行了简单封装。

| 方法     | 函数签名                                      | 介绍                                                                |
| -------- | --------------------------------------------- | ------------------------------------------------------------------- |
| ID       | `ID() string`                                 | 用于获取存储时生成的 Session ID，它不应该作为用户信息的一部分去使用 |
| Get      | `Get(key interface{}) interface{}`            | 用于根据给定的键值参数获取 Session 值                               |
| Set      | `Set(key, val interface{})`                   | 用于设置与给定键值相关联的 Session 值                               |
| Delete   | `Delete(key interface{})`                     | 用于根据给定的键值删除相关联的 Session 值                           |
| Clear    | `Clear()`                                     | 用于删除 Session 中存储的所有值                                     |
| AddFlash | `AddFlash(value interface{}, vars ...string)` | 用于向 Session 添加一条 flash message                               |
| Flashes  | `Flashes(vars ...string) []interface{}`       | 用于获取 Session 中的 flash message                                 |
| Options  | `Options(Options)`                            | 用于设置 Session 的配置                                             |
| Save     | `Save() error`                                | 用于保存当前请求期间使用的所有会话                                  |

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
	h.Use(sessions.New("mysession", store))
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
		_ = session.Save()
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
	h.Use(sessions.New("mysession", store))

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

### New

`sessions` 中间件提供了 `New` 用于创建单个 Session。

函数签名：

```go
func New(name string, store Store) app.HandlerFunc
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
	h.Use(sessions.New("mysession", store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)

		if session.Get("hello") != "world" {
			session.Set("hello", "world")
			_ = session.Save()
		}

		c.JSON(200, utils.H{"hello": session.Get("hello")})
	})
	h.Spin()
}
```

### Many

`sessions` 中间件提供了 `Many` 用于创建多个 Session。

函数签名：

```go
func Many(names []string, store Store) app.HandlerFunc
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
	h.Use(sessions.Many(sessionNames, store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		sessionA := sessions.DefaultMany(c, "a")
		sessionB := sessions.DefaultMany(c, "b")

		if sessionA.Get("hello") != "world!" {
			sessionA.Set("hello", "world!")
			_ = sessionA.Save()
		}

		if sessionB.Get("hello") != "world?" {
			sessionB.Set("hello", "world?")
			_ = sessionB.Save()
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

`sessions` 中间件提供了 `Default` 用于获取单个 Session 对象。

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
	h.Use(sessions.New("mysession", store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		session := sessions.Default(c)

		if session.Get("hello") != "world" {
			session.Set("hello", "world")
			_ = session.Save()
		}

		c.JSON(200, utils.H{"hello": session.Get("hello")})
	})
	h.Spin()
}
```

### DefaultMany

`sessions` 中间件提供了 `DefaultMany` 用于根据 Session 名获取对应的 Session 对象。

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
	h.Use(sessions.Many(sessionNames, store))
	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		sessionA := sessions.DefaultMany(c, "a")
		sessionB := sessions.DefaultMany(c, "b")

		if sessionA.Get("hello") != "world!" {
			sessionA.Set("hello", "world!")
			_ = sessionA.Save()
		}

		if sessionB.Get("hello") != "world?" {
			sessionB.Set("hello", "world?")
			_ = sessionB.Save()
		}

		c.JSON(200, utils.H{
			"a": sessionA.Get("hello"),
			"b": sessionB.Get("hello"),
		})
	})
	h.Spin()
}
```

## 分布式 Session

Hertz 也提供了基于 Redis 的分布式 Session 解决方案的 [bizdemo](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_session)。

**注意：这只是对分布式 Session 功能的简单演示，具体业务代码需用户结合对应的业务逻辑做出相应修改**

> 基于 Redis 的分布式 Session 解决方案是指将不同服务器的 Session 统一存储在 Redis 或 Redis 集群中，旨在解决分布式系统下多个服务器的 Session 不同步的问题。

**核心代码展示**

1. Session 中间件初始化：

```go
// biz/mw/session.go
func InitSession(h *server.Hertz) {
	store, err := redis.NewStore(consts.MaxIdleNum, consts.TCP, consts.RedisAddr, consts.RedisPasswd, []byte(consts.SessionSecretKey))
	if err != nil {
		panic(err)
	}
	h.Use(sessions.New(consts.HertzSession, store))
}
```

2. 用户登录后存储 Session：

```go
// biz/handler/user/user_service.go/Login
// ...
session := sessions.Default(c)
session.Set(consts.Username, req.Username)
_ = session.Save()
// ...
```

3. 用户直接访问主页时判断是否存在对应 Session，不存在则重定向到登录页面（本例）或者限制登录后才可以进行浏览或使用的资源：

```go
// pkg/render/render.go
// ...
session := sessions.Default(c)
username := session.Get(consts.Username)
if username == nil {
    // ...
    c.Redirect(http.StatusMovedPermanently, []byte("/login.html"))
    return
}
// ...
```

4. 用户登出后清理 Session：

```go
// biz/handler/user/user_service.go/Logout
// ...
session := sessions.Default(c)
session.Delete(consts.Username)
_ = session.Save()
// ...
```

Session 中间件对大多数复杂的逻辑进行了封装，用户只需要调用简单的接口即可完成对应的业务流程。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/sessions/tree/main/_example) 以及 [hertz_session](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_session)
