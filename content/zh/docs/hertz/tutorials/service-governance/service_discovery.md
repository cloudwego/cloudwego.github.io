---
title: "服务注册与发现"
date: 2022-08-14
weight: 3
description: >
---

目前在 Hertz 的开源版本支持的服务发现扩展都存放在 [registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

下面以 Nacos 注册中心为例，仅供参考，生产环境下可自行调整相关参数。使用方法可参考

## 安装

```go
go get github.com/hertz-contrib/registry/nacos
```

## 示例代码

### 服务端

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

### 客户端

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

### 运行实例代码

#### 使用 docker 运行 nacos-server

##### make prepare

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

## 配置

### 服务端配置

| 参数          | 介绍                                             |
| :------------ | :----------------------------------------------- |
| `Scheme`      | 用于设置 nacos 服务端的协议，默认为 http         |
| `ContextPath` | 用于设置 nacos 服务端的上下文路径，默认为 /nacos |
| `IpAddr`      | 用于设置 nacos 服务端的ip地址                    |
| `Port`        | 用于设置 nacos 服务端的端口                      |

### 客户端配置

| 参数                   | 介绍                                                         |
| :--------------------- | :----------------------------------------------------------- |
| `TimeoutMs`            | 用于设置 nacos 客户端的服务器请求超时时间，默认为10000ms     |
| `ListenInterval`       | 用于设置 nacos 客户端的监听间隔时间，不建议使用              |
| `BeatInterval`         | 用于设置 nacos 客户端发送心跳到服务器的时间间隔，默认为5000ms |
| `NamespaceId`          | 用于设置 nacos 客户端的 namespaceId 。当 namespace 为 public 时，此处将填入空字符串。 |
| `AppName`              | 用于设置 nacos 客户端的 AppName                              |
| `Endpoint`             | 用于设置 nacos 客户端获取 nacos 服务器地址的端点             |
| `RegionId`             | 用于设置 kms 的 regionID                                     |
| `AccessKey`            | 用于设置 kms 的 AccessKey                                    |
| `SecretKey`            | 用于设置 kms 的 SecretKey                                    |
| `OpenKMS`              | 用于开启 kms，默认为 false                                   |
| `CacheDir`             | 用于设置 nacos 客户端保存 nacos 服务信息的目录，默认为当前路径 |
| `UpdateThreadNum`      | 用于设置 nacos 客户端更新 nacos 服务信息的 goroutine 数量，默认值为 20 |
| `NotLoadCacheAtStart`  | 用于设置不在开始时在 CacheDir 中加载持久的 nacos 服务信息    |
| `UpdateCacheWhenEmpty` | 用于设置从服务器获取空服务实例时更新缓存                     |
| `Username`             | 用于设置身份验证用户名                                       |
| `Password`             | 用于设置身份验证密码                                         |
| `LogDir`               | 用于设置 nacos 客户端的日志目录，默认为当前路径              |
| `LogLevel`             | 用于设置 nacos 客户端的日志级别，必须是 debug, info, warn, error，默认值是info |
| `LogSampling`          | 用于设置 nacos 客户端的日志采样配置                          |
| `ContextPath`          | 用于设置 nacos 客户端的上下文路径                            |
| `LogRollingConfig`     | 用于设置 nacos 客户端的日志滚动配置                          |
| `CustomLogger`         | 用于设置 nacos 客户端的自定义日志接口，带有自定义Logger（nacos sdk不会提供日志切割和归档能力） |
| `AppendToStdout`       | 将日志附加到标准输出                                         |

### 自定义配置示例代码

#### 服务端

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

#### 客户端

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

## 完整示例

完整用法示例详见 [example](https://github.com/hertz-contrib/registry/tree/main/nacos/examples)
