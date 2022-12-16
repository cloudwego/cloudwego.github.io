---
title: "Log"
date: 2022-05-23
weight: 7
description: >

---

Hertz provides a default way to print logs in the standard output. It also provides several global functions, such as `hlog.Info`, `hlog.Errorf`, `hlog.CtxTracef`, etc., which are implemented in `pkg/common/hlog`, to call the corresponding methods of the default logger.

## How to print logs

Hertz can call the method under the `pkg/common/hlog` package directly, which will call the corresponding method on the `defaultLogger`. For example, implement a middleware that prints AccessLog.

```go
func AccessLog() app.HandlerFunc {
	return func(c context.Context, ctx *app.RequestContext) {
		start := time.Now()
		ctx.Next(c)
		end := time.Now()
		latency := end.Sub(start).Microseconds
		hlog.CtxTracef(c, "status=%d cost=%d method=%s full_path=%s client_ip=%s host=%s",
			ctx.Response.StatusCode(), latency,
			ctx.Request.Header.Method(), ctx.Request.URI().PathOriginal(), ctx.ClientIP(), ctx.Request.Host())
	}
}
```

## Redirects the output of the default logger

Hertz can use `hlog.SetOutput` to redirect the output of the default logger provided by hlog.
For example, to redirect the output of the default logger to `. /output.log`, you may do as follows:

```go
package main

import (
    "os"

    "github.com/cloudwego/hertz/pkg/common/hlog"
)

func main() {
    f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
            panic(err)
    }
    defer f.Close()
    hlog.SetOutput(f)

    ... // continue to set up your server
}
```

## Set the logLevel

Hertz can use `hlog.SetLevel` to set the log level above which logs will be printed.

```go
hlog.SetLevel(hlog.LevelInfo)
```

The following log levels are currently supported:

```text
LevelTrace
LevelDebug
LevelInfo
LevelNotice
LevelWarn
LevelError
LevelFatal
```

## Log Extension

Currently, hlog supports the extended use of zap and logrus. For details on log extension, [see](https://www.cloudwego.io/en/docs/hertz/tutorials/framework-exten/log/).
