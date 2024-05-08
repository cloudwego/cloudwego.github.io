---
title: "nacos"
date: 2023-04-22
weight: 2
keywords: ["Service Registration and Discovery", "nacos"]
description: "Service Registration and Discovery nacos Extensions provided by Hertz."
---

## Install

- nacos-sdk-go v1 version

```go
go get github.com/hertz-contrib/registry/nacos
```

- nacos-sdk-go v2 version

```go
go get github.com/hertz-contrib/registry/nacos/v2
```

## Service Registry

### Option

Nacos extension provides option configuration in the service registry section.

#### WithRegistryCluster

Nacos extension provides `WithRegistryCluster` to help users configure custom clusters. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryCluster(cluster string) RegistryOption
```

Example:

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

Nacos extension provides `WithRegistryGroup` to help users configure custom clusters. Defaults to "DEFAULT_GROUP" .

Function signature:

```go
func WithRegistryGroup(group string) RegistryOption
```

Example:

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

`NewDefaultNacosRegistry` creates a default service registry using nacos. `NewDefaultNacosConfig` will be called to create a default client. By default, the RegionID is `cn-hangzhou`, the server address is `127.0.0.1`, the server port number is `8848`, and the service instance information will not be automatically preloaded into the local cache upon startup. Service registry configuration can be customized.

Function signature:

```go
func NewDefaultNacosRegistry(opts ...RegistryOption) (registry.Registry, error)
```

Example:

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

`NewNacosRegistry` uses nacos to create a service registry that can configure clients, and needs to pass in self-configured clients. Customizable service registry configuration.

Function signature：

```go
func NewNacosRegistry(client naming_client.INamingClient, opts ...RegistryOption) registry.Registry
```

Example：

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

## Service Discovery

### Option

Nacos extension provides option configuration in the service discovery section.

#### WithRegistryCluster

Nacos extension provides `WithRegistryCluster` to help users configure custom clusters. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryCluster(cluster string) RegistryOption
```

Example:

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithRegistryCluster("Cluster123"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

#### WithRegistryGroup

Nacos extension provides `WithRegistryGroup` to help users configure custom clusters. Defaults to "DEFAULT_GROUP" .

Function signature:

```go
func WithRegistryGroup(group string) RegistryOption
```

Example:

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithRegistryGroup("Group1"),
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

`NewDefaultNacosResolver` creates a default service discovery center using nacos. `NewDefaultNacosConfig` will be called to create a default client. By default, the RegionID is `cn-hangzhou`, the server address is `127.0.0.1`, the server port number is `8848`, and the service instance information will not be automatically preloaded into the local cache upon startup. Service registry configuration can be customized.

Function signature：

```go
func NewDefaultNacosResolver(opts ...ResolverOption) (discovery.Resolver, error)
```

Example:

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

`NewNacosResolver` uses nacos to create a service discovery center with a configurable client, which needs to be passed in a self-configured client. Customizable Service Discovery Center configuration.

Function signature:

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...ResolverOption) discovery.Resolver
```

Example:

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

## How to use

### Server

- Use `server.WithRegistry` to set up registration extensions and registration information.

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
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    h.Spin()
}
```

### Client

- Use the `sd.Discovery` built-in middleware to support incoming custom service discovery extensions as well as load balance extensions.
- When using service discovery, replace Host with the service name and use `config.WithSD` to confirm that this request uses service registration.

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

## Caution

- The nacos/v2 version of hertz does not currently support creating multiple port examples in the same group multiple times.
- Service registration and discovery in nacos/v2 is compatible with previous versions.
- CustomLogger type in constant.ClientConfig has been removed in nacos-sdk-go v2.
- nacos/v2 only supports nacos 2.X version.

## Configuration

The configuration of Nacos client and server can be customized, refer to the configuration of [nacos-sdk-go](https://github.com/nacos-group/nacos-sdk-go) .

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples) .
