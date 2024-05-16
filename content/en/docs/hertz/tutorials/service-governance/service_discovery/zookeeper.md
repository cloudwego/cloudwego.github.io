---
title: "zookeeper"
date: 2023-04-22
weight: 8
keywords: ["Service Registration and Discovery", "zookeeper"]
description: "Service Registration and Discovery zookeeper Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/registry/zookeeper
```

## Service Registry

### NewZookeeperRegistry

`NewZookeeperRegistry` uses zookeeper to create a service registry. You need to pass the service to `Connect` through a string slice together with the session timeout.

Function signature:

```go
func NewZookeeperRegistry(servers []string, sessionTimeout time.Duration) (registry.Registry, error)
```

Example:

```go
func main() {
    // ...
    r, err := zookeeper.NewZookeeperRegistry([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
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

### NewZookeeperRegistryWithAuth

`NewZookeeperRegistryWithAuth` uses zookeeper to create a service registry. You need to pass the service into `Connect` through a string slice and session timeout time. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperRegistryWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

```go
func main() {
    // ...
    r, err := zookeeper.NewZookeeperRegistryWithAuth([]string{"127.0.0.1:2181"}, 20*time.Second, "hertzuser", "hertzpass")
    if err != nil {
        panic(err)
    }
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

### NewZookeeperResolver

`NewZookeeperResolver` uses zookeeper to create a service discovery center, which needs to pass a string slice and session timeout to `Connect`.

Function signature:

```go
func NewZookeeperResolver(servers []string, sessionTimeout time.Duration) (discovery.Resolver, error)
```

Example:

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolver([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewZookeeperResolverWithAuth

`NewZookeeperResolverWithAuth` uses zookeeper to create a service discovery center. You need to pass the service into `Connect` through a string slice and session timeout. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperResolverWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolverWithAuth([]string{"127.0.0.1:2181"}, 40*time.Second, "hertzuser", "hertzpass")
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
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/zookeeper"
)

func main() {
    addr := "127.0.0.1:8888"
    r, err := zookeeper.NewZookeeperRegistry([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

### Client

```go
import (
    "context"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/zookeeper"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolver([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

## Configuration

The configuration of Zookeeper client and server can be customized, refer to the configuration of [go-zookeeper/zk](https://github.com/go-zookeeper/zk).

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example) .
