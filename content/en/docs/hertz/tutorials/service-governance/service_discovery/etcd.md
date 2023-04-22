---
title: "etcd"
date: 2023-04-22
weight: 4
description: >
---

## Install

```go
go get github.com/hertz-contrib/registry/etcd
```

## Service Registry

### Option

Etcd extension provides option configuration in the service registry section.

#### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure the `TLS` option in Etcd.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

Example:

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    // ...
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

#### WithAuthOpt

Etcd extension provides `WithTLSOpt` to help users configure the `Username` and `Password` option in Etcd.

Function signature:

```go
func WithAuthOpt(username, password string) Option
```

Example:

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithAuthOpt("root","123456"),
    )
    if err != nil {
        panic(err)
    }
    // ...
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

### NewEtcdRegistry

`NewEtcdRegistry` uses etcd to create a new service registry, requires passing in the endpoint value. Customizable service registry configuration.

Function signature:

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

Example:

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    // ...
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

Etcd extension provides option configuration in the service discovery section.

#### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure the `TLS` option in Etcd.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

Example:

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithAuthOpt

Etcd extension provides `WithTLSOpt` to help users configure the `Username` and `Password` option in Etcd.

Function signature:

```go
func WithAuthOpt(username, password string) Option
```

Example:

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithAuthOpt("root","123456"),
    )
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewEtcdResolver

`NewEtcdResolver` uses etcd to create a new service discovery center, needs to pass in the endpoint value. You can customize the client configuration and pass `New` to create a new client. Customize the service discovery center configuration.

Function signature:

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

Example:

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithAuthOpt("root","123456"),
    )
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

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
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
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
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

## Configuration

The configuration of Etcd client and server can be customized, refer to the configuration of [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3).

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example) .
