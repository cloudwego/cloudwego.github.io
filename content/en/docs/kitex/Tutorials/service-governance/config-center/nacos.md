---
title: "nacos"
linkTitle: "nacos"
date: 2023-12-14
weight: 4
keywords: ["ConfigCenter Extension","Nacos"]
description: "Use Nacos as Kitex’s service governance configuration center"
---

### Install
`go get github.com/kitex-contrib/config-nacos`

## Suite
The configuration center adapter of Nacos.


### Server

```go
type NacosServerSuite struct {
	nacosClient nacos.Client
	service     string  // server-side service name
	opts        utils.Options
}
```

Function Signature:

`func NewSuite(service string, cli nacos.Client, opts ...utils.Option) *NacosServerSuite `

Sample:

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

Function Signature:

`func NewSuite(service, client string, cli nacos.Client, opts ...utils.Option) *NacosClientSuite `

Sample:

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

Set a custom parser for deserializing configuration, support json yaml default. User could extend it by self.

Function Signature:

`func SetParser(parser ConfigParser)`

```go
// ConfigParser the parser for nacos config.
type ConfigParser interface {
	Decode(kind vo.ConfigType, data string, config interface{}) error
}
```

Sample:

Extend parsing XML types.
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

## Nacos Configuration

The client is initialized according to the parameters of `Options` and connects to the nacos server. After the connection is established, the suite subscribes the appropriate configuration based on `Group`, `ServerDataIDFormat` and `ClientDataIDFormat` to updates its own policy dynamically. See the `Options` variables below for specific parameters.

The configuration format supports `json` and `yaml`. You can use the [SetParser](https://github.com/kitex-contrib/config-nacos/blob/eb006978517678dd75a81513142d3faed6a66f8d/nacos/nacos.go#L68) function to customise the format parsing method, and the `CustomFunction` function to customise the format of the subscription function during `NewSuite`.

### CustomFunction

Provide the mechanism to custom the nacos parameter `vo.ConfigParam`. 

### Options Variable

| Variable Name | Default Value | Introduction |
| ------------------------- | ---------------------------------- | --------------------------------- |
| Address               | 127.0.0.1                          | Nacos server address, may use the environment of `serverAddr` |
| Port               | 8848                               | Nacos server port, may use the environment of `serverPort` |
| NamespaceID                 |                                    | The namespaceID of Nacos, may use the environment of `namespace` |
| ClientDataIDFormat              | {{.ClientServiceName}}.{{.ServerServiceName}}.{{.Category}}  | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ClientServiceName` `ServiceName` `Category` three metadata that can be customised          |
| ServerDataIDFormat              | {{.ServerServiceName}}.{{.Category}}  | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ServiceName` `Category` two metadatas that can be customised          |
| Group               | DEFAULT_GROUP                      | Use fixed values or dynamic rendering. Usage is the same as configDataId.          |

### Governance Policy
> The configDataId and configGroup in the following example use default values, the service name is `ServiceName` and the client name is `ClientName`.

#### Rate Limit 
Category=limit
> Currently, current limiting only supports the server side, so ClientServiceName is empty.

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

|Variable|Introduction|
|----|----|
|connection_limit| Maximum concurrent connections | 
|qps_limit| Maximum request number every 100ms | 

Example:

> configDataID: ServiceName.limit

```json
{
  "connection_limit": 100,
  "qps_limit": 2000
}
```

Note:

- The granularity of the current limit configuration is server global, regardless of client or method.
- Not configured or value is 0 means not enabled.
- connection_limit and qps_limit can be configured independently, e.g. connection_limit = 100, qps_limit = 0

#### Retry Policy 
Category=retry
[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/retry/policy.go#L63)

|Variable|Introduction|
|----|----|
|type| 0: failure_policy 1: backup_policy| 
|failure_policy.backoff_policy| Can only be set one of `fixed` `none` `random` | 

Example：

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
Note: retry.Container has built-in support for specifying the default configuration using the `*` wildcard (see the [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) method for details).

#### RPC Timeout 
Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

Example：

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
Note: The circuit breaker implementation of kitex does not currently support changing the global default configuration (see [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195) for details).

#### Circuit Break 
Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

|Variable|Introduction|
|----|----|
|min_sample| Minimum statistical sample number| 

Example：

The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200)

> configDataId: `ClientName.ServiecName.circuit_break`

```json
{
  "echo": {
    "enable": true,
    "err_rate": 0.3, 
    "min_sample": 100 
  }
}
```

## Note
Do not delete the config in nacos, otherwise the nacos sdk may produce a large warning log.


## Compatibility
This Package use Nacos1.x client. The Nacos2.0 and Nacos1.0 Server are fully compatible with it. [see](https://nacos.io/en-us/docs/v2/upgrading/2.0.0-compatibility.html)



