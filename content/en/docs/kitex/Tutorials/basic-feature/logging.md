---
title: "Logging"
date: 2022-12-22
weight: 12
keywords: ["Kitex", "logger", "logrus", "zap"]
description: "Kitex supports default logger implementation, injection of custom loggers and redirection of default logger output."
---

## Default implementation

Kitex defines several interfaces in the package `pkg/klog`: `Logger`, `CtxLoggerKey` and `FormatLogger`. And it provides a default logger that implements those interfaces and can be accessed by calling `klog.DefaultLogger()`.

There are global functions in the package `pkg/klog` that expose the ability of the default logger, like `klog.Info`, `klog.Errorf` and so on.

Note that the default logger uses the `log.Logger` from the standard library as its underlying output. So the filename and line number shown in the log messages depend on the setting of call depth. Thus wrapping the implementation of `klog.DefaultLogger` may cause inaccuracies for these two values.

## Inject your custom logger implementation

You can use `klog.SetLogger` to replace the default logger.

[obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) provide logger implementation base on [logrus](https://github.com/sirupsen/logrus) and [zap](https://github.com/uber-go/zap)

### Logrus

set logger impl

```go
import (
    kitexlogrus "github.com/kitex-contrib/obs-opentelemetry/logging/logrus"
)

func init()  {
    klog.SetLogger(kitexlogrus.NewLogger())
    klog.SetLevel(klog.LevelDebug)
	...
}
```

log with context

```go
// Echo implements the Echo interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.CtxDebugf(ctx, "echo called: %s", req.GetMessage())
	return &api.Response{Message: req.Message}, nil
}
```

view log

```context
{"level":"debug","msg":"echo called: my request","span_id":"056e0cf9a8b2cec3","time":"2022-03-09T02:47:28+08:00","trace_flags":"01","trace_id":"33bdd3c81c9eb6cbc0fbb59c57ce088b"}
```

## Redirecting the Output of the Default Logger

The `klog.SetOutput` can be used to redirect the output of the default logger provided by the pkg/klog package.

For example, to redirect the output of the default logger to a file name `./output.log` under the launch directory, a possible implementation might be:

```go
package main
import (
    "os"
    "github.com/cloudwego/kitex/pkg/klog"
)
func main() {
    f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
    	panic(err)
    }
    defer f.Close()
    klog.SetOutput(f)
    ... // continue to set up your server
}
```
