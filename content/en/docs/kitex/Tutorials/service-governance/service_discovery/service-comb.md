---
title: "service-comb"
date: 2023-11-30
weight: 7
keywords: ["Service Discovery", "service-comb"]
description: "Service Registration and Discovery service-comb Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-servicecomb
```

## Service Registry

### Create Registry

Kitex provides two functions to create service registry.

#### NewDefaultSCRegistry

`NewDefaultSCRegistry` uses service-comb to create a default service registry, which needs to pass in the endpoint value. The service registry configuration can be customized.

Function signature:

```go
func NewDefaultSCRegistry(opts ...Option) (registry.Registry, error)
```

Example:

```go
import (
    // ...
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/server"
    "github.com/kitex-contrib/registry-servicecomb/registry"
)

// ...

func main() {
    r, err := registry.NewDefaultSCRegistry()
    if err != nil {
        panic(err)
    }
    svr := hello.NewServer(
        new(HelloImpl),
        server.WithRegistry(r),
        server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "Hello"}),
        server.WithServiceAddr(&net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8080}),
    )
    if err := svr.Run(); err != nil {
        log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
    // ...
}
```

#### NewSCRegistry

`NewSCRegistry` uses service-comb to create a new service registry. It needs to pass in a custom client. Customizable service registry configuration.

Function signature:

```go
func NewSCRegistry(client *sc.Client, opts ...Option) registry.Registry
```

Example:

```go
import (
    // ...
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/server"
  	"github.com/go-chassis/sc-client"
    "github.com/kitex-contrib/registry-servicecomb/registry"
)

// ...

func main() {
  	client := &sc.Client{
        // ...
    }
    // ...
    r, err := registry.NewSCRegistry(client)
    if err != nil {
        panic(err)
    }
    svr := hello.NewServer(
        new(HelloImpl),
        server.WithRegistry(r),
        server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "Hello"}),
        server.WithServiceAddr(&net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8080}),
    )
    if err := svr.Run(); err != nil {
        log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
    // ...
}
```

### Option

Servicecomb extension provides option configuration in the service registry section.

#### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to “DEFAULT” .

Function signature:

```go
func WithAppId(appId string) RegistryOption
```

#### WithRegistryVersionRule

Servicecomb extension provides `WithRegistryVersionRule` to help users configure the version requirements of Servicecomb. Defaults to 1.0.0 .

Function signature:

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

#### WithRegistryHostName

Servicecomb extension provides `WithRegistryHostName` to help users configure Servicecomb’s hostname. Defaults to “DEFAULT” .

Function signature:

```go
func WithRegistryHostName(hostName string) RegistryOption
```

#### WithRegistryHeartbeatInterval

Servicecomb extension provides `WithRegistryHeartbeatInterval` to help users configure the interval for sending heartbeat packets. Default is 5.

Function signature:

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

## Service Discovery

### Create Resolver

Kitex provides two functions to create service resolver.

#### NewDefaultSCResolver

`NewDefaultSCResolver` uses service-comb to create a default service discovery center, which needs to pass in the endpoint value. Service discovery center configuration can be customized.

Function signature:

```go
func NewDefaultSCResolver(opts ...Option) (discovery.Resolver, error)
```

Example:

```go
import (
    // ...
    "github.com/cloudwego/kitex/client"
    "github.com/kitex-contrib/registry-servicecomb/resolver"
)

func main() {
    r, err := resolver.NewDefaultSCResolver()
    if err != nil {
        panic(err)
    }
    newClient := hello.MustNewClient("Hello", client.WithResolver(r))
    // ...
}
```

#### NewSCResolver

`NewSCReslover` uses service-comb to create a new service discovery center. It needs to pass in a custom client. The configuration of the service discovery center can be customized.

Function signature:

```go
func NewSCResolver(cli *sc.Client, opts ...Option) discovery.Resolver
```

Example:

```go
import (
    // ...
    "github.com/cloudwego/kitex/client"
  	"github.com/go-chassis/sc-client"
    "github.com/kitex-contrib/registry-servicecomb/resolver"
)

func main() {
  	client := &sc.Client{
        // ...
    }
    // ...
    r, err := resolver.NewSCResolver(client)
    if err != nil {
        panic(err)
    }
    newClient := hello.MustNewClient("Hello", client.WithResolver(r))
    // ...
}
```

### Option

Servicecomb extension provides option configuration in the service discovery section.

#### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to “DEFAULT” .

Function signature:

```go
func WithResolverAppId(appId string) ResolverOption
```

#### WithResolverVersionRule

Servicecomb extension provides `WithResolverVersionRule` to help users configure Servicecomb’s version requirements. Defaults to latest .

Function signature:

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

#### WithResolverConsumerId

Servicecomb extension provides `WithResolverConsumerId` to help users configure Servicecomb’s ConsumerId . Default is empty .

Function signature:

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

## How To Use

### Server

```go
package main

import (
	"context"
	"log"
	"net"

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/registry-servicecomb/registry"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(_ context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	r, err := registry.NewDefaultSCRegistry()
	if err != nil {
		panic(err)
	}
	svr := hello.NewServer(
		new(HelloImpl),
		server.WithRegistry(r),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "Hello"}),
		server.WithServiceAddr(&net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8080}),
	)
	if err := svr.Run(); err != nil {
		log.Println("server stopped with error:", err)
	} else {
		log.Println("server stopped")
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

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/client"
	"github.com/kitex-contrib/registry-servicecomb/resolver"
)

func main() {
	r, err := resolver.NewDefaultSCResolver()
	if err != nil {
		panic(err)
	}
	newClient := hello.MustNewClient(
		"Hello",
		client.WithResolver(r),
		client.WithRPCTimeout(time.Second*3),
	)
	for {
		resp, err := newClient.Echo(context.Background(), &api.Request{Message: "Hello"})
		if err != nil {
			log.Fatal(err)
		}
		log.Println(resp)
		time.Sleep(time.Second)
	}
}
```

## Configuration

The configuration of Servicecomb client and server can be customized, refer to the configuration of [go-chassis/sc-client](https://github.com/go-chassis/sc-client).

## Complete Example

For more, see [example](https://github.com/kitex-contrib/registry-servicecomb/tree/main/example).
