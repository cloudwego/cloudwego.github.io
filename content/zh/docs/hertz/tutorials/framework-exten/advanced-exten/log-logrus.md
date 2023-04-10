### Logrus

#### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/logrus
```

#### 简单用法示例：
```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
)

func main() {
    logger := hertzlogrus.NewLogger()
    hlog.SetLogger(logger)

    ...

    hlog.CtxInfof(context.Background(), "hello %s", "hertz")
}
```
#### 部分 Logger 用法：

##### 定义 hlog.FullLogger 和 Logger 结构体
```go
var _ hlog.FullLogger = (*Logger)(nil)

// Logger logrus impl
type Logger struct {
    l *logrus.Logger
}

```
##### NewLogger
`NewLogger` 通过 `defaultConfig()` 来创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 `Logger`
相关配置请参考后面的 “option的配置”。

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

示例代码：

```go
logger := hertzlogrus.NewLogger(hertzlogrus.WithLogger(logrus.New()))
```

#### option 的配置

##### WithLogger
`WithLogger` 将 logrus.Logger 传入配置

函数签名：
```go
func WithLogger(logger *logrus.Logger) Option 
```

示例代码：
```go
stdLogger := logrus.StandardLogger()
l:=NewLogger(WithLogger(stdLogger))
```

##### WithHook
`WithHook` 将传入的 logrus.Hook 添加进配置中的 hook

函数签名：
```go
func WithHook(hook logrus.Hook) Option 
```

示例代码：
```go
var h logrus.Hook
l := NewLogger(WithHook(h))

l.Info("Foo")
l.Warn("Bar")
//h.logs[0].level==zerolog.InfoLevel
//h.logs[0].message=="Foo"
//h.logs[1].level==zerolog.WarnLevel
//h.logs[1].message=="Bar"
```

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/logrus](https://github.com/hertz-contrib/logger/tree/main/logrus)。
