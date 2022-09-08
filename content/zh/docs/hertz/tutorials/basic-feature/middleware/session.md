---
title: "Session扩展"
date: 2022-09-01
weight: 6
description: >

---

Hertz 提供了 [Session扩展](https://github.com/hertz-contrib/sessions) ，它参考了 Gin 的 [实现](https://github.com/gin-contrib/sessions) 。

使用方法可参考如下 [example](https://github.com/hertz-contrib/sessions/tree/main/_example)

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

更多用法示例详见 [sessions](https://github.com/hertz-contrib/sessions)
