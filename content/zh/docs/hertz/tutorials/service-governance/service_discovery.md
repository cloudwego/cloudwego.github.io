---
title: "服务注册与发现"
date: 2022-08-14
weight: 3
description: >
---

目前在 Hertz 的开源版本支持的服务发现扩展都存放在 [registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

到现在为止，支持的服务发现拓展有 [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos), [consul](https://github.com/hertz-contrib/registry/tree/main/consul), [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd), [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
, [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris), [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb), [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)

## nacos

### 安装

```go
go get github.com/hertz-contrib/registry/nacos
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 nacos-server

###### make prepare

```bash
make prepare
```

###### run server

```go
go run ./example/standard/server/main.go
```

###### run client

```go
go run ./example/standard/client/main.go
```

### 配置

[配置文档](https://github.com/nacos-group/nacos-sdk-go)

#### 自定义配置示例代码

##### 服务端

```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/registry/nacos"
	"github.com/nacos-group/nacos-sdk-go/clients"
	"github.com/nacos-group/nacos-sdk-go/common/constant"
	"github.com/nacos-group/nacos-sdk-go/vo"
)

func main() {
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

	addr := "127.0.0.1:8888"
	r := nacos.NewNacosRegistry(cli)
	h := server.Default(
		server.WithHostPorts(addr),
		server.WithRegistry(r, &registry.Info{
			ServiceName: "hertz.test.demo",
			Addr:        utils.NewNetAddr("tcp", addr),
			Weight:      10,
			Tags:        nil,
		}))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
	h.Spin()
}
```

##### 客户端

```go
import (
	"context"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
	"github.com/cloudwego/hertz/pkg/common/config"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/registry/nacos"
	"github.com/nacos-group/nacos-sdk-go/clients"
	"github.com/nacos-group/nacos-sdk-go/common/constant"
	"github.com/nacos-group/nacos-sdk-go/vo"
)

func main() {
	cli, err := client.NewClient()
	if err != nil {
		panic(err)
	}
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
	}

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
	for i := 0; i < 10; i++ {
		status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
		if err != nil {
			hlog.Fatal(err)
		}
		hlog.Infof("code=%d,body=%s", status, string(body))
	}
}
```

### 兼容性

Nacos2.0 服务完全兼容 1.X nacos-sdk-go，[详见](https://nacos.io/en-us/docs/2.0.0-compatibility.html)

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples)

## consul

### 安装

```go
go get github.com/hertz-contrib/registry/consul
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 consul-server

###### make prepare

```bash
make prepare
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 配置

[配置文档](https://developer.hashicorp.com/consul/docs/agent/config/config-files)

#### 自定义服务检查

consul 有用于服务检查的默认配置，如下所示

```
check.Timeout = "5s"
check.Interval = "5s"
check.DeregisterCriticalServiceAfter = "1m"
```

你可以使用 `WithCheck` 去修改你的配置

```go
import (
	"log"

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

	// build a consul register with the check option
	check := new(consulapi.AgentServiceCheck)
	check.Timeout = "10s"
	check.Interval = "10s"
	check.DeregisterCriticalServiceAfter = "1m"
	r := consul.NewConsulRegister(consulClient, consul.WithCheck(check))
}
```

### 兼容性

兼容 consul v1.11.x 到 v1.13.x.

[consul version list](https://releases.hashicorp.com/consul)

### 完整实例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/consul/example)

## etcd

### 安装

```go
go get github.com/hertz-contrib/registry/etcd
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 etcd-server

###### run docker

```bash
make prepare
```

###### run etcd cluster

```bash
make prepare-cluster
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 配置

[配置文档](https://pkg.go.dev/go.etcd.io/etcd/client/v3)

### 兼容性

与 etcd-clientv3 (3.0.0 - 3.5.4) 兼容 [详见](https://github.com/etcd-io/etcd/tree/main/client/v3)

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example)

## eureka

### 安装

```go
go get github.com/hertz-contrib/eureka
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 eureka-server

###### start eureka server

```bash
docker-compose up
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 配置

本项目使用 [fargo](https://github.com/hudl/fargo) 作为 eureka 客户端。 您应该参考 [fargo](https://github.com/hudl/fargo) 文档以了解高级配置。

有多种方法可以创建一个 `eurekaRegistry`

- `NewEurekaRegistry` 创建一个带有 eureka 服务器地址的 registry。
- `NewEurekaRegistryFromConfig` 使用给定的 `fargo.Config` 进行创建。
- `NewEurekaRegistryFromConn` 使用现有的 `fargo.EurekaConnection` 进行创建。

同样适用于 `eurekaResolver`.

- `NewEurekaResolver` 创建一个带有 eureka 服务器地址的 resolver。
- `NewEurekaResolverFromConfig` 使用给定的 `fargo.Config` 进行创建。
- `NewEurekaResolverFromConn` 使用现有的 `fargo.EurekaConnection` 进行创建。

#### 验证

一种直接的方法是[在 uri 中传递凭据](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#access_using_credentials_in_the_url)，e.g. `[]string{"http://username:password@127.0.0.1:8080/eureka"`。 或者，您可以将现有连接传递给 `NewEurekaRegistryFromConn` 或 `NewEurekaResolverFromConn`。

#### 设置日志级别

该项目使用 fargo 作为 eureka 客户端，它依赖于 [go-logging](https://github.com/hertz-contrib/registry/blob/main/eureka/github.com/op/go-logging) 进行日志记录。不幸的是，[go-logging](https://github.com/hertz-contrib/registry/blob/main/eureka/github.com/op/go-logging) 没有提供调整日志级别的接口。 以下代码演示了如何设置日志级别。

```go
import (
	"context"
	"github.com/op/go-logging"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/eureka"
)

func main() {

	logging.SetLevel(logging.WARNING, "fargo")
	// set this to a higher level if you wish to check responses from eureka 
	logging.SetLevel(logging.WARNING, "fargo.metadata")
	logging.SetLevel(logging.WARNING, "fargo.marshal")

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

### 兼容性

与 eureka server v1. 兼容

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example)

## polaris

### 安装

```go
go get github.com/hertz-contrib/registry/polaris
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 polaris-server

###### run docker

```bash
make prepare
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 配置

Polaris 支持单机和集群。 更多信息可以在[参考文档](https://polarismesh.cn/zh/doc/%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97/%E6%9C%8D%E5%8A%A1%E6%B3%A8%E5%86%8C/%E6%A6%82%E8%BF%B0.html#%E6%A6%82%E8%BF%B0)中找到

### 兼容性

兼容 polaris（v1.4.0 - v1.10.0），推荐最新稳定版本。 如果您想使用其他版本，请在 Makefile 中修改版本进行测试。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example)

## servicecomb

### 安装

```go
go get github.com/hertz-contrib/registry/servicecomb
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 servicecomb-server

###### run docker

```bash
make prepare
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 配置

[配置文档](https://service-center.readthedocs.io/en/latest/user-guides.html)

### 兼容性

兼容 v2.0.0 - 最新版本，推荐最新稳定版本。 如果您想使用其他版本，请在 Makefile 中修改版本进行测试。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example)

## zookeeper

### 安装

```go
go get github.com/hertz-contrib/registry/zookeeper
```

### 示例代码

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

#### 运行实例代码

##### 使用 docker 运行 zookeeper-server

###### run docker

```bash
make prepare
```

###### run server

```go
go run ./example/server/main.go
```

###### run client

```go
go run ./example/client/main.go
```

### 兼容性

兼容 v3.4.0 - v3.7.0，推荐最新稳定版本。 如果您想使用其他版本，请在 Makefile 中修改版本进行测试。

### 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example)
