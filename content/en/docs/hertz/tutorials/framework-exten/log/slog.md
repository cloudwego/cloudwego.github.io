---
title: "slog"
linkTitle: "slog"
weight: 5
keywords: ["Logger Extension", "slog"]
description: "Hertz interfaces with slog and lumberjack."
---

## Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l   *slog.Logger
    cfg *config
}
```

## NewLogger

Create and initialize a Logger through `defaultConfig()`. The required configuration can be passed into the function as a parameter. If no parameters are passed in, the initial configuration will be installed to create the Logger.
For related configuration, please refer to [option configuration](#option-configuration) below

Currently only `slog.NewJSONHandler()` in the slog library is supported, `slog.NewTextHandler()` is not supported

Function Signature:

```go
func NewLogger(opts ...Option) *Logger
```

Sample code:

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzslog "github.com/hertz-contrib/logger/slog"
    "os"
)

func main() {
    logger := hertzslog.NewLogger(hertzslog.WithOutput(os.Stdout))
    hlog.SetLogger(logger)
}
```

## Logger

`Logger` is used to obtain `*slog.Logger` to meet complex operations

Function Signature:

```go
func (l *Logger) Logger() *slog.Logger
```

Sample code:

```go
package main

import (
    hertzslog "github.com/hertz-contrib/logger/slog"
    "os"
)

func main() {
    logger := hertzslog.NewLogger(hertzslog.WithOutput(os.Stdout))
    l := logger.Logger()
}
```

## Option configuration

### WithOutput

`WithOutput` is used to set the output location of the log

Function Signature:

```go
func WithOutput(writer io.Writer) Option
```

Sample code:

```go
package main

import (
    hertzslog "github.com/hertz-contrib/logger/slog"
    "os"
)

func main() {
    logger := hertzslog.NewLogger(hertzslog.WithOutput(os.Stdout))
}


```

### WithLevel

`WithLevel` judges the incoming `*slog.LevelVar`. Only log levels higher than or equal to this will be recorded

> It is worth noting that if `WithLevel` is set together with `WithHandlerOptions`, the log level of WithLevel will override the log level in WithHandlerOptions

Function Signature:

```go
func WithLevel(lvl *slog.LevelVar) Option
```

Sample code:

```go
package main

import (
    hertzslog "github.com/hertz-contrib/logger/slog"
)

func main() {
    //Empty LevelVar corresponds to LevelInfo
    logger := hertzslog.NewLogger(hertzslog.WithLevel(&slog.LevelVar{}))

    //Dynamically set the log level to Level Debug
    levelVar := slog.LevelVar{}
    levelVar.Set(slog.LevelDebug)
    logger := hertzslog.NewLogger(hertzslog.WithLevel(&slog.LevelVar{}))
}

```

### WithHandlerOptions

`WithHandlerOptions` passes `*slog.HandlerOptions` into the configuration

Function Signature:

```go
func WithHandlerOptions(opts *slog.HandlerOptions) Option
```

Sample code:

```go
package main

import (
    hertzslog "github.com/hertz-contrib/logger/slog"
)

func main() {
    logger := hertzslog.NewLogger(hertzslog.WithHandlerOptions(&slog.HandlerOptions{
        AddSource:   false,
        Level:       slog.LevelInfo,
        ReplaceAttr: nil,
    }))
}
```

## A complete slog example

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
	hertzslog "github.com/hertz-contrib/logger/slog"
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

	// 将文件名设置为日期
	logFileName := time.Now().Format("2006-01-02") + ".log"
	fileName := path.Join(logFilePath, logFileName)
	if _, err := os.Stat(fileName); err != nil {
		if _, err := os.Create(fileName); err != nil {
			log.Println(err.Error())
			return
		}
	}

	logger := hertzslog.NewLogger()
	// set filename to date
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

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/slog](https://github.com/hertz-contrib/logger/tree/main/slog)
