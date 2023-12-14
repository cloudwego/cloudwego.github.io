---
title: "nacos"
date: 2023-11-30
weight: 5
keywords: ["Service Discovery", "nacos"]
description: "Service Registration and Discovery nacos Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-nacos
```

## Service Registry

### Create Registry

Kitex provides two functions to create service registry.

#### NewDefaultNacosRegistry

`NewDefaultNacosRegistry` uses nacos to create a new service registry, and read info from environment variable to create "Nacos Client". Customizable service registry configuration, see `Option` for configuration details.

| Environment Variable Name | Environment Variable Default Value | Environment Variable Introduction |
| ------------------------- | ---------------------------------- | --------------------------------- |
| serverAddr                | 127.0.0.1                          | nacos server address              |
| serverPort                | 8848                               | nacos server port                 |
| namespace                 |                                    | the namespaceId of nacos          |

Function signature:

```go
func NewDefaultNacosRegistry(opts ...Option) (registry.Registry, error
```

Example:

```go
import (
    // ...
    "github.com/kitex-contrib/registry-nacos/registry"
    "github.com/nacos-group/nacos-sdk-go/clients"
    "github.com/nacos-group/nacos-sdk-go/clients/naming_client"
    "github.com/nacos-group/nacos-sdk-go/common/constant"
    "github.com/nacos-group/nacos-sdk-go/vo"
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    // ...
)

func main() {
    // ... 
    r, err := registry.NewDefaultNacosRegistry()
    if err != nil {
        panic(err)
    }
    svr := echo.NewServer(
        new(EchoImpl), 
        server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "echo"}),
        server.WithRegistry(r), 
	)
    if err := svr.Run(); err != nil {
        log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
    // ...
}
```

#### NewNacosRegistry

`NewNacosRegistry` uses nacos to create a new service registry, requires passing in a self-configured client. Customizable service registry configuration, see `Option` for configuration details.

Function signature:

```go
func NewNacosRegistry(cli naming_client.INamingClient, opts ...Option) registry.Registry
```

Example:

```go
import (
    // ...
    "github.com/kitex-contrib/registry-nacos/registry"
    "github.com/nacos-group/nacos-sdk-go/clients"
    "github.com/nacos-group/nacos-sdk-go/clients/naming_client"
    "github.com/nacos-group/nacos-sdk-go/common/constant"
    "github.com/nacos-group/nacos-sdk-go/vo"
    // ...
)
func main() {
    // ...
    sc := []constant.ServerConfig{
        *constant.NewServerConfig("127.0.0.1", 8848),
    }
    
    cc := constant.ClientConfig{
        NamespaceId:         "public",
        TimeoutMs:           5000,
        NotLoadCacheAtStart: true,
        LogDir:              "/tmp/nacos/log",
        CacheDir:            "/tmp/nacos/cache",
        LogLevel:            "info",
        Username:            "your-name",
        Password:            "your-password",
    }
    
    cli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        },
    )
    if err != nil {
        panic(err)
    }
    
    svr := echo.NewServer(new(EchoImpl), 
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "echo"}),
		server.WithRegistry(registry.NewNacosRegistry(cli)),
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

Nacos extension provides option configuration in the service registry section.

#### WithCluster

Nacos extension provides `WithCluster` to help users configure the cluster in nacos. The default value is "DEFAULT".

Function signature:

```go
func WithCluster(cluster string) Option
```

#### WithGroup

Nacos extension provides `WithGroup` to help users configure the cluster in nacos. The default value is "DEFAULT_GROUP".

Function signature:

```go
func WithGroup(group string) Option 
```

## Service Discovery

### Create Resolver

Kitex provides two functions to create Resolver.

#### NewDefaultNacosResolver

`NewDefaultNacosResolver` uses nacos to create a new service resolver, and read info from environment variable to create "Nacos Client". Customizable service registry configuration, see `Option` for configuration details.

| Environment Variable Name | Environment Variable Default Value | Environment Variable Introduction |
| ------------------------- | ---------------------------------- | --------------------------------- |
| serverAddr                | 127.0.0.1                          | nacos server address              |
| serverPort                | 8848                               | nacos server port                 |
| namespace                 |                                    | the namespaceId of nacos          |

Function signature:

```go
func NewDefaultNacosResolver(opts ...Option) (discovery.Resolver, error)
```

Example:

```go
import (
    // ...
    "github.com/kitex-contrib/registry-nacos/resolver"
    "github.com/nacos-group/nacos-sdk-go/clients"
    "github.com/nacos-group/nacos-sdk-go/clients/naming_client"
    "github.com/nacos-group/nacos-sdk-go/common/constant"
    "github.com/nacos-group/nacos-sdk-go/vo"
    // ...
)

func main() {
    // ... 
    r, err := resolver.NewDefaultNacosResolver()
	if err != nil {
	    panic(err)	
    }
    client, err := echo.NewClient("echo", client.WithResolver(r))
    if err != nil {
        log.Fatal(err)
    }
    // ...
}
```

#### NewNacosResolver

`NewNacosResolver` uses nacos to create a new service resolver, requires passing in a self-configured client. Customizable service registry configuration, see `Option` for configuration details.

Function signature:

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...Option) discovery.Resolver
```

Example:

```go
import (
    // ...
    "github.com/kitex-contrib/registry-nacos/resolver"
    "github.com/nacos-group/nacos-sdk-go/clients"
    "github.com/nacos-group/nacos-sdk-go/clients/naming_client"
    "github.com/nacos-group/nacos-sdk-go/common/constant"
    "github.com/nacos-group/nacos-sdk-go/vo"
    // ...
)
func main() {
    // ... 
    sc := []constant.ServerConfig{
	    *constant.NewServerConfig("127.0.0.1", 8848),
	}
    cc := constant.ClientConfig{
        NamespaceId:         "public",
        TimeoutMs:           5000,
        NotLoadCacheAtStart: true,
        LogDir:              "/tmp/nacos/log",
        CacheDir:            "/tmp/nacos/cache",
        LogLevel:            "info",
        Username:            "your-name",
        Password:            "your-password",
    }
    
    cli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        },
    )
    if err != nil {
	    panic(err)	
    }
    client, err := echo.NewClient("echo", client.WithResolver(resolver.NewNacosResolver(cli))
    if err != nil {
        log.Fatal(err)
    }
    // ...
}
```

### Option

Nacos extension provides option configuration in the service discovery section.

#### WithCluster

Nacos extension provides `WithCluster` to help users configure the cluster in nacos. The default value is "DEFAULT".

Function signature:

```go
func WithCluster(cluster string) Option
```

#### WithGroup

Nacos extension provides `WithGroup` to help users configure the cluster in nacos. The default value is "DEFAULT_GROUP".

Function signature:

```go
func WithGroup(group string) Option 
```

## How To Use

### Server

```go
package main

import (
	"context"
	"log"
	"net"

	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/registry-nacos/example/hello/kitex_gen/api"
	"github.com/kitex-contrib/registry-nacos/example/hello/kitex_gen/api/hello"
	"github.com/kitex-contrib/registry-nacos/registry"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(_ context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	r, err := registry.NewDefaultNacosRegistry()
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

	"github.com/cloudwego/kitex/client"
	"github.com/kitex-contrib/registry-nacos/example/hello/kitex_gen/api"
	"github.com/kitex-contrib/registry-nacos/example/hello/kitex_gen/api/hello"
	"github.com/kitex-contrib/registry-nacos/resolver"
)

func main() {
	r, err := resolver.NewDefaultNacosResolver()
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

The configuration of Etcd client and server can be customized, refer to the configuration of [nacos-sdk-go](https://pkg.go.dev/go.etcd.io/etcd/client/v3).

## Complete Example

For more, see [example](https://github.com/kitex-contrib/registry-nacos/tree/main/example).
