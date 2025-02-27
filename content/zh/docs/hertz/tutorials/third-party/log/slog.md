---
title: "slog"
linkTitle: "slog"
weight: 5
keywords: ["日志扩展", "slog"]
description: "Hertz 对接 slog 和 lumberjack。"
---

## Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l   *slog.Logger
    cfg *config
}
```

## NewLogger

通过 `defaultConfig()` 创建并初始化一个 Logger，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 Logger
相关配置请参考后面的 [option 的配置](#option-的相关配置)

目前只支持 slog 库里的 `slog.NewJSONHandler()`，不支持 `slog.NewTextHandler()`

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

示例代码：

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

`Logger` 用于获取 `*slog.Logger` 以满足复杂操作

函数签名：

```go
func (l *Logger) Logger() *slog.Logger
```

示例代码：

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

## Option 的相关配置

### WithOutput

`WithOutput` 用来设置日志的输出位置

函数签名：

```go
func WithOutput(writer io.Writer) Option
```

示例代码：

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

`WithLevel` 对传入的 `*slog.LevelVar` 进行判断，高于或等于这个日志级别的才会被记录

> 值得注意的是，如果 `WithLevel` 与 `WithHandlerOptions` 一起设置，WithLevel 的日志等级会覆盖掉 WithHandlerOptions 中的日志等级

函数签名：

```go
func WithLevel(lvl *slog.LevelVar) Option
```

示例代码：

```go
package main

import (
    hertzslog "github.com/hertz-contrib/logger/slog"
)

func main() {
    // 空的 LevelVar 对应 LevelInfo
    logger := hertzslog.NewLogger(hertzslog.WithLevel(&slog.LevelVar{}))

    // 动态设置日志登记为 LevelDebug
    levelVar := slog.LevelVar{}
    levelVar.Set(slog.LevelDebug)
    logger := hertzslog.NewLogger(hertzslog.WithLevel(&slog.LevelVar{}))
}

```

### WithHandlerOptions

`WithHandlerOptions` 将 `*slog.HandlerOptions` 传入配置

函数名称：

```go
func WithHandlerOptions(opts *slog.HandlerOptions) Option
```

示例代码：

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

## 一个完整的 slog 示例

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

	logger := hertzslog.NewLogger()
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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/slog](https://github.com/hertz-contrib/logger/tree/main/slog)
