---
title: "正向代理和反向代理"
date: 2022-09-08
weight: 12
description: >

---

## 正向代理

正向代理是一种特殊的网络服务，允许一个网络终端（一般为客户端）通过这个服务与另一个网络终端（一般为服务器）进行非直接的连接。一些网关、路由器等网络设备具备网络代理功能。一般认为代理服务有利于保障网络终端的隐私或安全，防止攻击。

一个完整的代理请求过程为：客户端（Client）首先与代理服务器创建连接，接着根据代理服务器所使用的代理协议，请求对目标服务器创建连接、或者获得目标服务器的指定资源。

### 安装

hertz 内置了访问正向代理的功能

### 定义

```go
// Proxy 结构体，根据 request 来选定访问的代理 uri
type Proxy func(*protocol.Request) (*protocol.URI, error)

// ProxyURI 用来生成只会返回固定代理 uri 的 Proxy
func ProxyURI(fixedURI *protocol.URI) Proxy

// SetProxy 用来设置 client 的 proxy，设置后 client 会与 proxy 建连发请求
func (c *Client) SetProxy(p protocol.Proxy)
```

### 示例

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
    _, body, _ := c.Get(context.Background(), nil, upstreamURL)
}
```

> 客户端默认不支持 TLS，如果要访问 https 地址，应该使用标准库

```go
c, err := client.NewClient(client.WithDialer(standard.NewDialer()))
```

> 如果报证书错误还需要跳过证书验证

```go
clientCfg := &tls.Config{
   InsecureSkipVerify: true,
}
c, err := client.NewClient(client.WithTLSConfig(clientCfg), client.WithDialer(standard.NewDialer()))
```

## 反向代理

反向代理在计算机网络中是代理服务器的一种。

服务器根据客户端的请求，从其关系的一组或多组后端服务器（如 Web 服务器）上获取资源，然后再将这些资源返回给客户端，客户端只会得知反向代理的 IP 地址，而不知道在代理服务器后面的服务器集群的存在。

### 安装

```bash
go get github.com/hertz-contrib/reverseproxy
```

### 具体实现

```go
type ReverseProxy struct {
    // 用于转发的客户端，可以通过 SetClient 方法对其进行配置
    client *client.Client

    // 设置反向代理的目标地址
    target string

    // 用于转换 request，可以通过 SetDirector 方法来自定义
    // director  必须是将一个请求转换为一个新的请求的函数。
    // 响应直接未经修改重定向返回给原始客户端
    // 请求返回后 direcotr 不得访问
    director func (*protocol.Request)

    // modifyResponse 这是一个可选的函数，用于修改来自后端的响应
    // 可以通过 SetModifyResponse 方法进行修改
    // 如果后端返回任意响应，不管状态码是什么，这个方法将会被调用。
    // 如果后端不可访问，errorHandler 方法会使用错误信息做入参被调用。
    // 如果 modifyResponse 方法返回一个错误，errorHandler 方法将会使用错误做入参被调用。
    // 如果 errorHandler 未设置，将使用默认实现。
    modifyResponse func(*protocol.Response) error

    // errorHandler 是一个可选的函数，用于处理到达后台的错误或来自 modifyResponse 的错误。
    // 如果未进行设置，默认返回 StatusBadGateway (502)
    errorHandler func(*app.RequestContext, error)
}

// NewSingleHostReverseProxy 返回一个新的反向代理来路由请求到指定后端。如果后端路径是”/base“请求路径是”/dir” ，目标路径将会是“/base/dir” 。
// NewSingleHostReverseProxy 不会重写 Host 请求头。
// 要想覆盖 Host 请求头，可以选择自定义 director
func NewSingleHostReverseProxy(target string, opts ...config.Option) (*reverseProxy, error)
```

> - `NewSingleHostReverseProxy` 方法如果没有设置 `config.ClientOption` 将会使用默认的全局 `client.Client` 实例，
如果设置了 `config.ClientOption` 将会初始化一个 `client.Client` 实例。
如果你需要共享一个 `client.Client` 实例，可以使用 `ReverseProxy.SetClient` 来设置。
> - 反向代理会重置响应头，如果在请求之前修改了响应头将不会生效。

我们提供了 `SetXxx()` 函数用于设置私有属性

| 方法                  | 描述                                  |
|---------------------|-------------------------------------|
| `SetDirector`       | 用于指定 protocol.Request               |
| `SetClient`         | 用于指定转发的客户端                          |
| `SetModifyResponse` | 用于指定响应修改方法                          |
| `SetErrorHandler`   | 用于指定处理到达后台的错误或来自 modifyResponse 的错误 |

### 示例

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

### FAQ

#### 如何代理 HTTPS

> Netpoll 不支持 TLS，Client 需要使用标准网络库.

代理 HTTPS 需要在额外做一些配置.

- `NewSingleHostReverseProxy` 方法中使用 `WithDialer` 传递 `standard.NewDialer()` 指定标准网络库。
- 使用 `SetClient` 设置一个使用标准网络库的 Hertz Client。

#### 如何配合中间件使用

可以在 hertz handler 中也使用 `ReverseProxy.ServeHTTP` 来实现复杂的需求而不是直接将 `ReverseProxy.ServeHTTP` 注册到路由。

**示例代码**

```go
package main

import (
    //...
)

func main() {
    //...
    r.Use(func(c context.Context, ctx *app.RequestContext) {
        if ctx.Query("country") == "cn" {
            proxy.ServeHTTP(c, ctx)
            ctx.Response.Header.Set("key", "value")
            ctx.Abort()
        } else {
            ctx.Next(c)
        }
    })
    //...
}
```

### 更多示例

| 用途      | 示例代码                                                                                      |
|---------|-------------------------------------------------------------------------------------------|
| 代理 tls  | [code](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy/tls)            |
| 使用服务发现  | [code](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy/discovery)      |
| 配合中间件使用 | [code](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy/use_middleware) |

更多使用方法可参考如下 [examples](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy)。
