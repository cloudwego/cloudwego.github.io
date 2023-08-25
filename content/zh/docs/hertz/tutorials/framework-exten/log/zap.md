---
title: "zap"
linkTitle: "zap"
weight: 3
keywords: ["日志扩展", "zap"]
description: "Hertz 对接 zap 和 lumberjack。"

---

## Logger

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```

## NewLogger

通过 `defaultConfig()` 创建并初始化一个 Logger，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 Logger
相关配置请参考后面的 [option 的配置](#option-的相关配置)。

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

事例代码：

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

## Option 的相关配置

### WithCoreEnc

Encoder 是一个提供给日志条目编码器的格式不可知的接口，`WithCoreEnc` 将 `zapcore.Encoder` 传入配置

函数签名：

```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

示例代码：

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

`WithCoreWs` 通过内置的 `zapcore.AddSync(file)` 指定日志写入的位置，将 zapcore.WriteSyncer 传入配置

函数签名：

```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

示例代码：

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

`WithCoreLevel` 将 `zap.AtomicLevel` 传入配置

函数名称：

```go
func WithCoreLevel(lvl zap.AtomicLevel) Option 
```

示例代码：

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

`WithCores` 将 `zapcore.Encoder`，`zapcore.WriteSyncer`，`zap.AtomicLevel` 组合进的 CoreConfig 传入配置

函数签名：

```go
func WithCores(coreConfigs ...CoreConfig) Option
```

示例代码：

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

`WithZapOptions` 利用 `append()` 方法添加原始的 zap 配置

函数签名：

```go
func WithZapOptions(opts ...zap.Option) Option 
```

示例代码：

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

## 一个完整的 zap 示例

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
	
	logger := hertzzap.NewLogger()
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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。
