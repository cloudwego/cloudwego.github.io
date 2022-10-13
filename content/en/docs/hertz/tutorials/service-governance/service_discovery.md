---
title: "Service Registration and Service Discovery"
date: 2022-08-14
weight: 3
description: >
---

The service discovery extensions currently supported in the open source version of Hertz are stored in the [registry](https://github.com/hertz-contrib/registry). You are welcomed to join us in contributing and maintaining for this project.

As of now, the supported service discovery extensions are [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos), [consul](https://github.com/hertz-contrib/registry/tree/main/consul), [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd), [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
, [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris), [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb), [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)

## nacos

### Install

```go
go get github.com/hertz-contrib/registry/nacos
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run server

```go
go run ./example/standard/server/main.go
```

##### run client

```go
go run ./example/standard/client/main.go
```

### Configuration

[Configuration Doc](https://github.com/nacos-group/nacos-sdk-go)

#### Custom configuration example

##### Server

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

##### Client

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

### Compatibility

The server of Nacos2.0 is fully compatible with 1.X nacos-sdk-go. [see](https://nacos.io/en-us/docs/2.0.0-compatibility.html)

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples)

## consul

### Install

```go
go get github.com/hertz-contrib/registry/consul
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

[Configuration Doc](https://developer.hashicorp.com/consul/docs/agent/config/config-files)

#### Customize Service Check

registry has a default config for service check as below

```
check.Timeout = "5s"
check.Interval = "5s"
check.DeregisterCriticalServiceAfter = "1m"
```

you can also use `WithCheck` to modify your config

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

### Compatibility

Compatible with consul from v1.11.x to v1.13.x.

[consul version list](https://releases.hashicorp.com/consul)

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/consul/example)

## etcd

### Install

```go
go get github.com/hertz-contrib/registry/etcd
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run etcd cluster

```bash
make prepare-cluster
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

[Configuration Doc](https://pkg.go.dev/go.etcd.io/etcd/client/v3)

### Compatibility

Compatible with server (3.0.0 - 3.5.4) etcd-clientv3 [see](https://github.com/etcd-io/etcd/tree/main/client/v3)

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/etcd/example)

## eureka

### Install

```go
go get github.com/hertz-contrib/eureka
```

### Example

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

#### Run example

##### run docker

```bash
docker-compose up
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

This project uses [fargo](https://github.com/hudl/fargo) as eureka client. You should refer to [fargo](https://github.com/hudl/fargo) documentation for advanced configuration.

There are multiple ways to crate a `eurekaRegistry`.

- `NewEurekaRegistry` creates a registry with a slice of eureka server addresses.
- `NewEurekaRegistryFromConfig` creates a registry with given `fargo.Config`.
- `NewEurekaRegistryFromConn` creates a registry using existing `fargo.EurekaConnection` .

The same also applies for `eurekaResolver`.

- `NewEurekaResolver` creates a resolver with a slice of eureka server addresses.
- `NewEurekaResolverFromConfig` creates a resolver with given `fargo.Config`.
- `NewEurekaResolverFromConn` creates a resolver using existing `fargo.EurekaConnection` .

#### Authentication

A straight-forward approach is passing [credentials in uri](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#access_using_credentials_in_the_url) e.g. `[]string{"http://username:password@127.0.0.1:8080/eureka"`. Alternatively, you can pass existing connection to `NewEurekaRegistryFromConn` or `NewEurekaResolverFromConn`.

#### Setting Log Level

As discussed above, this project uses fargo as eureka client, which relies on [go-logging](https://github.com/hertz-contrib/registry/blob/main/eureka/github.com/op/go-logging) for logging. Unfortunately, [go-logging](https://github.com/hertz-contrib/registry/blob/main/eureka/github.com/op/go-logging) does not provide an interface to adjust log level. The following code demonstrates how to set log level.

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

### Compatibility

This project is compatible with eureka server v1.

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/eureka/example)

## polaris

### Install

```go
go get github.com/hertz-contrib/registry/polaris
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

Polaris support stand-alone and cluster. More information can be found in [install polaris](https://polarismesh.cn/zh/doc/快速入门/安装服务端/安装单机版.html#单机版安装)

### Compatibility

Compatible with polaris (v1.4.0 - v1.10.0), latest stable version is recommended. If you want to use other server version, please modify the version in `Makefile` to test.

### Complete exmaple

For complete [example](https://github.com/hertz-contrib/registry/tree/main/polaris/example)

## servicecomb

### Install

```go
go get github.com/hertz-contrib/registry/servicecomb
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

[Configuration Doc](https://service-center.readthedocs.io/en/latest/user-guides.html)

### Compatibility

Compatible with server (2.0.0 - latest), If you want to use older server version, please modify the version in `Makefile` to test.

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/servicecomb/example)

## zookeeper

### Install

```go
go get github.com/hertz-contrib/registry/zookeeper
```

### Example

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

#### Run example

##### run docker

```bash
make prepare
```

##### run server

```go
go run ./example/server/main.go
```

##### run client

```go
go run ./example/client/main.go
```

### Configuration

Compatible with server (3.4.0 - 3.7.0), If you want to use older server version, please modify the version in `Makefile` to test.

### Complete example

For complete [example](https://github.com/hertz-contrib/registry/tree/main/zookeeper/example)
