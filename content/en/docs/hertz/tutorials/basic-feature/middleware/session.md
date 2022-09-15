---
title: "Session Extension"
date: 2022-09-15
weight: 6
description: >

---

Hertz provides the [Session Extension](https://github.com/hertz-contrib/sessions), which references Gin's [implementation](https://github.com/gin-contrib/sessions).

Refer to the below for usage [example](https://github.com/hertz-contrib/sessions/tree/main/_example)

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

Refer to the [sessions](https://github.com/hertz-contrib/sessions) for more usage examples
