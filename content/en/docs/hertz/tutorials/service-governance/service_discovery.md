---
title: "Service Registration and Service Discovery"
date: 2022-08-14
weight: 3
description: >
---

The service discovery extensions currently supported in the open source version of Hertz are stored in the [registry](https://github.com/hertz-contrib/registry). You are welcomed to join us in contributing and maintaining for this project.

As of now, the supported service discovery extensions are

- [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos)
- [consul](https://github.com/hertz-contrib/registry/tree/main/consul)
- [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd)
- [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
- [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris)
- [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb)
- [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)
- [redis](https://github.com/hertz-contrib/registry/tree/main/redis)

## Configuration

Some optional configurations are provided to users when using service discovery.

| Configuration          | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| WithSD                 | Set isSD to true , **required to use service discovery**. |
| WithTag                | Set tag for requestOptions.                               |
| WithCustomizedAddrs    | Customize the address of the target instance.             |
| WithLoadBalanceOptions | Configure load balancing options.                         |

### WithSD

`requestOptins` provides `WithSD` configuration item, when the incoming parameter is true, `isSD` will be set to true. The `WithSD` configuration item must be used when using service discovery requests.

Sample code:
```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
```

### WithTag

`requestOptins` provides `WithTag` configuration item, using this configuration will set tag for `requestOptions`.

Sample code:
```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithTag("foo", "var"))
```

### WithCustomizedAddrs

This configuration item specifies the target instance address during service discovery. It will overwrite the result from `Resolver`.

Sample code:
```go
cli.Use(sd.Discovery(r, sd.WithCustomizedAddrs("127.0.0.1:8088")))
```

### WithLoadBalanceOptions

This configuration item can configure the load balancing algorithm and load balancing parameters for the client.

Sample code:
```go
cli.Use(sd.Discovery(r, sd.WithLoadBalanceOptions(loadbalance.NewWeightedBalancer(), loadbalance.Options{
     RefreshInterval: 5 * time. Second,
     ExpireInterval: 15 * time. Second,
})))
```

## Nacos

### Install

```go
go get github.com/hertz-contrib/registry/nacos
```

### Service Registry

#### Option

Nacos extension provides option configuration in the service registry section.

##### WithRegistryCluster

Nacos extension provides `WithRegistryCluster` to help users configure custom clusters. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryCluster(cluster string) RegistryOption
```

Example:

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

Nacos extension provides `WithRegistryGroup` to help users configure custom clusters. Defaults to "DEFAULT_GROUP" .

Function signature:

```go
func WithRegistryGroup(group string) RegistryOption
```

Example:

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

`NewDefaultNacosRegistry` creates a default service registry using nacos. `NewDefaultNacosConfig` will be called to use the default client. By default, the RegionID is `cn-hangzhou`, the address is `127.0.0.1`, the port number is `8848`, and the cache will not be loaded at the beginning. Service registry configuration can be customized.

Function signature:

```go
func NewDefaultNacosRegistry(opts ...RegistryOption) (registry.Registry, error)
```

Example:

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

`NewNacosRegistry` uses nacos to create a service registry that can configure clients, and needs to pass in self-configured clients. Customizable service registry configuration.

Function signature：

```go
func NewNacosRegistry(client naming_client.INamingClient, opts ...RegistryOption) registry.Registry
```

Example：

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

### Service Discovery

#### Option

Nacos extension provides option configuration in the service discovery section.

##### WithRegistryCluster

Nacos extension provides `WithRegistryCluster` to help users configure custom clusters. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryCluster(cluster string) RegistryOption
```

Example:

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

Nacos extension provides `WithRegistryGroup` to help users configure custom clusters. Defaults to "DEFAULT_GROUP" .

Function signature:

```go
func WithRegistryGroup(group string) RegistryOption
```

Example:

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

`NewDefaultNacosResolver` creates a default service discovery center using nacos. `NewDefaultNacosConfig` will be called to use the default client. By default, the RegionID is `cn-hangzhou`, the address is `127.0.0.1`, the port number is `8848`, and the cache will not be loaded at the beginning. Service registry configuration can be customized.

Function signature：

```go
func NewDefaultNacosResolver(opts ...ResolverOption) (discovery.Resolver, error)
```

Example:

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

`NewNacosResolver` uses nacos to create a service discovery center with a configurable client, which needs to be passed in a self-configured client. Customizable Service Discovery Center configuration.

Function signature:

```go
func NewNacosResolver(cli naming_client.INamingClient, opts ...ResolverOption) discovery.Resolver
```

Example:

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

### How to use

#### Server

- Use `server.WithRegistry` to set up registration extensions and registration information.

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

#### Client

- Use the `sd.Discovery` built-in middleware to support incoming custom service discovery extensions as well as load balance extensions.
- When using service discovery, replace Host with the service name and use `config.WithSD` to confirm that this request uses service registration.

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

### Configuration

The configuration of Nacos client and server can be customized, refer to the configuration of [nacos-sdk-go](https://github.com/nacos-group/nacos-sdk-go) .

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples) .

## Consul

### Install

```go
go get github.com/hertz-contrib/registry/consul
```

### Service Registry

#### Option

Consul extension provides option configuration in the service registry section.

##### WithRegistryGroup

Consul extension provides `WithCheck` to help users configure the `AgentServiceCheck` option in Consul. `defaultCheck()` is called by default.

Function signature:

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

Example:

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

`NewConsulRegister` uses consul to create a new service registry, which needs to be passed in a client, which is created with `NewClient`. The service registry configuration can be customized. If no configuration is passed in, set `check.Timeout` to 5 seconds, `check.Internal` to 5 seconds, and `check.DeregisterCriticalServiceAfter` to 1 minute.

Function signature:

```go
func NewConsulRegister(consulClient *api.Client, opts ...Option) registry.Registry
```

Example:

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

### Service Discovery

#### Option

Consul extension provides option configuration in the service discovery section.

##### WithRegistryGroup

Consul extension provides `WithCheck` to help users configure the `AgentServiceCheck` option in Consul. `defaultCheck()` is called by default.

Function signature:

```go
func WithCheck(check *api.AgentServiceCheck) Option
```

Example:

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

`NewConsulResolver` uses consul to create a new service discovery center, you need to pass in the client. The client is created using `NewClient`. The service discovery center configuration can be customized.

Function signature:

```go
func NewConsulResolver(consulClient *api.Client, opts ...Option) discovery.Resolver
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

The configuration of Consul client and server can be customized, refer to the configuration of [consul](https://github.com/hashicorp/consul).

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/consul/example) .

## Etcd

### Install

```go
go get github.com/hertz-contrib/registry/etcd
```

### Service Registry

#### Option

Etcd extension provides option configuration in the service registry section.

##### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure an option to authenticate via tls/ssl.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

Example:

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

`NewEtcdRegistry` uses etcd to create a new service registry, requires passing in the endpoint value. Customizable client configuration and passing in `New` creates a new client. Customizable service registry configuration.

Function signature:

```go
func NewEtcdRegistry(endpoints []string, opts ...Option) (registry.Registry, error)
```

Example:

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

### Service Discovery

#### Option

Etcd extension provides option configuration in the service discovery section.

##### WithTLSOpt

Etcd extension provides `WithTLSOpt` to help users configure an option to authenticate via tls/ssl.

Function signature:

```go
func WithTLSOpt(certFile, keyFile, caFile string) Option
```

Example:

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

`NewEtcdResolver` uses etcd to create a new service discovery center, needs to pass in the endpoint value. You can customize the client configuration and pass `New` to create a new client. Customize the service discovery center configuration.

Function signature:

```go
func NewEtcdResolver(endpoints []string, opts ...Option) (discovery.Resolver, error)
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

The configuration of Etcd client and server can be customized, refer to the configuration of [etcd-client](https://pkg.go.dev/go.etcd.io/etcd/client/v3).

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example) .

## Eureka

### Install

```go
go get github.com/hertz-contrib/eureka
```

### Service Registry

#### NewEurekaRegistry

`NewEurekaRegistry` uses eureka to create a new service registry, you need to pass the service Url into `NewConn` through a string slice, and also pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistry(servers []string, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

`NewEurekaRegistryFromConfig` uses eureka to create a new service registry, you need to pass in the configuration and call `NewConnFromConfig` , and also need to pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistryFromConfig(config fargo.Config, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

`NewEurekaRegistryFromConn` uses eureka to create a new service registry, you need to pass in conn directly, and also need to pass in the heartbeat interval.

Function signature:

```go
func NewEurekaRegistryFromConn(conn fargo.EurekaConnection, heatBeatInterval time.Duration) *eurekaRegistry
```

Example:

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

### Service Discovery

#### NewEurekaResolver

`NewEurekaResolver` uses eureka to create a new service discovery center, you need to pass the service Url through a string slice to `NewConn`.

Function signature:

```go
func NewEurekaResolver(servers []string) *eurekaResolver
```

Example:

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

`NewEurekaResolverFromConfig` uses eureka to create a new service discovery center, requires passing in the configuration and calling `NewConnFromConfig`.

Function signature:

```go
func NewEurekaResolverFromConfig(config fargo.Config) *eurekaResolver
```

Example:

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

`NewEurekaResolverFromConn` uses eureka to create a new service discovery center, which needs to be passed directly to conn.

Function signature:

```go
func NewEurekaResolverFromConn(conn fargo.EurekaConnection) *eurekaResolver
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

This project uses [fargo](https://github.com/hudl/fargo) as eureka client. You should refer to [fargo](https://github.com/hudl/fargo) documentation for advanced configuration.

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example) .

## Polaris

### Install

```go
go get github.com/hertz-contrib/registry/polaris
```

### Service Registry

#### NewPolarisRegistry

`NewPolarisRegistry` creates a new service registry using polaris, passing in a configuration file and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisRegistry(configFile ...string) (Registry, error)
```

Example:

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

### Service Discovery

#### NewPolarisResolver

`NewPolarisResolver` uses polaris to create a new service discovery center, passing in a configuration file and calling `GetPolarisConfig` , using the default configuration if not passed in.

Function signature:

```go
func NewPolarisResolver(configFile ...string) (Resolver, error)
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

The configuration of Polaris client and server can be customized, refer to the configuration of [polaris-go](https://pkg.go.dev/github.com/polarismesh/polaris-go/api#section-readme).

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example) .

## Servicecomb

### Install

```go
go get github.com/hertz-contrib/registry/servicecomb
```

### Service Registry

#### Option

Servicecomb extension provides option configuration in the service registry section.

##### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to "DEFAULT" .

Function signature:

```go
func WithAppId(appId string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryVersionRule` to help users configure the version requirements of Servicecomb. Defaults to 1.0.0 .

Function signature:

```go
func WithRegistryVersionRule(versionRule string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryHostName` to help users configure Servicecomb's hostname. Defaults to "DEFAULT" .

Function signature:

```go
func WithRegistryHostName(hostName string) RegistryOption
```

Example:

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

Servicecomb extension provides `WithRegistryHeartbeatInterval` to help users configure the interval for sending heartbeat packets. Default is 5.

Function signature:

```go
func WithRegistryHeartbeatInterval(second int32) RegistryOption
```

Example:

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

`NewDefaultSCRegistry` uses service-comb to create a default service registry, which needs to pass in the endpoint value. The service registry configuration can be customized.

Function signature:

```go
func NewDefaultSCRegistry(endPoints []string, opts ...RegistryOption) (registry.Registry, error)
```

Example:

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

`NewSCRegistry` uses service-comb to create a new service registry. It needs to pass in a custom client. Customizable service registry configuration.

Function signature:

```go
func NewSCRegistry(client *sc.Client, opts ...RegistryOption) registry.Registry
```

Example:

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

### Service Discovery

#### Option

Servicecomb extension provides option configuration in the service discovery section.

##### WithAppId

Servicecomb extension provides `WithAppId` to help users configure the AppId of Servicecomb. Defaults to "DEFAULT" .

Function signature:

```go
func WithResolverAppId(appId string) ResolverOption
```

Example:

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

Servicecomb extension provides `WithResolverVersionRule` to help users configure Servicecomb's version requirements. Defaults to latest .

Function signature:

```go
func WithResolverVersionRule(versionRule string) ResolverOption
```

Example:

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

Servicecomb extension provides `WithResolverConsumerId` to help users configure Servicecomb's ConsumerId . Default is empty .

Function signature:

```go
func WithResolverConsumerId(consumerId string) ResolverOption
```

Example:

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

`NewDefaultSCResolver` uses service-comb to create a default service discovery center, which needs to pass in the endpoint value. Service discovery center configuration can be customized.

Function signature:

```go
func NewDefaultSCResolver(endPoints []string, opts ...ResolverOption) (discovery.Resolver, error)
```

Example:

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

`NewSCReslover` uses service-comb to create a new service discovery center. It needs to pass in a custom client. The configuration of the service discovery center can be customized.

Function signature:

```go
func NewSCResolver(cli *sc.Client, opts ...ResolverOption) discovery.Resolver
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

The configuration of Servicecomb client and server can be customized, refer to the configuration of [go-chassis/sc-client](https://github.com/go-chassis/sc-client).

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example) .

## Zookeeper

### Install

```go
go get github.com/hertz-contrib/registry/zookeeper
```

### Service Registry

#### NewZookeeperRegistry

`NewZookeeperRegistry` uses zookeeper to create a service registry. You need to pass the service to `Connect` through a string slice together with the session timeout.

Function signature:

```go
func NewZookeeperRegistry(servers []string, sessionTimeout time.Duration) (registry.Registry, error)
```

Example:

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

`NewZookeeperRegistryWithAuth` uses zookeeper to create a service registry. You need to pass the service into `Connect` through a string slice and session timeout time. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperRegistryWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

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

### Service Discovery

#### NewZookeeperResolver

`NewZookeeperResolver` uses zookeeper to create a service discovery center, which needs to pass a string slice and session timeout to `Connect`.

Function signature:

```go
func NewZookeeperResolver(servers []string, sessionTimeout time.Duration) (discovery.Resolver, error)
```

Example:

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

`NewZookeeperResolverWithAuth` uses zookeeper to create a service discovery center. You need to pass the service into `Connect` through a string slice and session timeout. In addition, you need to pass in the user and password to call `AddAuth`, the user and password Can not be empty.

Function signature:

```go
func NewZookeeperResolverWithAuth(servers []string, sessionTimeout time.Duration, user, password string)
```

Example:

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

### How to use

#### Server

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

#### Client

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

### Configuration

The configuration of Zookeeper client and server can be customized, refer to the configuration of [go-zookeeper/zk](https://github.com/go-zookeeper/zk).

### Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example) .

## Redis

### Install

```go
go get github.com/hertz-contrib/registry/redis
```

### Service Registry

#### Option

The Redis extension provides option configuration in the service registry section.

##### WithPassword

The Redis extension provides `WithPassword` to configure the redis password, which must match the password specified in the server configuration options.

Function signature:

```go
func WithPassword(password string) Option
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithPassword("123456"))
     //...
     h := server. Default(
     server.WithHostPorts(addr),
     server.WithRegistry(r, &registry.Info{
       ServiceName: "hertz.test.demo",
       Addr: utils. NewNetAddr("tcp", addr),
       Weight: 10,
       Tags: nil,
     }),
     )
     //...
}
```

##### WithDB

The Redis extension provides `WithDB` to configure the database to choose after connecting to the server.

Function signature:

```go
func WithDB(db int) Option
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDB(1))
     //...
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     //...
}
```

##### WithTLSConfig

The Redis extension provides `WithTLSConfig` configuration items for configuring TLS.

Function signature:

```go
func WithTLSConfig(t *tls.Config) Option
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
     //...
     }))
     //...
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     //...
}
```

##### WithDialer

The Redis extension provides `WithDialer` to configure Dialer, Dialer will create a new network connection and take precedence over Network and Addr options.

Function signature:

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
     //...
     ))
     //...
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     //...
}
```

##### WithReadTimeout

The Redis extension provides `WithReadTimeout` to configure the read socket timeout time, the default is 3 seconds.

Function signature:

```go
func WithReadTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
     //...
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     //...
}
```

##### WithWriteTimeout

The Redis extension provides `WithReadTimeout` to configure the write socket timeout time, the default is `ReadTimeout`.

Function signature:

```go
func WithWriteTimeout(t time.Duration) Option
```

Sample code:
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

`NewRedisRegistry` uses redis to create a new service registry and needs to pass in the target address. You can customize the client configuration and pass in `NewClient` to create a new client.

Function signature:

```go
func NewRedisRegistry(addr string, opts...Option) registry.Registry
```

Sample code:

```go
func main() {
     r := redis.NewRedisRegistry("127.0.0.1:6379")
     //...
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     //...
}
```

### Service Discovery

#### Option

Etcd extension provides option configuration in the service discovery section.

##### WithPassword

The Redis extension provides `WithPassword` to configure the redis password, which must match the password specified in the server configuration options.

Function signature:

```go
func WithPassword(password string) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithPassword("123456"))
     cli. Use(sd. Discovery(r))
     //...
}
```

##### WithDB

The Redis extension provides `WithDB` to configure the database to choose after connecting to the server.

Function signature:

```go
func WithDB(db int) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithDB(1))
     cli. Use(sd. Discovery(r))
     //...
}
```

##### WithTLSConfig

The Redis extension provides `WithTLSConfig` configuration items for configuring TLS.

Function signature:

```go
func WithTLSConfig(t *tls.Config) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
     //...
     }))
     cli. Use(sd. Discovery(r))
     //...
}
```

##### WithDialer

The Redis extension provides `WithDialer` to configure Dialer, Dialer will create a new network connection and take precedence over Network and Addr options.

Function signature:

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
     //...
     ))
     cli. Use(sd. Discovery(r))
     //...
}
```

##### WithReadTimeout

The Redis extension provides `WithReadTimeout` to configure the read socket timeout time, the default is 3 seconds.

Function signature:

```go
func WithReadTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
     //...
     ))
     cli. Use(sd. Discovery(r))
     //...
}
```

##### WithWriteTimeout

The Redis extension provides `WithReadTimeout` to configure the write socket timeout time, the default is `ReadTimeout`.

Function signature:

```go
func WithWriteTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
     //...
     ))
     cli. Use(sd. Discovery(r))
     //...
}
```

#### NewRedisResolver

`NewRedisResolver` uses redis to create a new service discovery center, and needs to pass in the target address. You can customize the client configuration and pass in `NewClient` to create a new client.

Function signature:

```go
func NewRedisResolver(addr string, opts ...Option) discovery.Resolver
```

Sample code:

```go
func main() {
     cli, err := client. NewClient()
     //...
     r := redis.NewRedisResolver("127.0.0.1:6379")
     cli. Use(sd. Discovery(r))
     //...
}
```

### How to use

#### Server

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
     h := server. Default(
         server.WithHostPorts(addr),
         server.WithRegistry(r, &registry.Info{
             ServiceName: "hertz.test.demo",
             Addr: utils. NewNetAddr("tcp", addr),
             Weight: 10,
             Tags: nil,
         }),
     )
     h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
         ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
     })
     h. Spin()
}
```

#### Client

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
     cli, err := client. NewClient()
     if err != nil {
         panic(err)
     }
     r := redis.NewRedisResolver("127.0.0.1:6379")
     cli. Use(sd. Discovery(r))
     for i := 0; i < 10; i++ {
         status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
         if err != nil {
             hlog. Fatal(err)
         }
         hlog.Infof("HERTZ: code=%d, body=%s", status, string(body))
     }
}
```

### Configuration

You can customize the configuration of redis client and server, refer to [go-redis](https://github.com/go-redis/redis) configuration.

### Complete Example

For moer, see [example](https://github.com/hertz-contrib/registry/tree/main/redis/example).
