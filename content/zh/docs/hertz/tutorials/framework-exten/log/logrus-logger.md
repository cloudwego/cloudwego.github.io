---
title: "logrus的部分logger用法"
linkTitle: "logrus的部分logger用法"
weight: 2
description: >

---

## 定义 hlog.FullLogger 和 Logger 结构体
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}

```
## NewLogger
`NewLogger` 通过 `defaultConfig()` 来创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 `Logger`
相关配置请参考后面的 “option的配置”。

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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
