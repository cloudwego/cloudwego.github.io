---
title: "Consul"
date: 2024-03-02
weight: 6
keywords: ["ConfigCenter Extension", "consul"]
description: "Using consul as Kitex's service governance configuration center"
---

## Installation

`go get github.com/kitex-contrib/config-consul`

## Suite

The configuration center adapter of consul, kitex uses `WithSuite` to convert the configuration in consul into the governance feature configuration of kitex.

The following is a complete usage example:

### Server

```go
type ConsulServerSuite struct {
    uid          int64
    consulClient consul.Client
    service      string
    opts         utils.Options
}
```

Function Signature:

`func NewSuite(service string, cli consul.Client, opts ...utils.Option) *ConsulServerSuite`

Sample code:

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

function main() {
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

Function Signature:

`func NewSuite(service, client string, cli consul.Client, opts ...utils.Option) *ConsulClientSuite`

Sample code:

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

function main() {
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

Create client.

Function Signature:

`func NewClient(opts Options) (Client, error)`

Sample code:

```go
package main

import "github.com/kitex-contrib/config-consul/consul"

function main() {
	consulClient, err := consul.NewClient(consul.Options{})
	if err!=nil {
		panic(err)
	}
}
```

### CustomFunction

Provide the mechanism to custom the consul parameter Key.

```go
type Key struct {
    Type   ConfigType
    Prefix string
    Path   string
}
```

The key in Consul is made up of prefix and path, where prefix is the prefix and path is the path.

Type refers to the configuration format, supports json and yaml by default, and you can use the function SetParser to implement the parsing of custom formats and modify the format of the subscription function during NewSuite using the CustomFunction function.

### SetParser

Set a custom parser for deserializing consul configuration. If not specified, it will be the default parser.

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

import "github.com/kitex-contrib/config-consul/consul"

func (p *parser) Decode(data string, config interface{}) error {
	return yaml.Unmarshal([]byte(data), config)
}

type parser struct {}

function main() {
    consulClient, err := consul.NewClient(consul.Options{})
    if err!=nil {
        panic(err)
    }
    consulClient.SetParser(&parser{})
}
```

## Consul Configuration

### Options structure

```go
type Options struct {
    Addr             string
    Prefix           string
    ServerPathFormat string
    ClientPathFormat string
    DataCenter       string
    Timeout          time.Duration
    NamespaceId      string
    Token            string
    Partition        string
    LoggerConfig     *zap.Config
    ConfigParser     ConfigParser
}
```

### Options defaults

| Parameter        | Default                                                     | Description                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Addr             | 127.0.0.1:8500                                              | Consul server address                                                                                                                                                                                                                       |
| Prefix           | /KitexConfig                                                | The prefix of Consul                                                                                                                                                                                                                        |
| ServerPathFormat | {{.ServerServiceName}}/{{.Category}}                        | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ServiceName` `Category` two metadatas that can be customised, used with Prefix to form the key in etcd                        |
| ClientPathFormat | {{.ClientServiceName}}/{{.ServerServiceName}}/{{.Category}} | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ClientServiceName` `ServiceName` `Category` three metadata that can be customised, used with Prefix to form the key in consul |
| DataCenter       | dc1                                                         | Consul default data center                                                                                                                                                                                                                  |
| Timeout          | 5 \* time.Second                                            | Timeout duration of 5s                                                                                                                                                                                                                      |
| NamespaceId      |                                                             | Consul Namespace Id                                                                                                                                                                                                                         |
| Token            |                                                             | Auth Token for Consul service                                                                                                                                                                                                               |
| Partition        |                                                             | Consul Partition                                                                                                                                                                                                                            |
| LoggerConfig     | NULL                                                        | Default Logger                                                                                                                                                                                                                              |
| ConfigParser     | defaultConfigParser                                         | The default parser, which defaults to parsing json and yaml format data                                                                                                                                                                     |

### Governance Policy

> The configPath and configPrefix in the following example use default values, the service name is `ServiceName` and the client name is `ClientName`.

#### Rate Limit Category=limit

> Currently, current limiting only supports the server side, so ClientServiceName is empty.

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

| Variable         | Introduction                       |
| ---------------- | ---------------------------------- |
| connection_limit | Maximum concurrent connections     |
| qps_limit        | Maximum request number every 100ms |

Example:

> configPath: /KitexConfig/ServiceName/limit

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

#### Retry Policy Category=retry

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/retry/policy.go#L63)

| Variable                      | Introduction                                   |
| ----------------------------- | ---------------------------------------------- |
| type                          | 0: failure_policy 1: backup_policy             |
| failure_policy.backoff_policy | Can only be set one of `fixed` `none` `random` |

Example：

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

Note: retry.Container has built-in support for specifying the default configuration using the `*` wildcard (see the [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) method for details).

#### RPC Timeout Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

Example：

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

Note: The circuit breaker implementation of kitex does not currently support changing the global default configuration (see [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195) for details).

#### Circuit Break: Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

| Variable   | Introduction                      |
| ---------- | --------------------------------- |
| min_sample | Minimum statistical sample number |

Example：

The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200)

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

## Compatibility

Go version must be >= 1.20
