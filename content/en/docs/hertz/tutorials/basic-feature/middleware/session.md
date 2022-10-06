---
title: "Session Extension"
date: 2022-10-07
weight: 6
description: >

---

Hertz provides the [Session Extension](https://github.com/hertz-contrib/sessions), which references Gin’s [implementation](https://github.com/gin-contrib/sessions).

Refer to the below for usage [example](https://github.com/hertz-contrib/sessions/tree/main/_example)

## Install

Download and install

```shell
go get github.com/hertz-contrib/sessions
```

Import into your code

```go
import "github.com/hertz-contrib/sessions"
```

## Example

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

## Config

### NewStore

The `sessions` middleware provides `NewStore` to store sessions in Cookie or Redis.

#### Cookie

Function signatures of `cookie.NewStore`:

```go
func NewStore(keyPairs ...[]byte) Store
```

Sample Code:

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

Function signatures of `redis.NewStore`:

```go
func NewStore(size int, network, addr, passwd string, keyPairs ...[]byte) (Store, error)
```

Sample Code:

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

The `sessions` middleware provides `Sessions` to create a single Session.

Function signatures:

```go
func Sessions(name string, store Store) app.HandlerFunc
```

Sample Code:

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

The `sessions` middleware provides `SessionsMany` to create multiple sessions.

Function signatures:

```go
func SessionsMany(names []string, store Store) app.HandlerFunc
```

Sample Code:

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

The `sessions` middleware provides `Default` to fetch a single Session.

Function signatures:
```go
func Default(c *app.RequestContext) Session
```

Sample Code:

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

The `sessions` middleware provides `DefaultMany` to get the Session based on its name.

Function signatures:
```go
func DefaultMany(c *app.RequestContext, name string) Session
```

Sample Code:
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

### Session Interface

Session Wraps thinly [gorilla-session](https://github.com/gorilla/sessions) methods.

| Method   | Function Signatures                           | Description                                                                            |
|----------|-----------------------------------------------|----------------------------------------------------------------------------------------|
| ID       | `ID() string`                                 | Used to fetch the Session ID generated by stores, it should not be used for user data. |
| Get      | `Get(key interface{}) interface{}`            | Used to get the session value associated to the given key.                             |
| Set      | `Set(key, val interface{})`                   | Used to set the session value associated to the given key.                             |
| Delete   | `Delete(key interface{})`                     | Used to remove the session value associated to the given key.                          |
| Clear    | `Clear()`                                     | Used to delete all values in the session.                                              |
| AddFlash | `AddFlash(value interface{}, vars ...string)` | Used to add a flash message to the session.                                            |
| Flashes  | `Flashes(vars ...string) []interface{}`       | Used to get a slice of flash messages from the session.                                |
| Options  | `Options(Options)`                            | Used to set configuration for a session.                                               |
| Save     | `Save() error`                                | Used to save all sessions used during the current request.                             |



