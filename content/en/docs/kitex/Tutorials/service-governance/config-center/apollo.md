---
title: "apollo"
linkTitle: "apollo"
date: 2023-12-12
weight: 3
keywords: ["ConfigCenter Extension","apollo"]
description: "Use apollo as Kitex’s service governance configuration center"

---
## Install

`go get github.com/kitex-contrib/config-apollo`

## Suite
The configuration center adapter of apollo, kitex uses `WithSuite` to convert the configuration in apollo into the governance feature configuration of kitex.

The following is a complete usage example:

### Server

```go
type ApolloServerSuite struct {
	apolloClient apollo.Client // apollo client in config-apollo
	service      string // server-side service name
	opts         utils.Options // customize func
}
```

Function Signature:

`func NewSuite(service string, cli apollo.Client, options ...utils.Option) *ApolloServerSuite`

Sample code:

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
	serviceName := "ServiceName" // your server-side service name

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
	apolloClient apollo.Client // apollo client in config-apollo
	service      string // server-side service name
	client       string // client-side service name
	opts         utils.Options // customize func
}
```

Function Signature:

`func NewSuite(service, client string, cli apollo.Client,options ...utils.Option) *ApolloClientSuite`

Sample code:

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

	serviceName := "ServiceName" // your server-side service name
	clientName := "ClientName"   // your client-side service name
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

Create client.

Function Signature:

``func NewClient(opts Options, optsfunc ...OptionFunc) (Client, error)``

Sample code:

```go
package main

import "github.com/kitex-contrib/config-apollo/apollo"

func main() {
	apolloClient, err := apollo.NewClient(apollo.Options{}, apollo.WithApolloOption())
	if err != nil {
		panic(err)
	}
}
```

### SetParser

Set a custom parser for deserializing apollo configuration. If not specified, it will be the default parser.

The default parser parses configuration in json format.(only parsing JSON format is supported currently)

Function Signature:

`func (c *client) SetParser(parser ConfigParser)`

```go
type ConfigParser interface {
	Decode(data string, config interface{}) error
}
```

Sample code:

Set the configuration for parsing json types.
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


## Apollo Configuration

### Options Struct
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
### Options Variable
```go
type ConfigParamConfig struct {
	Category          string
	ClientServiceName string
	ServerServiceName string
}
```
The type of the namespace in kitex contrib/configure Apollo is properties, and the format reference for the key is as follows: ClientKeyFormat or ServerKeyFormat, with 'value' fixed in JSON format

| 参数            | 变量默认值                                    | 作用                                                         |
| --------------- | --------------------------------------------- | ------------------------------------------------------------ |
| ConfigServerURL | 127.0.0.1:8080                                | apollo config service address                                |
| AppID           | KitexApp                                      | appid of apollo (Uniqueness constraint / Length limit of 32 characters) |
| ClientKeyFormat | {{.ClientServiceName}}.{{.ServerServiceName}} | Using the go [template](https://pkg.go.dev/text/template) syntax to render and generate the corresponding ID, using two metadata: `ClientServiceName` and `ServiceName` (Length limit of 128 characters) |
| ServerKeyFormat | {{.ServerServiceName}}                        | Using the go [template](https://pkg.go.dev/text/template) Syntax rendering generates corresponding IDs, using 'ServiceName' as a single metadata (Length limit of 128 characters) |
| Cluster         | default                                       | Using default values, users can assign values as needed (Length limit of 32 characters) |
| ConfigParser    | defaultConfigParser                           | The default parser, which defaults to parsing json format data (only parsing JSON format is supported currently) |

### Governance Policy
> The namespace in the following example uses fixed policy values, with default values for AppID and Cluster. The service name is ServiceName and the client name is ClientName

#### Rate Limit

Category=limit

> Currently, current limiting only supports the server side, so ClientServiceName is empty.

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

| Variable         | Introduction                       |
| ---------------- | ---------------------------------- |
| connection_limit | Maximum concurrent connections     |
| qps_limit        | Maximum request number every 100ms |

Example:

> namespace: `limit`
> 
> key: `ServiceName`


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

| Variable                      | Introduction                                   |
| ----------------------------- | ---------------------------------------------- |
| type                          | 0: failure_policy 1: backup_policy             |
| failure_policy.backoff_policy | Can only be set one of `fixed` `none` `random` |

Example:

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

Note: retry.Container has built-in support for specifying the default configuration using the `*` wildcard (see the [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) method for details).

#### RPC Timeout

Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

Example:

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

Note: The circuit breaker implementation of kitex does not currently support changing the global default configuration (see [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195) for details).

#### Circuit Break

Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

| Variable   | Introduction                      |
| ---------- | --------------------------------- |
| min_sample | Minimum statistical sample number |

Example:

> namespace: `circuit_break`
> 
> key: `ClientName.ServiceName`

```json
The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200)
{
  "echo": {
    "enable": true,
    "err_rate": 0.3, 
    "min_sample": 100 
  }
}
```