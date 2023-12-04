---
title: "polaris"
date: 2023-11-30
weight: 6
keywords: ["Service Discovery", "polaris"]
description: "Service Registration and Discovery polaris Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/polaris
```

## Service Registry

### Create Registry

#### NewPolarisRegistry

`NewPolarisRegistry` creates a new service registry using polaris, requires passing in the "ServerOptions". Can pass in configuration files and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisRegistry(so ServerOptions, configFile ...string) (Registry, error)
```

Example:

```go
import (
	// ...
  
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/pkg/registry"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/polaris"
)

// ...

func main() {
  // ...
	so := polaris.ServerOptions{}
	r, err := polaris.NewPolarisRegistry(so)
	if err != nil {
		log.Fatal(err)
	}
	Info := &registry.Info{
		ServiceName: "polaris.quickstart.echo",
		Tags: map[string]string{
			polaris.NameSpaceTagKey: "Polaris",
		},
	}
	newServer := hello.NewServer(
		new(HelloImpl),
		server.WithRegistry(r),
		server.WithRegistryInfo(Info),
		server.WithServiceAddr(&net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8890}),
	)

	err = newServer.Run()
	if err != nil {
		log.Fatal(err)
	}
}
```

## Service Discovery

#### Create Resolver

##### NewPolarisResolver

`NewPolarisResolver` uses polaris to create a new service discovery center, requires passing in the "NewPolarisResolver". Can pass in configuration files and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisResolver(o ClientOptions, configFile ...string) (Resolver, error)
```

Example:

```go
import (
	// ...
  
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/client"
	"github.com/kitex-contrib/polaris"
)

// ...

func main() {
	newClient := hello.MustNewClient("polaris.quickstart.echo",
		client.WithSuite(polaris.NewDefaultClientSuite()), // you can also refer readme to customize the initialization of each component
		client.WithRPCTimeout(time.Second*360),
	)

	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*360)
		resp, err := newClient.Echo(ctx, &api.Request{Message: "Hi,polaris!"})
		cancel()
		if err != nil {
			log.Println(err)
		}
		log.Println(resp)
		time.Sleep(1 * time.Second)
	}
}
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
	"github.com/cloudwego/kitex/pkg/registry"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/polaris"
)

const (
	Namespace = "Polaris"
	// At present,polaris server tag is v1.4.0，can't support auto create namespace,
	// If you want to use a namespace other than default,Polaris ,before you register an instance,
	// you should create the namespace at polaris console first.
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message + "Hi,Kitex!",
	}
	return resp, nil
}

func main() {
	so := polaris.ServerOptions{}
	r, err := polaris.NewPolarisRegistry(so)
	if err != nil {
		log.Fatal(err)
	}
	Info := &registry.Info{
		ServiceName: "polaris.quickstart.echo",
		Tags: map[string]string{
			polaris.NameSpaceTagKey: Namespace,
		},
	}
	newServer := hello.NewServer(
		new(HelloImpl),
		server.WithRegistry(r),
		server.WithRegistryInfo(Info),
		server.WithServiceAddr(&net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8890}),
	)

	err = newServer.Run()
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

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/client"
	"github.com/kitex-contrib/polaris"
)

func main() {
	newClient := hello.MustNewClient("polaris.quickstart.echo",
		client.WithSuite(polaris.NewDefaultClientSuite()), // you can also refer readme to customize the initialization of each component
		client.WithRPCTimeout(time.Second*360),
	)

	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*360)
		resp, err := newClient.Echo(ctx, &api.Request{Message: "Hi,polaris!"})
		cancel()
		if err != nil {
			log.Println(err)
		}
		log.Println(resp)
		time.Sleep(1 * time.Second)
	}
}
```

## Configuration

The configuration of Polaris client and server can be customized, refer to the configuration of [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme).

## Complete Example

For more, see [example](https://github.com/kitex-contrib/polaris/tree/main/example).
