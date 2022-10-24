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

Hertz provides `SetLogger` interface to allow injection of your own logger. Besides, `SetOutput` can be used to redirect the default logger output, and then middlewares and the other components of the framework can use global methods in hlog to output logs.
By default, Hertz's default logger is used.

## Supported Log Extension

The log extensions currently supported in the open source version of Hertz are stored in the [obs-opentelemetry](https://github.com/hertz-contrib/obs-opentelemetry). You are welcomed to join us in contributing and maintaining for this project.

### Zap

Example：
```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzzap "github.com/hertz-contrib/obs-opentelemetry/logging/zap"
	"go.uber.org/zap"
)

func main() {
	h := server.Default()

	logger := hertzzap.NewLogger(
		hertzzap.WithTraceErrorSpanLevel(zap.WarnLevel),
		hertzzap.WithRecordStackTraceInSpan(true),
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```

For more details, see [hertz-contrib/obs-opentelemetry/logging/zap/](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/logging/zap)。

### Logrus

Example：
```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzlogrus "github.com/hertz-contrib/obs-opentelemetry/logging/logrus"
	"github.com/sirupsen/logrus"
)

func main() {
	h := server.Default()

	logger := hertzlogrus.NewLogger(
		hertzlogrus.WithTraceHookErrorSpanLevel(logrus.WarnLevel),
		hertzlogrus.WithTraceHookLevels(logrus.AllLevels),
		hertzlogrus.WithRecordStackTraceInSpan(true),
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```

For more details, see [hertz-contrib/obs-opentelemetry/logging/logrus/](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/logging/logrus)。
