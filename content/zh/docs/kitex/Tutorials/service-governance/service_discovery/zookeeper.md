---
title: "zookeeper"
date: 2023-11-30
weight: 8
keywords: ["服务注册与发现", "zookeeper"]
description: "Kitex 提供的服务注册与发现 zookeeper 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-zookeeper
```

## 服务注册

### 创建 Registry

提供了两个创建 Registry 的函数

#### NewZookeeperRegistry

`NewZookeeperRegistry` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。

函数签名：

```go
func NewZookeeperRegistry(servers []string, sessionTimeout time.Duration) (registry.Registry, error)
```

示例代码：

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

`NewZookeeperRegistryWithAuth` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。除此之外还需要传入用户与密码来调用 `AddAuth`，用户与密码不能为空。

函数签名：

```go
func NewZookeeperRegistryWithAuth(servers []string, sessionTimeout time.Duration, user, password string) (registry.Registry, error)
```

示例代码：

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

## 服务发现

### 创建 Resolver

#### NewZookeeperResolver

`NewZookeeperResolver` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。

函数签名：

```go
func NewZookeeperResolver(servers []string, sessionTimeout time.Duration) (discovery.Resolver, error)
```

示例代码：

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

`NewZookeeperResolverWithAuth` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。除此之外还需要传入用户与密码来调用 `AddAuth`，用户与密码不能为空。

函数签名：

```go
func NewZookeeperResolverWithAuth(servers []string, sessionTimeout time.Duration, user, password string) (discovery.Resolver, error)
```

示例代码：

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

## 配置

可自定义 zookeeper 客户端以及服务端的配置，参考 [go-zookeeper/zk](https://github.com/go-zookeeper/zk) 配置。

## 完整示例

完整示例见 [discovery_test.go](https://github.com/kitex-contrib/registry-zookeeper/blob/main/discovery_test.go)。

