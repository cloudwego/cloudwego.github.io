---
title: "logrus的option配置"
linkTitle: "logrus的option配置"
weight: 2
description: >

---

## WithLogger
`WithLogger` 将 logrus.Logger 传入配置

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

## WithHook
`WithHook` 将传入的 logrus.Hook 添加进配置中的 hook

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

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
