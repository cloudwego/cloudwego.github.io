---
title: "服务注册与发现"
date: 2022-08-14
weight: 3
description: >
---

目前在 Hertz 的开源版本支持的服务发现扩展都存放在 [registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

到现在为止，支持的服务发现拓展有

- [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos)
- [consul](https://github.com/hertz-contrib/registry/tree/main/consul)
- [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd)
- [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
- [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris)
- [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb)
- [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)

## Nacos

### 安装

```go
go get github.com/hertz-contrib/registry/nacos
```

### 服务注册

#### Option

nacos 拓展在服务注册部分中提供了 option 配置。

| 配置    | 描述                                    |
| ------- | --------------------------------------- |
| cluster | nacos 的集群配置。                      |
| group   | nacos 的配置管理可通过 group 进行分组。 |

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

| 配置    | 描述                                    |
| ------- | --------------------------------------- |
| cluster | Nacos 的集群配置。                      |
| group   | Nacos 的配置管理可通过 group 进行分组。 |

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

| 配置  | 描述                     |
| ----- | ------------------------ |
| check | 配置 Consul 的健康检查。 |

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

| 配置  | 描述                     |
| ----- | ------------------------ |
| check | 配置 Consul 的健康检查。 |

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

| 配置 | 描述                   |
| ---- | ---------------------- |
| TLS  | TLS 持有客户端安全凭证 |

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

| 配置 | 描述                   |
| ---- | ---------------------- |
| TLS  | TLS 持有客户端安全凭证 |

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

| 配置              | 描述                   |
| ----------------- | ---------------------- |
| appID             | Servicecomb 的 appID   |
| versionRule       | Servicecomb 的版本要求 |
| hostName          | Servicecomb 的主机名   |
| heartbeatInterval | 发送心跳包的间隔时长   |

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

| 配置        | 描述                      |
| ----------- | ------------------------- |
| appID       | Servicecomb 的 appID      |
| versionRule | Servicecomb 的版本要求    |
| consumerId  | Servicecomb 的 comsumerId |

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
