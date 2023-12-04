---
title: "etcd"
date: 2023-11-30
weight: 2
keywords: ["服务注册与发现", "etcd"]
description: "Kitex 提供的服务注册与发现 etcd 拓展。"
---

## 安装

```go
go get github.com/kitex-contrib/registry-etcd
```

## 服务注册

### 创建 Registry

提供了三个创建 Registry 的函数

#### NewEtcdRegistry

`NewEtcdRegistry` 使用 etcd 创建一个新的服务注册中心，需要传入端点值。可自定义服务注册中心配置，配置详情见 Option。

函数签名：

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

示例代码：

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

`NewEtcdRegistryWithAuth` 创建服务注册中心需要传入 auth 参数。

函数签名：

```go
func NewEtcdRegistryWithAuth(endpoints []string, username, password string) (registry.Registry, error)
```

代码示例：

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

`NewEtcdRegistryWithRetry` 创建服务注册中心传入自定义 Retry 配置。

函数签名：

```go
func NewEtcdRegistryWithRetry(endpoints []string, retryConfig *retry.Config, opts ...Option) (registry.Registry, error)
```

使用 `NewRetryConfig(opts ...Option) *Config` 生成 Retry 配置，配置详情见 Option。

代码示例：

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

Etcd 拓展在服务注册部分中提供了 option 配置。

#### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置 Etcd 中的 `TLS` 选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

#### WithAuthOpt

Etcd 扩展提供了 `WithAuthOpt` 用于帮助用户配置 Etcd 中的 `Username` 和 `Password` 选项。

函数签名：

```go
func WithAuthOpt(username, password string) Option
```

#### WithDialTimeoutOpt

Etcd 扩展提供了 `WithTimeoutOpt` 用于帮助用户配置连接超时时间。

```go
func WithDialTimeoutOpt(dialTimeout time.Duration) Option
```

#### Retry

在服务注册到 etcd 之后，它会定期检查服务的状态。如果发现任何异常状态，它将尝试重新注册服务。observeDelay 是正常情况下检查服务状态的延迟时间，而 retryDelay 是断开连接后尝试注册服务的延迟时间。

**默认配置**

| 配置名                                                | 默认值           | 描述                                           |
| ----------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `WithMaxAttemptTimes(maxAttemptTimes uint) Option`    | 5                | 用于设置最大尝试次数，如果为 0，则表示无限尝试 |
| `WithObserveDelay(observeDelay time.Duration) Option` | 30 * time.Second | 用于设置正常连接条件下检查服务状态的延迟时间   |
| `WithRetryDelay(t time.Duration) Option`              | 10 * time.Second | 用于设置断开连接后重试的延迟时间               |

## 服务发现

### 创建 Resolver

提供了两个创建 Resolver 的函数。

#### NewEtcdResolver

`NewEtcdResolver` 使用 etcd 创建一个新的服务发现中心，需要传入端点值。可自定义服务发现中心配置，配置详情见 Option。

函数签名：

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

示例代码：

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

`NewEtcdResolverWithAuth` 服务发现中心，需要传入 Auth 参数。

函数签名：

```go
func NewEtcdResolverWithAuth(endpoints []string, username, password string) (discovery.Resolver, error)
```

示例代码：

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

Etcd 拓展在服务发现部分中提供了 option 配置。

#### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置 Etcd 中的`TLS`选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

#### WithAuthOpt

Etcd 扩展提供了`WithAuthOpt`用于帮助用户配置 Etcd 中的`Username`和`Password`选项。

函数签名：

```go
func WithAuthOpt(username, password string) Option
```

#### WithDialTimeoutOpt

Etcd 扩展提供了`WithTimeoutOpt`用于帮助用户配置连接超时时间。

```go
func WithDialTimeoutOpt(dialTimeout time.Duration) Option
```

## 使用示例

### 服务端

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

## 配置

可自定义 Etcd 客户端以及服务端的配置，参考 [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/kitex-contrib/registry-etcd/tree/main/example) 。

