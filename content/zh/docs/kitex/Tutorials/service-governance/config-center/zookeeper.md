---
title: "zookeeper"
linkTitle: "zookeeper"
date: 2023-12-18
weight: 6
keywords: ["配置中心扩展","ZooKeeper"]
description: "使用 ZooKeeper 作为 Kitex 的服务治理配置中心"

---
## 安装

`go get github.com/kitex-contrib/config-zookeeper`

## Suite

zookeeper 的配置中心适配器，kitex 通过 `WithSuite` 将 zookeeper 中的配置转换为 kitex 的治理特性配置。

以下是完整的使用样例:

### Server

```go
type ZookeeperServerSuite struct {
	zookeeperClient zookeeper.Client // config-zookeeper 中的 zookeeper client
	service         string // 服务端名称
	opts            utils.Options // 用户自定义配置函数
}
```

函数签名:

`func NewSuite(service string, cli zookeeper.Client, opts ...utils.Option) *ZookeeperServerSuite`

示例代码:

```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/pkg/klog"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	zookeeperServer "github.com/kitex-contrib/config-zookeeper/server"
	"github.com/kitex-contrib/config-zookeeper/zookeeper"
)

var _ api.Echo = &EchoImpl{}

type EchoImpl struct{}

func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.Info("echo called")
	return &api.Response{Message: req.Message}, nil
}

func main() {
	zookeeperClient, err := zookeeper.NewClient(zookeeper.Options{})
	if err != nil {
		panic(err)
	}
	serviceName := "ServiceName" // 你的服务端名称
	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(zookeeperServer.NewSuite(serviceName, zookeeperClient)),
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
type ZookeeperClientSuite struct {
	zookeeperClient zookeeper.Client // config-zookeeper 中的 zookeeper client
	service         string // 服务端名称
	client          string // 客户端名称
	opts            utils.Options // 用户自定义配置函数
}
```

函数签名:

`func NewSuite(service, client string, cli zookeeper.Client, opts ...utils.Option) *ZookeeperClientSuite`

示例代码:

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex/pkg/klog"
	zookeeperclient "github.com/kitex-contrib/config-zookeeper/client"
	"github.com/kitex-contrib/config-zookeeper/utils"
	"github.com/kitex-contrib/config-zookeeper/zookeeper"
)

type configLog struct{}

func (cl *configLog) Apply(opt *utils.Options) {
	fn := func(k *zookeeper.ConfigParam) {
		klog.Infof("zookeeper config %v", k)
	}
	opt.ZookeeperCustomFunctions = append(opt.ZookeeperCustomFunctions, fn)
}

func main() {
	zookeeperClient, err := zookeeper.NewClient(zookeeper.Options{})
	if err != nil {
		panic(err)
	}

	cl := configLog{}

	serviceName := "ServiceName" // 你的服务端名称
	clientName := "ClientName"   // 你的客户端名称
	client, err := echo.NewClient(
		serviceName,
		client.WithHostPorts("0.0.0.0:8888"),
		client.WithSuite(zookeeperclient.NewSuite(serviceName, clientName, zookeeperClient, &cl)),
	)
	if err != nil {
		log.Fatal(err)
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

import "github.com/kitex-contrib/config-zookeeper/zookeeper"

func main() {
	zookeeperClient, err := zookeeper.NewClient(zookeeper.Options{})
	if err != nil {
		panic(err)
	}
}

```

### SetParser

设置反序列化 zookeeper 配置的自定义解析器，若不指定则为默认解析器。

默认设置的解析器解析的是 json 格式的配置

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

import (
	"github.com/kitex-contrib/config-zookeeper/zookeeper"
	"gopkg.in/yaml.v3"
)

func (p *parser) Decode(data string, config interface{}) error {
	return yaml.Unmarshal([]byte(data), config)
}

type parser struct{}

func main() {
	zookeeperClient, err := zookeeper.NewClient(zookeeper.Options{})
	if err != nil {
		panic(err)
	}
	zookeeperClient.SetParser(&parser{})
}

```

## ZooKeeper 配置

### Options 结构体

```go
type Options struct {
	Servers          []string
	Prefix           string
	ServerPathFormat string
	ClientPathFormat string
	CustomLogger     zk.Logger
	ConfigParser     ConfigParser
}
```

### Options 默认值

```go
type ConfigParam struct {
	Prefix string
	Path   string
}
```

kitex-contrib/config-zookeeper 中的最终 path 由 ConfigParam 中的 Prefix 和 Path 拼接而成：`param.Prefix + "/" + param.Path`

| 参数             | 变量默认值                                                  | 作用                                                         |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Servers          | 127.0.0.1:2181                                              | Zookeeper的服务器节点                                        |
| Prefix           | /KitexConfig                                                | Zookeeper中的 prefix                                         |
| ClientPathFormat | {{.ClientServiceName}}/{{.ServerServiceName}}/{{.Category}} | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ClientServiceName` `ServiceName` `Category` 三个元数据 |
| ServerPathFormat | {{.ServerServiceName}}/{{.Category}}                        | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ServiceName` `Category` 两个元数据 |
| ConfigParser     | defaultConfigParser                                         | 解析 json 数据的解析器                                       |

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



注：retry.Container 内置支持用 * 通配符指定默认配置（详见 [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) 方法）

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

echo 方法使用下面的配置（0.3, 100），其他方法使用全局默认配置（0.5, 200）

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

