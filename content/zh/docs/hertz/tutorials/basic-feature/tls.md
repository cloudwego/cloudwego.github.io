---
title: "TLS"
date: 2022-11-06
weight: 7
keywords: ["TLS", "HTTP"]
description: "Hertz 支持 TLS 安全传输，帮助用户实现数据的保密性和完整性。"
---

Hertz 支持 TLS 安全传输，帮助用户实现了数据的保密性和完整性。

> 如果有 TLS 的需求，请使用 go net 网络库。Netpoll 尚未实现对 TLS 的支持。

在 `tls.Config` 中，服务端和客户端都可使用的参数如下：

|        参数名         | 介绍                                                                   |
| :-------------------: | :--------------------------------------------------------------------- |
|     Certificates      | 用于添加证书，可以配置多个证书。 <br/>两端自动选择第一个证书进行验证。 |
| VerifyPeerCertificate | 用于验证对端证书。<br/>在任意一端证书验证后调用。                      |
|   VerifyConnection    | 在两端证书均验证后，进行 TLS 连接验证。                                |
|      NextProtos       | 用于设置支持的应用层协议。                                             |
|     CipherSuites      | 用于协商加密策略，支持 TLS 1.0-1.2。                                   |
|      MaxVersion       | 用于设置 TLS 支持的最大版本，目前是 1.3。                              |

## 服务端

Hertz 在 `server` 包提供了 `WithTLS` Option 用于配置 TLS 服务。但是目前 Hertz 只有 标准网络库 支持 TLS，[Netpoll](https://github.com/cloudwego/netpoll) 网络库的支持还在路上。
`WithTLS` 的 `Transporter` 默认设置为标准库的 `Transporter`。

```go
// WithTLS sets TLS config to start a tls server.
// NOTE: If a tls server is started, it won't accept non-tls request.
func WithTLS(cfg *tls.Config) config.Option {
	return config.Option{F: func(o *config.Options) {
		route.SetTransporter(standard.NewTransporter)
		o.TLS = cfg
	}}
}
```

### 参数

在 `tls.Config` 中，除了上述基本参数，服务端可以配置的参数如下：

|        参数名        | 介绍                                                                                                             |
| :------------------: | :--------------------------------------------------------------------------------------------------------------- |
|    GetCertificate    | 基于客户端 SNI 信息或证书集为空时，返回证书。                                                                    |
| GetClientCertificate | 用于服务端要求验证客户端证书时，返回客户端证书。                                                                 |
|  GetConfigForClient  | 当服务端从客户端接收了 ClientHello 后，返回配置信息。 <br/>如果返回的是非空的配置信息，将会被用于这次 TLS 连接。 |
|      ClientAuth      | 用于客户端验证策略设置，默认为 `NoClientCert`。                                                                  |
|      ClientCAs       | 当启用了 `ClientAuth`, 用于验证客户端证书的真实性。                                                              |

服务器端 TLS 主要流程：

1. 载入根证书，用于验证客户端的真实性。
2. 载入服务器证书，用于发送给客户端以验证服务器真实性。
3. 配置 `tls.Config`。
4. 使用 `WithTLS` 配置服务端 TLS，默认使用标准库的 Transporter。

### 示例代码

本次示例中的 `ca.key`、`ca.crt`、`server.key` 和 `server.crt` 均通过 openssl 生成。
首先生成 CA 的私钥和证书，命令如下：

```shell
openssl ecparam -genkey -name prime256v1 -out ca.key
openssl req -new -key ca.key -out ca.req
# country=cn, common name=ca.example.com
openssl x509 -req -in ca.req -signkey ca.key -out ca.crt -days 365
```

通过 CA 签名，生成服务端的私钥和证书，命令如下：

```shell
openssl ecparam -genkey -name prime256v1 -out server.key
openssl req -new -key server.key -out server.req
# country=cn, common name=server.example.com
openssl x509 -req -in server.req -CA ca.crt -CAkey ca.key -out server.crt -CAcreateserial -days 365
```

服务端示例代码：

```go
package main

// ...

func main() {
	// load server certificate
	cert, err := tls.LoadX509KeyPair("./tls/server.crt", "./tls/server.key")
	if err != nil {
		fmt.Println(err.Error())
	}
	// load root certificate
	certBytes, err := ioutil.ReadFile("./tls/ca.crt")
	if err != nil {
		fmt.Println(err.Error())
	}
	caCertPool := x509.NewCertPool()
	ok := caCertPool.AppendCertsFromPEM(certBytes)
	if !ok {
		panic("Failed to parse root certificate.")
	}
	// set server tls.Config
	cfg := &tls.Config{
        // add certificate
		Certificates: []tls.Certificate{cert},
		MaxVersion:   tls.VersionTLS13,
        // enable client authentication
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    caCertPool,
        // cipher suites supported
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
        // set application protocol http2
		NextProtos: []string{http2.NextProtoTLS},
	}
	// set TLS server
	// default is standard.NewTransporter
	h := server.Default(server.WithTLS(cfg), server.WithHostPorts(":8443"))

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "TLS test\n")
	})

	h.Spin()
}
```

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) 。

## 客户端

### 参数

在 `tls.Config` 中，除了上述基本参数，客户端可以配置的参数如下：

|       参数名       | 介绍                                 |
| :----------------: | :----------------------------------- |
|     ServerName     | 根据返回的证书信息验证主机名。       |
| InsecureSkipVerify | 用于客户端是否开启服务端的证书验证。 |
|      RootCAs       | 用于客户端验证服务端的证书。         |

客户端 TLS 主要流程：

1. 载入根证书，用于验证服务器端的真实性。
2. 载入客户证书，用于发送给服务器端以验证客户端的真实性。
3. 配置 `tls.Config`。
4. 使用 `WithTLS` 配置客户端 TLS，默认使用标准库的 Dialer。

### 示例代码

通过 CA 签名，生成客户端的私钥和证书，命令如下：

```shell
openssl ecparam -genkey -name prime256v1 -out client.key
openssl req -new -key client.key -out client.req
# country=cn, common name=client.example.com
openssl x509 -req -in client.req -CA ca.crt -CAkey ca.key -out client.crt -CAcreateserial -days 365
```

客户端示例代码：

```go
package main

// ...

func main() {
	// load root certificate to verify the client validity
	certBytes, err := ioutil.ReadFile("./tls/ca.crt")
	if err != nil {
		fmt.Println(err.Error())
	}
	caCertPool := x509.NewCertPool()
	ok := caCertPool.AppendCertsFromPEM(certBytes)
	if !ok {
		panic("Failed to parse root certificate.")
	}
    // load client certificate to send to server
	cert, err := tls.LoadX509KeyPair("./tls/client.crt", "./tls/client.key")
	if err != nil {
		fmt.Println(err.Error())
	}
    // set TLS configuration
	cfg := &tls.Config{
		MaxVersion:   tls.VersionTLS13,
		Certificates: []tls.Certificate{cert},
        // verify the server certificate
		RootCAs:      caCertPool,
        // ignored the server certificate
		InsecureSkipVerify: true,
	}

	c, err := client.NewClient(
		// default dialer is standard
		client.WithTLSConfig(cfg),
		client.WithDialer(standard.NewDialer()),
	)
	if err != nil {
		fmt.Println(err.Error())
	}
    // ...
}
```

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) 。

## Autotls 中间件

Hertz 提供了 [autotls](https://github.com/hertz-contrib/autotls) 扩展适配 [Let's Encrypt](https://letsencrypt.org/) ，方便用户进行 TLS 服务自动配置。

### 安装

```shell
go get github.com/hertz-contrib/autotls
```

### 配置

#### NewTlsConfig

`autotls` 扩展提供了 `NewTlsConfig` 用于帮助用户使用一行代码支持 LetsEncrypt HTTPS servers。

NewTlsConfig 函数签名如下：

```go
func NewTlsConfig(domains ...string) *tls.Config
```

示例代码：

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/autotls"
)

func main() {
	h := server.Default(
		server.WithTLS(autotls.NewTlsConfig("example1.com", "example2.com")),
		server.WithHostPorts(":https"),
	)

	// Ping handler
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, map[string]interface{}{
			"ping": "pong",
		})
	})

	hlog.Fatal(autotls.Run(h))
}
```

#### RunWithContext

`autotls` 扩展提供了 `RunWithContext` 用于帮助用户使用一行代码支持 LetsEncrypt HTTPS servers 的同时能够让服务优雅关机。

RunWithContext 函数签名如下：

```go
func RunWithContext(ctx context.Context, h *server.Hertz) error
```

示例代码：

```go
package main

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/autotls"
)

func main() {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer stop()

	h := server.Default(
		server.WithTLS(autotls.NewTlsConfig("example1.com", "example2.com")),
		server.WithHostPorts(":https"),
	)

	// Ping handler
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, map[string]interface{}{
			"ping": "pong",
		})
	})

	hlog.Fatal(autotls.RunWithContext(ctx, h))
}
```

#### NewServerWithManagerAndTlsConfig

`autotls` 扩展提供了 `NewServerWithManagerAndTlsConfig` 用于帮助用户自动证书管理和 TLS 配置。

NewServerWithManagerAndTlsConfig 函数签名如下：

```go
func NewServerWithManagerAndTlsConfig(m *autocert.Manager, tlsc *tls.Config, opts ...config.Option) *server.Hertz
```

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/autotls"
	"golang.org/x/crypto/acme/autocert"
)

func main() {
	m := autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist("example1.com", "example2.com"),
		Cache:      autocert.DirCache("/var/www/.cache"),
	}

	h := autotls.NewServerWithManagerAndTlsConfig(&m, nil)

	// Ping handler
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, map[string]interface{}{
			"ping": "pong",
		})
	})

	hlog.Fatal(autotls.Run(h))
}
```

完整用法示例详见 [example](https://github.com/hertz-contrib/autotls/tree/main/examples) 。

## 注意

### Client 报错 not support tls

Hertz 默认使用了 `netpoll` 作为网络库并且目前 `netpoll` 不支持 TLS。使用 TLS 需要切换到标准网络库，代码如下:

```go
import (
    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/network/standard"
    "github.com/cloudwego/hertz/pkg/protocol"
)

func main() {
	clientCfg := &tls.Config{
		InsecureSkipVerify: true,
	}
	c, err := client.NewClient(
		client.WithTLSConfig(clientCfg),
		client.WithDialer(standard.NewDialer()),
	)
}
```
