---
title: "Recovery"
date: 2022-12-15
weight: 2
keywords: ["Recovery", "panic recovery"]
description: "The Recovery middleware is preset by the Hertz framework to provide the feature of Panic recovery for the Hertz framework."
---

The Recovery middleware is preset by the Hertz framework. The `server.Default()` will register Recovery middleware by default to provide the feature of Panic recovery for the Hertz framework.

If you don't use `server.Default()`, you can also register the Recovery middleware as followings:

```go
h := server.New()
h.Use(recovery.Recovery())
```

The Recovery middleware will recover any panics in the Hertz framework. When a panic occurs, the Recover middleware will print out the panic time, content and stack information by default, then set the status code as 500 through `*app.RequestContext'`.

## Import

```go
import "github.com/cloudwego/hertz/pkg/app/middlewares/server/recovery"
```

## Example

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

## Configuration

The Recovery middleware provides a default panic recovery handler`defaultRecoveryHandler()`。

You can also use the `WithRecoveryHandler()` function to customize the handler function when the panic occurs. The function signature is as follows:

```go
func WithRecoveryHandler(f func(ctx context.Context, c *app.RequestContext, err interface{}, stack []byte))
```

For example, if you attempt to obtain client agent, you can customize your handler function as follows:

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

func MyRecoveryHandler(ctx context.Context, c *app.RequestContext, err interface{}, stack []byte) {
	hlog.SystemLogger().CtxErrorf(ctx, "[Recovery] err=%v\nstack=%s", err, stack)
	hlog.SystemLogger().Infof("Client: %s", c.Request.Header.UserAgent())
	c.AbortWithStatus(consts.StatusInternalServerError)
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
