---
title: "Sentry"
date: 2022-11-25
weight: 11
keywords: ["Sentry", "实时错误监控"]
description: "Hertz 通过使用中间件 hertzsentry，整合了 Sentry-Go 的 SDK。"
---

Sentry 是一个开源的实时错误监控项目，支持很多平台，包括 Web 前端、服务器端、移动端和游戏端等。Hertz 通过使用中间件 [hertzsentry](https://github.com/hertz-contrib/hertzsentry) ，整合了 [Sentry-Go](https://docs.sentry.io/platforms/go/) 的 SDK。提供了一些统一的接口，帮助用户获得 sentry hub 和报告错误信息。

注意：信息上报功能的实现，依旧是以 Sentry 的 Go SDK 为载体。

这个项目参考了 [fibersentry](https://github.com/gofiber/contrib/tree/main/fibersentry) 的实现。

## 安装

```shell
go get github.com/hertz-contrib/hertzsentry
```

## 示例代码

```go
package main

import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/getsentry/sentry-go"
    "github.com/hertz-contrib/hertzsentry"
)

var yourDsn = ""

func main()  {
    // set interval to 0 means using fs-watching mechanism.
    h := server.Default(server.WithAutoReloadRender(true, 0))

    // init sentry
    if err := sentry.Init(sentry.ClientOptions{
        // The DSN to use. If the DSN is not set, the client is effectively disabled.
        Dsn: yourDsn,
        // Before send callback.
        BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
            return event
        },
        // In debug mode, the debug information is printed to stdout to help you understand what
        // sentry is doing.
        Debug: true,
        // Configures whether SDK should generate and attach stacktraces to pure capture message calls.
        AttachStacktrace: true,
    }); err != nil {
        log.Fatal("sentry init failed")
    }

    // use sentry middleware and config with your requirements.
    // attention! you should use sentry handler after recovery.Recovery()
    h.Use(hertzsentry.NewSentry(
        hertzsentry.WithSendRequest(true),
        hertzsentry.WithRePanic(true),
    ))

    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        // use GetHubFromContext to get the hub
        if hub := hertzsentry.GetHubFromContext(ctx); hub != nil {
            hub.WithScope(func(scope *sentry.Scope) {
                scope.SetTag("hertz", "CloudWeGo Hertz")
                scope.SetLevel(sentry.LevelDebug)
                hub.CaptureMessage("Just for debug")
            })
        }
        ctx.SetStatusCode(0)
    })

    h.Spin()
}
```

## 配置

Hertz 通过使用中间件，整合了 Sentry-Go 的功能。其中 `hertzsentry.options` 结构定义了 hertzsentry 的配置信息，并提供了默认配置，用户也可以依据业务场景进行定制。

| 参数            | 介绍                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| rePanic         | 用于配置 Sentry 在恢复后是否要再次 panic。如果使用了 Recover 中间件，则设置为 true，默认为 false。                                                                                         |
| waitForDelivery | 用于配置是否要在继续处理响应之前阻止请求并清空缓存区（**只有异步传输时才真正意义上有清空缓存区的操作**）。如果使用 Recover 中间件，跳过这个选项或将其设置为 false 是安全的，默认为 false。 |
| sendRequest     | 用于配置在捕获 sentry 事件时是否要添加当前的请求头信息，默认为 false。                                                                                                                     |
| sendBody        | 用于配置在捕获 sentry 事件时是否要添加当前的请求正文信息，默认为 false。                                                                                                                   |
| timeout         | 用于配置 sentry 事件传递请求的超时时长，默认为 2 秒。                                                                                                                                      |

### Flush（Go-Sentry）

Go-Sentry 可以选择异步或者同步发送捕获的信息，选择异步发送时，Flush 用于清空缓存区，**同步发送时没有缓存的概念**，直接返回 true。

触发 Flush 时等待，直到底层传输系统向 Sentry 服务器发送所有事件完毕，返回 true。但最多等待给定的超时时间，如果达到超时，则返回 false。在这种情况下，有些事件可能没有被发送。（这两种情况下缓存区都将被清空）

应该在终止程序之前调用 Flush，以避免无意中丢弃事件。

不要在每次调用 CaptureEvent、CaptureException 或 CaptureMessage 后不加区分地调用 Flush。相反，要想让 SDK 在网络上同步发送事件，请将其配置为使用 HTTPSyncTransport。

函数签名：

```go
func (hub *Hub) Flush(timeout time.Duration) bool
```

Flush 调用逻辑如下：

```go
func (hub *Hub) Flush(timeout time.Duration) bool {
    client := hub.Client()

    if client == nil {
        return false
    }

    // client 的传输方式为异步或同步（需提前配置 Go-Sentry 的初始化参数）
    return client.Flush(timeout)
}
```
