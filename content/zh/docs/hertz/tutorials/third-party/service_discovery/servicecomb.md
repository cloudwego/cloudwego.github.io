---
title: "servicecomb"
date: 2023-04-22
weight: 7
keywords: ["服务注册与发现", "servicecomb"]
description: "Hertz 提供的服务注册与发现 servicecomb 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/servicecomb
```

## 服务注册

### Option

Servicecomb 拓展在服务注册部分中提供了 option 配置。

#### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId。默认为“DEFAULT" 。

函数签名：

```go
func WithAppId(appId string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithAppId("appID"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithRegistryVersionRule

Servicecomb 扩展提供了 `WithRegistryVersionRule` 用于帮助用户配置 Servicecomb 的版本要求。默认为 1.0.0。

函数签名：

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryVersionRule("1.1.0"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithRegistryHostName

Servicecomb 扩展提供了 `WithRegistryHostName` 用于帮助用户配置 Servicecomb 的主机名。默认为”DEFAULT" 。

函数签名：

```go
func WithRegistryHostName(hostName string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryHostName("hostName"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithRegistryHeartbeatInterval

Servicecomb 扩展提供了 `WithRegistryHeartbeatInterval` 用于帮助用户配置发送心跳包的间隔时长。默认为 5。

函数签名：

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryHeartbeatInterval(10),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### NewDefaultSCRegistry

`NewDefaultSCRegistry` 使用 service-comb 创建一个默认服务注册中心，需要传入端点值。可自定义服务注册中心配置。

函数签名：

```go
func NewDefaultSCRegistry(endPoints []string, opts ...RegistryOption) (registry.Registry, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr})
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### NewSCRegistry

`NewSCRegistry` 使用 service-comb 创建一个新的服务注册中心。需要传入自定义客户端。可自定义服务注册中心配置。

函数签名：

```go
func NewSCRegistry(client *sc.Client, opts ...RegistryOption) registry.Registry
```

示例代码：

```go
func main() {
    client := &sc.Client{
        // ...
    }
    // ...
    r, err := servicecomb.NewSCRegistry(client)
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
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

Servicecomb 拓展在服务发现部分中提供了 option 配置。

#### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId。默认为“DEFAULT" 。

函数签名：

```go
func WithResolverAppId(appId string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithAppId("appID"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithResolverVersionRule

Servicecomb 扩展提供了 `WithResolverVersionRule` 用于帮助用户配置 Servicecomb 的版本要求。默认为 latest。

函数签名：

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithResolverVersionRule("1.0.0"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
		panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithResolverConsumerId

Servicecomb 扩展提供了 `WithResolverConsumerId` 用于帮助用户配置 Servicecomb 的 ConsumerId。默认为空。

函数签名：

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithResolverConsumerId("1"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewDefaultSCResolver

`NewDefaultSCResolver` 使用 service-comb 创建一个默认服务发现中心，需要传入端点值。可自定义服务发现中心配置。

函数签名：

```go
func NewDefaultSCResolver(endPoints []string, opts ...ResolverOption) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCResolver([]string{scAddr})
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewSCResolver

`NewSCReslover` 使用 service-comb 创建一个新的服务发现中心。需要传入自定义客户端。可自定义服务发现中心配置。

函数签名：

```go
func NewSCResolver(cli *sc.Client, opts ...ResolverOption) discovery.Resolver
```

示例代码：

```go
func main() {
    client := &sc.Client{
        // ...
    }
    // ...
    r, err := servicecomb.NewSCResolver(client)
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
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
    "log"
    "sync"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/servicecomb"
)

func main() {
    const scAddr = "127.0.0.1:30100"
    const addr = "127.0.0.1:8701"
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr})
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
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
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/servicecomb"
)

func main() {
    const scAddr = "127.0.0.1:30100"
    // build a servicecomb resolver
    r, err := servicecomb.NewDefaultSCResolver([]string{scAddr})
    if err != nil {
        panic(err)
    }
    // build a hertz client with the servicecomb resolver
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.servicecomb.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

## 配置

可自定义 Servicecomb 客户端以及服务端的配置，参考 [go-chassis/sc-client](https://github.com/go-chassis/sc-client) 配置

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example) 。
