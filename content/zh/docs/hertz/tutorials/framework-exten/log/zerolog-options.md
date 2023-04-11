---
title: "zerolog概览"
linkTitle: "zerolog概览"
weight: 2
description: >

---
##### WithOutput

`WithOutput` 通过 zerolog 内置的 `zerolog.Context.Logger().Output(out).With()` 返回一个Opt的函数，允许指定 logger 的输出。默认情况下，它设置为 os.Stdout。

函数签名：
```go
func WithOutput(out io.Writer) Opt 
```

示例代码：
```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithOutput(b))
    l.Info("foobar")
}
```

##### WithLevel

`WithLevel` 通过 zerolog 内置的 `zerolog.Context.Logger().Level(lvl).With()` 方法指定 logger 的级别。通过 `matchHlogLevel()` 将 hlog.Level 转换成 zerolog.level。默认情况下，它设置为 WarnLevel。

函数签名：
```go
func WithLevel(level hlog.Level) Opt 
```

示例代码：
```go
package main

import (
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithLevel(hlog.LevelDebug))
    l.Debug("foobar")
}

```

##### WithField

`WithField` 通过 zerolog 内置的 `zerolog.Context.Interface(name, value)` 方法向 logger 的 context 添加一个字段

函数签名：
```go
func WithField(name string, value interface{}) Opt 
```

示例代码：
```go
package main

import (
    "bytes"
    "github.com/cloudwego/hertz/pkg/common/json"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithField("service", "logging"))
    l.SetOutput(b)

    l.Info("foobar")

    type Log struct {
        Level   string `json:"level"`
        Service string `json:"service"`
        Message string `json:"message"`
    }

    log := &Log{}

    err := json.Unmarshal(b.Bytes(), log)//log.service=="logging"
}
```

##### WithFields

`WithFields` 通过 zerolog 内置的 `zerolog.Context.Fields(fields)` 向 logger 的 context 添加一些字段

函数签名：
```go
func WithFields(fields map[string]interface{}) Opt 
```

示例代码：
```go
package main

import (
    "bytes"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithFields(map[string]interface{}{
        "host": "localhost",
        "port": 8080,
    })) //...
}
```

##### WithTimestamp

`WithTimestamp` 通过 zerolog 内置的 `zerolog.Context.Timestamp()` 将时间戳字段添加到 logger 的 context 中

函数签名：
```go
func WithTimestamp() Opt 
```

示例代码：
```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithTimestamp())
    l.Info("foobar")
}
```

##### WithFormattedTimestamp

`WithFormattedTimestamp` 与 `WithTimestamp` 类似，将格式化的时间戳字段添加到 logger 的 context 中

函数签名：
```go
func WithFormattedTimestamp(format string) Opt 
```

示例代码：
```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "time"
)

func main() {
    l := hertzZerolog.New(hertzZerolog.WithFormattedTimestamp(time.RFC3339Nano))
    l.Info("foobar")
}
```

##### WithCaller

`WithCaller` 通过 zerolog 内置的 `zerolog.Context.Caller()` 添加一个 caller 到 logger 的 context 中，caller 会报告调用者的信息

函数签名：
```go
func WithCaller() Opt 
```

示例代码：
```go
//获取路径的最后一个元素
package main

import (
    "bytes"
    "encoding/json"
    "github.com/hertz-contrib/logger/zerolog"
    "path/filepath"
    "strings"
)

func main() {
    b := &bytes.Buffer{}
    l := zerolog.New(zerolog.WithCaller())//添加了一个调用者
    l.SetOutput(b)
    l.Info("foobar")
    type Log struct {
        Level   string `json:"level"`
        Caller  string `json:"caller"`
        Message string `json:"message"`
    }

    log := &Log{}

    err := json.Unmarshal(b.Bytes(), log)
    if err!=nil {
        //...
    }

    segments := strings.Split(log.Caller, ":")
    filePath := filepath.Base(segments[0]) //filepath=="logger.go"
}
```
##### WithHook

`WithHook` 通过 zerolog 内置的 `zerolog.Context.Logger().Hook(hook).With()` 添加一个 hook 到 logger 的 context 中

函数签名：
```go
func WithHook(hook zerolog.Hook) Opt 
```

示例代码：
```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

type Hook struct {
    logs []HookLog
}
type HookLog struct {
    level   zerolog.Level
    message string
}

func main() {
    h := Hook{}
    l := hertzZerolog.New(hertzZerolog.WithHook(h))

    l.Info("Foo")
    l.Warn("Bar")
    //h.logs[0].level==zerolog.InfoLevel
    //h.logs[0].message=="Foo"
    //h.logs[1].level==zerolog.WarnLevel
    //h.logs[1].message=="Bar"
}
```

##### WithHookFunc

`WithHookFunc` 与 `WithHook` 类似，添加一个 hook 函数到 logger 的 context 中

函数签名：
```go
func WithHookFunc(hook zerolog.HookFunc) Opt
```

示例代码：
```go
package main

import (
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
    "github.com/rs/zerolog"
)

type HookLog struct {
    level   zerolog.Level
    message string
}

func main() {
    logs := make([]HookLog, 0, 2)
    l := hertzZerolog.New(hertzZerolog.WithHookFunc(func(e *zerolog.Event, level zerolog.Level, message string) {
        logs = append(logs, HookLog{
            level:   level,
            message: message,
        })
    }))

    l.Info("Foo")
    l.Warn("Bar")
    //h.logs[0].level==zerolog.InfoLevel
    //h.logs[0].message=="Foo"
    //h.logs[1].level==zerolog.WarnLevel
    //h.logs[1].message=="Bar"
}
```
适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zerolog](https://github.com/hertz-contrib/logger/tree/main/zerolog)。
