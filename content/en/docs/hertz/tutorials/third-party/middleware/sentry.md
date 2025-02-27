---
title: "Sentry"
date: 2022-11-25
weight: 11
keywords: ["Sentry", "real-time error monitoring"]
description: "Hertz integrates with the Sentry-Go SDK by using the middleware hertzsentry. "
---

Sentry is an open-source real-time error monitoring project that supports many platforms, including web front-end, server-side, mobile, and game-side. Hertz integrates with the [Sentry-Go](https://docs.sentry.io/platforms/go/) SDK by using the middleware [hertzsentry](https://github.com/hertz-contrib/hertzsentry). It provides several unified interfaces to help users get access to the sentry hub and report error messages.

Note: Information reporting is still implemented using Sentry's Go SDK.

This project refers to [fibersentry](https://github.com/gofiber/contrib/tree/main/fibersentry).

## Install

```shell
go get github.com/hertz-contrib/hertzsentry
```

## Example

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
        c.SetStatusCode(0)
    })

    h.Spin()
}
```

## Config

Hertz integrates the functionality of Sentry-Go through the use of middleware. The `hertzsentry.options` structure defines the configuration information for hertzsentry and provides a default configuration that can be customized by the user according to the business scenario.

| Parameter       | Introduction                                                                                                                                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rePanic         | Used to configure whether Sentry should panic again after recovery; set to true if the Recover middleware is used, the default is false.                                                                                                                                                                       |
| waitForDelivery | Used to configure whether the request should be blocked and the buffer emptied before continuing to process the response (**only asynchronous transfers really have an operation to empty the buffer**). If using Recover middleware, it is safe to skip this option or set it to false, the default is false. |
| sendRequest     | Used to configure whether the current request headers should be added when capturing sentry events, the default is false.                                                                                                                                                                                      |
| sendBody        | Used to configure whether to add the current request body information when capturing sentry events, the default is false.                                                                                                                                                                                      |
| timeout         | Used to configure the timeout for sentry event delivery requests, the default is 2 seconds.                                                                                                                                                                                                                    |

### Flush（Go-Sentry）

Go-Sentry can choose to send the captured information asynchronously or synchronously, with Flush used to empty the cache when asynchronous is selected. **No concept of cache when sending synchronously**, returns true directly.

When Flush is triggered it waits until the underlying transport has sent all events to the Sentry server, returning true, but waits up to a given timeout and returns false if the timeout is reached, in which case some events may not be sent. (The buffer will be emptied in both cases)

Flush should be called before terminating the program to avoid inadvertently discarding events.

Do not call Flush indiscriminately after each CaptureEvent, CaptureException or CaptureMessage call. Instead, to have the SDK send events synchronously over the network, configure it to use HTTPSyncTransport.

Function signatures:

```go
func (hub *Hub) Flush(timeout time.Duration) bool
```

The internal call logic for Flush is as follows:

```go
func (hub *Hub) Flush(timeout time.Duration) bool {
    client := hub.Client()

    if client == nil {
        return false
    }

    // The client's transfer pattern is asynchronous or synchronous (Go-Sentry initialization parameters must be pre-configured)
    return client.Flush(timeout)
}
```
