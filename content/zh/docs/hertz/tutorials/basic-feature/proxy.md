---
title: "正向代理和反向代理"
date: 2022-09-08
weight: 9
description: >

---

## 何为正向代理

正向代理是一种特殊的网络服务，允许一个网络终端（一般为客户端）通过这个服务与另一个网络终端（一般为服务器）进行非直接的连接。一些网关、路由器等网络设备具备网络代理功能。一般认为代理服务有利于保障网络终端的隐私或安全，防止攻击。

一个完整的代理请求过程为：客户端（Client）首先与代理服务器创建连接，接着根据代理服务器所使用的代理协议，请求对目标服务器创建连接、或者获得目标服务器的指定资源。

### 接口

```go
// Proxy 结构体，根据 request 来选定访问的代理 uri
type Proxy func(*protocol.Request) (*protocol.URI, error)

// ProxyURI 用来生成只会返回固定代理 uri 的 Proxy
func ProxyURI(fixedURI *protocol.URI) Proxy

// SetProxy 用来设置 client 的 proxy，设置后 client 会与 proxy 建连发请求
func (c *Client) SetProxy(p protocol.Proxy)
```

### 例子

```go
package main

import (
   "context"

   "github.com/cloudwego/hertz/pkg/app/client"
   "github.com/cloudwego/hertz/pkg/protocol"
)

func main() {
   proxyURL := "http://<__user_name__>:<__password__>@<__proxy_addr__>:<__proxy_port__>"

   // 将代理的 uri 转成 *protocol.URI 的形式
   parsedProxyURL := protocol.ParseURI(proxyURL)

   c, err := client.NewClient()
   if err != nil {
      return
   }

	// 设置代理
	c.SetProxy(protocol.ProxyURI(parsedProxyURL))

	upstreamURL := "http://google.com"
	_, body, _ := client.Get(context.Background(), nil, upstreamURL)
}
```

## 何为反向代理

反向代理在计算机网络中是代理服务器的一种。

服务器根据客户端的请求，从其关系的一组或多组后端服务器（如 Web 服务器）上获取资源，
然后再将这些资源返回给客户端，客户端只会得知反向代理的 IP 地址，而不知道在代理服务器后面的服务器集群的存在。

### 具体实现

```go
type ReverseProxy struct {
    // 用于转发的客户端, 可以通过 SetClient 方法对其进行配置
    client *client.Client

    // 设置反向代理的目标地址
    target string

    // 用于修改 request, 可以通过 SetDirector 方法来自定义
    director func (*protocol.Request)

    // modifyResponse这是一个可选的函数，用于修改来自后端的响应
    // 可以通过 SetModifyResponse 方法进行修改
    modifyResponse func(*protocol.Response) error

    // errorHandler 是一个可选的函数，用于处理到达后台的错误或来自modifyResponse的错误。
    // 如果未进行设置, 默认返回 StatusBadGateway (502)
    errorHandler func(*app.RequestContext, error)
}

// 设置目标地址并进行相关配置
func NewSingleHostReverseProxy(target string, opts ...config.Option) (*reverseProxy, error)
```

### 简易示例

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/reverseproxy"
)

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8000"))
	// 设置目标地址
	proxy, err := reverseproxy.NewSingleHostReverseProxy("http://127.0.0.1:8000/proxy")
	if err != nil {
		panic(err)
	}
	h.GET("/proxy/backend", func(cc context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{
			"msg": "proxy success!!",
		})
	})
	// 设置代理
	h.GET("/backend", proxy.ServeHTTP)
	h.Spin()
}
```

### 更多示例

使用方法可参考如下 [example](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy)
