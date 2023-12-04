---
title: "zookeeper"
date: 2023-11-30
weight: 8
keywords: ["Service Discovery", "zookeeper"]
description: "Service Registration and Discovery zookeeper Extensions provided by Kitex."
---

## Install

```go
go get github.com/kitex-contrib/registry-zookeeper
```

## Service Registry

### Create Registry

#### NewZookeeperRegistry

`NewZookeeperRegistry` uses zookeeper to create a service registry. You need to pass the service to `Connect` through a string slice together with the session timeout.

Function signature:

```go
func NewZookeeperRegistry(servers []string, sessionTimeout time.Duration) (registry.Registry, error)
```

Example:

```go
import (
    ...
	zkregistry "github.com/kitex-contrib/registry-zookeeper/registry"
	"github.com/cloudwego/kitex/server"
    ...
)

func main() {
    ...
    r, err := zkregistry.NewZookeeperRegistry([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil{
        panic(err)
    }
    svr := echo.NewServer(new(EchoImpl), server.WithRegistry(r))
    if err := svr.Run(); err != nil {
    log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
    ...
}
```

#### NewZookeeperRegistryWithAuth

`NewZookeeperRegistryWithAuth` uses zookeeper to create a service registry. You need to pass the service into `Connect` through a string slice and session timeout time. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperRegistryWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

```go
import (
    ...
	zkregistry "github.com/kitex-contrib/registry-zookeeper/registry"
	"github.com/cloudwego/kitex/server"
    ...
)

func main() {
    ...
    // creates a zk based registry with given username and password.
    r, err := zkregistry.NewZookeeperRegistryWithAuth([]string{"127.0.0.1:2181"}, 40*time.Second, "username", "password")
    if err != nil{
        panic(err)
    }
    svr := echo.NewServer(new(EchoImpl), server.WithRegistry(r))
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

#### NewZookeeperResolver

`NewZookeeperResolver` uses zookeeper to create a service discovery center, which needs to pass a string slice and session timeout to `Connect`.

Function signature:

```go
func NewZookeeperResolver(servers []string, sessionTimeout time.Duration) (discovery.Resolver, error)
```

Example:

```go
import (
    ...
    "github.com/kitex-contrib/registry-zookeeper/resolver"
    "github.com/cloudwego/kitex/client"
    ...
)

func main() {
    ...
    r, err := resolver.NewZookeeperResolver([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    client, err := echo.NewClient("echo", client.WithResolver(r))
	if err != nil {
		log.Fatal(err)
	}
    ...
}
```

#### NewZookeeperResolverWithAuth

`NewZookeeperResolverWithAuth` uses zookeeper to create a service discovery center. You need to pass the service into `Connect` through a string slice and session timeout. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperResolverWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

```go
import (
    ...
    "github.com/kitex-contrib/registry-zookeeper/resolver"
    "github.com/cloudwego/kitex/client"
    ...
)

func main() {
    ...
	// creates a zk based resolver with given username and password.
    r, err := resolver.NewZookeeperResolverWithAuth([]string{"127.0.0.1:2181"}, 40*time.Second, "username", "password")
    if err != nil {
        panic(err)
    }
    client, err := echo.NewClient("echo", client.WithResolver(r))
	if err != nil {
		log.Fatal(err)
	}
    ...
}
```

## Configuration

The configuration of Zookeeper client and server can be customized, refer to the configuration of [go-zookeeper/zk](https://github.com/go-zookeeper/zk).

## Complete Example

For more, see [discovery_test.go](https://github.com/kitex-contrib/registry-zookeeper/blob/main/discovery_test.go).
