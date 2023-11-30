---
title: "配置中心扩展"
linkTitle: "配置中心扩展"
date: 2023-11-29
weight: 1
keywords: ["配置中心扩展"]
description: "kitex-contrib 提供对配置中心的扩展"

---

## Kitex 对接配置中心

Kitex 提供了可动态配置的服务治理能力，包括客户端的超时、重试、熔断，以及服务端的限流。

kitex-contrib 提供了对于社区主流配置中心的拓展，实现了动态配置对接 kitex 治理特性

微服务的开发者可以动态获取服务治理配置，并且是准实时生效，这些能力对提高微服务的 SLA 非常有帮助。

目前支持的配置中心有

|  配置中心  |                               仓库                                |
|:------:|:---------------------------------------------------------------:|
| nacos  |  [config-nacos](https://github.com/kitex-contrib/config-nacos)  |
|  etcd  |   [config-etcd](https://github.com/kitex-contrib/config-etcd)   |
| apollo | [config-apollo](https://github.com/kitex-contrib/config-apollo) |

## Suite

在对接配置中心的过程中，使用了 Suite（套件）来进行第三方的拓展

Suite 的定义如下:
```go
type Suite interface {
    Options() []Option
}
```
Server 端和 Client 端都是通过 WithSuite 这个方法来启用新的套件。

更多关于 Suite 的介绍请见 [Suite](../../framework-exten/suite.md)

以下是以 etcd 为例在 Server 和 Client 中添加 Suite:

### Server
```go
type EtcdServerSuite struct {
    uid        int64
    etcdClient etcd.Client
    service    string
    opts       utils.Options
}
```

函数签名:

`func NewSuite(service string, cli etcd.Client, opts ...utils.Option,) *EtcdServerSuite`

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
    etcdClient etcd.Client
    service    string
    opts       utils.Options
}
```

函数签名:

`func NewSuite(service,client string, cli etcd.Client, opts ...utils.Option,) *EtcdServerSuite`

示例代码:

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

