---
title: "zerolog"
linkTitle: "zerolog"
weight: 4
keywords: ["Logger Extension", "zerolog"]
description: "Hertz interfaces with zerolog and lumberjack."
---

## Logger structure

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

`New` returns a new Logger instance via the `newLogger` function

Function Signature:

```go
func New(options ...Opt) *Logger
```

Sample code:

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

`From` returns a new Logger using an existing Logger via `newLogger`

Function Signature:

```go
func From(log zerolog.Logger, options ...Opt) *Logger
```

Sample code:

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

`GetLogger` returns the default Logger instance and error via the `DefaultLogger()` method

Function Signature:

```go
func GetLogger() (Logger, error)
```

Sample code:

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

`Unwrap` returns the underlying zerolog logger

Function Signature:

```go
func (l *Logger) Unwrap() zerolog.Logger
```

Sample code:

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

## Option configuration

### WithOutput

`WithOutput` returns an Opt function through zerolog's `zerolog.Context.Logger().Output(out).With()`, allowing to specify the output of the logger. By default, it is set to `os.Stdout`

Function Signature:

```go
func WithOutput(out io.Writer) Opt
```

Sample code:

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

`WithLevel` specifies the level of the logger through zerolog's built-in `zerolog.Context.Logger().Level(lvl).With()` method. Convert hlog.Level to zerolog.level by `matchHlogLevel()`. By default it is set to WarnLevel

Function Signature:

```go
func WithLevel(level hlog.Level) Opt
```

Sample code:

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

`WithField` adds a field to the logger's context through zerolog's `zerolog.Context.Interface(name, value)` method

Function Signature:

```go
func WithField(name string, value interface{}) Opt
```

Sample code:

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

`WithFields` adds some fields to the logger's context through zerolog's `zerolog.Context.Fields(fields)`

Function Signature:

```go
func WithFields(fields map[string]interface{}) Opt
```

Sample code:

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

`WithTimestamp` adds the timestamp field to the logger's context through zerolog's `zerolog.Context.Timestamp()`

Function Signature:

```go
func WithTimestamp() Opt
```

Sample code:

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

`WithFormattedTimestamp` is similar to `WithTimestamp`, adding a formatted timestamp field to the logger's context

Function Signature:

```go
func WithFormattedTimestamp(format string) Opt
```

Sample code:

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

`WithCaller` adds a caller to the context of the logger through zerolog's built-in `zerolog.Context.Caller()`, and the caller will report the caller's information

Function Signature:

```go
func WithCaller() Opt
```

Sample code:

```go
//get the last element of the path
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
    l := zerolog.New(zerolog.WithCaller())//add a caller
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

`WithCallerSkipFrameCount` adds `caller` to `logger`'s Context. `CallerWithSkipFrameCount` is a method of zerolog's Context structure. It is used to add the caller's file name and line number in the log record, and uses `zerolog.CallerFieldName` as key name

This method accepts a `skipFrameCount` parameter, which specifies the number of stack frames to skip to determine the correct caller location. If the `skipFrameCount` parameter is set to -1, the global `CallerSkipFrameCount` value is used

After calling the `CallerWithSkipFrameCount` method, a new Context structure is created, and the `newCallerHook` method is used to create a new hook and add it to the logger

Function Signature:

```go
func WithCallerSkipFrameCount(skipFrameCount int) Opt
```

Sample code:

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

`WithHook` adds a hook to the context of logger through zerolog's `zerolog.Context.Logger().Hook(hook).With()`

Function Signature:

```go
func WithHook(hook zerolog.Hook) Opt
```

Sample code:

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

`WithHookFunc` is similar to `WithHook`, adding a hook function to the context of logger

Function Signature:

```go
func WithHookFunc(hook zerolog.HookFunc) Opt
```

Sample code:

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

## A complete logrus example

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

    // Customizable output directory.
	var logFilePath string
	dir := "./hlog"
	logFilePath = dir + "/logs/"
	if err := os.MkdirAll(logFilePath, 0o777); err != nil {
		log.Println(err.Error())
		return
	}

    // set filename to date
	logFileName := time.Now().Format("2006-01-02") + ".log"
	fileName := path.Join(logFilePath, logFileName)
	if _, err := os.Stat(fileName); err != nil {
		if _, err := os.Create(fileName); err != nil {
			log.Println(err.Error())
			return
		}
	}

	logger := hertzZerolog.New()
    // Provides compression and deletion
	lumberjackLogger := &lumberjack.Logger{
		Filename:   fileName,
		MaxSize:    20,   // A file can be up to 20M.
		MaxBackups: 5,    // Save up to 5 files at the same time
		MaxAge:     10,   // A file can be saved for up to 10 days.
		Compress:   true, // Compress with gzip.
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

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)
