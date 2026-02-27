---
title: "zookeeper"
date: 2023-04-22
weight: 8
keywords: ["服务注册与发现", "zookeeper"]
description: "Hertz 提供的服务注册与发现 zookeeper 拓展。"
---

## 安装

```go
go get github.com/hertz-contrib/registry/zookeeper
```

## 服务注册

### NewZookeeperRegistry

`NewZookeeperRegistry` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。

函数签名：

```go
func NewZookeeperRegistry(servers []string, sessionTimeout time.Duration) (registry.Registry, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := zookeeper.NewZookeeperRegistry([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

### NewZookeeperRegistryWithAuth

`NewZookeeperRegistryWithAuth` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。除此之外还需要传入用户与密码来调用 `AddAuth`，用户与密码不能为空。

函数签名：

```go
func NewZookeeperRegistryWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

示例代码：

```go
func main() {
    // ...
    r, err := zookeeper.NewZookeeperRegistryWithAuth([]string{"127.0.0.1:2181"}, 20*time.Second, "hertzuser", "hertzpass")
    if err != nil {
        panic(err)
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    // ...
}
```

## 服务发现

### NewZookeeperResolver

`NewZookeeperResolver` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。

函数签名：

```go
func NewZookeeperResolver(servers []string, sessionTimeout time.Duration) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolver([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewZookeeperResolverWithAuth

`NewZookeeperResolverWithAuth` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect`。除此之外还需要传入用户与密码来调用 `AddAuth`，用户与密码不能为空。

函数签名：

```go
func NewZookeeperResolverWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolverWithAuth([]string{"127.0.0.1:2181"}, 40*time.Second, "hertzuser", "hertzpass")
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

## 使用示例

### 服务端

```go
import (
    "context"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/zookeeper"
)

func main() {
    addr := "127.0.0.1:8888"
    r, err := zookeeper.NewZookeeperRegistry([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

### 客户端

```go
import (
    "context"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/zookeeper"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := zookeeper.NewZookeeperResolver([]string{"127.0.0.1:2181"}, 40*time.Second)
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

## 配置

可自定义 zookeeper 客户端以及服务端的配置，参考 [go-zookeeper/zk](https://github.com/go-zookeeper/zk) 配置。

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example) 。
