---
title: "zap的option配置"
linkTitle: "zap的option配置"
weight: 2
description: >

---

## WithCoreEnc

Encoder 是一个提供给日志条目编码器的格式不可知的接口，`WithCoreEnc` 将 zapcore.Encoder 传入配置

函数签名：
```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

示例代码：
```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func main() {
    enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
    l := hertzzap.NewLogger(hertzzap.WithCoreEnc(enc))
}

```

## WithCoreWs

`WithCoreWs` 通过内置的 `zapcore.AddSync(file)` 指定日志写入的位置，将 zapcore.WriteSyncer传入配置

函数签名：
```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

示例代码：
```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap/zapcore"
    "os"
)

func main() {
    ws := zapcore.AddSync(os.Stdout)
    l:=hertzzap.NewLogger(hertzzap.WithCoreWs(ws))
}

```

## WithCoreLevel

`WithCoreLevel` 将 zap.AtomicLevel 传入配置

函数名称：
```go
func WithCoreLevel(lvl zap.AtomicLevel) Option 
```

示例代码：
```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
    l:=hertzzap.NewLogger(hertzzap.WithCoreLevel(lvl))
}
```

## WithCores

`WithCores` 将 zapcore.Encoder ，zapcore.WriteSyncer ，zap.AtomicLevel 组合进的 CoreConfig 传入配置

函数签名：
```go
func WithCores(coreConfigs ...CoreConfig) Option
```

示例代码：
```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "os"
)

func main() {
    enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
    lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
    ws := zapcore.AddSync(os.Stdout)

    cfg := hertzzap.CoreConfig{
        Enc: enc,
        Ws:  ws,
        Lvl: lvl,
    }

    l := hertzzap.NewLogger(hertzzap.WithCores(cfg))
}
```

## WithZapOptions

`WithZapOptions` 利用 `apend()` 方法添加原始的 zap 配置

函数签名：
```go
func WithZapOptions(opts ...zap.Option) Option 
```

示例代码：
```go
package main

import (
    hertzzap "github.com/hertz-contrib/logger/zap"
    "go.uber.org/zap"
)

func main() {
    opts := zap.AddCaller()
    l := hertzzap.NewLogger(hertzzap.WithZapOptions(opts,zap.Hooks()))
}
}
```

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。
