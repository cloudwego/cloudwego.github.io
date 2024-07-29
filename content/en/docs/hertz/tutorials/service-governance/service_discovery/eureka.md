---
title: "eureka"
date: 2023-04-22
weight: 5
keywords: ["Service Registration and Discovery", "eureka"]
description: "Service Registration and Discovery eureka Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/eureka
```

## Service Registry

### NewEurekaRegistry

`NewEurekaRegistry` uses eureka to create a new service registry, you need to pass the service Url into `NewConn` through a string slice, and also pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

`NewEurekaRegistryFromConfig` uses eureka to create a new service registry, you need to pass in the configuration and call `NewConnFromConfig` , and also need to pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistryFromConfig(config fargo.Config, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

`NewEurekaRegistryFromConn` uses eureka to create a new service registry, you need to pass in conn directly, and also need to pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistryFromConn(conn fargo.EurekaConnection, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

## Service Discovery

### NewEurekaResolver

`NewEurekaResolver` uses eureka to create a new service discovery center, you need to pass the service Url through a string slice to `NewConn`.

Function signature:

```go
func NewEurekaResolver(servers []string) *eurekaResolver
```

Example:

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

`NewEurekaResolverFromConfig` uses eureka to create a new service discovery center, requires passing in the configuration and calling `NewConnFromConfig`.

Function signature:

```go
func NewEurekaResolverFromConfig(config fargo.Config) *eurekaResolver
```

Example:

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

`NewEurekaResolverFromConn` uses eureka to create a new service discovery center, which needs to be passed directly to conn.

Function signature:

```go
func NewEurekaResolverFromConn(conn fargo.EurekaConnection) *eurekaResolver
```

Example:

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

## How to use

### Server

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

### Client

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/seureka"
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

## Configuration

This project uses [fargo](https://github.com/hudl/fargo) as eureka client. You should refer to [fargo](https://github.com/hudl/fargo) documentation for advanced configuration.

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example) .
