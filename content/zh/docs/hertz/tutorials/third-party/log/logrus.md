---
title: "logrus"
linkTitle: "logrus"
weight: 2
keywords: ["日志扩展", "logrus"]
description: "Hertz 对接 logrus 和 lumberjack。"
---

## Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}
```

## NewLogger

`NewLogger` 通过 `defaultConfig()` 来创建并初始化一个 Logger，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 `Logger`
相关配置请参考后面的 [option 的相关配置](#option-的相关配置)

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

示例代码：

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

`Logger` 用来返回一个 `*logrus.Logger` 实例以满足复杂操作

函数签名：

```go
func (l *Logger) Logger() *logrus.Logger
```

示例代码：

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

## option 的相关配置

### WithLogger

`WithLogger` 将 `logrus.Logger` 传入配置

函数签名：

```go
func WithLogger(logger *logrus.Logger) Option
```

示例代码：

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

`WithHook` 将传入的 `logrus.Hook` 添加进配置中的 hook

函数签名：

```go
func WithHook(hook logrus.Hook) Option
```

示例代码：

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

## 一个完整的 logrus 示例

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

	logger := hertzlogrus.NewLogger()
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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)
