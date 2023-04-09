---
title: "日志扩展"
linkTitle: "日志扩展"
weight: 2
description: >

---


Hertz 提供对日志的扩展，接口定义在 `pkg/common/hlog` 中。

## 接口定义

Hertz 在 pkg/common/hlog 里定义了 `Logger`、`CtxLogger`、`FormatLogger` 几个接口实现不同的打日志方式，并定义了一个 Control 接口实现 logger 的控制。
用户注入自己的 logger 实现时需要实现上面的所有接口(FullLogger)。Hertz提供了一个 `FullLogger` 默认实现。

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
默认使用 hertz 默认实现的 logger 。

## 已支持日志拓展

目前在 Hertz 的开源版本支持的日志扩展都存放在 [hertz-logger](https://github.com/hertz-contrib/logger) 中，欢迎大家参与项目贡献与维护。

### Zap

#### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/zap
```
    

#### 简单用法示例：
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
#### 部分 Logger 用法：

##### 定义 hlog.FullLogger 和 Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```
##### NewLogger

通过 `defaultConfig()` 创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 Logger
相关配置请参考后面的 “option的配置”。

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

事例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
hlog.SetLogger(logger)
```

#### option 的配置

##### WithCoreEnc

Encoder 是一个提供给日志条目编码器的格式不可知的接口，`WithCoreEnc` 将 zapcore.Encoder 传入配置

函数签名：
```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

示例代码：
```go
enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
l:=NewLogger(WithCoreEnc(enc))
```

##### WithCoreWs

`WithCoreWs` 通过内置的 `zapcore.AddSync(file)` 指定日志写入的位置，将 zapcore.WriteSyncer传入配置

函数签名：
```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

示例代码：
```go
ws := zapcore.AddSync(os.Stdout)
l:=NewLogger(WithCoreWs(ws))
```

##### WithCoreLevel

`WithCoreLevel` 将 zap.AtomicLevel 传入配置

函数名称：
```go
func WithCoreLevel(lvl zap.AtomicLevel) Option 
```

示例代码：
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
l:=NewLogger(WithCoreLevel(lvl))
```

##### WithCores

`WithCores` 将 zapcore.Encoder ，zapcore.WriteSyncer ，zap.AtomicLevel 组合进的 CoreConfig 传入配置

函数签名：
```go
func WithCores(coreConfigs ...CoreConfig) Option
```

示例代码：
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

`WithZapOptions` 利用 `apend()` 方法添加原始的 zap 配置

函数签名：
```go
func WithZapOptions(opts ...zap.Option) Option 
```

示例代码：
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
ws := zapcore.AddSync(os.Stdout)
opts:=WithCoreLevel(lvl)
l:=NewLogger(WithZapOptions(opts,WithCoreWs(ws)))
```

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

### Logrus

#### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/logrus
```

#### 简单用法示例：
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
#### 部分 Logger 用法：

##### 定义 hlog.FullLogger 和 Logger 结构体
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}

```
##### NewLogger
`NewLogger` 通过 `defaultConfig()` 来创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 `Logger`
相关配置请参考后面的 “option的配置”。

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

示例代码：

```go
logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
```

#### option 的配置

##### WithLogger
`WithLogger` 将 logrus.Logger 传入配置

函数签名：
```go
func WithLogger(logger *logrus.Logger) Option 
```

示例代码：
```go
stdLogger := logrus.StandardLogger()
l:=NewLogger(WithLogger(stdLogger))
```

##### WithHook
`WithHook` 将传入的 logrus.Hook 添加进配置中的 hook

函数签名：
```go
func WithHook(hook logrus.Hook) Option 
```

示例代码：
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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。

### Zerolog

#### 下载并安装
```shell
go get github.com/hertz-contrib/logger/zerolog
```
#### 简单用法示例：
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
#### Logger 的部分用法：

##### 定义 hlog.FullLogger 和 Logger 结构体

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
`New` 通过 `newLogger` 函数返回一个新的 Logger 实例

函数签名：
```go
func New(options ...Opt) *Logger
```

示例代码：
```go
hlog.SetLogger(hertzZerolog.New())
```
##### From
`From` 通过 `newLogger` 用一个已存在的 Logger 返回一个新的 Logger

函数签名：
```go
func From(log zerolog.Logger, options ...Opt) *Logger
```

示例代码：
```go
zl := zerolog.New(b).With().Str("key", "test").Logger()
l := From(zl)
l.Info("foo")
```
##### GetLogger
`GetLogger` 通过 `DefaultLogger()` 方法返回默认的 Logger 实例和 error

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

#### option 的配置

##### WithOutput

`WithOutput` 通过 zerolog 内置的 `zerolog.Context.Logger().Output(out).With()` 返回一个Opt的函数，允许指定 logger 的输出。默认情况下，它设置为 os.Stdout。

函数签名：
```go
func WithOutput(out io.Writer) Opt 
```

示例代码：
```go
b := &bytes.Buffer{}
l := New(WithOutput(b))
l.Info("foobar")
```

##### WithLevel

`WithLevel` 通过 zerolog 内置的 `zerolog.Context.Logger().Level(lvl).With()` 方法指定 logger 的级别。通过 `matchHlogLevel()` 将 hlog.Level 转换成 zerolog.level。默认情况下，它设置为 WarnLevel。

函数签名：
```go
func WithLevel(level hlog.Level) Opt 
```

示例代码：
```go
l:=New(WithLevel(hlog.LevelDebug))
l.Debug("foobar")
```

##### WithField

`WithField` 通过 zerolog 内置的 `zerolog.Context.Interface(name, value)` 方法向 logger 的 context 添加一个字段

函数签名：
```go
func WithField(name string, value interface{}) Opt 
```

示例代码：
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

`WithFields` 通过 zerolog 内置的 `zerolog.Context.Fields(fields)` 向 logger 的 context 添加一些字段

函数签名：
```go
func WithFields(fields map[string]interface{}) Opt 
```

示例代码：
```go
b := &bytes.Buffer{}
l := New(WithFields(map[string]interface{}{
	"host": "localhost",
	"port": 8080,
}))//...
```

##### WithTimestamp

`WithTimestamp` 通过 zerolog 内置的 `zerolog.Context.Timestamp()` 将时间戳字段添加到 logger 的 context 中

函数签名：
```go
func WithTimestamp() Opt 
```

示例代码：
```go
l := New(WithTimestamp())
l.Info("foobar")
```

##### WithFormattedTimestamp

`WithFormattedTimestamp` 与 `WithTimestamp` 类似，将格式化的时间戳字段添加到 logger 的 context 中

函数签名：
```go
func WithFormattedTimestamp(format string) Opt 
```

示例代码：
```go
l := New(WithFormattedTimestamp(time.RFC3339Nano))
l.Info("foobar")
```

##### WithCaller

`WithCaller` 通过 zerolog 内置的 `zerolog.Context.Caller()` 添加一个 caller 到 logger 的 context 中，caller 会报告调用者的信息

函数签名：
```go
func WithCaller() Opt 
```

示例代码：
```go
//获取路径的最后一个元素
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
##### WithHook

`WithHook` 通过 zerolog 内置的 `zerolog.Context.Logger().Hook(hook).With()` 添加一个 hook 到 logger 的 context 中

函数签名：
```go
func WithHook(hook zerolog.Hook) Opt 
```

示例代码：
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

`WithHookFunc` 与 `WithHook` 类似，添加一个 hook 函数到 logger 的 context 中

函数签名：
```go
func WithHookFunc(hook zerolog.HookFunc) Opt
```

示例代码：
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
适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。

