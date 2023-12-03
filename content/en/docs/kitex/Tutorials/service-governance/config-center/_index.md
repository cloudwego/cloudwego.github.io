---
title: "ConfigCenter Extension"
linkTitle: "ConfigCenter Extension"
date: 2023-11-29
weight: 1
keywords: ["ConfigCenter Extension"]
description: "ConfigCenter Extension provided by kitex-contrib"

---

## Kitex provide configuration center

Kitex provides dynamically configurable service management capabilities, including client timeout, retry, circuit breaker, and server limiting.

kitex-contrib provides an extension to the community's mainstream configuration center and realizes dynamic configuration docking with kitex governance features.

Microservice developers can use the configuration center to dynamically obtain service governance configurations, which take effect in near real-time

Currently supported configuration centers are

| config-center |                           depository                            |
|:-------------:|:---------------------------------------------------------------:|
|     nacos     |  [config-nacos](https://github.com/kitex-contrib/config-nacos)  |
|     etcd      |   [config-etcd](https://github.com/kitex-contrib/config-etcd)   |
|    apollo     | [config-apollo](https://github.com/kitex-contrib/config-apollo) |

## Suite

In the process of connecting to the configuration center, Suite is used for third-party expansion.

Suite is defined as follows:
```go
type Suite interface {
    Options() []Option
}
```
Both the server and the client use the WithSuite method to enable new suites.

For more information about Suite, please see [Suite](../../framework-exten/suite.md)

The following is taking etcd as an example to add Suite to Server and Client:

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
