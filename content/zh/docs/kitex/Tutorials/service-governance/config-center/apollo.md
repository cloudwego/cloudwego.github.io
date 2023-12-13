---
title: "apollo"
linkTitle: "apollo"
date: 2023-12-12
weight: 3
keywords: ["配置中心扩展","apollo"]
description: "使用 apollo作为 Kitex 的服务治理配置中心"

---
## 安装

`go get github.com/kitex-contrib/config-apollo`

## Suite
apollo 的配置中心适配器，kitex 通过 `WithSuite` 将 apollo 中的配置转换为 kitex 的治理特性配置。

以下是完整的使用样例:

### Server

```go
type ApolloServerSuite struct {
	apolloClient apollo.Client // config-apollo 中的 apollo client
	service      string // 服务端名称
	opts         utils.Options // 用户自定义配置函数
}
```

函数签名:

`func NewSuite(service string, cli apollo.Client, options ...utils.Option) *ApolloServerSuite`

示例代码:

```go
package main

import (
	"context"
	"log"
	"net"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/pkg/klog"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	"github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/config-apollo/apollo"
	apolloserver "github.com/kitex-contrib/config-apollo/server"
	"github.com/kitex-contrib/config-apollo/utils"
)

var _ api.Echo = &EchoImpl{}

type EchoImpl struct{}

func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.Info("echo called")
	return &api.Response{Message: req.Message}, nil
}

func main() {
	klog.SetLevel(klog.LevelDebug)
	apolloClient, err := apollo.NewClient(apollo.Options{})
	if err != nil {
		panic(err)
	}
	serviceName := "ServiceName" // 你的服务端名称

	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(apolloserver.NewSuite(serviceName, apolloClient)),
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
type ApolloClientSuite struct {
	apolloClient apollo.Client // config-apollo 中的 apollo client
	service      string // 服务端名称
	client       string // 客户端名称
	opts         utils.Options // 用户自定义配置函数
}
```
函数签名:

`func NewSuite(service, client string, cli apollo.Client,options ...utils.Option) *ApolloClientSuite`

示例代码:

```go
package main

import (
	"log"

	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/client"
	"github.com/kitex-contrib/config-apollo/apollo"
	apolloclient "github.com/kitex-contrib/config-apollo/client"
)

func main() {
	apolloClient, err := apollo.NewClient(apollo.Options{})
	if err != nil {
		panic(err)
	}

	serviceName := "ServiceName" // 你的服务端名称
	clientName := "ClientName"   // 你的客户端名称
	client, err := echo.NewClient(
		serviceName,
		client.WithHostPorts("0.0.0.0:8888"),
		client.WithSuite(apolloclient.NewSuite(serviceName, clientName, apolloClient)),
	)
	if err != nil {
		log.Fatal(err)
	}
}

```

## NewClient

创建 client 客户端。

函数签名:

`func NewClient(opts Options, optsfunc ...OptionFunc) (Client, error)`

示例代码:

```go
package main

import "github.com/kitex-contrib/config-apollo/apollo"

func main() {
	apolloClient, err := apollo.NewClient(apollo.Options{})
	if err!=nil {
		panic(err)
	}
}
```

### SetParser

设置反序列化 apollo 配置的自定义解析器，若不指定则为默认解析器。

默认设置的解析器解析的是 json 格式的配置。(目前仅支持json格式)

函数签名:

`func (c *client) SetParser(parser ConfigParser)`

```go
type ConfigParser interface {
	Decode(kind ConfigType, data string, config interface{}) error
}
```

示例代码:

设置解析 json 类型的配置
```go
package main

import (
	"github.com/bytedance/sonic"
	"github.com/kitex-contrib/config-apollo/apollo"
)

func (p *parser) Decode(data string, config interface{}) error {
	return sonic.Unmarshal([]byte(data), config)
}

type parser struct{}

func main() {
	apolloClient, err := apollo.NewClient(apollo.Options{})
	if err != nil {
		panic(err)
	}
	apolloClient.SetParser(&parser{})
}
```

## Apollo 配置

### Options 结构体
```go
type Options struct {
	ConfigServerURL string
	AppID           string
	Cluster         string
	ServerKeyFormat string
	ClientKeyFormat string
	ApolloOptions   []agollo.Option
	ConfigParser    ConfigParser
}
```
### Options 默认值
```go
type ConfigParamConfig struct {
	Category          string
	ClientServiceName string
	ServerServiceName string
}
```
kitex-contrib/config-apollo 中设计 namespace 的类型为 properties ，key 的格式参考如下： ClientKeyFormat 或 ServerKeyFormat ，value 固定为 json 格式

| 参数 | 变量默认值 | 作用 |
| :------------------------ | :--------------------------------: | --------------------------------- |
| ConfigServerURL | 127.0.0.1:8080                     | apollo config service 地址 |
| AppID            | KitexApp | apollo 的 appid (唯一性约束) |
| ClientKeyFormat | {{.ClientServiceName}}.{{.ServerServiceName}}  | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ClientServiceName` `ServiceName` 两个元数据 (长度不超过128个字符) |
| ServerKeyFormat | {{.ServerServiceName}}  | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ServiceName` ` 单个元数据 (长度不超过128个字符) |
| Cluster             | default                      | 使用默认值，用户可根据需要赋值 (长度不超过32个字符) |
| ConfigParser |              defaultConfigParser              | 默认解析器，默认为解析 json 格式的数据(目前设计仅支持json解析) |

### 治理策略

下面例子中的 namespace 使用策略固定值， APPID 以及 Cluster 均使用默认值，服务名称为 ServiceName，客户端名称为 ClientName

#### 限流 

Category=limit

> 限流目前只支持服务端，所以 ClientServiceName 为空。

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

|字段|说明|
|----|----|
|connection_limit|最大并发数量| 
|qps_limit|每 100ms 内的最大请求数量| 

例子：

> namespace: `limit`
> 
> key: `ServiceName`

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

|参数|说明|
|----|----|
|type| 0: failure_policy 1: backup_policy| 
|failure_policy.backoff_policy| 可以设置的策略： `fixed` `none` `random` | 

例子：

> namespace: `retry`
> 
> key: `ClientName.ServiceName`

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

> namespace: `rpc_timeout`
> 
> key: `ClientName.ServiceName`

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

|参数|说明|
|----|----|
|min_sample| 最小的统计样本数| 
例子：

> namespace: `circuit_break`
> 
> key: `ClientName.ServiceName`

```json
echo 方法使用下面的配置（0.3、100），其他方法使用全局默认配置（0.5、200）
{
  "echo": {
    "enable": true,
    "err_rate": 0.3, 
    "min_sample": 100 
  }
}
```