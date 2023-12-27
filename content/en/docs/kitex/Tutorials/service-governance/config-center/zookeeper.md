---
title: "zookeeper"
linkTitle: "zookeeper"
date: 2023-12-18
weight: 6
keywords: ["ConfigCenter Extension","ZooKeeper"]
description: "Use ZooKeeper as Kitex’s service governance configuration center"

---
## Install

`go get github.com/kitex-contrib/config-zookeeper`

## Suite
The configuration center adapter of zookeeper, kitex uses `WithSuite` to convert the configuration in zookeeper into the governance feature configuration of kitex.

The following is a complete usage example:

### Server

```go
type ZookeeperServerSuite struct {
	zookeeperClient zookeeper.Client // zookeeper client in config-zookeeper
	service         string // server-side service name
	opts            utils.Options // customize func
}
```

Function Signature:

`func NewSuite(service string, cli zookeeper.Client, opts ...utils.Option) *ZookeeperServerSuite`

Sample code:

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
	serviceName := "ServiceName" // your server-side service name
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
	zookeeperClient zookeeper.Client // zookeeper client in config-zookeeper
	service         string // server-side service name
	client          string // client-side service name
	opts            utils.Options // customize func
}
```

Function Signature:

`func NewSuite(service, client string, cli zookeeper.Client, opts ...utils.Option) *ZookeeperClientSuite`

Sample code:

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

	serviceName := "ServiceName" // your server-side service name
	clientName := "ClientName"   // your client-side service name
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

### NewClient

Create client.

Function Signature:

`func NewClient(opts Options) (Client, error)`

Sample code:

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

#### SetParser

Set a custom parser for deserializing zookeeper configuration. If not specified, it will be the default parser.

The default parser parses configuration in json format.

Function Signature:

`func (c *client) SetParser(parser ConfigParser)`

```go
type ConfigParser interface {
	Decode(data string, config interface{}) error
}
```

Sample code:

Set the configuration for parsing yaml types.

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

## ZooKeeper Configuration

### Options Struct

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

### Options Variable

```go
type ConfigParam struct {
	Prefix string
	Path   string
}
```

The final path in kitex-contrib/config-zookeeper is a combination of Prefix and Path in ConfigParam: `param.Prefix + "/" + param.Path`

| Variable Name    | Default Value                                               | Introduction                                                 |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Servers          | 127.0.0.1:2181                                              | Zookeeper server nodes                                       |
| Prefix           | /KitexConfig                                                | The prefix of Zookeeper                                      |
| ClientPathFormat | {{.ClientServiceName}}/{{.ServerServiceName}}/{{.Category}} | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ClientServiceName` `ServiceName` `Category` three metadata that can be customised |
| ServerPathFormat | {{.ServerServiceName}}/{{.Category}}                        | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ServiceName` `Category` two metadatas that can be customised |
| ConfigParser     | defaultConfigParser                                         | The default is the parser that parses json                   |

### Governance Policy

> The configPath and configPrefix in the following example use default values, the service name is `ServiceName` and the client name is `ClientName`.

#### Rate Limit 

Category=limit

> Currently, current limiting only supports the server side, so ClientServiceName is empty.

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

| Variable         | Introduction                       |
| ---------------- | ---------------------------------- |
| connection_limit | Maximum concurrent connections     |
| qps_limit        | Maximum request number every 100ms |

Example:

> configPath: /KitexConfig/ServiceName/limit

```
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

| Variable                      | Introduction                                   |
| ----------------------------- | ---------------------------------------------- |
| type                          | 0: failure_policy 1: backup_policy             |
| failure_policy.backoff_policy | Can only be set one of `fixed` `none` `random` |

Example：

> configPath: /KitexConfig/ClientName/ServiceName/retry

```
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

> configPath: /KitexConfig/ClientName/ServiceName/rpc_timeout

```
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

| Variable   | Introduction                      |
| ---------- | --------------------------------- |
| min_sample | Minimum statistical sample number |

Example：

The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200)

> configPath: /KitexConfig/ClientName/ServiceName/circuit_break

```
{
  "echo": {
    "enable": true,
    "err_rate": 0.3,
    "min_sample": 100
  }
}
```
