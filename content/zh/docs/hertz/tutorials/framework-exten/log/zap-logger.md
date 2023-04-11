---
title: "zap的部分logger用法"
linkTitle: "zap的部分logger用法"
weight: 2
description: >

---

## 定义 hlog.FullLogger 和 Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```
## NewLogger

通过 `defaultConfig()` 创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 Logger
相关配置请参考后面的 “option的配置”。

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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。
