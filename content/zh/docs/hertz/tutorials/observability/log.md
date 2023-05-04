---
title: "日志"
date: 2022-05-23
weight: 1
description: >

---

Hertz 提供打印日志的方式，默认打在标准输出。实现在 `pkg/common/hlog` 中，Hertz 同时也提供了若干全局函数，例如 `hlog.Info`、`hlog.Errorf`、`hlog.CtxTracef` 等，用于调用默认 logger 的相应方法。

## 如何打印日志

hertz 中可以直接调用 `pkg/common/hlog` 包下的方法打日志，该方法会调用 `defaultLogger` 上对应的方法。如实现一个打印 AccessLog 的中间件。

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
## hlog 打印日志并指定日志的 field

以 zerolog 为例，zerolog 中实现了这样的函数：

```go
package main

import (
    "bytes"
    "github.com/cloudwego/hertz/pkg/common/json"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithField("service", "logging"))
    l.SetOutput(b)

    l.Info("foobar")

    type Log struct {
        Level   string `json:"level"`
        Service string `json:"service"`
        Message string `json:"message"`
    }

    log := &Log{}

    err := json.Unmarshal(b.Bytes(), log)//log.service=="logging"
}
```
而在 zap 和 logrus 中并未直接实现这样的函数，需要手动添加原始 option

以 zap 为例：
```go
package main

import (
	"bytes"
	"github.com/cloudwego/hertz/pkg/common/json"
	hertzzap "github.com/hertz-contrib/logger/zap"
	"go.uber.org/zap"
)

func main() {
	b := &bytes.Buffer{}
	l := hertzzap.NewLogger(hertzzap.WithZapOptions(zap.Fields(zap.String("service", "logging"))))
	l.SetOutput(b)

	l.Info("foobar")

	type Log struct {
		Level   string `json:"level"`
		Service string `json:"service"`
		Message string `json:"message"`
	}

	log := &Log{}

	err := json.Unmarshal(b.Bytes(), log) //log.service=="logging"
}
```
## 日志拓展

目前 hlog 支持 zap , logrus 和 zerolog 的拓展使用，日志拓展[详见](https://www.cloudwego.io/zh/docs/hertz/tutorials/framework-exten/log/)。
