---
title: "Recovery"
date: 2022-12-15
weight: 2
description: >

---

Recovery中间件是Hertz框架预置的中间件，使用 `server.Default()` 可以默认注册该中间件，为Hertz框架提供panic恢复的功能。

Recovery中间件会恢复Hertz框架运行中的任何panic，在panic发生之后，Recover中间件会默认打印出panic的时间、内容和堆栈信息，同时通过`*app.RequestContext`将返回响应的状态码设置成500。

## 导入

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/recovery"
```

## 示例代码

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
	h.GET("/test", func(ctx context.Context, c *app.RequestContext) {
		panic("test")
		c.String(http.StatusOK, "test interface")
	})
	h.Spin()
}
```

## 配置

Recovery中间件提供了默认的panic处理函数`defaultRecoveryHandler()`。

同时你也可以通过`WithRecoveryHandler()`函数来自定义出现panic后的处理函数，函数签名如下：

```go
func WithRecoveryHandler(f func(c context.Context, ctx *app.RequestContext, err interface{}, stack []byte))
```

如果你在发生panic之后希望能够获取客户端信息，示例代码如下：

```go
package main

import (
	"context"
	"fmt"
	"github.com/cloudwego/hertz/pkg/app/middlewares/server/recovery"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func MyRecoveryHandler(c context.Context, ctx *app.RequestContext, err interface{}, stack []byte) {
	hlog.SystemLogger().CtxErrorf(c, "[Recovery] err=%v\nstack=%s", err, stack)
	hlog.SystemLogger().Infof("Client: %s", ctx.Request.Header.UserAgent())
	ctx.AbortWithStatus(consts.StatusInternalServerError)
}

func main() {
	h := server.New()
	h.Use(recovery.Recovery(recovery.WithRecoveryHandler(MyRecoveryHandler)))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		panic("test")
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}
```

