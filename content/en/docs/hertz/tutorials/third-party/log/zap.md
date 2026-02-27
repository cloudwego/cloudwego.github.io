---
title: "zap"
linkTitle: "zap"
weight: 3
keywords: ["Logger Extension", "zap"]
description: "Hertz interfaces with zap and lumberjack."
---

## Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```

## NewLogger

Create and initialize a Logger through `defaultConfig()`. The required configuration can be passed into the function as a parameter. If no parameter is passed in, the initial configuration will be installed to create a Logger
For related configuration, please refer to [option configuration](#option-configuration) below

Function Signature:

```go
func NewLogger(opts ...Option) *Logger
```

Sample code:

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func main() {
    logger := hertzzap.NewLogger(hertzzap.WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

    hlog.SetLogger(logger)
}

```

## Logger

`Logger` is used to return an instance of `*zap.Logger` for custom fields, etc

Function Signature:

```go
func (l *Logger) Logger() *zap.Logger
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func main() {
    logger := hertzzap.NewLogger(hertzzap.WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

    l := logger.Logger()
}


```

## Option configuration

### WithCoreEnc

Encoder is a format-agnostic interface for all log entry marshalers, `WithCoreEnc` passes `zapcore.Encoder` into configuration

Function Signature:

```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func main() {
    enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
    l := hertzzap.NewLogger(hertzzap.WithCoreEnc(enc))
}

```

### WithCoreWs

`WithCoreWs` specifies the location where the log is written through the `zapcore.AddSync(file)`, and passes `zapcore.WriteSyncer` into the configuration

Function Signature:

```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap/zapcore"
    "os"
)

func main() {
    ws := zapcore.AddSync(os.Stdout)
    l:=hertzzap.NewLogger(hertzzap.WithCoreWs(ws))
}

```

### WithCoreLevel

`WithCoreLevel` passes `zap.AtomicLevel` into configuration

Function Signature:

```go
func WithCoreLevel(lvl zap.AtomicLevel) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
    l:=hertzzap.NewLogger(hertzzap.WithCoreLevel(lvl))
}
```

### WithCores

`WithCores` passes `zapcore.Encoder`, `zapcore.WriteSyncer`, `zap.AtomicLevel` into `CoreConfig` into the configuration

Function Signature:

```go
func WithCores(coreConfigs ...CoreConfig) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "os"
)

func main() {
    enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
    lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
    ws := zapcore.AddSync(os.Stdout)

    cfg := hertzzap.CoreConfig{
        Enc: enc,
        Ws:  ws,
        Lvl: lvl,
    }

    l := hertzzap.NewLogger(hertzzap.WithCores(cfg))
}
```

### WithZapOptions

`WithZapOptions` uses the `append()` method to append the original zap configuration

Function Signature:

```go
func WithZapOptions(opts ...zap.Option) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    opts := zap.AddCaller()
    l := hertzzap.NewLogger(hertzzap.WithZapOptions(opts,zap.Hooks()))
}
}
```

### WithExtraKeys

`ExtraKey` is a field in the `zap.config` structure used to store extra keys. `WithExtraKeys` judges the incoming parameters. If they are not added to `zap.config`, the incoming parameters are added to `zap .config`

Function Signature:

```go
type ExtraKey String

func WithExtraKeys(keys []ExtraKey) Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    l := hertzzap.NewLogger(hertzzap.WithExtraKeys())
}
```

### WithExtraKeyAsStr

`WithExtraKeyAsStr` convert `extraKey` to a string type when retrieving value from context

Not recommended for use, only for compatibility with certain situations

Typically used with `WithExtraKeys`

Function Signature:

```go
func WithExtraKeyAsStr() Option
```

Sample code:

```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    l := hertzzap.NewLogger(hertzzap.WithExtraKeys(),hertzzap.WithExtraKeyAsStr())
}
```

## A complete zap example

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
	hertzzap "github.com/hertz-contrib/logger/zap"
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

	logger := hertzzap.NewLogger()
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

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)
