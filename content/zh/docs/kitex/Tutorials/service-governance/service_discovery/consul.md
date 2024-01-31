---
title: "consul"
date: 2023-11-30
weight: 3
keywords: ["服务注册与发现", "consul"]
description: "Kitex 提供的服务注册与发现 consul 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-consul
```

## 服务注册

### 创建 Registry

提供了两个创建 Registry 的函数

#### NewConsulRegister

`NewConsulRegister` 使用 consul 创建一个新的服务注册中心，需要传入地址。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewConsulRegister(address string, opts ...Option) (registry.Registry, error)
```

示例代码：

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

`NewConsulRegisterWithConfig` 使用 consul 创建一个可配置客户端的服务注册中心，需要传入客户端，客户端需用户自行使用 consul 官方 Go 客户端创建。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewConsulRegisterWithConfig(config *api.Config, opts ...Option) (*consulRegistry, error)
```

示例代码：

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

Consul 拓展在服务注册部分中提供了 option 配置。

#### WithCheck

Consul 扩展提供了 `WithCheck` 用于帮助用户配置 Consul 中的 `AgentServiceCheck` 选项。若不使用，则默认设置 `check.Timeout` 为 5 秒，`check.Internal` 为 5 秒，`check.DeregisterCriticalServiceAfter` 为 1 分钟。

函数签名：

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

示例代码：

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

## 服务发现

### 创建 Resolver

提供了两个创建 Resolver 的函数。

#### NewConsulResolver

`NewConsulResolver` 使用 consul 创建一个新的服务发现中心，需要传入地址。

函数签名：

```go
func NewConsulResolver(address string) (discovery.Resolver, error)
```

示例代码：

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

`NewConsulResolverWithConfig` 使用 consul 创建一个新的服务发现中心，需要传入客户端，客户端需用户自行使用 consul 官方 Go 客户端创建。

函数签名：

```go
func NewConsulResolver(consulClient *api.Client) discovery.Resolver
```

示例代码：

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

## 使用示例

### 服务端

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

### 客户端

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

## 配置

可自定义 Consul 客户端以及服务端的配置，参考 [consul](https://github.com/hashicorp/consul) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/registry-consul/tree/main/example) 。

