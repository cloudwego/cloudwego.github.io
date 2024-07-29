---
title: "eureka"
date: 2023-04-22
weight: 5
keywords: ["服务注册与发现", "eureka"]
description: "Hertz 提供的服务注册与发现 eureka 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/eureka
```

## 服务注册

### NewEurekaRegistry

`NewEurekaRegistry` 使用 eureka 创建一个新的服务注册中心，需要将服务 Url 通过一个字符串切片传入 `NewConn`，并同时传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    r := eureka.NewEurekaRegistry([]string{"http://127.0.0.1:8761/eureka"}, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

### NewEurekaRegistryFromConfig

`NewEurekaRegistryFromConfig` 使用 eureka 创建一个新的服务注册中心，需要传入配置并调用 `NewConnFromConfig`，也需要传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistryFromConfig(config fargo.Config, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    config := fargo.Config{
    // ...
    }
    r := eureka.NewEurekaRegistryFromConfig(config, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

### NewEurekaRegistryFromConn

`NewEurekaRegistryFromConn` 使用 eureka 创建一个新的服务注册中心，需要直接传入 conn，也需要传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistryFromConn(conn fargo.EurekaConnection, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    conn := fargo.EurekaConnection{
    // ...
    }
    r := eureka.NewEurekaRegistryFromConn(conn, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

## 服务发现

### NewEurekaResolver

`NewEurekaResolver` 使用 eureka 创建一个新的服务发现中心，需要将服务 Url 通过一个字符串切片传入 `NewConn`。

函数签名：

```go
func NewEurekaResolver(servers []string) *eurekaResolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolver([]string{"http://127.0.0.1:8761/eureka"})

    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewEurekaResolverFromConfig

`NewEurekaResolverFromConfig` 使用 eureka 创建一个新的服务发现中心，需要传入配置并调用 `NewConnFromConfig`。

函数签名：

```go
func NewEurekaResolverFromConfig(config fargo.Config) *eurekaResolver
```

示例代码：

```go
func main() {
    // ...
    config := fargo.Config{
    // ...
    }
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolverFromConfig(config)

    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewEurekaResolverFromConn

`NewEurekaResolverFromConn` 使用 eureka 创建一个新的服务发现中心，需要直接传入 conn。

函数签名：

```go
func NewEurekaResolverFromConn(conn fargo.EurekaConnection) *eurekaResolver
```

示例代码：

```go
func main() {
    // ...
    conn := fargo.EurekaConnection{
    // ...
    }
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolverFromConn(conn)

    cli.Use(sd.Discovery(r))
    // ...
}
```

## 使用示例

### 服务端

```go
import (
    "context"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/eureka"
)

func main() {
    addr := "127.0.0.1:8888"
    r := eureka.NewEurekaRegistry([]string{"http://127.0.0.1:8761/eureka"}, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
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
    "github.com/hertz-contrib/registry/eureka"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolver([]string{"http://127.0.0.1:8761/eureka"})

    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.discovery.eureka/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

## 配置

本项目使用 [fargo](https://github.com/hudl/fargo) 作为 eureka 客户端。您应该参考 [fargo](https://github.com/hudl/fargo) 文档以了解高级配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example) 。
