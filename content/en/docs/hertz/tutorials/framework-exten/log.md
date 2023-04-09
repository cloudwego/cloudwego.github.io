---
title: "Logger Extension"
linkTitle: "Logger Extension"
date: 2022-06-22
weight: 2
description: >

---

Hertz provides logger extension, and the interface is defined in `pkg/common/hlog`.

## Interface Definition

In Hertz, the interfaces `Logger`, `CtxLogger`, `FormatLogger` are defined in `pkg/common/hlog`, and these interfaces are used to output logs in different ways, and a Control interface is defined to control the logger.
If you'd like to inject your own logger implementation, you must implement all the above interfaces (i.e. FullLogger). Hertz already provides a default implementation of `FullLogger`.

```go
// FullLogger is the combination of Logger, FormatLogger, CtxLogger and Control.
type FullLogger interface {
   Logger
   FormatLogger
   CtxLogger
   Control
}
```

Note that the default logger makes use of the standard library `log.Logger` as its underlying output. So the filenames and line numbers shown in the log messages depend on the settings of call depth. Thus wrapping the implementation of hlog may cause inaccuracies for these two values.

### Inject your own logger

Hertz provides `SetLogger` interface to allow injection of your own logger. Besides, `SetOutput` can be used to redirect the default logger output, and then middlewares and the other components of the framework can use global methods in hlog to output logs. By default, Hertz's default logger is used.

## Supported Log Extension

The log extensions currently supported in the open source version of Hertz are stored in the [hertz-logger](https://github.com/hertz-contrib/logger). You are welcome to join us in contributing to and maintaining this project.

### Zap

#### Download and Install
```shell
go get github.com/hertz-contrib/logger/zap
```


#### A simple example:
```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzzap "github.com/hertz-contrib/logger/zap"
)

func main() {
	h := server.Default()

	logger := hertzzap.NewLogger(
		hertzzap.WithZapOptions(
			// ...
		),
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```
#### Part of Logger usage:

##### Define hlog.FullLogger and Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```
##### NewLogger

Create and initialize a Logger through `defaultConfig()`. The required configuration can be passed into the function as a parameter. If no parameter is passed in, the initial configuration will be installed to create a Logger
For related configuration, please refer to "option configuration" below.

Function Signature:

```go
func NewLogger(opts ...Option) *Logger
```

Sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
hlog.SetLogger(logger)
```

#### Option configuration


##### WithCoreEnc

Encoder is a format-agnostic interface for all log entry marshalers, `WithCoreEnc` passes zapcore.Encoder into configuration

Function Signature:
```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

Sample code:
```go
enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
l:=NewLogger(WithCoreEnc(enc))
```

##### WithCoreWs

`WithCoreWs` specifies the location where the log is written through the `zapcore.AddSync(file)`, and passes zapcore.WriteSyncer into the configuration

Function Signature:
```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

Sample code:
```go
ws := zapcore.AddSync(os.Stdout)
l:=NewLogger(WithCoreWs(ws))
```

##### WithCoreLevel

`WithCoreLevel` passes zap.AtomicLevel into configuration

Function Signature:
```go
func WithCoreLevel(lvl zap.AtomicLevel) Option 
```

Sample code:
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
l:=NewLogger(WithCoreLevel(lvl))
```

##### WithCores

`WithCores` passes zapcore.Encoder, zapcore.WriteSyncer, zap.AtomicLevel into CoreConfig into the configuration

Function Signature:
```go
func WithCores(coreConfigs ...CoreConfig) Option
```

Sample code:
```go
enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
ws := zapcore.AddSync(os.Stdout)

cfg:=CoreConfig{
    Enc: enc,
    Ws:  ws,
    Lvl: lvl,
}

l:=NewLogger(WithCoreConfig(cfg))
```

##### WithZapOptions

`WithZapOptions` uses the `append()` method to append the original zap configuration

Function Signature:
```go
func WithZapOptions(opts ...zap.Option) Option 
```

Sample code:
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
ws := zapcore.AddSync(os.Stdout)
opts:=WithCoreLevel(lvl)
l:=NewLogger(WithZapOptions(opts,WithCoreWs(ws)))
```

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

### Logrus

#### Download and Install：
```shell
go get github.com/hertz-contrib/logger/logrus
```

#### A simple example：
```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
)

func main() {
    logger := hertzlogrus.NewLogger()
    hlog.SetLogger(logger)

    ...

    hlog.CtxInfof(context.Background(), "hello %s", "hertz")
}
```
#### Part of Logger usage:

##### Define hlog.FullLogger and Logger structure
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}

```
##### NewLogger
`NewLogger` uses `defaultConfig()` to create and initialize a Logger. The required configuration can be passed into the function as a parameter. If no parameter is passed in, the initial configuration will be installed to create `Logger`
For related configuration, please refer to "option configuration" below.

Function Signature:

```go
func NewLogger(opts ...Option) *Logger
```

Sample code:

```go
logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
```

#### Option configuration

##### WithLogger
`WithLogger` passes logrus.Logger into configuration

Function Signature:
```go
func WithLogger(logger *logrus.Logger) Option 
```

Sample code:
```go
stdLogger := logrus.StandardLogger()
l:=NewLogger(WithLogger(stdLogger))
```

##### WithHook
`WithHook` adds the incoming logrus.Hook to the hook in the configuration

Function Signature:
```go
func WithHook(hook logrus.Hook) Option 
```

Sample code:
```go
var h logrus.Hook
l := NewLogger(WithHook(h))

l.Info("Foo")
l.Warn("Bar")
//h.logs[0].level==zerolog.InfoLevel
//h.logs[0].message=="Foo"
//h.logs[1].level==zerolog.WarnLevel
//h.logs[1].message=="Bar"
```

For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
### Zerolog

#### Download and Install
```shell
go get github.com/hertz-contrib/logger/zerolog
```
#### A simple example：
```go
import (
	"context"
	"os"
	
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
	h := server.Default()

	logger := hertzZerolog.New(
		hertzZerolog.WithOutput(os.Stdout),     // allows to specify output
		hertzZerolog.WithLevel(hlog.LevelInfo), // option with log level
		hertzZerolog.WithTimestamp(),           // option with timestamp
		hertzZerolog.WithCaller(),              // option with caller
		// ...
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```
#### Partial usage of Logger:

##### Define hlog.FullLogger and Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
	log     zerolog.Logger
	out     io.Writer
	level   zerolog.Level
	options []Opt
}
```

##### New
`New` returns a new Logger instance via the `newLogger` function

Function Signature:
```go
func New(options ...Opt) *Logger
```

Sample code:
```go
hlog.SetLogger(hertzZerolog.New())
```
##### From
`From` returns a new Logger using an existing Logger via `newLogger`

Function Signature:
```go
func From(log zerolog.Logger, options ...Opt) *Logger
```

Sample code:
```go
zl := zerolog.New(b).With().Str("key", "test").Logger()
l := From(zl)
l.Info("foo")
```
##### GetLogger
`GetLogger` returns the default Logger instance and error via the `DefaultLogger()` method

Function Signature:
```go
func GetLogger() (Logger, error)
```

Sample code:
```go
logger,err:=GetLogger()
if err!=nil{
	printf("get logger failed")
}
```

#### Option configuration

##### WithOutput

`WithOutput` returns an Opt function through zerolog's `zerolog.Context.Logger().Output(out).With()`, allowing to specify the output of the logger. By default it is set to os.Stdout.

Function Signature:
```go
func WithOutput(out io.Writer) Opt 
```

Sample code:
```go
b := &bytes.Buffer{}
l := New(WithOutput(b))
l.Info("foobar")
```

##### WithLevel

`WithLevel` specifies the level of the logger through zerolog's built-in `zerolog.Context.Logger().Level(lvl).With()` method. Convert hlog.Level to zerolog.level by `matchHlogLevel()`. By default it is set to WarnLevel.

Function Signature:
```go
func WithLevel(level hlog.Level) Opt 
```

Sample code:
```go
l:=New(WithLevel(hlog.LevelDebug))
l.Debug("foobar")
```

##### WithField

`WithField` adds a field to the logger's context through zerolog's `zerolog.Context.Interface(name, value)` method

Function Signature:
```go
func WithField(name string, value interface{}) Opt 
```

Sample code:
```go
b := &bytes.Buffer{}
l := New(WithField("service", "logging"))
l.SetOutput(b)

l.Info("foobar")

type Log struct {
    Level   string `json:"level"`
    Service string `json:"service"`
    Message string `json:"message"`
}

log := &Log{}

err := json.Unmarshal(b.Bytes(), log)//log.service=="logging"
```

##### WithFields

`WithFields` adds some fields to the logger's context through zerolog's `zerolog.Context.Fields(fields)`

Function Signature:
```go
func WithFields(fields map[string]interface{}) Opt 
```

Sample code:
```go
b := &bytes.Buffer{}
l := New(WithFields(map[string]interface{}{
	"host": "localhost",
	"port": 8080,
}))//...
```

##### WithTimestamp

`WithTimestamp` adds the timestamp field to the logger's context through zerolog's `zerolog.Context.Timestamp()`

Function Signature:
```go
func WithTimestamp() Opt 
```

Sample code:
```go
l := New(WithTimestamp())
l.Info("foobar")
```

##### WithFormattedTimestamp

`WithFormattedTimestamp` is similar to `WithTimestamp`, adding a formatted timestamp field to the logger's context

Function Signature:
```go
func WithFormattedTimestamp(format string) Opt 
```

Sample code:
```go
l := New(WithFormattedTimestamp(time.RFC3339Nano))
l.Info("foobar")
```

##### WithCaller

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
##### WithHook

`WithHook` adds a hook to the context of logger through zerolog's `zerolog.Context.Logger().Hook(hook).With()`

Function Signature:
```go
func WithHook(hook zerolog.Hook) Opt 
```

Sample code:
```go
h := &Hook{}
l := New(WithHook(h))

l.Info("Foo")
l.Warn("Bar")
//h.logs[0].level==zerolog.InfoLevel
//h.logs[0].message=="Foo"
//h.logs[1].level==zerolog.WarnLevel
//h.logs[1].message=="Bar"
```

##### WithHookFunc

`WithHookFunc` is similar to `WithHook`, adding a hook function to the context of logger

Function Signature:
```go
func WithHookFunc(hook zerolog.HookFunc) Opt
```

Sample code:
```go
logs := make([]HookLog, 0, 2)   
l := New(WithHookFunc(func(e *zerolog.Event, level zerolog.Level, message string) {
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
```
For more details on how to adapt the interface of hlog, see [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。
