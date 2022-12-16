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

### Zap

用法示例：
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

更多用法示例详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

### Logrus

用法示例：
```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzlogrus "github.com/hertz-contrib/logger/logrus"
	"github.com/sirupsen/logrus"
)

func main() {
	h := server.Default()

	logger := hertzlogrus.NewLogger(
		hertzlogrus.WithLogger(&logrus.Logger{
			// ...
		}),
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```

更多用法示例详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。

### Zerolog

用法示例：
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

更多用法示例详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。
