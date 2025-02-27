---
title: "Etcd"
date: 2023-11-29
weight: 1
keywords: ["ConfigCenter Extension", "etcd"]
description: "Use etcd as Kitex’s service governance configuration center"
---

## Install

`go get github.com/kitex-contrib/config-etcd`

## Suite

The configuration center adapter of etcd, kitex uses `WithSuite` to convert the configuration in etcd into the governance feature configuration of kitex.

The following is a complete usage example:

### Server

```go
type EtcdServerSuite struct {
    uid        int64
    etcdClient etcd.Client // etcd client in config-etcd
    service    string
    opts       utils.Options
}
```

Function Signature:

`func NewSuite(service string, cli etcd.Client, opts ...utils.Option,) *EtcdServerSuite`

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
	"github.com/kitex-contrib/config-etcd/etcd"
	etcdServer "github.com/kitex-contrib/config-etcd/server"
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
	serviceName := "ServiceName" // your server-side service name
	etcdClient, _ := etcd.NewClient(etcd.Options{})
	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(etcdServer.NewSuite(serviceName, etcdClient)),
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
type EtcdServerSuite struct {
    uid        int64
    etcdClient etcd.Client // etcd client in config-etcd
    service    string
    opts       utils.Options
}
```

Function Signature:

`func NewSuite(service,client string, cli etcd.Client, opts ...utils.Option,) *EtcdServerSuite`

Sample code:

```go
package main

import (
    "log"

    "github.com/cloudwego/kitex-examples/kitex_gen/api"
    "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
    "github.com/cloudwego/kitex/client"
    etcdclient "github.com/kitex-contrib/config-etcd/client"
    "github.com/kitex-contrib/config-etcd/etcd"
)

func main() {
    etcdClient, err := etcd.NewClient(etcd.Options{})
    if err != nil {
        panic(err)
    }

    serviceName := "ServiceName" // your server-side service name
    clientName := "ClientName"   // your client-side service name
    client, err := echo.NewClient(
        serviceName,
        client.WithHostPorts("0.0.0.0:8888"),
        client.WithSuite(etcdclient.NewSuite(serviceName, clientName, etcdClient)),
    )
    if err != nil {
        log.Fatal(err)
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

import "github.com/kitex-contrib/config-etcd/etcd"

func main() {
    etcdClient, err := etcd.NewClient(etcd.Options{})
    if err!=nil {
        panic(err)
    }
}
```

### SetParser

Set a custom parser for deserializing etcd configuration. If not specified, it will be the default parser.

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

import "github.com/kitex-contrib/config-etcd/etcd"

func (p *parser) Decode(data string, config interface{}) error {
    return yaml.Unmarshal([]byte(data), config)
}

type parser struct{}

func main() {
    etcdClient, err := etcd.NewClient(etcd.Options{})
    if err!=nil {
        panic(err)
    }
    etcdClient.SetParser(&parser{})
}
```

## Etcd Configuration

### Options Struct

```go
type Options struct {
	Node             []string
	Prefix           string
	ServerPathFormat string
	ClientPathFormat string
	Timeout          time.Duration
	LoggerConfig     *zap.Config
	ConfigParser     ConfigParser
}
```

### Options Variable

```go
type Key struct {
    Prefix string
    Path   string
}
```

The key in etcd consists of prefix and path, where prefix is the prefix and path is the path.

| Variable Name    | Default Value                                               | Introduction                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node             | 127.0.0.1:2379                                              | Etcd server nodes                                                                                                                                                                                                                         |
| Prefix           | /KitexConfig                                                | The prefix of Etcd                                                                                                                                                                                                                        |
| ClientPathFormat | {{.ClientServiceName}}/{{.ServerServiceName}}/{{.Category}} | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ClientServiceName` `ServiceName` `Category` three metadata that can be customised, used with Prefix to form the key in etcd |
| ServerPathFormat | {{.ServerServiceName}}/{{.Category}}                        | Use go [template](https://pkg.go.dev/text/template) syntax rendering to generate the appropriate ID, and use `ServiceName` `Category` two metadatas that can be customised, used with Prefix to form the key in etcd                      |
| Timeout          | 5 \* time.Second                                            | five seconds timeout                                                                                                                                                                                                                      |
| LoggerConfig     | NULL                                                        | Default Logger                                                                                                                                                                                                                            |
| ConfigParser     | defaultConfigParser                                         | The default parser, which defaults to parsing json format data                                                                                                                                                                            |

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

#### RPC Timeout

Category=rpc_timeout

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

#### Circuit Break

Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

| Variable   | Introduction                      |
| ---------- | --------------------------------- |
| min_sample | Minimum statistical sample number |

Example：

The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200).

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
#### Degradation

[JSON Schema](https://github.com/kitex-contrib/config-etcd/blob/main/pkg/degradation/item_degradation.go#L34)

| Variable   | Introduction                       |
|------------|------------------------------------|
| enable     | Whether to enable degradation      |
| percentage | The percentage of dropped requests | 

Example：

> configPath: /KitexConfig/ClientName/ServiceName/degradation

```json
{
  "enable": true,
  "percentage": 30
}
```
Note: Degradation is not enabled by default.

## Compatibility

For grpc compatibility, the version of Go must >=1.19
