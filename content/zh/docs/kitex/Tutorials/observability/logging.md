---
title: "日志"
date: 2022-12-22
weight: 3
keywords: ["Kitex", "logger", "logrus", "zap"]
description: "Kitex 支持默认 logger 实现和注入自定义 logger 以及重定向默认 logger 输出。"
---

## 默认实现

Kitex 在 pkg/klog 里定义了 `Logger`、`CtxLogger`、`FormatLogger` 等几个接口，并提供了一个 `FormatLogger`
的默认实现，可以通过 `klog.DefaultLogger()` 获取到其实例。

pkg/klog 同时也提供了若干全局函数，例如 `klog.Info`、`klog.Errorf` 等，用于调用默认 logger 的相应方法。

注意，由于默认 logger 底层使用标准库的 `log.Logger` 实现，其在日志里输出的调用位置依赖于设置的调用深度（call depth），因此封装
klog 提供的实现可能会导致日志内容里文件名和行数不准确。

## 注入自定义 logger 实现

可以用 `klog.SetLogger` 来替换掉默认的 logger 实现。

[obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) 扩展下提供了基于 [logrus](https://github.com/sirupsen/logrus)、[zap](https://github.com/uber-go/zap) 与 [slog](https://pkg.go.dev/log/slog) 的日志实现。

### 使用方式

以 logrus 为例，设置 logger 为 logrus：

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

将日志与 context 关联：

```go
// Echo implements the Echo interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.CtxDebugf(ctx, "echo called: %s", req.GetMessage())
	return &api.Response{Message: req.Message}, nil
}
```

日志输出：

```text
{"level":"debug","msg":"echo called: hello","time":"2024-01-09T14:50:43+08:00"}
```

## 重定向默认 logger 的输出

可以使用 `klog.SetOutput` 来重定向 klog 提供的默认 logger 的输出。

例如，要把默认 logger 的输出重定向到启动路径下的 ./output.log，可以这样实现：

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
