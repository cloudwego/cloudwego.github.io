---
title: "polaris"
date: 2023-04-22
weight: 6
keywords: ["服务注册与发现", "polaris"]
description: "Hertz 提供的服务注册与发现 polaris 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/polaris
```

## 服务注册

### NewPolarisRegistry

`NewPolarisRegistry` 使用 polaris 创建一个新的服务注册中心，可传入配置文件并调用 `GetPolarisConfig`，若不传入则使用默认配置。

函数签名：

```go
func NewPolarisRegistry(configFile ...string) (Registry, error)
```

示例代码：

```go
func main() {
    r, err := polaris.NewPolarisRegistry(confPath)
    if err != nil {
        log.Fatal(err)
    }

    Info := &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", "127.0.0.1:8888"),
        Tags: map[string]string{
            "namespace": Namespace,
        },
    }
    h := server.Default(server.WithRegistry(r, Info), server.WithExitWaitTime(10*time.Second))
    // ...
}
```

## 服务发现

### NewPolarisResolver

`NewPolarisResolver` 使用 polaris 创建一个新的服务发现中心，可传入配置文件并调用 `GetPolarisConfig`，若不传入则使用默认配置。

函数签名：

```go
func NewPolarisResolver(configFile ...string) (Resolver, error)
```

示例代码：

```go
func main() {
    r, err := polaris.NewPolarisResolver(confPath)
    if err != nil {
        log.Fatal(err)
    }

    client, err := hclient.NewClient()
    client.Use(sd.Discovery(r))
    //...
}
```

## 使用示例

### 服务端

```go
import (
    "context"
    "log"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/polaris"
)

const (
    confPath  = "polaris.yaml"
    Namespace = "Polaris"
    // At present,polaris server tag is v1.4.0，can't support auto create namespace,
    // If you want to use a namespace other than default,Polaris ,before you register an instance,
    // you should create the namespace at polaris console first.
)

func main() {
    r, err := polaris.NewPolarisRegistry(confPath)

    if err != nil {
        log.Fatal(err)
    }

    Info := &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", "127.0.0.1:8888"),
        Tags: map[string]string{
            "namespace": Namespace,
        },
    }
    h := server.Default(server.WithRegistry(r, Info), server.WithExitWaitTime(10*time.Second))

    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "Hello,Hertz!")
    })

    h.Spin()
}
```

### 客户端

```go
import (
    "context"
    "log"

    hclient "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/polaris"
)

const (
    confPath  = "polaris.yaml"
    Namespace = "Polaris"
    // At present,polaris server tag is v1.4.0，can't support auto create namespace,
    // if you want to use a namespace other than default,Polaris ,before you register an instance,
    // you should create the namespace at polaris console first.
)

func main() {
    r, err := polaris.NewPolarisResolver(confPath)
    if err != nil {
        log.Fatal(err)
    }

    client, err := hclient.NewClient()
    client.Use(sd.Discovery(r))

    for i := 0; i < 10; i++ {
        // config.WithTag sets the namespace tag for service discovery
        status, body, err := client.Get(context.TODO(), nil, "http://hertz.test.demo/hello", config.WithSD(true), config.WithTag("namespace", Namespace))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s\n", status, body)
    }
}
```

## 配置

可自定义 polaris 客户端以及服务端的配置，参考 [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example) 。
