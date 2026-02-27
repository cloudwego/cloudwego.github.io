---
title: "polaris"
date: 2023-04-22
weight: 6
keywords: ["Service Registration and Discovery", "polaris"]
description: "Service Registration and Discovery polaris Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/registry/polaris
```

## Service Registry

### NewPolarisRegistry

`NewPolarisRegistry` creates a new service registry using polaris, passing in a configuration file and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisRegistry(configFile ...string) (Registry, error)
```

Example:

```go
func main() {
    r, err := polaris.NewPolarisRegistry(confPath)
    if err != nil {
        log.Fatal(err)
    }

    Info := &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", "127.0.0.1:8888"),
        Tags: map[string]string{
            "namespace": Namespace,
        },
    }
    h := server.Default(server.WithRegistry(r, Info), server.WithExitWaitTime(10*time.Second))
    // ...
}
```

## Service Discovery

### NewPolarisResolver

`NewPolarisResolver` uses polaris to create a new service discovery center, passing in a configuration file and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisResolver(configFile ...string) (Resolver, error)
```

Example:

```go
func main() {
    r, err := polaris.NewPolarisResolver(confPath)
    if err != nil {
        log.Fatal(err)
    }

    client, err := hclient.NewClient()
    client.Use(sd.Discovery(r))
    //...
}
```

## How to use

### Server

```go
import (
    "context"
    "log"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/polaris"
)

const (
    confPath  = "polaris.yaml"
    Namespace = "Polaris"
    // At present,polaris server tag is v1.4.0，can't support auto create namespace,
    // If you want to use a namespace other than default,Polaris ,before you register an instance,
    // you should create the namespace at polaris console first.
)

func main() {
    r, err := polaris.NewPolarisRegistry(confPath)

    if err != nil {
        log.Fatal(err)
    }

    Info := &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", "127.0.0.1:8888"),
        Tags: map[string]string{
            "namespace": Namespace,
        },
    }
    h := server.Default(server.WithRegistry(r, Info), server.WithExitWaitTime(10*time.Second))

    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "Hello,Hertz!")
    })

    h.Spin()
}
```

### Client

```go
import (
    "context"
    "log"

    hclient "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/polaris"
)

const (
    confPath  = "polaris.yaml"
    Namespace = "Polaris"
    // At present,polaris server tag is v1.4.0，can't support auto create namespace,
    // if you want to use a namespace other than default,Polaris ,before you register an instance,
    // you should create the namespace at polaris console first.
)

func main() {
    r, err := polaris.NewPolarisResolver(confPath)
    if err != nil {
        log.Fatal(err)
    }

    client, err := hclient.NewClient()
    client.Use(sd.Discovery(r))

    for i := 0; i < 10; i++ {
        // config.WithTag sets the namespace tag for service discovery
        status, body, err := client.Get(context.TODO(), nil, "http://hertz.test.demo/hello", config.WithSD(true), config.WithTag("namespace", Namespace))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s\n", status, body)
    }
}
```

## Configuration

The configuration of Polaris client and server can be customized, refer to the configuration of [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme).

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example) .
