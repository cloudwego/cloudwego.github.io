---
title: "nacos"
date: 2023-04-22
weight: 2
keywords: ["服务注册与发现", "nacos"]
description: "Hertz 提供的服务注册与发现 nacos 拓展。"
---

## 安装

- nacos-sdk-go v1 版本

```go
go get github.com/hertz-contrib/registry/nacos
```

- nacos-sdk-go v2 版本

```go
go get github.com/hertz-contrib/registry/nacos/v2
```

## 服务注册

### Option

Nacos 拓展在服务注册部分中提供了 option 配置。

#### WithRegistryCluster

Nacos 扩展提供了 `WithRegistryCluster` 用于帮助用户配置自定义的集群。默认为“DEFAULT” 。

函数签名：

```go
func WithRegistryCluster(cluster string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry(
        nacos.WithRegistryCluster("Cluster123"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
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

#### WithRegistryGroup

Nacos 扩展提供了 `WithRegistryGroup` 用于帮助用户配置自定义的集群。默认为 "DEFAULT_GROUP" 。

函数签名：

```go
func WithRegistryGroup(group string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry(
        nacos.WithRegistryGroup("Group1"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
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

### NewDefaultNacosRegistry

`NewDefaultNacosRegistry` 使用 nacos 创建一个默认的服务注册中心。会调用 `NewDefaultNacosConfig` 读取环境变量来创建一个默认的 nacos 客户端，并设置 RegionId 为 `cn-hangzhou`，且不会在启动时自动预加载服务实例信息到本地缓存。可自定义服务注册中心配置。

环境变量：

| 环境变量名 | 环境变量默认值 | 描述                    |
| ---------- | -------------- | ----------------------- |
| serverAddr | 127.0.0.1      | nacos 服务器地址        |
| serverPort | 8848           | nacos 服务器端口        |
| namespace  |                | nacos 中的 namespace Id |

函数签名：

```go
func NewDefaultNacosRegistry(opts ...RegistryOption) (registry.Registry, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry()
    if err != nil {
        log.Fatal(err)
        return
    }
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

### NewNacosRegistry

`NewNacosRegistry` 使用 nacos 创建一个可配置客户端的服务注册中心，需要传入自行配置的客户端。可自定义服务注册中心配置。

函数签名：

```go
func NewNacosRegistry(client naming_client.INamingClient, opts ...RegistryOption) registry.Registry
```

示例代码：

```go
func main() {
    // ...
    cli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        },
    )
    // ...
    r := nacos.NewNacosRegistry(cli)
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

Nacos 拓展在服务发现部分中提供了 option 配置。

#### WithResolverCluster

Nacos 扩展提供了 `WithResolverCluster` 用于帮助用户配置自定义的集群。默认为“DEFAULT” 。

函数签名：

```go
func WithResolverCluster(cluster string) ResolverOption
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithResolverCluster("Cluster123"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

#### WithResolverGroup

Nacos 扩展提供了 `WithResolverGroup` 用于帮助用户配置自定义的集群。默认为 "DEFAULT_GROUP" 。

函数签名：

```go
func WithResolverGroup(group string) ResolverOption
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithResolverGroup("Group1"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

### NewDefaultNacosResolver

`NewDefaultNacosResolver` 使用 nacos 创建一个默认的服务发现中心。会调用 `NewDefaultNacosConfig` 读取环境变量来创建一个默认的 nacos 客户端，并设置 RegionId 为 `cn-hangzhou`，且不会在启动时自动预加载服务实例信息到本地缓存。可自定义服务注册中心配置。

环境变量：

| 环境变量名 | 环境变量默认值 | 描述                    |
| ---------- | -------------- | ----------------------- |
| serverAddr | 127.0.0.1      | nacos 服务器地址        |
| serverPort | 8848           | nacos 服务器端口        |
| namespace  |                | nacos 中的 namespace Id |

函数签名：

```go
func NewDefaultNacosResolver(opts ...ResolverOption) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver()
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

### NewNacosResolver

`NewNacosResolver` 使用 nacos 创建一个可配置客户端的服务发现中心，需要传入自行配置的客户端。可自定义服务发现中心配置。

函数签名：

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...ResolverOption) discovery.Resolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    // ...
    nacosCli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        })
    if err != nil {
        panic(err)
    }
    r := nacos.NewNacosResolver(nacosCli)
    cli.Use(sd.Discovery(r))
    // ...
}
```

## 使用示例

### 服务端

- 使用 `server.WithRegistry` 设置注册扩展以及注册信息。

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/nacos"
)

func main() {
    addr := "127.0.0.1:8888"
    r, err := nacos.NewDefaultNacosRegistry()
    if err != nil {
        log.Fatal(err)
        return
    }
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
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    h.Spin()
}
```

### 客户端

- 使用内置的 `sd.Discovery` 中间件，支持传入自定义的服务发现扩展以及负载均衡扩展。
- 使用服务发现时需要将 url 中的域名替换为服务名，并使用 `config.WithSD` 确定本次请求使用服务注册。

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/nacos"
)

func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver()
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := client.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s\n", status, string(body))
    }
}
```

## 注意

- nacos/v2 版本中 hertz 目前不支持多次在同分组下创建多端口示例
- nacos/v2 的服务注册与发现和先前的版本兼容
- nacos-sdk-go v2 版本中 constant.ClientConfig 中 CustomLogger 类型被移除
- nacos/v2 只支持 nacos 2.X 版本

## 配置

可自定义 Nacos 客户端以及服务端的配置，参考 [nacos-sdk-go](https://github.com/nacos-group/nacos-sdk-go) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples) 。
