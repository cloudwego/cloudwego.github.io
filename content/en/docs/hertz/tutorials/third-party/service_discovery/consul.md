---
title: "consul"
date: 2023-04-22
weight: 3
keywords: ["Service Registration and Discovery", "consul"]
description: "Service Registration and Discovery consul Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/registry/consul
```

## Service Registry

### Option

Consul extension provides option configuration in the service registry section.

#### WithCheck

Consul extension provides `WithCheck` to help users configure the `AgentServiceCheck` option in Consul. `defaultCheck()` is called by default. If not use, set `check.Timeout` to 5 seconds, `check.Internal` to 5 seconds, and `check.DeregisterCriticalServiceAfter` to 1 minute.

Function signature:

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

Example:

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

`NewConsulRegister` uses consul to create a new service registry, which needs to be passed in a client, which is created with `NewClient`. The service registry configuration can be customized.

Function signature:

```go
func NewConsulRegister(consulClient *api.Client, opts ...Option) registry.Registry
```

Example:

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

## Service Discovery

### NewConsulResolver

`NewConsulResolver` uses consul to create a new service discovery center, you need to pass in the client. The client is created using `NewClient`. The service discovery center configuration can be customized.

Function signature:

```go
func NewConsulResolver(consulClient *api.Client) discovery.Resolver
```

Example:

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

## How to use

### Server

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

### Client

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

## Configuration

The configuration of Consul client and server can be customized, refer to the configuration of [consul](https://github.com/hashicorp/consul).

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/consul/example) .
