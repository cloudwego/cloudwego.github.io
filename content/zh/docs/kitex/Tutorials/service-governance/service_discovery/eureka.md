---
title: "eureka"
date: 2023-11-30
weight: 4
keywords: ["服务注册与发现", "eureka"]
description: "Kitex 提供的服务注册与发现 eureka 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-eureka
```

## 服务注册

### 创建 Registry

#### NewEurekaRegistry

`NewEurekaRegistry` 使用 eureka 创建一个新的服务注册中心，需要将服务 Url 通过一个字符串切片传入 `NewConn`，并同时传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) registry.Registry
```

示例代码：

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

## 服务发现

### 创建 Resolver

#### NewEurekaResolver

`NewEurekaResolver` 使用 eureka 创建一个新的服务发现中心，需要将服务 Url 通过一个字符串切片传入 `NewConn`。

函数签名：

```go
func NewEurekaResolver(servers []string) discovery.Resolver
```

示例代码：

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

## 使用示例

### 服务端

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

## 配置

本项目使用 [fargo](https://github.com/hudl/fargo) 作为 eureka 客户端。您应该参考 [fargo](https://github.com/hudl/fargo) 文档以了解高级配置。

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/registry-eureka/tree/main/example)。

