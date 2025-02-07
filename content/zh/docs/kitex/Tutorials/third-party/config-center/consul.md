---
title: "Consul"
date: 2024-03-02
weight: 6
keywords: ["配置中心扩展", "consul"]
description: "使用 consul 作为 Kitex 的服务治理配置中心"
---

## 安装

`go get github.com/kitex-contrib/config-consul`

## Suite

consul 的配置中心适配器，kitex 通过 `WithSuite` 将 consul 中的配置转换为 kitex 的治理特性配置。

以下是完整的使用样例:

### Server

```go
type ConsulServerSuite struct {
	uid          int64
	consulClient consul.Client
	service      string
	opts         utils.Options
}
```

函数签名：

`func NewSuite(service string, cli consul.Client, opts ...utils.Option) *ConsulServerSuite`

示例代码：

```go

package main

import (
	"github.com/kitex-contrib/config-consul/consul"
	"context"
	"log"

	consulserver "github.com/kitex-contrib/config-consul/server"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/pkg/klog"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
)

var _ api.Echo = &EchoImpl{}

// EchoImpl implements the last service interface defined in the IDL.
type EchoImpl struct{}

// Echo implements the Echo interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.Info("echo called")
	return &api.Response{Message: req.Message}, nil
}

func main() {
	klog.SetLevel(klog.LevelDebug)
	serviceName := "ServiceName" // your server-side service name
	consulClient, _ := consul.NewClient(consul.Options{})
	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(consulserver.NewSuite(serviceName, consulClient)),
	)
	if err := svr.Run(); err != nil {
		log.Println("server stopped with error:", err)
	} else {
		log.Println("server stopped")
	}
}


```

### Client

```go
type ConsulClientSuite struct {
	uid          int64
	consulClient consul.Client
	service      string
	client       string
	opts         utils.Options
}
```

函数签名：

`func NewSuite(service, client string, cli consul.Client, opts ...utils.Option) *ConsulClientSuite`

示例代码：

```go

package main

import (
	"github.com/kitex-contrib/config-consul/consul"
	"github.com/kitex-contrib/config-consul/utils"
	"context"
	"log"
	"time"

	consulclient "github.com/kitex-contrib/config-consul/client"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex/pkg/klog"
)

type configLog struct{}

func (cl *configLog) Apply(opt *utils.Options) {
	fn := func(k *consul.Key) {
		klog.Infof("consul config %v", k)
	}
	opt.ConsulCustomFunctions = append(opt.ConsulCustomFunctions, fn)
}

func main() {
	consulClient, err := consul.NewClient(consul.Options{})
	if err != nil {
		panic(err)
	}

	cl := &configLog{}

	serviceName := "ServiceName" // your server-side service name
	clientName := "ClientName"   // your client-side service name
	client, err := echo.NewClient(
		serviceName,
		client.WithHostPorts("0.0.0.0:8888"),
		client.WithSuite(consulclient.NewSuite(serviceName, clientName, consulClient, cl)),
	)
	if err != nil {
		log.Fatal(err)
	}
	for {

		req := &api.Request{Message: "my request"}
		resp, err := client.Echo(context.Background(), req)
		if err != nil {
			klog.Errorf("take request error: %v", err)
		} else {
			klog.Infof("receive response %v", resp)
		}
		time.Sleep(time.Second * 10)
	}
}

```

## NewClient

创建 client 客户端。

函数签名:

`func NewClient(opts Options) (Client, error)`

示例代码:

```go
package main

import "github.com/kitex-contrib/config-consul/consul"

func main() {
	consulClient, err := consul.NewClient(consul.Options{})
	if err!=nil {
		panic(err)
	}
}
```

### CustomFunction

允许用户自定义 consul 的参数 key。

```go
type Key struct {
    Type   ConfigType
    Prefix string
    Path   string
}
```

consul 中的 key 由 prefix 和 path 组成，prefix 为前缀，path 为路径。

type 为配置格式，默认支持 json 和 yaml，可以使用函数 SetParser 实现自定义格式的解析方式，并在 NewSuite 的时候使用 CustomFunction 函数修改订阅函数的格式。

### SetParser

设置反序列化 consul 配置的自定义解析器，若不指定则为默认解析器。

函数签名:

`func (c *client) SetParser(parser ConfigParser)`

```go
type ConfigParser interface {
	Decode(data string, config interface{}) error
}
```

示例代码:

设置解析 yaml 类型的配置

```go
package main

import "github.com/kitex-contrib/config-consul/consul"

func (p *parser) Decode(data string, config interface{}) error {
	return yaml.Unmarshal([]byte(data), config)
}

type parser struct{}

func main() {
    consulClient, err := consul.NewClient(consul.Options{})
    if err!=nil {
        panic(err)
    }
    consulClient.SetParser(&parser{})
}
```

## Consul 配置

### Options 结构体

```go
type Options struct {
    Addr             string
    Prefix           string
    ServerPathFormat string
    ClientPathFormat string
    DataCenter       string
    TimeOut          time.Duration
    NamespaceId      string
    Token            string
    Partition        string
    LoggerConfig     *zap.Config
    ConfigParser     ConfigParser
}
```

### Options 默认值

| 参数             | 变量默认值                                                  | 作用                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Addr             | 127.0.0.1:8500                                              | Consul 服务器地址                                                                                                                                                                |
| Prefix           | /KitexConfig                                                | Consul 的 Prefix                                                                                                                                                                 |
| ServerPathFormat | {{.ServerServiceName}}/{{.Category}}                        | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ServiceName` `Category` 两个元数据，用于和 Prefix 组成 consul 中配置的 key                     |
| ClientPathFormat | {{.ClientServiceName}}/{{.ServerServiceName}}/{{.Category}} | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ClientServiceName` `ServiceName` `Category` 三个元数据，用于和 Prefix 组成 consul 中配置的 key |
| DataCenter       | dc1                                                         | Consul 默认数据中心                                                                                                                                                              |
| Timeout          | 5 \* time.Second                                            | 5s 超时时间                                                                                                                                                                      |
| NamespaceId      |                                                             | Consul 的 Namespace Id                                                                                                                                                           |
| Token            |                                                             | Consul 服务的认证 Token                                                                                                                                                          |
| Partition        |                                                             | Consul 的 Partition                                                                                                                                                              |
| LoggerConfig     | NULL                                                        | 默认日志                                                                                                                                                                         |
| ConfigParser     | defaultConfigParser                                         | 默认解析器，默认为解析 json 与 yaml 格式的数据                                                                                                                                   |

### 治理策略

下面例子中的 configPath 以及 configPrefix 均使用默认值，服务名称为 ServiceName，客户端名称为 ClientName

#### 限流

Category=limit

> 限流目前只支持服务端，所以 ClientServiceName 为空。

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

| 字段             | 说明                      |
| ---------------- | ------------------------- |
| connection_limit | 最大并发数量              |
| qps_limit        | 每 100ms 内的最大请求数量 |

例子：

> configPath: /KitexConfig/ServiceName/limit

```json
{
  "connection_limit": 100,
  "qps_limit": 2000
}
```

注：

- 限流配置的粒度是 Server 全局，不分 client、method
- 「未配置」或「取值为 0」表示不开启
- connection_limit 和 qps_limit 可以独立配置，例如 connection_limit = 100, qps_limit = 0

#### 重试

Category=retry

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/retry/policy.go#L63)

| 参数                          | 说明                                     |
| ----------------------------- | ---------------------------------------- |
| type                          | 0: failure_policy 1: backup_policy       |
| failure_policy.backoff_policy | 可以设置的策略： `fixed` `none` `random` |

例子：

> configPath: /KitexConfig/ClientName/ServiceName/retry

```json
{
  "*": {
    "enable": true,
    "type": 0,
    "failure_policy": {
      "stop_policy": {
        "max_retry_times": 3,
        "max_duration_ms": 2000,
        "cb_policy": {
          "error_rate": 0.3
        }
      },
      "backoff_policy": {
        "backoff_type": "fixed",
        "cfg_items": {
          "fix_ms": 50
        }
      },
      "retry_same_node": false
    }
  },
  "echo": {
    "enable": true,
    "type": 1,
    "backup_policy": {
      "retry_delay_ms": 100,
      "retry_same_node": false,
      "stop_policy": {
        "max_retry_times": 2,
        "max_duration_ms": 300,
        "cb_policy": {
          "error_rate": 0.2
        }
      }
    }
  }
}
```

注：retry.Container 内置支持用 \* 通配符指定默认配置（详见 [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) 方法）

#### 超时

Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

例子：

> configPath: /KitexConfig/ClientName/ServiceName/rpc_timeout

```json
{
  "*": {
    "conn_timeout_ms": 100,
    "rpc_timeout_ms": 3000
  },
  "echo": {
    "conn_timeout_ms": 50,
    "rpc_timeout_ms": 1000
  }
}
```

注：kitex 的熔断实现目前不支持修改全局默认配置（详见 [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195)）

#### 熔断

Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

| 参数       | 说明             |
| ---------- | ---------------- |
| min_sample | 最小的统计样本数 |

例子：

echo 方法使用下面的配置（0.3、100），其他方法使用全局默认配置（0.5、200）

> configPath: /KitexConfig/ClientName/ServiceName/circuit_break

```json
{
  "echo": {
    "enable": true,
    "err_rate": 0.3,
    "min_sample": 100
  }
}
```

## 兼容性

Go 的版本必须 >= 1.20
