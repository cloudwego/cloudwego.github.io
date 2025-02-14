---
title: "日志"
date: 2022-05-23
weight: 1
keywords: ["日志", "logLevel"]
description: "Hertz 提供的日志能力。"
---

Hertz 提供打印日志的方式，默认打在标准输出。实现在 `pkg/common/hlog` 中，Hertz 同时也提供了若干全局函数，例如 `hlog.Info`、`hlog.Errorf`、`hlog.CtxTracef` 等，用于调用默认 logger 的相应方法。

## 如何打印日志

hertz 中可以直接调用 `pkg/common/hlog` 包下的方法打日志，该方法会调用 `defaultLogger` 上对应的方法。如实现一个打印 AccessLog 的中间件。

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

## 重定向默认 logger 的输出

可以使用 `hlog.SetOutput` 来重定向 hlog 提供的默认 logger 的输出。
例如，要把默认 logger 的输出重定向到启动路径下的 `./output.log`，可以这样实现：

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

logger 的默认输出位置为 os.stdout，在重定向后将不会在终端输出。

如果想同时输出到终端和路径，可参考以下代码：

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

## 设置 logLevel

可以使用 `hlog.SetLevel` 来设置日志等级，高于该日志等级的日志才能够被打印出来。

```go
hlog.SetLevel(hlog.LevelInfo)
```

目前支持的日志等级有

```text
LevelTrace
LevelDebug
LevelInfo
LevelNotice
LevelWarn
LevelError
LevelFatal
```

## 关闭 Engine 错误日志

在生产环境中可能会遇到 `error when reading request headers` 类似的错误，这类错误往往由于 client 侧不规范的行为导致。对于 server 来说除了通过 client IP 定位到具体 client 并告知其整改（如果可以的话）以外，能够做的并不多。
因此 Hertz 提供了一个配置，在初始化时添加如下配置即可关闭这些日志

```go
hlog.SetSilentMode(true)
```
