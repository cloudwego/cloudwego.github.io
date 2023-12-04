---
title: "eureka"
date: 2023-11-30
weight: 4
keywords: ["Service Discovery", "eureka"]
description: "Service Registration and Discovery eureka Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-eureka
```

## Service Registry

### Create Registry

#### NewEurekaRegistry

`NewEurekaRegistry` uses eureka to create a new service registry, you need to pass the service Url into `NewConn` through a string slice, and also pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) registry.Registry
```

Example:

```go
import (
    ...
    euregistry "github.com/kitex-contrib/registry-eureka/registry"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    ...
)

func main() {
    ...
    r = euregistry.NewEurekaRegistry([]string{"http://127.0.0.1:8080/eureka"}, 15*time.Second)
	svr := echo.NewServer(new(EchoImpl), server.WithRegistry(r),
    server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "test"}), 
    )
    if err := svr.Run(); err != nil {
        log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
    ...
}
```

## Service Discovery

### Create Resolver

#### NewEurekaResolver

`NewEurekaResolver` uses eureka to create a new service discovery center, you need to pass the service Url through a string slice to `NewConn`.

Function signature:

```go
func NewEurekaResolver(servers []string) discovery.Resolver
```

Example:

```go
import (
    ...
    "github.com/kitex-contrib/registry-eureka/resolver"
    "github.com/cloudwego/kitex/client"
    ...
)

func main() {
    ...
    r = resolver.NewEurekaResolver([]string{"http://127.0.0.1:8080/eureka"})
    client, err := echo.NewClient("echo", 
        client.WithResolver(r),
    )
    if err != nil {
        log.Fatal(err)
    }
    ...
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
	"time"

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/registry-eureka/registry"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	r := registry.NewEurekaRegistry([]string{"http://127.0.0.1:8761/eureka"}, 3*time.Second)
	addr := &net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8888}
	srv := hello.NewServer(new(HelloImpl), server.WithRegistry(r), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{
		ServiceName: "Hello",
	}), server.WithServiceAddr(addr))
	err := srv.Run()
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
	"github.com/kitex-contrib/registry-eureka/resolver"
)

func main() {
	r := resolver.NewEurekaResolver([]string{"http://127.0.0.1:8761/eureka"})
	cli := hello.MustNewClient("Hello", client.WithResolver(r))
	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
		resp, err := cli.Echo(ctx, &api.Request{Message: "Hello"})
		cancel()
		if err != nil {
			log.Fatal(err)
		}
		log.Println(resp)
		time.Sleep(time.Second)
	}
}
```

## Configuration

This project uses [fargo](https://github.com/hudl/fargo) as eureka client. You should refer to [fargo](https://github.com/hudl/fargo) documentation for advanced configuration.

## Complete Example

For more, see [example](https://github.com/kitex-contrib/registry-eureka/tree/main/example).
