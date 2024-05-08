---
title: "logrus"
linkTitle: "logrus"
weight: 2
date: 2023-04-18
keywords: ["Logger Extension", "logrus"]
description: "Hertz interfaces with logrus and lumberjack."
---

## Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}
```

## NewLogger

`NewLogger` uses `defaultConfig()` to create and initialize a Logger. The required configuration can be passed into the function as a parameter. If no parameter is passed in, the initial configuration will be installed to create `Logger`
For related configuration, please refer to [option configuration](#option-configuration) below

Function Signature:

```go
func NewLogger(opts ...Option) *Logger
```

Sample code:

```go
package main

import (
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
    "github.com/sirupsen/logrus"
)

func main() {
    logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
}
```

## Logger

`Logger` is used to return an instance of `*logrus.Logger` for custom fields, etc

Function Signature:

```go
func (l *Logger) Logger() *logrus.Logger
```

Sample code:

```go
package main

import (
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
    "github.com/sirupsen/logrus"
)

func main() {
    logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
    l := logger.Logger()
}
```

## Option configuration

### WithLogger

`WithLogger` passes logrus.Logger into configuration

Function Signature:

```go
func WithLogger(logger *logrus.Logger) Option
```

Sample code:

```go
package main

import (
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
    "github.com/sirupsen/logrus"
)

func main() {
    stdLogger := logrus.StandardLogger()
    l:=hertzlogrus.NewLogger(hertzlogrus.WithLogger(stdLogger))
}
```

### WithHook

`WithHook` adds the incoming logrus.Hook to the hook in the configuration

Function Signature:

```go
func WithHook(hook logrus.Hook) Option
```

Sample code:

```go
package main

import (
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
    "github.com/sirupsen/logrus"
)

func main() {
    var h logrus.Hook
    l := hertzlogrus.NewLogger(hertzlogrus.WithHook(h))

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
	hertzlogrus "github.com/hertz-contrib/logger/logrus"
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

	logger := hertzlogrus.NewLogger()
    // Provides compression and deletion
	lumberjackLogger := &lumberjack.Logger{
		Filename:   fileName,
		MaxSize:    20,   // A file can be up to 20M.
		MaxBackups: 5,    // Save up to 5 files at the same time.
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

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)
