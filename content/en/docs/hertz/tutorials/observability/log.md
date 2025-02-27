---
title: "Log"
date: 2022-05-23
weight: 1
keywords: ["Log", "logLevel"]
description: "Hertz provides logging capabilities."
---

Hertz provides a default way to print logs in the standard output. It also provides several global functions, such as `hlog.Info`, `hlog.Errorf`, `hlog.CtxTracef`, etc., which are implemented in `pkg/common/hlog`, to call the corresponding methods of the default logger.

## How to print logs

Hertz can call the method under the `pkg/common/hlog` package directly, which will call the corresponding method on the `defaultLogger`. For example, implement a middleware that prints AccessLog.

```go
func AccessLog() app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		start := time.Now()
		c.Next(ctx)
		end := time.Now()
		latency := end.Sub(start).Microseconds
		hlog.CtxTracef(ctx, "status=%d cost=%d method=%s full_path=%s client_ip=%s host=%s",
			c.Response.StatusCode(), latency,
			c.Request.Header.Method(), c.Request.URI().PathOriginal(), c.ClientIP(), c.Request.Host())
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

The default output location of logger is os.stdout, which will not be output on the terminal after redirection.

If you want to output to the terminal and path at the same time, you can refer to the following code:

```go
package main

import (
    "io"
    "os"

    "github.com/cloudwego/hertz/pkg/common/hlog"
)

func main() {
    f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        panic(err)
    }
    defer f.Close()
    fileWriter := io.MultiWriter(f,os.Stdout)
    hlog.SetOutput(fileWriter)

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

## Mute engine error log

In production environment, it may encounter errors like "error when reading request headers", which are often caused by the non-standard behavior of the client side. For the server, besides locating the specific client through its IP address and informing it to make improvements (if possible), there is not much that can be done. Therefore, Hertz provides a configuration that can be added during initialization to disable these logs.

```go
hlog.SetSilentMode(true)
```
