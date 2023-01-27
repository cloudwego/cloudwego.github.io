---
title: "正向代理和反向代理"
date: 2022-09-08
weight: 9
description: >

---

## 正向代理

正向代理是一种特殊的网络服务，允许一个网络终端（一般为客户端）通过这个服务与另一个网络终端（一般为服务器）进行非直接的连接。一些网关、路由器等网络设备具备网络代理功能。一般认为代理服务有利于保障网络终端的隐私或安全，防止攻击。

一个完整的代理请求过程为：客户端（Client）首先与代理服务器创建连接，接着根据代理服务器所使用的代理协议，请求对目标服务器创建连接、或者获得目标服务器的指定资源。

### 安装

hertz内置了访问正向代理的功能

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

// NewSingleHostReverseProxy 返回一个新的反向代理来路由请求到指定后端。如果后端路径是 ”/base“ 请求路径是 ”/dir” ，目标路径将会是 “/base/dir” 。
// NewSingleHostReverseProxy 不会重写 Host 请求头。
// 要想覆盖 Host 请求头，可以选择自定义 director
func NewSingleHostReverseProxy(target string, opts ...config.Option) (*reverseProxy, error)
```

> - `NewSingleHostReverseProxy` 方法如果没有设置 `config.ClientOption` 将会使用默认的全局 `client.Client` 实例，
如果设置了 `config.ClientOption` 将会初始化一个 `client.Client` 实例。
如果你需要共享一个 `client.Client` 实例，可以使用 `ReverseProxy.SetClient` 来设置。
> - 反向代理会重置响应头，如果在请求之前修改了响应头将不会生效。

我们提供了 `SetXxx()` 函数用于设置私有属性

| 方法                  | 描述                                  | 示例                                                                                                                         |
|---------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `SetDirector`       | 用于指定 protocol.Request               | [reverseproxy/discovery](https://github.com/cloudwego/hertz-examples/blob/main/reverseproxy/discovery/discovery/main.go)   |
| `SetClient`         | 用于指定转发的客户端                          | [reverseproxy/discovery](https://github.com/cloudwego/hertz-examples/blob/main/reverseproxy/discovery/discovery/main.go)   |
| `SetModifyResponse` | 用于指定响应修改方法                          | [reverseproxy/modify_response](https://github.com/cloudwego/hertz-examples/blob/main/reverseproxy/modify_response/main.go) |
| `SetErrorHandler`   | 用于指定处理到达后台的错误或来自 modifyResponse 的错误 | [reverseproxy/customize_error](https://github.com/cloudwego/hertz-examples/blob/main/reverseproxy/customize_error/main.go) |

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

代理 HTTPS 需要在 `NewSingleHostReverseProxy` 方法中配置 TLS 并且使用 `WithDialer` 建立连接。

**示例代码**

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"
    "sync"
    
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/network/standard"
    "github.com/hertz-contrib/reverseproxy"
)

func main() {
    var wg sync.WaitGroup
    wg.Add(2)
    go func() {
        defer wg.Done()
        cfg := &tls.Config{
            MinVersion:               tls.VersionTLS12,
            CurvePreferences:         []tls.CurveID{tls.X25519, tls.CurveP256},
            PreferServerCipherSuites: true,
            CipherSuites: []uint16{
                tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
                tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
                tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
            },
        }
        cert, err := tls.LoadX509KeyPair("tls/server.crt", "tls/server.key")
        if err != nil {
            fmt.Println(err.Error())
        }
        cfg.Certificates = append(cfg.Certificates, cert)
    
        h := server.New(
            server.WithHostPorts(":8004"),
            server.WithTLS(cfg),
        )
        h.GET("/backend", func(cc context.Context, c *app.RequestContext) {
            c.JSON(200, utils.H{"msg": "pong"})
        })
        h.Spin()
    }()
    
    go func() {
        defer wg.Done()
        h := server.New(server.WithHostPorts(":8001"))
        proxy, err := reverseproxy.NewSingleHostReverseProxy("https://127.0.0.1:8004",
            client.WithTLSConfig(&tls.Config{
                InsecureSkipVerify: true,
            }),
            client.WithDialer(standard.NewDialer()),
        )
        if err != nil {
            panic(err)
        }
        h.GET("/backend", proxy.ServeHTTP)
        h.Spin()
    }()
    wg.Wait()
}
```

#### 如何配合中间件使用

通过 `Use` 方法使用中间件，在中间件逻辑中处理反向代理即可。

**示例代码**

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
    r := server.Default(server.WithHostPorts("127.0.0.1:9998"))
    
    r2 := server.Default(server.WithHostPorts("127.0.0.1:9997"))
    
    proxy, err := reverseproxy.NewSingleHostReverseProxy("http://127.0.0.1:9997")
    if err != nil {
        panic(err)
    }
    
    r.Use(func(c context.Context, ctx *app.RequestContext) {
        if ctx.Query("country") == "cn" {
            proxy.ServeHTTP(c, ctx)
            ctx.Response.Header.Set("key", "value")
            ctx.Abort()
        } else {
            ctx.Next(c)
        }
    })
    
    r.GET("/backend", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(200, utils.H{
            "message": "pong1",
        })
    })
    
    r2.GET("/backend", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(200, utils.H{
            "message": "pong2",
        })
    })
    
    go r.Spin()
    r2.Spin()
}
```

### 更多示例

使用方法可参考如下 [examples](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy)
