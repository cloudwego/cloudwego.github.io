---
title: "日志扩展"
linkTitle: "日志扩展"
weight: 2
description: >

---


Hertz 提供对日志的扩展，接口定义在 `pkg/common/hlog` 中。

## 接口定义

Hertz 在 pkg/common/hlog 里定义了 `Logger`、`CtxLogger`、`FormatLogger` 几个接口实现不同的打日志方式，并定义了一个 Control 接口实现 logger 的控制。
用户注入自己的 logger 实现时需要实现上面的所有接口( FullLogger )。Hertz提供了一个 `FullLogger` 默认实现。

```go
// FullLogger is the combination of Logger, FormatLogger, CtxLogger and Control.
type FullLogger interface {
   Logger
   FormatLogger
   CtxLogger
   Control
}
```

注意，由于默认 logger 底层使用标准库的 `log.Logger` 实现，其在日志里输出的调用位置依赖于设置的调用深度（call depth），因此封装 hlog 提供的实现可能会导致日志内容里文件名和行数不准确。

### 注入自己的 logger 实现

Hertz 提供 `SetLogger` 接口用于注入用户自定义的 logger 实现，也可以使用 `SetOutput` 接口重定向默认的 logger 输出，随后的中间件以及框架的其他部分可以使用 hlog 中的全局方法来输出日志。
默认使用 hertz 默认实现的 logger。

## 已支持日志拓展

目前在 Hertz 的开源版本支持的日志扩展都存放在 [hertz-logger](https://github.com/hertz-contrib/logger) 中，欢迎大家参与项目贡献与维护。

## Zap

### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/zap
```
    

### 简单用法示例：
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
### 更多用法：

### 定义hlog.FullLogger和Logger结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
l      *zap.SugaredLogger
config *config
}

```
### NewLogger

创建并初始化一个Logger，便于后续的调用，可将所需配置作为参数传入函数,若不传入参数则安装初始配置创建Logger

函数签名：

```go
func(opts ...Option) *Logger
```

事例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

hlog.SetLogger(logger)
```
### Log

根据传入的参数打印出对应的日志等级与信息
对应的日志等级有如下格式： 
hlog.LevelTrace; hlog.LevelDebug; hlog.LevelInfo; hlog.LevelNotice; hlog.LevelWarn; hlog.LevelError; hlog.LevelFatal

函数签名：
```go
func (l *Logger)(level hlog.Level, kvs ...interface{})
```

示例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

logger.Log(hlog.LevelFatal,"msg")
```
### Logf

使用方法与Log相似，区别在于新引入一个参数以输出模板化的日志记录

函数签名：
```go
func (l *Logger)(level hlog.Level, format string, kvs ...interface{})
```

示例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

logger.Logf(hlog.LevelFatal,"The level is Fatal,message is:%s","msg")
```
### CtxLogf

使用方法与Logf相似,区别在于多传入了一个context上下文

函数签名：
```go
func (l *Logger)(level hlog.Level, ctx context.Context, format string, kvs ...interface{})
```

示例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))

logger.Logf(hlog.LevelFatal,ctx,"The level is Fatal,message is:%s","msg")
```
### 根据日志等级包装出来的函数

只需要输入日志信息，省去了日志等级

函数签名：
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{})
```
示例代码：
```go
ctx:=Context.Background()
logger := NewLogger()
logger.Debug("this is a debug log")
logger.Debugf("the msg is:%s","this is a debug log")
logger.CtxDebugf(ctx,"the msg is:%s","this is a debug log")
```

其他的诸如Debugf,CtxDebugf等函数详见[hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)

### SetLevel
给Logger的level设定一个等级

注意：设定的等级必须为上文所提到的的等级如：hlog.LevelTrace；hlog.LevelDebug等，不能自定义等级，否则将给Logger等级赋为zap.WarnLevel

函数签名：
```go
func (l *Logger)(level hlog.Level)
```

示例代码：
```go
logger.SetLevel(hlog.LevelDebug)
```
### Sync

同步刷新所有缓冲的日志条目。

函数签名：
```go
func (l *Logger)()
```

示例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
defer logger.Sync()
```
### SetOutput

SetOutput为Logger提供了一个输出功能,重定向 Logger 提供的默认 logger 的输出

函数名称：
```go
func (l *Logger)(writer io.Writer)
```
示例代码：
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
更多用法示例详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

## Logrus

### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/logrus
```

用法示例：
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
### 定义hlog.FullLogger和Logger结构体
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
l *logrus.Logger
}

```
### NewLogger
NewLogger 用来创建一个logger

函数签名：

```go
func (opts ...Option) *Logger
```

示例代码：

```go
logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
```
### Logger
Logger函数返回一个Logger里的logrus.Logger

函数签名：
```go
func (l *Logger) Logger() *logrus.Logger
```

示例代码：
```go
logger.Logger().Info("log from origin logrus")
```
### 封装好日志等级的函数


传入信息然后将信息以对应的日志等级输出

函数签名：
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{}) 
```

示例代码：
```go
ctx:=context.Background()
logger.Logger().Info("log from origin logrus")
logger.Logger().Infof("the Info message is:%s","log from origin logrus")
logger.Logger().CtxInfof(ctx,"the Info message is:%s","log from origin logrus")

```
其他的诸如Debugf,CtxDebugf等函数详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
### SetLevel
设定Logger的日志等级

注意：设定的等级必须为上文所提到的的等级如：hlog.LevelTrace；hlog.LevelDebug等，不能自定义等级，否则将给Logger等级赋为logrus.WarnLevel

函数签名：
```go
func (l *Logger) SetLevel(level hlog.Level) 
```

示例代码：
```go
hlog.SetLogger(logger)
hlog.SetLevel(hlog.LevelError)
```
### SetOutput
SetOutput为Logger提供了一个输出功能,重定向 Logger 提供的默认 logger 的输出

函数签名：
```go
func (l *Logger)(writer io.Writer) 
```

示例代码：
```go
buf := new(bytes.Buffer)

logger := NewLogger()

// output to buffer
logger.SetOutput(buf)
```


更多用法示例详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。

## Zerolog

### 下载并安装
```shell
go get github.com/hertz-contrib/logger/zerolog
```
简单用法示例：
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
### 更多用法：

### 定义hlog.FullLogger和Logger结构体

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
New返回一个新的Logger

函数签名：
```go
func (options ...Opt) *Logger
```

示例代码：
```go
hlog.SetLogger(hertzZerolog.New())
```
### From
From用一个已存在的Logger返回一个新的Logger

函数签名：
```go
func(log zerolog.Logger, options ...Opt) *Logger
```

示例代码：
```go
zl := zerolog.New(b).With().Str("key", "test").Logger()
l := From(zl)

l.Info("foo")
```
### GetLogger
GetLogger返回一个默认的logger

函数签名：
```go
func GetLogger() (Logger, error)
```

示例代码：
```go
logger,err:=GetLogger()
if err!=nil{
	printf("get logger failed")
}

```
### NewLogger
根据zerolog.logger创建一个新的logger

函数签名：
```go
func(log zerolog.Logger, options []Opt) *Logger
```

示例代码：
```go
l:=NewLogger()
```
### SetLevel
SetLevel为logger设定了一个日志等级

函数签名：
```go
func (l *Logger) SetLevel(level hlog.Level)
```

示例代码：
```go
l := New()

l.SetLevel(hlog.LevelDebug)
```
### SetOutput
SetOutput为Logger提供了一个输出功能,重定向 Logger 提供的默认 logger 的输出

函数签名：
```go
func (l *Logger) (writer io.Writer) 
```

示例代码：
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
WithContext返回一个带context的logger

函数签名：
```go
func (l *Logger)(ctx context.Context) context.Context
```

示例代码：
```go
ctx := context.Background()
l := New()
c := l.WithContext(ctx)

```
### WithField
WithField给logger添加了一个字段

函数签名：
```go
func (l *Logger)(key string, value interface{}) Logger
```

示例代码：
```go
b := &bytes.Buffer{}
l := New()
l.SetOutput(b)
l.WithField("service", "logging")
```
### Unwrap
Unwrap 返回下层的zerolog logger

函数签名：
```go
func (l *Logger) zerolog.Logger 
```

示例代码：
```go
l := New()

logger := l.Unwrap()

```
### Log
Log使用一个具有特定日志等级的zerolog来记录日志

函数签名：
```go
func (l *Logger)(level hlog.Level, kvs ...interface{})
```

示例代码：
```go
l := New()

l.Log(hlog.LevelDebug,"msg")
```
### Logf
Logf使用一个具有特定日志等级和格式的zerolog来记录日志

函数签名：
```go
func (l *Logger)(level hlog.Level, format string, kvs ...interface{})
```

示例代码：
```go
l := New()

l.Logf(hlog.LevelDebug,"the message is %s","msg")
```
### CtxLogf
CtxLogf使用一个具有特定日志等级,格式和上下文的zerolog来记录日志

如果没有相关联的logger，DefaultContextLogger将被使用，除非DefaultContextLoggers为nil，在这种情况下使用无能力的logger

函数签名：
```go
func (l *Logger) CtxLogf(level hlog.Level, ctx context.Context, format string, kvs ...interface{})
```

示例代码：
```go
ctx:=context.Background()
l := New()

l.Logf(hlog.LevelDebug,ctx,"the message is %s","msg")
```
### 封装好日志等级的函数
Debug,Debugf,CtxDebugf等

函数签名：
```go
func (l *Logger)(v ...interface{})
func (l *Logger)(format string, v ...interface{})
func (l *Logger)(ctx context.Context, format string, v ...interface{})
```

示例代码：
```go
ctx:=context.Background()
l := New()
l.CtxDebugf(ctx,"the message is %s","msg")
```
更多用法示例详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。

