---
title: "consul"
date: 2023-11-30
weight: 3
keywords: ["Service Discovery", "consul"]
description: "Service Registration and Discovery consul Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-consul
```

## Service Registry

### Create Registry

Kitex provides two functions to create service registry.

#### NewConsulRegister

`NewConsulRegister` uses consul to create a new service registry. It requires passing in an address. Customizable service registry configuration, see `Option` for configuration details.

Function signature:

```go
func NewConsulRegister(address string, opts ...Option) (registry.Registry, error)
```

Example:

```go
import (
    ...
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/server"
    consul "github.com/kitex-contrib/registry-consul"
    consulapi "github.com/hashicorp/consul/api"
)

func main() {
    
    r, err := consul.NewConsulRegister("127.0.0.1:8500")
    if err != nil {
        log.Fatal(err)
    }
    
    server := hello.NewServer(new(HelloImpl), server.WithRegistry(r), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{
        ServiceName: "greet.server",
    }))
    err = server.Run()
    if err != nil {
        log.Fatal(err)
    }
}
```

#### NewConsulRegisterWithConfig

`NewConsulRegisterWithConfig` uses consul to create a new service registry. It requires passing in a client, and the client needs to be created by the user using the official Consul Go client. Customizable service registry configuration, see `Option` for configuration details.

Function signature:

```go
func NewConsulRegisterWithConfig(config *api.Config, opts ...Option) (*consulRegistry, error)
```

Example:

```go
import (
	...
	consul "github.com/kitex-contrib/registry-consul"
	consulapi "github.com/hashicorp/consul/api"
)
func main() {
    ...
	consulConfig := consulapi.Config{
		Address: "127.0.0.1:8500",
		Scheme:  "https"
		Token:   "TEST-MY-TOKEN",
	}
	r, err := consul.NewConsulRegisterWithConfig(&consulConfig)
}
```

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
import (
	...
	consul "github.com/kitex-contrib/registry-consul"
	consulapi "github.com/hashicorp/consul/api"
)
func main() {
    ...
	r, err := consul.NewConsulRegister("127.0.0.1:8500", consul.WithCheck(&consulapi.AgentServiceCheck{
            Interval:                       "7s",
            Timeout:                        "5s",
            DeregisterCriticalServiceAfter: "1m",
	}))
}
```

## Service Discovery

### Create Resolver

Kitex provides two functions to create Resolver.

#### NewConsulResolver

`NewConsulResolver` uses consul to create a new service discovery center. It requires passing in an address.

Function signature:

```go
func NewConsulResolver(address string) (discovery.Resolver, error)
```

Example:

```go
import (
    ...
    "github.com/cloudwego/kitex/client"
    consul "github.com/kitex-contrib/registry-consul"
    ...
)

func main() {
    ...
    r, err := consul.NewConsulResolver("127.0.0.1:8500")
    if err != nil {
        log.Fatal(err)
    }
    client, err := echo.NewClient("greet.server", client.WithResolver(r))
    if err != nil {
        log.Fatal(err)
    }
    ...
}
```

#### NewConsulResolverWithConfig

`NewConsulResolverWithConfig` uses consul to create a new service discovery center. It requires passing in a client, and the client needs to be created by the user using the official Consul Go client.

Function signature:

```go
func NewConsulResolver(consulClient *api.Client) discovery.Resolver
```

Example:

```go
import (
	...
	consul "github.com/kitex-contrib/registry-consul"
	consulapi "github.com/hashicorp/consul/api"
)
func main() {
    ...
	consulConfig := consulapi.Config{
		Address: "127.0.0.1:8500",
		Scheme:  "https"
		Token:   "TEST-MY-TOKEN",
	}
	r, err := consul.NewConsulResolverWithConfig(&consulConfig)
}
```

## How To Use

### Server

```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/kitex/pkg/registry"
	"github.com/cloudwego/kitex/server"
	consul "github.com/kitex-contrib/registry-consul"
	"github.com/kitex-contrib/registry-consul/example/hello/kitex_gen/api"
	"github.com/kitex-contrib/registry-consul/example/hello/kitex_gen/api/hello"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(_ context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	r, err := consul.NewConsulRegister("127.0.0.1:8500")
	if err != nil {
		log.Fatal(err)
	}

	svc := hello.NewServer(
		new(HelloImpl),
		server.WithRegistry(r),
		server.WithRegistryInfo(&registry.Info{
			ServiceName: "hello",
			Weight:      1, // weights must be greater than 0 in consul,else received error and exit.
		}),
	)
	err = svc.Run()
	if err != nil {
		log.Fatal(err)
	}
}
```

### Client

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/cloudwego/kitex/client"
	consul "github.com/kitex-contrib/registry-consul"
	"github.com/kitex-contrib/registry-consul/example/hello/kitex_gen/api"
	"github.com/kitex-contrib/registry-consul/example/hello/kitex_gen/api/hello"
)

func main() {
	r, err := consul.NewConsulResolver("127.0.0.1:8500")
	if err != nil {
		log.Fatal(err)
	}
	c := hello.MustNewClient("hello", client.WithResolver(r), client.WithRPCTimeout(time.Second*3))
	ctx := context.Background()
	for {
		resp, err := c.Echo(ctx, &api.Request{Message: "Hello"})
		if err != nil {
			log.Fatal(err)
		}
		log.Println(resp)
		time.Sleep(time.Second)
	}
}
```

## Configuration

The configuration of Consul client and server can be customized, refer to the configuration of [consul](https://github.com/hashicorp/consul).

## Complete Example

For more, see [example](https://github.com/kitex-contrib/registry-consul/tree/main/example) .
