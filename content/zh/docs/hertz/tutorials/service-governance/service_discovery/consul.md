---
title: "consul"
date: 2023-04-22
weight: 3
keywords: ["服务注册与发现", "consul"]
description: "Hertz 提供的服务注册与发现 consul 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/consul
```

## 服务注册

### Option

Consul 拓展在服务注册部分中提供了 option 配置。

#### WithCheck

Consul 扩展提供了 `WithCheck` 用于帮助用户配置 Consul 中的 `AgentServiceCheck` 选项。若不使用，则默认设置 `check.Timeout` 为 5 秒，`check.Internal` 为 5 秒，`check.DeregisterCriticalServiceAfter` 为 1 分钟。

函数签名：

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(config)
    // ...
    check := &consulapi.AgentServiceCheck{
        // ...
    }
    r := consul.NewConsulRegister(consulClient, consul.WithCheck(check))
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

### NewConsulRegister

`NewConsulRegister` 使用 consul 创建一个可配置客户端的服务注册中心，需要传入客户端，其中客户端使用 `NewClient` 创建。可自定义服务注册中心配置。

函数签名：

```go
func NewConsulRegister(consulClient *api.Client, opts ...Option) registry.Registry
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(config)
    // ...
    r := consul.NewConsulRegister(consulClient)
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

### NewConsulResolver

`NewConsulResolver` 使用 consul 创建一个新的服务发现中心，需要传入客户端，其中客户端使用 `NewClient` 创建。可自定义服务发现中心配置。

函数签名：

```go
func NewConsulResolver(consulClient *api.Client) discovery.Resolver
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(consulConfig)
    if err != nil {
        log.Fatal(err)
        return
    }
    r := consul.NewConsulResolver(consulClient)

    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
}
```

## 使用示例

### 服务端

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    consulapi "github.com/hashicorp/consul/api"
    "github.com/hertz-contrib/registry/consul"
)


func main() {
    // build a consul client
    config := consulapi.DefaultConfig()
    config.Address = "127.0.0.1:8500"
    consulClient, err := consulapi.NewClient(config)
    if err != nil {
        log.Fatal(err)
        return
    }
    // build a consul register with the consul client
    r := consul.NewConsulRegister(consulClient)

    // run Hertz with the consul register
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
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong1"})
    })
    h.Spin()
}
```

### 客户端

```go
import (
    "log"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    consulapi "github.com/hashicorp/consul/api"
    "github.com/hertz-contrib/registry/consul"
)

func main() {
    // build a consul client
    consulConfig := consulapi.DefaultConfig()
    consulConfig.Address = "127.0.0.1:8500"
    consulClient, err := consulapi.NewClient(consulConfig)
    if err != nil {
        log.Fatal(err)
        return
    }
    // build a consul resolver with the consul client
    r := consul.NewConsulResolver(consulClient)

    // build a hertz client with the consul resolver
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
}
```

## 配置

可自定义 Consul 客户端以及服务端的配置，参考 [consul](https://github.com/hashicorp/consul) 配置。

## 完整实例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/consul/example) 。
