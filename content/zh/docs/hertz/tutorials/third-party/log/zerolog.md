---
title: "zerolog"
linkTitle: "zerolog"
weight: 4
keywords: ["日志扩展", "zerolog"]
description: "Hertz 对接 zerolog 和 lumberjack。"
---

## Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
	log     zerolog.Logger
	out     io.Writer
	level   zerolog.Level
	options []Opt
}
```

## New

`New` 通过 `newLogger` 函数返回一个新的 Logger 实例

函数签名：

```go
func New(options ...Opt) *Logger
```

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    hlog.SetLogger(hertzZerolog.New())
}
```

## From

`From` 通过 `newLogger` 用一个已存在的 Logger 返回一个新的 Logger

函数签名：

```go
func From(log zerolog.Logger, options ...Opt) *Logger
```

示例代码：

```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    zl := zerolog.New(b).With().Str("key", "test").Logger()
    l := hertzZerolog.From(zl)
    l.Info("foo")
}
```

## GetLogger

`GetLogger` 通过 `DefaultLogger()` 方法返回默认的 Logger 实例和 error

函数签名：

```go
func GetLogger() (Logger, error)
```

示例代码：

```go
package main

import (
    "fmt"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    logger, err := hertzZerolog.GetLogger()
    if err != nil {
        fmt.Printf("get logger failed")
    }
}

```

## Unwrap

`Unwrap` 返回底层的 zerolog 记录器

函数签名：

```go
func (l *Logger) Unwrap() zerolog.Logger
```

示例代码：

```go
package main

import (
    "fmt"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    logger, err := hertzZerolog.GetLogger()
    if err != nil {
        fmt.Printf("get logger failed")
    }
    l := logger.Unwrap()
}

```

## Option 的相关配置

### WithOutput

`WithOutput` 通过 zerolog 内置的 `zerolog.Context.Logger().Output(out).With()` 返回一个 Opt 的函数，允许指定 logger 的输出。默认情况下，它设置为 `os.Stdout`

函数签名：

```go
func WithOutput(out io.Writer) Opt
```

示例代码：

```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithOutput(b))
    l.Info("foobar")
}
```

### WithLevel

`WithLevel` 通过 zerolog 内置的 `zerolog.Context.Logger().Level(lvl).With()` 方法指定 logger 的级别。通过 `matchHlogLevel()` 将 `hlog.Level` 转换成 `zerolog.level`。默认情况下，它设置为 WarnLevel

函数签名：

```go
func WithLevel(level hlog.Level) Opt
```

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithLevel(hlog.LevelDebug))
    l.Debug("foobar")
}

```

### WithField

`WithField` 通过 zerolog 内置的 `zerolog.Context.Interface(name, value)` 方法向 logger 的 context 添加一个字段

函数签名：

```go
func WithField(name string, value interface{}) Opt
```

示例代码：

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

### WithFields

`WithFields` 通过 zerolog 内置的 `zerolog.Context.Fields(fields)` 向 logger 的 context 添加一些字段

函数签名：

```go
func WithFields(fields map[string]interface{}) Opt
```

示例代码：

```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithFields(map[string]interface{}{
        "host": "localhost",
        "port": 8080,
    })) //...
}
```

### WithTimestamp

`WithTimestamp` 通过 zerolog 内置的 `zerolog.Context.Timestamp()` 将时间戳字段添加到 logger 的 context 中

函数签名：

```go
func WithTimestamp() Opt
```

示例代码：

```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithTimestamp())
    l.Info("foobar")
}
```

### WithFormattedTimestamp

`WithFormattedTimestamp` 与 `WithTimestamp` 类似，将格式化的时间戳字段添加到 logger 的 context 中

函数签名：

```go
func WithFormattedTimestamp(format string) Opt
```

示例代码：

```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "time"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithFormattedTimestamp(time.RFC3339Nano))
    l.Info("foobar")
}
```

### WithCaller

`WithCaller` 通过 zerolog 内置的 `zerolog.Context.Caller()` 添加一个 caller 到 logger 的 context 中，caller 会报告调用者的信息

函数签名：

```go
func WithCaller() Opt
```

示例代码：

```go
package main

import (
    "bytes"
    "encoding/json"
    "github.com/hertz-contrib/logger/zerolog"
    "path/filepath"
    "strings"
)

func main() {
    b := &bytes.Buffer{}
    l := zerolog.New(zerolog.WithCaller())//添加了一个调用者
    l.SetOutput(b)
    l.Info("foobar")
    type Log struct {
        Level   string `json:"level"`
        Caller  string `json:"caller"`
        Message string `json:"message"`
    }

    log := &Log{}

    err := json.Unmarshal(b.Bytes(), log)
    if err!=nil {
        //...
    }

    segments := strings.Split(log.Caller, ":")
    filePath := filepath.Base(segments[0]) //filepath=="logger.go"
}
```

### WithCallerSkipFrameCount

`WithCallerSkipFrameCount` 将 `caller` 添加到 `logger` 的 Context 中，`CallerWithSkipFrameCount` 是 zerolog 的 Context 结构体的方法，它用于在日志记录中添加调用者的文件名和行号，并使用 `zerolog.CallerFieldName` 作为键名

该方法接受一个 `skipFrameCount` 参数，用于指定要跳过的堆栈帧数，以确定正确的调用者位置。如果 `skipFrameCount` 参数设为 -1，则使用全局的 `CallerSkipFrameCount` 值

通过调用 `CallerWithSkipFrameCount` 方法后，会创建一个新的 Context 结构体，并使用 `newCallerHook` 方法创建一个新的钩子（hook），将其添加到日志记录器中

函数签名：

```go
func WithCallerSkipFrameCount(skipFrameCount int) Opt
```

示例代码：

```go
package main

import (
    "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    l := zerolog.New(zerolog.WithCallerSkipFrameCount(-1))
}
```

### WithHook

`WithHook` 通过 zerolog 内置的 `zerolog.Context.Logger().Hook(hook).With()` 添加一个 hook 到 logger 的 context 中

函数签名：

```go
func WithHook(hook zerolog.Hook) Opt
```

示例代码：

```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

type Hook struct {
    logs []HookLog
}
type HookLog struct {
    level   zerolog.Level
    message string
}

func main() {
    h := Hook{}
    l := hertzZerolog.New(hertzZerolog.WithHook(h))

    l.Info("Foo")
    l.Warn("Bar")
    //h.logs[0].level==zerolog.InfoLevel
    //h.logs[0].message=="Foo"
    //h.logs[1].level==zerolog.WarnLevel
    //h.logs[1].message=="Bar"
}
```

### WithHookFunc

`WithHookFunc` 与 `WithHook` 类似，添加一个 hook 函数到 logger 的 context 中

函数签名：

```go
func WithHookFunc(hook zerolog.HookFunc) Opt
```

示例代码：

```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

type HookLog struct {
    level   zerolog.Level
    message string
}

func main() {
    logs := make([]HookLog, 0, 2)
    l := hertzZerolog.New(hertzZerolog.WithHookFunc(func(e *zerolog.Event, level zerolog.Level, message string) {
        logs = append(logs, HookLog{
            level:   level,
            message: message,
        })
    }))

    l.Info("Foo")
    l.Warn("Bar")
    //h.logs[0].level==zerolog.InfoLevel
    //h.logs[0].message=="Foo"
    //h.logs[1].level==zerolog.WarnLevel
    //h.logs[1].message=="Bar"
}
```

## 一个完整的 zerolog 示例

```go
package main

import (
	"context"
	"log"
	"os"
	"path"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzZerolog "github.com/hertz-contrib/logger/zerolog"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	h := server.Default()

    // 可定制的输出目录。
	var logFilePath string
	dir := "./hlog"
	logFilePath = dir + "/logs/"
	if err := os.MkdirAll(logFilePath, 0o777); err != nil {
		log.Println(err.Error())
		return
	}

    // 将文件名设置为日期
	logFileName := time.Now().Format("2006-01-02") + ".log"
	fileName := path.Join(logFilePath, logFileName)
	if _, err := os.Stat(fileName); err != nil {
		if _, err := os.Create(fileName); err != nil {
			log.Println(err.Error())
			return
		}
	}

	logger := hertzZerolog.New()
    // 提供压缩和删除
	lumberjackLogger := &lumberjack.Logger{
		Filename:   fileName,
		MaxSize:    20,   // 一个文件最大可达 20M。
		MaxBackups: 5,    // 最多同时保存 5 个文件。
		MaxAge:     10,   // 一个文件最多可以保存 10 天。
		Compress:   true, // 用 gzip 压缩。
	}

	logger.SetOutput(lumberjackLogger)
	logger.SetLevel(hlog.LevelDebug)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)
