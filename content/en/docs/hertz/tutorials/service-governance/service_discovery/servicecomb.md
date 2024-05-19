---
title: "servicecomb"
date: 2023-04-22
weight: 7
keywords: ["Service Registration and Discovery", "servicecomb"]
description: "Service Registration and Discovery servicecomb Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/registry/servicecomb
```

## Service Registry

### Option

Servicecomb extension provides option configuration in the service registry section.

#### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to "DEFAULT" .

Function signature:

```go
func WithAppId(appId string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryVersionRule` to help users configure the version requirements of Servicecomb. Defaults to 1.0.0 .

Function signature:

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryHostName` to help users configure Servicecomb's hostname. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryHostName(hostName string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryHeartbeatInterval` to help users configure the interval for sending heartbeat packets. Default is 5.

Function signature:

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

Example:

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

`NewDefaultSCRegistry` uses service-comb to create a default service registry, which needs to pass in the endpoint value. The service registry configuration can be customized.

Function signature:

```go
func NewDefaultSCRegistry(endPoints []string, opts ...RegistryOption) (registry.Registry, error)
```

Example:

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

`NewSCRegistry` uses service-comb to create a new service registry. It needs to pass in a custom client. Customizable service registry configuration.

Function signature:

```go
func NewSCRegistry(client *sc.Client, opts ...RegistryOption) registry.Registry
```

Example:

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

## Service Discovery

### Option

Servicecomb extension provides option configuration in the service discovery section.

#### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to "DEFAULT" .

Function signature:

```go
func WithResolverAppId(appId string) ResolverOption
```

Example:

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

Servicecomb extension provides `WithResolverVersionRule` to help users configure Servicecomb's version requirements. Defaults to latest .

Function signature:

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

Example:

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

Servicecomb extension provides `WithResolverConsumerId` to help users configure Servicecomb's ConsumerId . Default is empty .

Function signature:

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

Example:

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

`NewDefaultSCResolver` uses service-comb to create a default service discovery center, which needs to pass in the endpoint value. Service discovery center configuration can be customized.

Function signature:

```go
func NewDefaultSCResolver(endPoints []string, opts ...ResolverOption) (discovery.Resolver, error)
```

Example:

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

`NewSCReslover` uses service-comb to create a new service discovery center. It needs to pass in a custom client. The configuration of the service discovery center can be customized.

Function signature:

```go
func NewSCResolver(cli *sc.Client, opts ...ResolverOption) discovery.Resolver
```

Example:

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

## How to use

### Server

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

    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong1"})
    })
    h.Spin()
}
```

### Client

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

## Configuration

The configuration of Servicecomb client and server can be customized, refer to the configuration of [go-chassis/sc-client](https://github.com/go-chassis/sc-client).

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example) .
