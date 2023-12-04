---
title: "nacos"
date: 2023-11-30
weight: 5
keywords: ["服务注册与发现", "nacos"]
description: "Kitex 提供的服务注册与发现 nacos 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-nacos
```

## 服务注册

### 创建 Registry

提供了两个创建 Registry 的函数

#### NewDefaultNacosRegistry

`NewDefaultNacosRegistry` 使用 nacos 创建一个新的服务注册中心，从环境变量中读取信息用于创建 Nacos Client。可自定义服务注册中心配置，配置详情见 Option。

| 环境变量名 | 环境变量默认值 | 描述                    |
| ---------- | -------------- | ----------------------- |
| serverAddr | 127.0.0.1      | nacos 服务器地址        |
| serverPort | 8848           | nacos 服务器端口        |
| namespace  |                | nacos 中的 namespace Id |

函数签名：

```go
func NewDefaultNacosRegistry(opts ...Option) (registry.Registry, error
```

示例代码：

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

`NewNacosRegistry` 使用 nacos 创建服务注册中心，需要传入自行配置的客户端。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewNacosRegistry(cli naming_client.INamingClient, opts ...Option) registry.Registry
```

示例代码：

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

Nacos 拓展在服务注册部分中提供了 option 配置。

#### WithCluster

Nacos 扩展提供了 `WithCluster` 用于帮助用户配置自定义的集群。默认为 “DEFAULT”。

函数签名：

```go
func WithCluster(cluster string) Option
```

#### WithGroup

Nacos 扩展提供了 `WithGroup` 用于帮助用户配置自定义的集群。默认为 “DEFAULT_GROUP” 。

函数签名：

```go
func WithGroup(group string) Option 
```

## 服务发现

### 创建 Resolver

提供了两个创建 Resolver 的函数

#### NewDefaultNacosResolver

`NewDefaultNacosResolver` 使用 nacos 创建一个新的服务发现中心，从环境变量中读取信息用于创建 Nacos Client。可自定义服务注册中心配置，配置详情见 Option。

| 环境变量名 | 环境变量默认值 | 描述                    |
| ---------- | -------------- | ----------------------- |
| serverAddr | 127.0.0.1      | nacos 服务器地址        |
| serverPort | 8848           | nacos 服务器端口        |
| namespace  |                | nacos 中的 namespace Id |

函数签名：

```go
func NewDefaultNacosResolver(opts ...Option) (discovery.Resolver, error)
```

示例代码：

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

`NewNacosResolver` 使用 nacos 创建服务发现中心，需要传入自行配置的客户端。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...Option) discovery.Resolver
```

示例代码：

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

Nacos 拓展在服务发现部分中提供了 option 配置。

#### WithCluster

Nacos 扩展提供了 `WithCluster` 用于帮助用户配置自定义的集群。默认为 “DEFAULT”。

函数签名：

```go
func WithCluster(cluster string) Option
```

#### WithGroup

Nacos 扩展提供了 `WithGroup` 用于帮助用户配置自定义的集群。默认为 “DEFAULT_GROUP” 。

函数签名：

```go
func WithGroup(group string) Option 
```

## 使用示例

### 服务端

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

### 客户端

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

## 配置

可自定义 Nacos 客户端以及服务端的配置，参考 [nacos-sdk-go](https://github.com/nacos-group/nacos-sdk-go) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/registry-nacos/tree/main/example)。
