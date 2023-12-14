---
title: "polaris"
date: 2023-11-30
weight: 6
keywords: ["服务注册与发现", "polaris"]
description: "Kitex 提供的服务注册与发现 polaris 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/polaris
```

## 服务注册

### 创建 Registry

#### NewPolarisRegistry

`NewPolarisRegistry` 使用 polaris 创建一个新的服务注册中心，需要传入 ServerOptions。可传入配置文件并调用 `GetPolarisConfig`，若不传入则使用默认配置。

函数签名：

```go
func NewPolarisRegistry(so ServerOptions, configFile ...string) (Registry, error)
```

示例代码：

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

## 服务发现

### 创建 Resolver

#### NewPolarisResolver

`NewPolarisResolver` 使用 polaris 创建一个新的服务发现中心，需传入 ClientOptions。可传入配置文件并调用 `GetPolarisConfig`，若不传入则使用默认配置。

函数签名：

```go
func NewPolarisResolver(o ClientOptions, configFile ...string) (Resolver, error)
```

代码示例：

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

## 配置

可自定义 polaris 客户端以及服务端的配置，参考 [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/polaris/tree/main/example)。
