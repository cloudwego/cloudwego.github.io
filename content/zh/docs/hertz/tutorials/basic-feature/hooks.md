---
title: "Hooks"
date: 2022-10-16
weight: 14
description: >

---

**钩子函数**（Hooks）是一个通用的概念，表示某事件触发时所伴随的操作。

Hertz 提供了全局的 Hook 注入能力，用于在服务**触发启动后**和**退出前**注入自己的处理逻辑。

## StartHook

`StartHook` 在 Hertz 当中表示服务**触发启动后**需调用的函数，使用 `CtxErrCallback` 类型表示。Hertz 使用 `OnRun` 属性存储 `StartHook` 列表。

```go
// CtxErrCallback 参见下方其函数签名
OnRun []CtxErrCallback
```

触发 Server 启动后，框架会按函数声明顺序**依次**调用所有的 `StartHook` 函数，完成调用之后，才会正式开始端口监听，如果发生错误，则立刻终止服务。

函数签名：

```go
type CtxErrCallback func(ctx context.Context) error
```

示例代码：

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default()

    h.OnRun = append(h.OnRun, func(ctx context.Context) error {
        hlog.Info("run the first start hook")
        return nil
    })
    h.OnRun = append(h.OnRun, func(ctx context.Context) error {
        hlog.Info("run the second start hook")
        return nil
    })
    h.OnRun = append(h.OnRun, func(ctx context.Context) error {
        hlog.Info("run the third start hook")
        return nil
    })

    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

提示：启动服务，将在控制台**顺序**打印三个 `StartHook` 函数的日志。

```shell
main.go:17: [Info] run the first start hook
main.go:21: [Info] run the second start hook
main.go:25: [Info] run the third start hook
```

## ShutdownHook

`ShutdownHook` 在 Hertz 当中表示服务**退出前**需调用的函数，使用 `CtxCallback` 类型表示。Hertz 使用 `OnShutdown` 属性存储 `ShutdownHook` 列表。

Server 退出前，框架会**并发地**调用所有声明的 `ShutdownHook` 函数，并且可以通过 `server.WithExitWaitTime`配置最大等待时长，默认为 5 秒，如果超时，则立刻终止服务。

`ShutdownHook` 的调用本质上是 Hertz [优雅退出](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/graceful-shutdown/) 的一环。

函数签名：

```go
type CtxCallback func(ctx context.Context)
```

示例代码 1：

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default()

    h.OnShutdown = append(h.OnShutdown, func(ctx context.Context) {
        hlog.Info("run the first shutdown hook")
    })
    h.OnShutdown = append(h.OnShutdown, func(ctx context.Context) {
        hlog.Info("run the second shutdown hook")
    })
    h.OnShutdown = append(h.OnShutdown, func(ctx context.Context) {
        hlog.Info("run the third shutdown hook")
    })

    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

提示：终止服务，将在控制台**乱序**打印三个 `ShutdownHook` 函数的日志。

```shell
hertz.go:77: [Info] HERTZ: Begin graceful shutdown, wait at most num=5 seconds...
main.go:22: [Info] run the third shutdown hook
main.go:16: [Info] run the first shutdown hook
main.go:19: [Info] run the second shutdown hook
engine.go:279: [Info] HERTZ: Execute OnShutdownHooks finish
```

示例代码 2：

```go
package main

import (
	"context"
    "time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.Default(server.WithExitWaitTime(time.Second * 2))

	h.OnShutdown = append(h.OnShutdown, func(ctx context.Context) {
		hlog.Info("run shutdown hook")
		time.Sleep(time.Second * 5)
	})

	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

提示：终止服务时，因为钩子函数执行时间超过 2 秒，打印超时日志。

```shell
hertz.go:77: [Info] HERTZ: Begin graceful shutdown, wait at most num=2 seconds...
main.go:17: [Info] run shutdown hook
engine.go:276: [Info] HERTZ: Execute OnShutdownHooks timeout: error=context deadline exceeded
```

## OnAccept

`OnAccept` 是一个在连接建立后且被添加到 epoll 前调用的函数。

```go
OnAccept func(conn net.Conn) context.Context
```

示例代码：

```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "net"
)

func main() {

    h := server.New(
        server.WithOnAccept(func(conn net.Conn) context.Context {
            hlog.Info("run the onAccept")
            return context.Background()
        }),
        server.WithHostPorts("localhost:9230"))
    h.GET("", func(c context.Context, ctx *app.RequestContext) {
        hlog.Info("pong")
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()

}

```

提示：在发出请求后，将在控制台打印 `OnAccept` 函数的日志。

```
main.go:32: [Info] run the onAccept
main.go:38: [Info] pong
```

## OnConnect

`OnConnect` 是一个在其被添加到 epoll 后调用的函数。它和 `OnAccept` 的不同之处在于它可以获取数据但是 `OnAccept` 不可以。

```go
OnConnect func(ctx context.Context, conn network.Conn) context.Context
```

示例代码：

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/network"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {

	h := server.New(
		server.WithHostPorts("localhost:9229"),
		server.WithOnConnect(func(ctx context.Context, conn network.Conn) context.Context {
			b, _ := conn.Peek(3)
			hlog.Info("onconnect")
			hlog.Info(b)
			return ctx
		}))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
	h.Spin()

}
```

提示：在发出请求后，将在控制台打印 `OnConnect` 函数的日志。

```
main.go:19: [Info] onconnect
main.go:20: [Info] [71 69 84]
```
