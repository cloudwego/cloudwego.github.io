---
title: "zerolog概览"
linkTitle: "zerolog概览"
weight: 2
description: >

---

## 定义 hlog.FullLogger 和 Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
	log     zerolog.Logger
	out     io.Writer
	level   zerolog.Level
	options []Opt
}
```

## New
`New` 通过 `newLogger` 函数返回一个新的 Logger 实例

函数签名：
```go
func New(options ...Opt) *Logger
```

示例代码：
```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    hlog.SetLogger(hertzZerolog.New())
}
```
## From
`From` 通过 `newLogger` 用一个已存在的 Logger 返回一个新的 Logger

函数签名：
```go
func From(log zerolog.Logger, options ...Opt) *Logger
```

示例代码：
```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    zl := zerolog.New(b).With().Str("key", "test").Logger()
    l := hertzZerolog.From(zl)
    l.Info("foo")
}
```
## GetLogger
`GetLogger` 通过 `DefaultLogger()` 方法返回默认的 Logger 实例和 error

函数签名：
```go
func GetLogger() (Logger, error)
```

示例代码：
```go
package main

import (
    "fmt"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    logger, err := hertzZerolog.GetLogger()
    if err != nil {
        fmt.printf("get logger failed")
    }
}

```
适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。
