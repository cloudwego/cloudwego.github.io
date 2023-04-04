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

Note that the default logger makes use of the standard library log.Logger as its underlying output. So the filenames and line numbers shown in the log messages depend on the settings of call depth. Thus wrapping the implementation of hlog may cause inaccuracies for these two values.

### Inject your own logger

Hertz provides SetLogger interface to allow injection of your own logger. Besides, SetOutput can be used to redirect the default logger output, and then middlewares and the other components of the framework can use global methods in hlog to output logs. By default, Hertz's default logger is used.

## Supported Log Extension

The log extensions currently supported in the open source version of Hertz are stored in the [hertz-logger](https://github.com/hertz-contrib/logger). You are welcomed to join us in contributing and maintaining for this project.

## Zap

### Download and Install
```shell
go get github.com/hertz-contrib/logger/zap
```


### A simple example:
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
### More examples:

### Define the hlog.FullLogger and the Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}

```
### NewLogger

Create and initialize a logger

Function Signature:

```go
func(opts ...Option) *Logger
```

sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
hlog.SetLogger(logger)
```
### Log

Print the corresponding log level and information based on the incoming parameters

The corresponding log level has the following format:

hlog.LevelTrace; hlog.LevelDebug; hlog.LevelInfo; hlog.LevelNotice; hlog.LevelWarn; hlog.LevelError; hlog.LevelFatal

function signature:
```go
func (l *Logger)(level hlog.Level, kvs ...interface{})
```

sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
logger.Log(hlog.LevelFatal,"msg")
```
### Logf

The method of use is similar to Log, the difference is that a new parameter is introduced to output templated log records

Function Signature:
```go
func (l *Logger)(level hlog.Level, format string, kvs ...interface{})
```

sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
logger.Logf(hlog.LevelFatal,"The level is Fatal,message is:%s","msg")
```
### CtxLogf

The method of use is similar to Logf, the difference is that an additional context is passed in

Function Signature:
```go
func (l *Logger)(level hlog.Level, ctx context.Context, format string, kvs ...interface{})
```

sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
logger.Logf(hlog.LevelFatal,ctx,"The level is Fatal,message is:%s","msg")
```
### A function wrapped according to the log level

Only need to enter the log information, ignoring the log level

Function Signature:
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{})
```

sample code:
```go
ctx:=Context.Background()
logger := NewLogger()
logger.Debug("this is a debug log")
logger.Debugf("the msg is:%s","this is a debug log")
logger.CtxDebugf(ctx,"the msg is:%s","this is a debug log")
```

For other functions such as Debugf, CtxDebugf, etc., see[hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)

### SetLevel
Set a level for Logger's level

Note: The set level must be the level mentioned above, such as: hlog.LevelTrace; hlog.LevelDebug, etc. You cannot customize the level, otherwise the Logger level will be assigned zap.WarnLevel

Function Signature:
```go
func (l *Logger)(level hlog.Level)
```

sample code:
```go
logger.SetLevel(hlog.LevelDebug)
```
### Sync

Synchronously flush all buffered log entries.

Function Signature:
```go
func (l *Logger)()
```

sample code:
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
defer logger.Sync()
```
### SetOutput

SetOutput provides an output function for Logger, redirecting the output of the default logger provided by Logger

Function Signature:
```go
func (l *Logger)(writer io.Writer)
```
sample code:
```go
f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
if err != nil {
	panic(err)
}
defer f.Close()
logger := NewLogger()
defer logger.Sync()
// output to the log
logger.SetOutput(f)
```
For more usage examples see [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

## Logrus

### Download and Install：
```shell
go get github.com/hertz-contrib/logger/logrus
```

A simple example：
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
### Define hlog.FullLogger and the Logger structure
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}

```
### NewLogger
NewLogger is used to create a logger

Function Signature:

```go
func (opts ...Option) *Logger
```

sample code:

```go
logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
```
### Logger
The Logger function returns logrus.Logger in a Logger

Function Signature:
```go
func (l *Logger) Logger() *logrus.Logger
```

sample code:
```go
logger.Logger().Info("log from origin logrus")
```
### A function wrapped according to the log level


Pass in information and output the information at the corresponding log level

Function Signature:
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{}) 
```

sample code:
```go
ctx:=context.Background()
logger.Logger().Info("log from origin logrus")
logger.Logger().Infof("the Info message is:%s","log from origin logrus")
logger.Logger().CtxInfof(ctx,"the Info message is:%s","log from origin logrus")
```

For other functions such as Debugf, CtxDebugf, etc., see [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
### SetLevel
Set the log level of Logger

Note: The set level must be the level mentioned above, such as: hlog.LevelTrace; hlog.LevelDebug, etc., the level cannot be customized, otherwise the Logger level will be assigned to logrus.WarnLevel

Function Signature:
```go
func (l *Logger)(level hlog.Level) 
```

sample code:
```go
hlog.SetLogger(logger)
hlog.SetLevel(hlog.LevelError)
```
### SetOutput
SetOutput provides an output function for Logger, redirecting the output of the default logger provided by Logger

Function Signature:
```go
func (l *Logger)(writer io.Writer) 
```

sample code:
```go
buf := new(bytes.Buffer)
logger := NewLogger()
// output to buffer
logger.SetOutput(buf)
```

For more usage examples see [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。

## Zerolog

### Download and Install
```shell
go get github.com/hertz-contrib/logger/zerolog
```
A simple example：
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
### More examples：

### Define hlog.FullLogger and the Logger structure

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
	log     zerolog.Logger
	out     io.Writer
	level   zerolog.Level
	options []Opt
}
```
### New
New returns a new Logger

Function Signature:
```go
func (options ...Opt) *Logger
```

sample code:
```go
hlog.SetLogger(hertzZerolog.New())
```
### From
From returns a new Logger with an existing Logger

Function Signature:
```go
func(log zerolog.Logger, options ...Opt) *Logger
```

sample code:
```go
zl := zerolog.New(b).With().Str("key", "test").Logger()
l := From(zl)
l.Info("foo")
```
### GetLogger
GetLogger returns a default logger

Function Signature:
```go
func ()(Logger, error)
```

sample code:
```go
logger,err:=GetLogger()
if err!=nil{
	printf("get logger failed")
}
```
### NewLogger
Create a new logger based on zerolog.logger

Function Signature:
```go
func(log zerolog.Logger, options []Opt) *Logger
```

sample code:
```go
l:=NewLogger()
```
### SetLevel
SetLevel sets a log level for logger

Function Signature:
```go
func (l *Logger)(level hlog.Level)
```

sample code:
```go
l := New()
l.SetLevel(hlog.LevelDebug)
```
### SetOutput
SetOutput provides an output function for Logger, redirecting the output of the default logger provided by Logger

Function Signature:
```go
func (l *Logger)(writer io.Writer) 
```

sample code:
```go
l := New()
f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
if err != nil {
    panic(err)
}
defer f.Close()
l.SetOutput(f)
```
### WithContext
WithContext returns a logger with context

Function Signature:
```go
func (l *Logger)(ctx context.Context) context.Context
```

sample code:
```go
ctx := context.Background()
l := New()
c := l.WithContext(ctx)
```
### WithField
WithField adds a field to logger

Function Signature:
```go
func (l *Logger)(key string, value interface{}) Logger
```

sample code:
```go
b := &bytes.Buffer{}
l := New()
l.SetOutput(b)
l.WithField("service", "logging")
```
### Unwrap
Unwrap returns the underlying zerolog logger

Function Signature:
```go
func (l *Logger) zerolog.Logger 
```

sample code:
```go
l := New()
logger := l.Unwrap()
```
### Log
Log uses a zerolog with a specific log level to log

Function Signature:
```go
func (l *Logger)(level hlog.Level, kvs ...interface{})
```

sample code:
```go
l := New()
l.Log(hlog.LevelDebug,"msg")
```
### Logf
Logf uses a zerolog with a specific log level and format to log

Function Signature:
```go
func (l *Logger)(level hlog.Level, format string, kvs ...interface{})
```

sample code:
```go
l := New()
l.Logf(hlog.LevelDebug,"the message is %s","msg")
```
### CtxLogf
CtxLogf uses a zerolog with a specific log level, format and context to log

DefaultContextLogger will be used if there is no associated logger, unless DefaultContextLoggers is nil, in which case a disabled logger is used

Function Signature:
```go
func (l *Logger)(level hlog.Level, ctx context.Context, format string, kvs ...interface{})
```

sample code:
```go
ctx:=context.Background()
l := New()
l.Logf(hlog.LevelDebug,ctx,"the message is %s","msg")
```
### A function wrapped according to the log level
Debug,Debugf,CtxDebugf等

Function Signature:
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{})
```

sample code:
```go
ctx:=context.Background()
l := New()
l.CtxDebugf(ctx,"the message is %s","msg")
```
For more usage examples see [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。

