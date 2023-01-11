---
title: "Hooks"
date: 2022-10-16
weight: 11
description: >

---

**Hook** is a generic concept that indicates the action that accompanies an event when it is triggered. 

Hertz provides a global Hook for injecting your processing logic on the server-side **after triggering startup** and **before exiting**.

## StartHook

`StartHook` is a function to be called **after** the server-side has triggered a start, represented in Hertz by the type `CtxErrCallback`. Hertz uses the `OnRun` property to store the `StartHook` list.

```shell
// CtxErrCallback refer to it's function signatures below
OnRun []CtxErrCallback
```

Hook functions get triggered **sequentially** after triggering the startup. Once the call is completed, Hertz will officially start listening on the port, or terminate the service immediately if any error occurs.

Function signatures:

```go
type CtxErrCallback func(ctx context.Context) error
```

Sample Code:

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

Note:  After triggering startup, The logs of the three `StartHook` functions will be printed in the terminal **in order**.

```shell
main.go:17: [Info] run the first start hook
main.go:21: [Info] run the second start hook
main.go:25: [Info] run the third start hook
```

## ShutdownHook

`ShutdownHook` is a function to be called **before** the server-side exiting, represented in Hertz by the type `CtxCallback`. Hertz uses the `OnShutdown` property to store the `ShutdownHook` list.

Hook functions get triggered **simultaneously** before the server-side exiting. The user can configure the max expiration time by `server.WithExitWaitTime`, the default is 5 seconds, and once timeout, the server is terminated.

The `ShutdownHook` call process is essentially a part of the Hertz [Graceful Shutdown](https://www.cloudwego.io/docs/hertz/tutorials/basic-feature/graceful-shutdown/).

Function signatures:

```go
type CtxCallback func(ctx context.Context)
```

Sample Code1:

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

Note: Before exiting, the logs of the three `ShutdownHook` functions will be printed in the terminal **disorderly**.

```shell
main.go:17: [Info] run the first shutdown hook
main.go:23: [Info] run the third shutdown hook
main.go:20: [Info] run the second shutdown hook
```

Sample Code2:

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

Note: When terminating the service, the timeout log is printed because the hook function took more than 2 seconds to execute.

```shell
hertz.go:77: [Info] HERTZ: Begin graceful shutdown, wait at most num=2 seconds...
main.go:17: [Info] run shutdown hook
engine.go:276: [Info] HERTZ: Execute OnShutdownHooks timeout: error=context deadline exceeded
```
