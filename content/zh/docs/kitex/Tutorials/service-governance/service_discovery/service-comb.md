---
title: "service-comb"
date: 2023-11-30
weight: 7
keywords: ["服务注册与发现", "service-comb"]
description: "Kitex 提供的服务注册与发现 service-comb 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-servicecomb
```

## 服务注册

### 创建 Registry

提供了两个创建 Registry 的函数

#### NewDefaultSCRegistry

`NewDefaultSCRegistry` 使用 service-comb 创建一个默认服务注册中心，需要传入端点值。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewDefaultSCRegistry(opts ...Option) (registry.Registry, error)
```

示例代码：

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

`NewSCRegistry` 使用 service-comb 创建一个新的服务注册中心。需要传入自定义客户端。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewSCRegistry(client *sc.Client, opts ...Option) registry.Registry
```

示例代码：

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

Servicecomb 拓展在服务注册部分中提供了 option 配置。

#### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId。默认为 “DEFAULT"。

函数签名：

```go
func WithAppId(appId string) RegistryOption
```

#### WithRegistryVersionRule

Servicecomb 扩展提供了 `WithRegistryVersionRule` 用于帮助用户配置 Servicecomb 的版本要求。默认为 1.0.0。

函数签名：

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

#### WithRegistryHostName

Servicecomb 扩展提供了 `WithRegistryHostName` 用于帮助用户配置 Servicecomb 的主机名。默认为 ”DEFAULT"。

函数签名：

```go
func WithRegistryHostName(hostName string) RegistryOption
```

#### WithRegistryHeartbeatInterval

Servicecomb 扩展提供了 `WithRegistryHeartbeatInterval` 用于帮助用户配置发送心跳包的间隔时长。默认为 5。

函数签名：

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

## 服务发现

### 创建 Resolver

提供了两个创建 Resolver 的函数。

#### NewDefaultSCResolver

`NewDefaultSCResolver` 使用 service-comb 创建一个默认服务发现中心，需要传入端点值。可自定义服务发现中心配置，配置详情见 Option。

函数签名：

```go
func NewDefaultSCResolver(opts ...Option) (discovery.Resolver, error)
```

示例代码：

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

`NewSCReslover` 使用 service-comb 创建一个新的服务发现中心。需要传入自定义客户端。可自定义服务发现中心配置，配置详情见 Option。

函数签名：

```go
func NewSCResolver(cli *sc.Client, opts ...Option) discovery.Resolver
```

示例代码：

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

Servicecomb 拓展在服务发现部分中提供了 option 配置。

#### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId。默认为 “DEFAULT"。

函数签名：

```go
func WithResolverAppId(appId string) ResolverOption
```

#### WithResolverVersionRule

Servicecomb 扩展提供了 `WithResolverVersionRule` 用于帮助用户配置 Servicecomb 的版本要求。默认为 ”latest“。

函数签名：

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

#### WithResolverConsumerId

Servicecomb 扩展提供了 `WithResolverConsumerId` 用于帮助用户配置 Servicecomb 的 ConsumerId。默认为空。

函数签名：

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

## 使用示例

### 服务端

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

### 客户端

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

## 配置

可自定义 Servicecomb 客户端以及服务端的配置，参考 [go-chassis/sc-client](https://github.com/go-chassis/sc-client) 配置

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/registry-servicecomb/tree/main/example)。

