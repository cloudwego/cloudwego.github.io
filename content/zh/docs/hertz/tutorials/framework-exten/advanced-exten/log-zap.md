
### Zap

#### 下载并安装：
```shell
go get github.com/hertz-contrib/logger/zap
```


#### 简单用法示例：
```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	hertzzap "github.com/hertz-contrib/logger/zap"
)

func main() {
	h := server.Default()

	logger := hertzzap.NewLogger(
		hertzzap.WithZapOptions(
			// ...
		),
	)

	hlog.SetLogger(logger)

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		hlog.Info("Hello, hertz")
		c.String(consts.StatusOK, "Hello hertz!")
	})

	h.Spin()
}
```
#### 部分 Logger 用法：

##### 定义 hlog.FullLogger 和 Logger 结构体

```go
var _ hlog.FullLogger = (*Logger)(nil)

type Logger struct {
    l      *zap.SugaredLogger
    config *config
}
```
##### NewLogger

通过 `defaultConfig()` 创建并初始化一个 Logger ，便于后续的调用，可将所需配置作为参数传入函数，若不传入参数则安装初始配置创建 Logger
相关配置请参考后面的 “option的配置”。

函数签名：

```go
func NewLogger(opts ...Option) *Logger
```

事例代码：
```go
logger := NewLogger(WithZapOptions(zap.WithFatalHook(zapcore.WriteThenPanic)))
hlog.SetLogger(logger)
```

#### option 的配置

##### WithCoreEnc

Encoder 是一个提供给日志条目编码器的格式不可知的接口，`WithCoreEnc` 将 zapcore.Encoder 传入配置

函数签名：
```go
func WithCoreEnc(enc zapcore.Encoder) Option
```

示例代码：
```go
enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
l:=NewLogger(WithCoreEnc(enc))
```

##### WithCoreWs

`WithCoreWs` 通过内置的 `zapcore.AddSync(file)` 指定日志写入的位置，将 zapcore.WriteSyncer传入配置

函数签名：
```go
func WithCoreWs(ws zapcore.WriteSyncer) Option
```

示例代码：
```go
ws := zapcore.AddSync(os.Stdout)
l:=NewLogger(WithCoreWs(ws))
```

##### WithCoreLevel

`WithCoreLevel` 将 zap.AtomicLevel 传入配置

函数名称：
```go
func WithCoreLevel(lvl zap.AtomicLevel) Option 
```

示例代码：
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
l:=NewLogger(WithCoreLevel(lvl))
```

##### WithCores

`WithCores` 将 zapcore.Encoder ，zapcore.WriteSyncer ，zap.AtomicLevel 组合进的 CoreConfig 传入配置

函数签名：
```go
func WithCores(coreConfigs ...CoreConfig) Option
```

示例代码：
```go
enc := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
ws := zapcore.AddSync(os.Stdout)

cfg:=CoreConfig{
    Enc: enc,
    Ws:  ws,
    Lvl: lvl,
}

l:=NewLogger(WithCoreConfig(cfg))
```

##### WithZapOptions

`WithZapOptions` 利用 `apend()` 方法添加原始的 zap 配置

函数签名：
```go
func WithZapOptions(opts ...zap.Option) Option 
```

示例代码：
```go
lvl := zap.NewAtomicLevelAt(zap.InfoLevel)
ws := zapcore.AddSync(os.Stdout)
opts:=WithCoreLevel(lvl)
l:=NewLogger(WithZapOptions(opts,WithCoreWs(ws)))
```

适配 hlog 的接口的方法等更多用法详见 [hertz-contrib/logger/zap](https://github.com/hertz-contrib/logger/tree/main/zap)。

