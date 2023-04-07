---
title: "服务注册与发现"
date: 2022-08-14
weight: 1
description: >
---

目前在 Hertz 的开源版本支持的服务发现拓展都存放在 [registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

到现在为止，支持的服务发现拓展有

- [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos)
- [consul](https://github.com/hertz-contrib/registry/tree/main/consul)
- [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd)
- [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
- [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris)
- [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb)
- [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)
- [redis](https://github.com/hertz-contrib/registry/tree/main/redis)

## 配置

使用服务发现时会提供一些可选配置给用户。

| 配置                   | 描述                                       |
| ---------------------- | ------------------------------------------ |
| WithSD                 | 设置 isSD 为 true ，**使用服务发现必选**。 |
| WithTag                | 为 requestOptions 设置 tag 。              |
| WithCustomizedAddrs    | 自定义目标实例地址。                       |
| WithLoadBalanceOptions | 配置负载均衡选项。                         |

### WithSD

`requestOptions` 提供 `WithSD` 配置项，传入参数为 true 时将会设置 `isSD` 为 true。使用服务发现请求时必须使用 `WithSD` 配置项。

示例代码：
```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
```

### WithTag

`requestOptions` 提供 `WithTag` 配置项，使用此配置会为 `requestOptions` 设置 tag。

示例代码：
```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithTag("foo", "var"))
```

### WithCustomizedAddrs

此配置项指定服务发现时的目标实例地址。它将会覆盖来自 `Resolver` 的结果。`Resolver` 是服务发现中心，用于服务发现。

示例代码：
```go
cli.Use(sd.Discovery(r, sd.WithCustomizedAddrs("127.0.0.1:8088")))
```

### WithLoadBalanceOptions

此配置项可为客户端配置负载均衡算法和负载均衡参数。

示例代码：
```go
cli.Use(sd.Discovery(r, sd.WithLoadBalanceOptions(loadbalance.NewWeightedBalancer(), loadbalance.Options{
    RefreshInterval: 5 * time.Second, 
    ExpireInterval:  15 * time.Second,
})))
```

## Nacos

### 安装

```go
go get github.com/hertz-contrib/registry/nacos
```

### 服务注册

#### Option

Nacos 拓展在服务注册部分中提供了 option 配置。

##### WithRegistryCluster

Nacos 扩展提供了 `WithRegistryCluster` 用于帮助用户配置自定义的集群。默认为 “DEFAULT” 。

函数签名：

```go
func WithRegistryCluster(cluster string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry(
        nacos.WithRegistryCluster("Cluster123"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithRegistryGroup

Nacos 扩展提供了 `WithRegistryGroup` 用于帮助用户配置自定义的集群。默认为 "DEFAULT_GROUP" 。

函数签名：

```go
func WithRegistryGroup(group string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry(
        nacos.WithRegistryGroup("Group1"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewDefaultNacosRegistry

`NewDefaultNacosRegistry` 使用 nacos 创建一个默认的服务注册中心。会调用 `NewDefaultNacosConfig` 使用默认的客户端，默认设置 RegionID 为 `cn-hangzhou`、地址为 `127.0.0.1`、端口号为`8848`，且不会在开始时加载缓存。可自定义服务注册中心配置。

函数签名：

```go
func NewDefaultNacosRegistry(opts ...RegistryOption) (registry.Registry, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := nacos.NewDefaultNacosRegistry()
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewNacosRegistry

`NewNacosRegistry`使用 nacos 创建一个可配置客户端的服务注册中心，需要传入自行配置的客户端。可自定义服务注册中心配置。

函数签名：

```go
func NewNacosRegistry(client naming_client.INamingClient, opts ...RegistryOption) registry.Registry
```

示例代码：

```go
func main() {
    // ...
    cli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        },
    )
    // ...
    r := nacos.NewNacosRegistry(cli)
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

### 服务发现

#### Option

Nacos 拓展在服务发现部分中提供了 option 配置。

##### WithRegistryCluster

Nacos 扩展提供了 `WithRegistryCluster` 用于帮助用户配置自定义的集群。默认为 “DEFAULT” 。

函数签名：

```go
func WithRegistryCluster(cluster string) RegistryOption
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithRegistryCluster("Cluster123"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

##### WithRegistryGroup

Nacos 扩展提供了 `WithRegistryGroup` 用于帮助用户配置自定义的集群。默认为 "DEFAULT_GROUP" 。

函数签名：

```go
func WithRegistryGroup(group string) RegistryOption
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver(
    nacos.WithRegistryGroup("Group1"),
    )
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

#### NewDefaultNacosResolver

`NewDefaultNacosResolver` 使用 nacos 创建一个默认的服务发现中心。会调用 `NewDefaultNacosConfig` 使用默认的客户端，默认设置 RegionID 为 `cn-hangzhou`、地址为 `127.0.0.1`、端口号为`8848`，且不会在开始时加载缓存。可自定义服务注册中心配置。

函数签名：

```go
func NewDefaultNacosResolver(opts ...ResolverOption) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver()
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    // ...
}
```

#### NewNacosResolver

`NewNacosResolver` 使用 nacos 创建一个可配置客户端的服务发现中心，需要传入自行配置的客户端。可自定义服务发现中心配置。

函数签名：

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...ResolverOption) discovery.Resolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    // ...
    nacosCli, err := clients.NewNamingClient(
        vo.NacosClientParam{
            ClientConfig:  &cc,
            ServerConfigs: sc,
        })
    if err != nil {
        panic(err)
    }
    r := nacos.NewNacosResolver(nacosCli)
    cli.Use(sd.Discovery(r))
    // ...
}
```

### 使用示例

#### 服务端

- 使用 `server.WithRegistry` 设置注册扩展以及注册信息。

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/nacos"
)

func main() {
    addr := "127.0.0.1:8888"
    r, err := nacos.NewDefaultNacosRegistry()
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    h.Spin()
}
```

#### 客户端

- 使用内置的 `sd.Discovery` 中间件，支持传入自定义的服务发现扩展以及负载均衡扩展。
- 使用服务发现时需要将 Host 替换为服务名，并使用 `config.WithSD` 确定本次请求使用服务注册。

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/nacos"
)

func main() {
    client, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := nacos.NewDefaultNacosResolver()
    if err != nil {
        log.Fatal(err)
        return
    }
    client.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := client.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s\n", status, string(body))
    }
}
```

### 配置

可自定义 Nacos 客户端以及服务端的配置，参考 [nacos-sdk-go](https://github.com/nacos-group/nacos-sdk-go) 配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples) 。

## Consul

### 安装

```go
go get github.com/hertz-contrib/registry/consul
```

### 服务注册

#### Option

Consul 拓展在服务注册部分中提供了 option 配置。

##### WithRegistryGroup

Consul 扩展提供了 `WithCheck` 用于帮助用户配置 Consul 中的 `AgentServiceCheck` 选项。默认调用 `defaultCheck()` 。

函数签名：

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(config)
    // ...
    check := &consulapi.AgentServiceCheck{
        // ...
    }
    r := consul.NewConsulRegister(consulClient, consul.WithCheck(check))
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewConsulRegister

`NewConsulRegister` 使用 consul 创建一个新的服务注册中心，需要传入客户端，其中客户端使用 `NewClient` 创建。可自定义服务注册中心配置，若不传入配置则设置 `check.Timeout` 为5秒，`check.Internal` 为5秒，`check.DeregisterCriticalServiceAfter` 为 1分钟。

函数签名：

```go
func NewConsulRegister(consulClient *api.Client, opts ...Option) registry.Registry
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(config)
    // ...
    r := consul.NewConsulRegister(consulClient)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### 服务发现

#### Option

Consul 拓展在服务发现部分中提供了 option 配置。

##### WithRegistryGroup

Consul 扩展提供了 `WithCheck` 用于帮助用户配置 Consul 中的 `AgentServiceCheck` 选项。默认调用 `defaultCheck()` 。

函数签名：

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(consulConfig)
    if err != nil {
        log.Fatal(err)
        return
    }
    check := &consulapi.AgentServiceCheck{
        // ...
    }
    r := consul.NewConsulResolver(consulClient, consul.WithCheck(check))

    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
}
```

#### NewConsulResolver

`NewConsulResolver` 使用 consul 创建一个新的服务发现中心，需要传入客户端，其中客户端使用 `NewClient` 创建。可自定义服务发现中心配置。

函数签名：

```go
func NewConsulResolver(consulClient *api.Client, opts ...Option) discovery.Resolver
```

示例代码：

```go
func main() {
    // ...
    consulClient, err := consulapi.NewClient(consulConfig)
    if err != nil {
        log.Fatal(err)
        return
    }
    r := consul.NewConsulResolver(consulClient)

    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
}
```

### 使用示例

#### 服务端

```go
import (
    "context"
    "log"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    consulapi "github.com/hashicorp/consul/api"
    "github.com/hertz-contrib/registry/consul"
)


func main() {
    // build a consul client
    config := consulapi.DefaultConfig()
    config.Address = "127.0.0.1:8500"
    consulClient, err := consulapi.NewClient(config)
    if err != nil {
        log.Fatal(err)
        return
    }
    // build a consul register with the consul client
    r := consul.NewConsulRegister(consulClient)

    // run Hertz with the consul register
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong1"})
    })
    h.Spin()
}
```

#### 客户端

```go
import (
    "log"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    consulapi "github.com/hashicorp/consul/api"
    "github.com/hertz-contrib/registry/consul"
)

func main() {
    // build a consul client
    consulConfig := consulapi.DefaultConfig()
    consulConfig.Address = "127.0.0.1:8500"
    consulClient, err := consulapi.NewClient(consulConfig)
    if err != nil {
        log.Fatal(err)
        return
    }
    // build a consul resolver with the consul client
    r := consul.NewConsulResolver(consulClient)

    // build a hertz client with the consul resolver
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
}
```

### 配置

可自定义 Nacos 客户端以及服务端的配置，参考 [consul](https://github.com/hashicorp/consul) 配置。

### 完整实例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/consul/example) 。

## Etcd

### 安装

```go
go get github.com/hertz-contrib/registry/etcd
```

### 服务注册

#### Option

Etcd 拓展在服务注册部分中提供了 option 配置。

##### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置一个通过 tls/ssl 进行身份验证的选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    // ...
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

#### NewEtcdRegistry

`NewEtcdRegistry` 使用 etcd 创建一个新的服务注册中心，需要传入端点值。可自定义客户端配置并传入 `New` 创建一个新的客户端。可自定义服务注册中心配置。

函数签名：

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

示例代码：

```go
func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    // ...
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

### 服务发现

#### Option

Etcd 拓展在服务发现部分中提供了 option 配置。

##### WithTLSOpt

Etcd 扩展提供了 `WithTLSOpt` 用于帮助用户配置一个通过 tls/ssl 进行身份验证的选项。

函数签名：

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"},
        etcd.WithTLSOpt(certFile, keyFile, caFile),
    )
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewEtcdResolver

`NewEtcdResolver` 使用 etcd 创建一个新的服务发现中心，需要传入端点值。可自定义客户端配置并传入 `New` 创建一个新的客户端。可自定义服务发现中心配置。

函数签名：

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### 使用示例

#### 服务端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    r, err := etcd.NewEtcdRegistry([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

#### 客户端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/etcd"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r, err := etcd.NewEtcdResolver([]string{"127.0.0.1:2379"})
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("HERTZ: code=%d,body=%s", status, string(body))
    }
}
```

### 配置

可自定义 Etcd 客户端以及服务端的配置，参考 [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3) 配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example) 。

## Eureka

### 安装

```go
go get github.com/hertz-contrib/eureka
```

### 服务注册

#### NewEurekaRegistry

`NewEurekaRegistry` 使用 eureka 创建一个新的服务注册中心，需要将服务 Url 通过一个字符串切片传入 `NewConn` ，并同时传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    r := eureka.NewEurekaRegistry([]string{"http://127.0.0.1:8761/eureka"}, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

#### NewEurekaRegistryFromConfig

`NewEurekaRegistryFromConfig` 使用 eureka 创建一个新的服务注册中心，需要传入配置并调用 `NewConnFromConfig` ，也需要传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistryFromConfig(config fargo.Config, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    config := fargo.Config{
    // ...
    }
    r := eureka.NewEurekaRegistryFromConfig(config, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

#### NewEurekaRegistryFromConn

`NewEurekaRegistryFromConn` 使用 eureka 创建一个新的服务注册中心，需要直接传入 conn ，也需要传入心跳间隔时长。

函数签名：

```go
func NewEurekaRegistryFromConn(conn fargo.EurekaConnection, heatBeatInterval time.Duration) *eurekaRegistry
```

示例代码：

```go
func main() {
    // ...
    conn := fargo.EurekaConnection{
    // ...
    }
    r := eureka.NewEurekaRegistryFromConn(conn, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    //...
}
```

### 服务发现

#### NewEurekaResolver

`NewEurekaResolver` 使用 eureka 创建一个新的服务发现中心，需要将服务 Url 通过一个字符串切片传入 `NewConn` 。

函数签名：

```go
func NewEurekaResolver(servers []string) *eurekaResolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolver([]string{"http://127.0.0.1:8761/eureka"})

    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewEurekaResolverFromConfig

`NewEurekaResolverFromConfig` 使用 eureka 创建一个新的服务发现中心，需要传入配置并调用 `NewConnFromConfig` 。

函数签名：

```go
func NewEurekaResolverFromConfig(config fargo.Config) *eurekaResolver
```

示例代码：

```go
func main() {
    // ...
    config := fargo.Config{
    // ...
    }
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolverFromConfig(config)

    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewEurekaResolverFromConn

`NewEurekaResolverFromConn` 使用 eureka 创建一个新的服务发现中心，需要直接传入 conn 。

函数签名：

```go
func NewEurekaResolverFromConn(conn fargo.EurekaConnection) *eurekaResolver
```

示例代码：

```go
func main() {
    // ...
    conn := fargo.EurekaConnection{
    // ...
    }
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolverFromConn(conn)

    cli.Use(sd.Discovery(r))
    // ...
}
```

### 使用示例

#### 服务端

```go
import (
    "context"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/eureka"
)

func main() {
    addr := "127.0.0.1:8888"
    r := eureka.NewEurekaRegistry([]string{"http://127.0.0.1:8761/eureka"}, 40*time.Second)
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.discovery.eureka",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }))
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

#### 客户端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/eureka"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        hlog.Fatal(err)
        return
    }
    r := eureka.NewEurekaResolver([]string{"http://127.0.0.1:8761/eureka"})

    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.discovery.eureka/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

### 配置

本项目使用 [fargo](https://github.com/hudl/fargo) 作为 eureka 客户端。 您应该参考 [fargo](https://github.com/hudl/fargo) 文档以了解高级配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example) 。

## Polaris

### 安装

```go
go get github.com/hertz-contrib/registry/polaris
```

### 服务注册

#### NewPolarisRegistry

`NewPolarisRegistry` 使用 polaris 创建一个新的服务注册中心，可传入配置文件并调用 `GetPolarisConfig` ，若不传入则使用默认配置。

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

### 服务发现

#### NewPolarisResolver

`NewPolarisResolver` 使用 polaris 创建一个新的服务发现中心，可传入配置文件并调用 `GetPolarisConfig` ，若不传入则使用默认配置。

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

### 使用示例

#### 服务端

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

#### 客户端

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

### 配置

可自定义 polaris 客户端以及服务端的配置，参考 [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme) 配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example) 。

## Servicecomb

### 安装

```go
go get github.com/hertz-contrib/registry/servicecomb
```

### 服务注册

#### Option

Servicecomb 拓展在服务注册部分中提供了 option 配置。

##### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId 。默认为 “DEFAULT" 。

函数签名：

```go
func WithAppId(appId string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithAppId("appID"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithRegistryVersionRule

Servicecomb 扩展提供了 `WithRegistryVersionRule` 用于帮助用户配置 Servicecomb 的版本要求 。默认为 1.0.0 。

函数签名：

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryVersionRule("1.1.0"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithRegistryHostName

Servicecomb 扩展提供了 `WithRegistryHostName` 用于帮助用户配置 Servicecomb 的主机名 。默认为 ”DEFAULT" 。

函数签名：

```go
func WithRegistryHostName(hostName string) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryHostName("hostName"),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithRegistryHeartbeatInterval

Servicecomb 扩展提供了 `WithRegistryHeartbeatInterval` 用于帮助用户配置发送心跳包的间隔时长 。默认为5。

函数签名：

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithRegistryHeartbeatInterval(10),
        )
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewDefaultSCRegistry

`NewDefaultSCRegistry` 使用 service-comb 创建一个默认服务注册中心，需要传入端点值。可自定义服务注册中心配置。

函数签名：

```go
func NewDefaultSCRegistry(endPoints []string, opts ...RegistryOption) (registry.Registry, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr})
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewSCRegistry

`NewSCRegistry` 使用 service-comb 创建一个新的服务注册中心。需要传入自定义客户端。可自定义服务注册中心配置。

函数签名：

```go
func NewSCRegistry(client *sc.Client, opts ...RegistryOption) registry.Registry
```

示例代码：

```go
func main() {
    client := &sc.Client{
        // ...
    }
    // ...
    r, err := servicecomb.NewSCRegistry(config)
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### 服务发现

#### Option

Servicecomb 拓展在服务发现部分中提供了 option 配置。

##### WithAppId

Servicecomb 扩展提供了 `WithAppId` 用于帮助用户配置 Servicecomb 的 AppId 。默认为 “DEFAULT" 。

函数签名：

```go
func WithResolverAppId(appId string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithAppId("appID"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithResolverVersionRule

Servicecomb 扩展提供了 `WithResolverVersionRule` 用于帮助用户配置 Servicecomb 的版本要求 。默认为 latest 。

函数签名：

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithResolverVersionRule("1.0.0"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
		panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithResolverConsumerId

Servicecomb 扩展提供了 `WithResolverConsumerId` 用于帮助用户配置 Servicecomb 的 ConsumerId 。默认为空 。

函数签名：

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr},
        servicecomb.WithResolverConsumerId("1"),
        )
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewDefaultSCResolver

`NewDefaultSCResolver` 使用 service-comb 创建一个默认服务发现中心，需要传入端点值。可自定义服务发现中心配置。

函数签名：

```go
func NewDefaultSCResolver(endPoints []string, opts ...ResolverOption) (discovery.Resolver, error)
```

示例代码：

```go
func main() {
    // ...
    r, err := servicecomb.NewDefaultSCResolver([]string{scAddr})
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewSCResolver

`NewSCReslover` 使用 service-comb 创建一个新的服务发现中心。需要传入自定义客户端。可自定义服务发现中心配置。

函数签名：

```go
func NewSCResolver(cli *sc.Client, opts ...ResolverOption) discovery.Resolver
```

示例代码：

```go
func main() {
    client := &sc.Client{
        // ...
    }
    // ...
    r, err := servicecomb.NewSCResolver(client)
    if err != nil {
        panic(err)
    }
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    // ...
}
```

### 使用示例

#### 服务端

```go
import (
    "context"
    "log"
    "sync"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/app/server/registry"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/registry/servicecomb"
)

func main() {
    const scAddr = "127.0.0.1:30100"
    const addr = "127.0.0.1:8701"
    r, err := servicecomb.NewDefaultSCRegistry([]string{scAddr})
    if err != nil {
        log.Fatal(err)
        return
    }
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.servicecomb.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )

    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong1"})
    })
    h.Spin()
}
```

#### 客户端

```go
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/hertz-contrib/registry/servicecomb"
)

func main() {
    const scAddr = "127.0.0.1:30100"
    // build a servicecomb resolver
    r, err := servicecomb.NewDefaultSCResolver([]string{scAddr})
    if err != nil {
        panic(err)
    }
    // build a hertz client with the servicecomb resolver
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.servicecomb.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}
```

### 配置

可自定义 Servicecomb 客户端以及服务端的配置，参考 [go-chassis/sc-client](https://github.com/go-chassis/sc-client) 配置

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example) 。

## Zookeeper

### 安装

```go
go get github.com/hertz-contrib/registry/zookeeper
```

### 服务注册

#### NewZookeeperRegistry

`NewZookeeperRegistry` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect` 。

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

#### NewZookeeperRegistryWithAuth

`NewZookeeperRegistryWithAuth` 使用 zookeeper 创建一个服务注册中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect` 。除此之外还需要传入用户与密码来调用 `AddAuth` ，用户与密码不能为空。

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

### 服务发现

#### NewZookeeperResolver

`NewZookeeperResolver` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect` 。

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

#### NewZookeeperResolverWithAuth

`NewZookeeperResolverWithAuth` 使用 zookeeper 创建一个服务发现中心，需要将服务通过一个字符串切片与会话超时时间共同传入 `Connect` 。除此之外还需要传入用户与密码来调用 `AddAuth` ，用户与密码不能为空。

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

### 使用示例

#### 服务端

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
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong2"})
    })
    h.Spin()
}
```

#### 客户端

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

### 配置

可自定义 zookeeper 客户端以及服务端的配置，参考 [go-zookeeper/zk](https://github.com/go-zookeeper/zk) 配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example) 。

## Redis

### 安装

```go
go get github.com/hertz-contrib/registry/redis
```

### 服务注册

#### Option

Redis 拓展在服务注册部分中提供了 option 配置。

##### WithPassword

Redis 扩展提供了 `WithPassword` 配置 redis 的密码，此密码必须匹配服务器配置选项中指定的密码。

函数签名：

```go
func WithPassword(password string) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithPassword("123456"))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
      ServiceName: "hertz.test.demo",
      Addr:        utils.NewNetAddr("tcp", addr),
      Weight:      10,
      Tags:        nil,
    }),
    )
    // ...
}
```

##### WithDB

Redis 扩展提供了 `WithDB` 配置连接到服务器后要选择的数据库。

函数签名：

```go
func WithDB(db int) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDB(1))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithTLSConfig

Redis 扩展提供了 `WithTLSConfig` 配置 TLS 的配置项。

函数签名：

```go
func WithTLSConfig(t *tls.Config) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithDialer

Redis 扩展提供了 `WithDialer` 配置 Dialer，Dialer 将会创建新的网络连接并优先于 Network 和 Addr 选项。

函数签名：

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithReadTimeout

Redis 扩展提供了 `WithReadTimeout` 配置读取 socket 超时的时间，默认为 3 秒。

函数签名：

```go
func WithReadTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

##### WithWriteTimeout

Redis 扩展提供了 `WithWriteTimeout` 配置写入 socket 超时的时间，默认等同于 `ReadTimeout` 。

函数签名：

```go
func WithWriteTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### NewRedisRegistry

`NewRedisRegistry` 使用 redis 创建一个新的服务注册中心，需要传入目标地址。可自定义客户端配置并传入 `NewClient` 创建一个新的客户端。

函数签名：

```go
func NewRedisRegistry(addr string, opts ...Option) registry.Registry
```

示例代码：

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379")
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### 服务发现

#### Option

Redis 拓展在服务发现部分中提供了 option 配置。

##### WithPassword

Redis 扩展提供了 `WithPassword` 配置 redis 的密码，此密码必须匹配服务器配置选项中指定的密码。

函数签名：

```go
func WithPassword(password string) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithPassword("123456"))
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithDB

Redis 扩展提供了 `WithDB` 配置连接到服务器后要选择的数据库。

函数签名：

```go
func WithDB(db int) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithDB(1))
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithTLSConfig

Redis 扩展提供了 `WithTLSConfig` 配置 TLS 的配置项。

函数签名：

```go
func WithTLSConfig(t *tls.Config) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithDialer

Redis 扩展提供了 `WithDialer` 配置 Dialer，Dialer 将会创建新的网络连接并优先于 Network 和 Addr 选项。

函数签名：

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithReadTimeout

Redis 扩展提供了 `WithReadTimeout` 配置读取 socket 超时的时间，默认为 3 秒。

函数签名：

```go
func WithReadTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    ))
    cli.Use(sd.Discovery(r))
    // ...
}
```

##### WithWriteTimeout

Redis 扩展提供了 `WithWriteTimeout` 配置写入 socket 超时的时间，默认等同于 `ReadTimeout` 。

函数签名：

```go
func WithWriteTimeout(t time.Duration) Option
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    ))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### NewRedisResolver

`NewRedisResolver` 使用 redis 创建一个新的服务发现中心，需要传入目标地址。可自定义客户端配置并传入 `NewClient` 创建一个新的客户端。

函数签名：

```go
func NewRedisResolver(addr string, opts ...Option) discovery.Resolver
```

示例代码：

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379")
    cli.Use(sd.Discovery(r))
    // ...
}
```

### 使用示例

#### 服务端

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379")
    addr := "127.0.0.1:8888"
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    h.Spin()
}
```

#### 客户端

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
	"github.com/cloudwego/hertz/pkg/common/config"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := redis.NewRedisResolver("127.0.0.1:6379")
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("HERTZ: code=%d,body=%s", status, string(body))
    }
}
```

### 配置

可自定义 redis 客户端以及服务端的配置，参考 [go-redis](https://github.com/go-redis/redis) 配置。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/redis/example) 。
