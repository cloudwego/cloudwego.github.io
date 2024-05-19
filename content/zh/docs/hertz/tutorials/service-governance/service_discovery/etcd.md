---
title: "etcd"
date: 2023-10-18
weight: 4
keywords: ["服务注册与发现", "etcd"]
description: "Hertz 提供的服务注册与发现 etcd 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/etcd
```

## 服务注册

### Option

Etcd 拓展在服务注册部分中提供了 option 配置。

#### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置 Etcd 中的 `TLS` 选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

#### WithAuthOpt

Etcd 扩展提供了 `WithAuthOpt` 用于帮助用户配置 Etcd 中的 `Username` 和 `Password` 选项。

函数签名：

```go
func WithAuthOpt(username, password string) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithAuthOpt("root","123456"),
    )
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

#### Retry

在服务注册到 etcd 之后，它会定期检查服务的状态。如果发现任何异常状态，它将尝试重新注册服务。observeDelay 是正常情况下检查服务状态的延迟时间，而 retryDelay 是断开连接后尝试注册服务的延迟时间。

**默认配置**

| 配置名              | 默认值            | 描述                                           |
| ------------------- | ----------------- | ---------------------------------------------- |
| WithMaxAttemptTimes | 5                 | 用于设置最大尝试次数，如果为 0，则表示无限尝试 |
| WithObserveDelay    | 30 \* time.Second | 用于设置正常连接条件下检查服务状态的延迟时间   |
| WithRetryDelay      | 10 \* time.Second | 用于设置断开连接后重试的延迟时间               |

##### WithMaxAttemptTimes

`WithMaxAttemptTimes` 用于设置最大尝试次数，包括初始调用。

函数签名：

```go
func WithMaxAttemptTimes(maxAttemptTimes uint) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithMaxAttemptTimes(10),
    )
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

##### WithObserveDelay

`WithObserveDelay` 用于设置正常连接条件下检查服务状态的延迟时间。

函数签名：

```go
func WithObserveDelay(observeDelay time.Duration) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithObserveDelay(20*time.Second),
    )
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

##### WithRetryDelay

`WithRetryDelay` 用于设置断开连接后重试的延迟时间。

函数签名：

```go
func WithRetryDelay(t time.Duration) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithRetryDelay(5*time.Second),
    )
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

### NewEtcdRegistry

`NewEtcdRegistry` 使用 etcd 创建一个新的服务注册中心，需要传入端点值。可自定义服务注册中心配置。

函数签名：

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

## 服务发现

### Option

Etcd 拓展在服务发现部分中提供了 option 配置。

#### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置 Etcd 中的 `TLS` 选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithAuthOpt

Etcd 扩展提供了 `WithAuthOpt` 用于帮助用户配置 Etcd 中的 `Username` 和 `Password` 选项。

函数签名：

```go
func WithAuthOpt(username, password string) Option
```

示例代码：

```
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"},
        etcd.WithAuthOpt("root","123456"),
    )
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewEtcdResolver

`NewEtcdResolver` 使用 etcd 创建一个新的服务发现中心，需要传入端点值。可自定义服务发现中心配置。

函数签名：

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

## 使用示例

### 服务端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

### 客户端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("HERTZ: code=%d,body=%s", status, string(body))
    }
}
```

## 配置

可自定义 Etcd 客户端以及服务端的配置，参考 [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example) 。
