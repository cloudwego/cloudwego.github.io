---
title: "redis"
date: 2023-04-22
weight: 9
keywords: ["服务注册与发现", "redis"]
description: "Hertz 提供的服务注册与发现 redis 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/redis
```

## 服务注册

### Option

Redis 拓展在服务注册部分中提供了 option 配置。

#### WithExpireTime

Redis 扩展提供了 `WithExpireTime` 配置存储服务信息的 Key 的过期时间（秒为单位）。默认为 60 秒。

**注意：过期时间必须大于刷新间隔。**

函数签名：

```go
func WithExpireTime(time int) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithExpireTime(10))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", addr),
        Weight:      10,
        Tags:        nil,
    }),
    )
    // ...
}
```

#### WithRefreshInterval

Redis 扩展提供了 `WithRefreshInterval` 配置存储服务信息的 Key 的过期时间刷新间隔（秒为单位）。默认为 30 秒。

**注意：刷新间隔必须小于过期时间。**

函数签名：

```go
func WithRefreshInterval(interval int) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithRereshInterval(5))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", addr),
        Weight:      10,
        Tags:        nil,
    }),
    )
    // ...
}
```

#### WithPassword

Redis 扩展提供了 `WithPassword` 配置 redis 的密码，此密码必须匹配服务器配置选项中指定的密码。默认为空。

函数签名：

```go
func WithPassword(password string) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithPassword("123456"))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
      ServiceName: "hertz.test.demo",
      Addr:        utils.NewNetAddr("tcp", addr),
      Weight:      10,
      Tags:        nil,
    }),
    )
    // ...
}
```

#### WithDB

Redis 扩展提供了 `WithDB` 配置连接到服务器后要选择的数据库。默认为 0。

函数签名：

```go
func WithDB(db int) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDB(1))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithTLSConfig

Redis 扩展提供了 `WithTLSConfig` 配置 TLS 的配置项。

函数签名：

```go
func WithTLSConfig(t *tls.Config) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithDialer

Redis 扩展提供了 `WithDialer` 配置 Dialer，Dialer 将会创建新的网络连接并优先于 Network 和 Addr 选项。

函数签名：

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithReadTimeout

Redis 扩展提供了 `WithReadTimeout` 配置读取 socket 超时的时间，默认为 3 秒。

函数签名：

```go
func WithReadTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithWriteTimeout

Redis 扩展提供了 `WithWriteTimeout` 配置写入 socket 超时的时间，默认等同于 `ReadTimeout`。

函数签名：

```go
func WithWriteTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### NewRedisRegistry

`NewRedisRegistry` 使用 redis 创建一个新的服务注册中心，需要传入目标地址。可自定义客户端配置并传入 `NewClient` 创建一个新的客户端。

函数签名：

```go
func NewRedisRegistry(addr string, opts ...Option) registry.Registry
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379")
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

## 服务发现

### Option

Redis 拓展在服务发现部分中提供了 option 配置。

#### WithPassword

Redis 扩展提供了 `WithPassword` 配置 redis 的密码，此密码必须匹配服务器配置选项中指定的密码。默认为空。

函数签名：

```go
func WithPassword(password string) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithPassword("123456"))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithDB

Redis 扩展提供了 `WithDB` 配置连接到服务器后要选择的数据库。默认为 0。

函数签名：

```go
func WithDB(db int) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithDB(1))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithTLSConfig

Redis 扩展提供了 `WithTLSConfig` 配置 TLS 的配置项。

函数签名：

```go
func WithTLSConfig(t *tls.Config) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithDialer

Redis 扩展提供了 `WithDialer` 配置 Dialer，Dialer 将会创建新的网络连接并优先于 Network 和 Addr 选项。

函数签名：

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithReadTimeout

Redis 扩展提供了 `WithReadTimeout` 配置读取 socket 超时的时间，默认为 3 秒。

函数签名：

```go
func WithReadTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithWriteTimeout

Redis 扩展提供了 `WithWriteTimeout` 配置写入 socket 超时的时间，默认等同于 `ReadTimeout`。

函数签名：

```go
func WithWriteTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewRedisResolver

`NewRedisResolver` 使用 redis 创建一个新的服务发现中心，需要传入目标地址。可自定义客户端配置并传入 `NewClient` 创建一个新的客户端。

函数签名：

```go
func NewRedisResolver(addr string, opts ...Option) discovery.Resolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379")
    cli.Use(sd.Discovery(r))
    // ...
}
```

## 使用示例

### 服务端

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379")
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    h.Spin()
}
```

### 客户端

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
	"github.com/cloudwego/hertz/pkg/common/config"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := redis.NewRedisResolver("127.0.0.1:6379")
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

可自定义 redis 客户端以及服务端的配置，参考 [go-redis](https://github.com/go-redis/redis) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/redis/example) 。
