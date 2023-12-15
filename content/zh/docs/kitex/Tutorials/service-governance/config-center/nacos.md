---
title: "nacos"
linkTitle: "nacos"
date: 2023-12-14
weight: 4
keywords: ["配置中心扩展","Nacos"]
description: "使用 Nacos 作为 Kitex 的服务治理配置中心"
---

## 安装
`go get github.com/kitex-contrib/config-nacos`

## Suite
Nacos 的配置中心适配器，Kitex 通过 Nacos 中的配置转换为 Kitex 的治理特性配置。


### Server

```go
type NacosServerSuite struct {
	nacosClient nacos.Client
	service     string
	opts        utils.Options
}
```

函数签名：

`func NewSuite(service string, cli nacos.Client, opts ...utils.Option) *NacosServerSuite `

示例代码：

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
	"github.com/kitex-contrib/config-nacos/nacos"
	nacosserver "github.com/kitex-contrib/config-nacos/server"
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
	nacosClient, err := nacos.NewClient(nacos.Options{})
	if err != nil {
		panic(err)
	}
	serviceName := "ServiceName"  // your server-side service name
	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(nacosserver.NewSuite(serviceName, nacosClient)),
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
type NacosClientSuite struct {
	nacosClient nacos.Client
	service     string
	client      string
	opts        utils.Options
}
```

函数签名：

`func NewSuite(service, client string, cli nacos.Client, opts ...utils.Option) *NacosClientSuite `

示例代码：

```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex/pkg/klog"
	nacosclient "github.com/kitex-contrib/config-nacos/client"
	"github.com/kitex-contrib/config-nacos/nacos"
	"github.com/nacos-group/nacos-sdk-go/vo"
)

type configLog struct{}

func (cl *configLog) Apply(opt *utils.Options) {
	fn := func(cp *vo.ConfigParam) {
		klog.Infof("nacos config %v", cp)
	}
	opt.NacosCustomFunctions = append(opt.NacosCustomFunctions, fn)
}

func main() {
	klog.SetLevel(klog.LevelDebug)

	nacosClient, err := nacos.NewClient(nacos.Options{})
	if err != nil {
		panic(err)
	}

	cl := &configLog{}
	serviceName := "ServiceName"  // your server-side service name
	clientName := "ClientName"    // your client-side service name
	client, err := echo.NewClient(
		serviceName,
		client.WithHostPorts("0.0.0.0:8888"),
		client.WithSuite(nacosclient.NewSuite(serviceName, clientName, nacosClient, cl)),
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
	}
}
```

### SetParser

设置反序列化 Nacos 配置的自定义解析器，默认支持 json 和 yaml 格式，有新的格式需要用户自己实现。

函数签名:

`func SetParser(parser ConfigParser)`

```go
// ConfigParser the parser for nacos config.
type ConfigParser interface {
	Decode(kind vo.ConfigType, data string, config interface{}) error
}
```

示例代码:

设置解析 xml 类型的配置
```go
package main

import (
    "encoding/xml"

    "sigs.k8s.io/yaml"
    "github.com/kitex-contrib/config-nacos/nacos"
)

type parser struct{}

// Decode decodes the data to struct in specified format.
func (p *parser) Decode(kind vo.ConfigType, data string, config interface{}) error {
	switch kind {
	case vo.YAML, vo.JSON:
		// since YAML is a superset of JSON, it can parse JSON using a YAML parser
		return yaml.Unmarshal([]byte(data), config)
	case vo.XML:
		return xml.Unmarshal([]byte(data), config)
	default:
		return fmt.Errorf("unsupported config data type %s", kind)
	}
}


func main() {
    client, err := nacos.NewClient(etcd.Options{})
    if err!=nil {
        panic(err)
    }
    client.SetParser(&parser{})
}
```

## Nacos 配置

根据 Options 的参数初始化 client，建立链接之后 suite 会根据 `Group` 以及 `ServerDataIDFormat` 或者 `ClientDataIDFormat` 订阅对应的配置并动态更新自身策略，具体参数参考下面 `Options` 变量。 

配置的格式默认支持 `json` 和 `yaml`，可以使用函数 [SetParser](https://github.com/kitex-contrib/config-nacos/blob/eb006978517678dd75a81513142d3faed6a66f8d/nacos/nacos.go#L68) 进行自定义格式解析方式，并在 `NewSuite` 的时候使用 `CustomFunction` 函数修改订阅函数的格式。

### CustomFunction

允许用户自定义 nacos 的参数。

### Options 默认值

| 参数 | 变量默认值 | 作用 |
| ------------------------- | ---------------------------------- | --------------------------------- |
| Address               | 127.0.0.1                          | nacos 服务器地址, 如果参数为空使用 serverAddr 环境变量值 |
| Port               | 8848                               | nacos 服务器端口, 如果参数为空使用 serverPort 环境变量值 |
| NamespaceID                 |                                    | nacos 中的 namespace Id, 如果参数为空使用 namespace 环境变量值 |
| ClientDataIDFormat              | {{.ClientServiceName}}.{{.ServerServiceName}}.{{.Category}}  | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ClientServiceName` `ServiceName` `Category` 三个元数据          |
| ServerDataIDFormat              | {{.ServerServiceName}}.{{.Category}}  | 使用 go [template](https://pkg.go.dev/text/template) 语法渲染生成对应的 ID, 使用 `ServiceName` `Category` 两个元数据          |
| Group               | DEFAULT_GROUP                      | 使用固定值，也可以动态渲染，用法同 DataIDFormat          |

### 治理策略

下面例子中的 configDataId 以及 configGroup 均使用默认值，服务名称为 ServiceName，客户端名称为 ClientName

#### 限流 
Category=limit
> 限流目前只支持服务端，所以 ClientServiceName 为空。

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

|字段|说明|
|----|----|
|connection_limit|最大并发数量| 
|qps_limit|每 100ms 内的最大请求数量| 

例子：

> configDataID: ServiceName.limit

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

> configDataId: ClientName.ServiceName.retry

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

> configDataId: ClientName.ServiceName.rpc_timeout

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

#### 熔断: 
Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

|参数|说明|
|----|----|
|min_sample| 最小的统计样本数| 

例子：

echo 方法使用下面的配置（0.3、100），其他方法使用全局默认配置（0.5、200）

> configDataId: `ClientName.ServiceName.circuit_break`

```json
{
  "echo": {
    "enable": true,
    "err_rate": 0.3, 
    "min_sample": 100 
  }
}
```

## 注意
在启动后不要删除 Nacos 上的配置信息，不然会产生大量的警告日志

## 兼容性
该包使用 Nacos1.x 客户端，Nacos2.0 和 Nacos1.0 服务端完全兼容该版本. [详情](https://nacos.io/zh-cn/docs/v2/upgrading/2.0.0-compatibility.html)



