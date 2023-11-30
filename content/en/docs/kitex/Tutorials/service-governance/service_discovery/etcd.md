---
title: "etcd"
date: 2023-11-30
weight: 2
keywords: ["Service Discovery", "etcd"]
description: "Service Registration and Discovery etcd Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-etcd
```

## Service Registry

### Create Registry

Kitex provides three functions to create service registry.

#### NewEtcdRegistry

`NewEtcdRegistry` uses etcd to create a new service registry, requires passing in the endpoint value. Customizable service registry configuration, see `Option` for configuration details.

Function signature:

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

Example:

```go
package main

import (
    ...
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/server"
    etcd "github.com/kitex-contrib/registry-etcd"
    ...
)

func main() {
    ...
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"}) // r should not be reused.
    if err != nil {
        log.Fatal(err)
    }
    // https://www.cloudwego.io/docs/tutorials/framework-exten/registry/#integrate-into-kitex
    server, err := echo.NewServer(new(EchoImpl), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "echo"}), server.WithRegistry(r))
    if err != nil {
        log.Fatal(err)
    }
    err = server.Run()
    if err != nil {
        log.Fatal(err)
    }
    ...
}
```

#### NewEtcdRegistryWithAuth

`NewEtcdRegistryWithAuth` create a service registry with auth arguments.

Function signature:

```go
func NewEtcdRegistryWithAuth(endpoints []string, username, password string) (registry.Registry, error)
```

Example:

```go
package main

import (
    ...
	"github.com/cloudwego/kitex/server"
	etcd "github.com/kitex-contrib/registry-etcd"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	// creates a etcd based registry with given username and password
	r, err := etcd.NewEtcdRegistryWithAuth([]string{"127.0.0.1:2379"}, "username", "password")
	if err != nil {
		log.Fatal(err)
	}
	server := hello.NewServer(new(HelloImpl), server.WithRegistry(r), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{
		ServiceName: "Hello",
	}))
	err = server.Run()
	if err != nil {
		log.Fatal(err)
	}
}
```

#### NewEtcdRegistryWithRetry

`NewEtcdRegistryWithRetry` create a service registry with custom `Retry` configuration.

Function signature:

```go
func NewEtcdRegistryWithRetry(endpoints []string, retryConfig *retry.Config, opts ...Option) (registry.Registry, error)
```

Use `NewRetryConfig(opts ...Option) *Config`  to create `Retry` configuration, see `Option` for configuration details.

Example:

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	etcd "github.com/kitex-contrib/registry-etcd"
	"github.com/kitex-contrib/registry-etcd/retry"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	retryConfig := retry.NewRetryConfig(
		retry.WithMaxAttemptTimes(10),
		retry.WithObserveDelay(20*time.Second),
		retry.WithRetryDelay(5*time.Second),
	)
	r, err := etcd.NewEtcdRegistryWithRetry([]string{"127.0.0.1:2379"}, retryConfig)
	if err != nil {
		log.Fatal(err)
	}
	server := hello.NewServer(new(HelloImpl), server.WithRegistry(r), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{
		ServiceName: "Hello",
	}))
	err = server.Run()
	if err != nil {
		log.Fatal(err)
	}
}
```

### Option

Etcd extension provides option configuration in the service registry section.

#### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure the `TLS` option in Etcd.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

#### WithAuthOpt

Etcd extension provides `WithTLSOpt` to help users configure the `Username` and `Password` option in Etcd.

Function signature:

```go
func WithAuthOpt(username, password string) Option
```

#### WithDialTimeoutOpt

Etcd extension provides `WithDialTimeoutOpt` to help users configure the dial timeout.

Function signature:

```go
func WithDialTimeoutOpt(dialTimeout time.Duration) Option
```

#### Retry

After the service is registered to ETCD, it will regularly check the status of the service. If any abnormal status is found, it will try to register the service again. `ObserveDelay` is the delay time for checking the service status under normal conditions, and `RetryDelay` is the delay time for attempting to register the service after disconnecting.

**Default Configuration**

| Configuration                                         | Default Value    | description                                                  |
| ----------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| `WithMaxAttemptTimes(maxAttemptTimes uint) Option`    | 5                | Used to set the maximum number of attempts, if 0, it means infinite attempts |
| `WithObserveDelay(observeDelay time.Duration) Option` | 30 * time.Second | Used to set the delay time for checking service status under normal connection conditions |
| `WithRetryDelay(t time.Duration) Option`              | 10 * time.Second | Used to set the retry delay time after disconnecting         |

## Service Discovery

### Create Resolver

Kitex provides two functions to create Resolver.

#### NewEtcdResolver

`NewEtcdResolver` uses etcd to create a new service discovery center, needs to pass in the endpoint value. You can customize the client configuration and pass `New` to create a new client. Customize the service discovery center configuration, see `Option` for configuration details.

Function signature:

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

Example:

```go
package main

import (
    ...
    "github.com/cloudwego/kitex/client"
    etcd "github.com/kitex-contrib/registry-etcd"
    ...
)

func main() {
    ...
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        log.Fatal(err)
    }
    client, err := echo.NewClient("echo", client.WithResolver(r))
    if err != nil {
        log.Fatal(err)
    }
    ...
}
```

#### NewEtcdResolverWithAuth

`NewEtcdResolverWithAuth` create resolver with auth arguments.

Function Signature:

```go
func NewEtcdResolverWithAuth(endpoints []string, username, password string) (discovery.Resolver, error)
```

Example:

```go
package main

import (
    ...
	"github.com/cloudwego/kitex/client"
	etcd "github.com/kitex-contrib/registry-etcd"
)

func main() { 
	// creates a etcd based resolver with given username and password
	r, err := etcd.NewEtcdResolverWithAuth([]string{"127.0.0.1:2379"}, "username", "password")
	if err != nil {
		log.Fatal(err)
	}
	client := hello.MustNewClient("Hello", client.WithResolver(r))
	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
		resp, err := client.Echo(ctx, &api.Request{Message: "Hello"})
		cancel()
		if err != nil {
			log.Fatal(err)
		}
		log.Println(resp)
		time.Sleep(time.Second)
	}
}
```

### Option

Etcd extension provides option configuration in the service discovery section.

#### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure the `TLS` option in Etcd.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

#### WithAuthOpt

Etcd extension provides `WithTLSOpt` to help users configure the `Username` and `Password` option in Etcd.

Function signature:

```go
func WithAuthOpt(username, password string) Option
```

#### WithDialTimeoutOpt

Etcd extension provides `WithDialTimeoutOpt` to help users configure the dial timeout.

Function signature:

```go
func WithDialTimeoutOpt(dialTimeout time.Duration) Option
```

## How To Use

### Server

```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/hello/kitex_gen/api/hello"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	etcd "github.com/kitex-contrib/registry-etcd"
)

type HelloImpl struct{}

func (h *HelloImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	resp = &api.Response{
		Message: req.Message,
	}
	return
}

func main() {
	r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
	if err != nil {
		log.Fatal(err)
	}
	server := hello.NewServer(new(HelloImpl), server.WithRegistry(r), server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{
		ServiceName: "Hello",
	}))
	err = server.Run()
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
	etcd "github.com/kitex-contrib/registry-etcd"
)

func main() {
	r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
	if err != nil {
		log.Fatal(err)
	}
	client := hello.MustNewClient("Hello", client.WithResolver(r))
	for {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*3)
		resp, err := client.Echo(ctx, &api.Request{Message: "Hello"})
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

The configuration of Etcd client and server can be customized, refer to the configuration of [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3).

## Complete Example

For more, see [example](https://github.com/kitex-contrib/registry-etcd/tree/main/example) 。

