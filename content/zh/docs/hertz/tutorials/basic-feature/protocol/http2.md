---
title: "HTTP2"
date: 2022-12-15
weight: 2
keywords: ["HTTP/2", "HTTP", "h2", "h2c"]
description: "Hertz 同时支持 h2 和 h2c。参考了 net/http2 的实现。"
---

HTTP/2 是对 HTTP "在线" 表达方式的一种替代。它并不是对协议的彻底重写；HTTP 方法、状态码和语义都是一样的，而且应该可以使用与 HTTP/1.x 相同的 API（可能会有一些小的补充）来表示协议。

协议的侧重点是性能：缩短用户感知的延迟、减少网络和服务器资源的使用。一个主要目标是允许使用从浏览器到网站的单一连接。

Hertz 同时支持 h2 和 h2c。参考了 [net/http2](https://github.com/golang/net/tree/master/http2) 的实现。

## 示例代码

### h2

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
	"github.com/cloudwego/hertz/pkg/protocol"

	"github.com/hertz-contrib/http2/config"
	"github.com/hertz-contrib/http2/factory"
)

const (
	keyPEM = `<your key PEM>`
	certPEM = `<your cert PEM>`
)

func runClient() {
	cli, _ := client.NewClient()
	cli.SetClientFactory(factory.NewClientFactory(
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":    "world",
		"protocol": "h2",
	})

	for {
		time.Sleep(time.Second * 1)
		req, rsp := protocol.AcquireRequest(), protocol.AcquireResponse()
		req.SetMethod("POST")
		req.SetRequestURI("https://127.0.0.1:8888")
		req.SetBody(v)
		err := cli.Do(context.Background(), req, rsp)
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Printf("[client]: received body: %s\n", string(rsp.Body()))
	}
}

func main() {
	cfg := &tls.Config{
		MinVersion:       tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
	}

	cert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM))
	if err != nil {
		fmt.Println(err.Error())
	}
	cfg.Certificates = append(cfg.Certificates, cert)
	h := server.New(server.WithHostPorts(":8888"), server.WithALPN(true), server.WithTLS(cfg))

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(c context.Context, ctx *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(ctx.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		ctx.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}
```

### h2c

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"

	"github.com/hertz-contrib/http2/config"
	"github.com/hertz-contrib/http2/factory"
)

func runClient() {
	c, _ := client.NewClient()
	c.SetClientFactory(factory.NewClientFactory(config.WithAllowHTTP(true)))
	v, _ := json.Marshal(map[string]string{
		"hello":    "world",
		"protocol": "h2c",
	})

	for {
		time.Sleep(time.Second * 1)
		req, rsp := protocol.AcquireRequest(), protocol.AcquireResponse()
		req.SetMethod("POST")
		req.SetRequestURI("http://127.0.0.1:8888")
		req.SetBody(v)
		err := c.Do(context.Background(), req, rsp)
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Printf("client received body: %s\n", string(rsp.Body()))
	}
}

func main() {
	h := server.New(server.WithHostPorts(":8888"), server.WithH2C(true))

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory())

	h.POST("/", func(c context.Context, ctx *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(ctx.Request.Body(), &j)
		fmt.Printf("server received request: %+v\n", j)
		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		ctx.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}

```

## 配置

### 服务端

| 配置               | 默认值  | 介绍                                         |
| :----------------- | :------ | -------------------------------------------- |
| `ReadTimeout`      | `0`     | 建立连接后，从服务器读取到可用资源的超时时间 |
| `DisableKeepAlive` | `false` | 是否关闭 `Keep-Alive` 模式                   |

示例代码：

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
	"github.com/cloudwego/hertz/pkg/protocol"

	"github.com/hertz-contrib/http2/config"
	"github.com/hertz-contrib/http2/factory"
)

const (
	keyPEM = `<your key PEM>`
	certPEM = `<your cert PEM>`
)

func runClient() {
	cli, _ := client.NewClient()
	cli.SetClientFactory(factory.NewClientFactory(
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":    "world",
		"protocol": "h2",
	})

	for {
		time.Sleep(time.Second * 1)
		req, rsp := protocol.AcquireRequest(), protocol.AcquireResponse()
		req.SetMethod("POST")
		req.SetRequestURI("https://127.0.0.1:8888")
		req.SetBody(v)
		err := cli.Do(context.Background(), req, rsp)
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Printf("[client]: received body: %s\n", string(rsp.Body()))
	}
}

func main() {
	cfg := &tls.Config{
		MinVersion:       tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
	}

	cert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM))
	if err != nil {
		fmt.Println(err.Error())
	}
	cfg.Certificates = append(cfg.Certificates, cert)
	h := server.New(server.WithHostPorts(":8888"), server.WithALPN(true), server.WithTLS(cfg))

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(c context.Context, ctx *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(ctx.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		ctx.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}
```

#### WithReadTimeout

用于设置 `ReadTimeout`,默认值为 `0`。

函数签名：

```go
func WithReadTimeout(t time.Duration) Option
```

#### WithDisableKeepAlive

用于设置是否禁用 `keep-alive`，默认不禁用。

函数签名:

```go
func WithDisableKeepAlive(disableKeepAlive bool) Option
```

### 客户端

| 配置                         | 默认值                        | 介绍                                                                 |
| ---------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `MaxHeaderListSize`          | `0`，指使用默认的限制（10MB） | 指 http2 规范中的 `SETTINGS_MAX_HEADER_LIST_SIZE`。                  |
| `AllowHTTP`                  | `false`                       | 设置是否允许 http，h2c 模式的开关                                    |
| `ReadIdleTimeout`            | `0`，即不进行健康检查         | 若连接在该段时间间隔内未接收到任何帧，将使用 `ping` 帧进行健康检查。 |
| `PingTimeout`                | `15s`                         | 超时时间，如果未收到对 `Ping` 的响应，连接将在该超时时间后关闭。     |
| `WriteByteTimeout`           | `0`                           | 若在该段时间间隔内未写入任何数据，将关闭连接。                       |
| `StrictMaxConcurrentStreams` | `false`                       | 设置服务器的 `SETTINGS_MAX_CONCURRENT_STREAMS` 是否应该被全局使用。  |
| `DialTimeout`                | `1s`                          | 与主机建立新连接的超时时间。                                         |
| `MaxIdleConnDuration`        | `0`                           | 闲置的长连接在该段时间后关闭。                                       |
| `DisableKeepAlive`           | `false`                       | 是否在每次请求后关闭连接。                                           |
| `Dialer`                     | `netpoll.NewDialer()`         | 用于设置拨号器。                                                     |
| `TLSConfig`                  | `nil`                         | `TLS` 配置                                                           |
| `RetryConfig`                | `nil`                         | 所有与重试有关的配置                                                 |

示例代码：

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app/client/retry"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
	"github.com/cloudwego/hertz/pkg/protocol"

	"github.com/hertz-contrib/http2/config"
	"github.com/hertz-contrib/http2/factory"
)

const (
	keyPEM = `<your key PEM>`
	certPEM = `<your cert PEM>`
)

func runClient() {
	cli, _ := client.NewClient()
	cli.SetClientFactory(factory.NewClientFactory(
		config.WithDialTimeout(3*time.Second),
		config.WithReadIdleTimeout(1*time.Second),
		config.WithWriteByteTimeout(time.Second),
		config.WithPingTimeout(time.Minute),
		config.WithMaxIdleConnDuration(2*time.Second),
		config.WithClientDisableKeepAlive(true),     //Close Connection after each request
		config.WithStrictMaxConcurrentStreams(true), // Set the server's SETTINGS_MAX_CONCURRENT_STREAMS to be respected globally.
		config.WithDialer(standard.NewDialer()),     // You can customize dialer here
		config.WithMaxHeaderListSize(0xffffffff),    // Set SETTINGS_MAX_HEADER_LIST_SIZE to unlimited.
		config.WithMaxIdempotentCallAttempts(3),
		config.WithRetryConfig(
			retry.WithMaxAttemptTimes(3),
			retry.WithInitDelay(2*time.Millisecond),
			retry.WithMaxDelay(200*time.Millisecond),
			retry.WithMaxJitter(30*time.Millisecond),
			retry.WithDelayPolicy(retry.FixedDelayPolicy),
		),
		config.WithStrictMaxConcurrentStreams(true), // Set the server's SETTINGS_MAX_CONCURRENT_STREAMS to be respected globally.
		config.WithTLSConfig(&tls.Config{
			SessionTicketsDisabled: false,
			InsecureSkipVerify:     true,
		}),
	))

	v, _ := json.Marshal(map[string]string{
		"hello":    "world",
		"protocol": "h2",
	})

	for {
		time.Sleep(time.Second * 1)
		req, rsp := protocol.AcquireRequest(), protocol.AcquireResponse()
		req.SetMethod("POST")
		req.SetRequestURI("https://127.0.0.1:8888")
		req.SetBody(v)
		err := cli.Do(context.Background(), req, rsp)
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Printf("[client]: received body: %s\n", string(rsp.Body()))
	}
}

func main() {
	cfg := &tls.Config{
		MinVersion:       tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
	}

	cert, err := tls.X509KeyPair([]byte(certPEM), []byte(keyPEM))
	if err != nil {
		fmt.Println(err.Error())
	}
	cfg.Certificates = append(cfg.Certificates, cert)
	h := server.New(server.WithHostPorts(":8888"), server.WithALPN(true), server.WithTLS(cfg))

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(c context.Context, ctx *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(ctx.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		ctx.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}
```

#### WithMaxHeaderListSize

用于设置 `SETTINGS_MAX_HEADER_LIST_SIZE`。

与 HTTP2 规范不同，这里的 `0` 表示使用默认限制（目前是 10MB）。如果想表示无限，可以设置为一个尽可能大的值（`0xffffffff` 或 `1<<32-1`）。

函数签名：

```go
func WithMaxHeaderListSize(maxHeaderListSize uint32) ClientOption
```

#### WithReadIdleTimeout

用于设置读取超时时间，超时后将使用 `ping` 帧进行健康检查。

注意，一个 `ping` 响应将被视为一个接收帧，所以如果连接上没有其他流量，健康检查将在每一个读取超时时间间隔内进行。

默认值为 `0` 表示不执行健康检查。

函数签名：

```go
func WithReadIdleTimeout(readIdleTimeout time.Duration) ClientOption
```

#### WithWriteByteTimeout

用于设置写入超时时间，超时后连接将被关闭。当数据可以写入时开始计时，并随数据的写入不断延长。

函数签名：

```go
func WithWriteByteTimeout(writeByteTimeout time.Duration) ClientOption
```

#### WithStrictMaxConcurrentStreams

用来设置服务器的 `SETTINGS_MAX_CONCURRENT_STREAMS` 是否应该被全局使用。

函数签名：

```go
func WithStrictMaxConcurrentStreams(strictMaxConcurrentStreams bool) ClientOption
```

#### WithPingTimeout

设置 `ping` 响应的超时时间，如果未收到对 `Ping` 的响应，连接将在该超时时间后关闭。

默认为 `15s`

函数签名：

```go
func WithPingTimeout(pt time.Duration) ClientOption
```

#### WithAllowHTTP

用于设置是否允许 http。如果启用，客户端将使用 h2c 模式。默认不启用。

函数签名：

```go
func WithAllowHTTP(allow bool) ClientOption
```

#### WithDialer

支持自定义拨号器，默认为 `netpoll.NewDialer()`。

函数签名：

```go
func WithDialer(d network.Dialer) ClientOption
```

接口定义：

```go
type Dialer interface {
	// DialConnection is used to dial the peer end.
	DialConnection(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn Conn, err error)

	// DialTimeout is used to dial the peer end with a timeout.
	//
	// NOTE: Not recommended to use this function. Just for compatibility.
	DialTimeout(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn net.Conn, err error)

	// AddTLS will transfer a common connection to a tls connection.
	AddTLS(conn Conn, tlsConfig *tls.Config) (Conn, error)
}
```

#### WithDialTimeout

用于设置与主机建立新连接的超时时间，默认为 `1s`。

函数签名：

```go
func WithDialTimeout(timeout time.Duration) ClientOption
```

#### WithTLSConfig

用于自定义 `TLS` 配置。

函数签名：

```go
func WithTLSConfig(tlsConfig *tls.Config) ClientOption
```

#### WithMaxIdleConnDuration

用于设置长连接的最长闲置时间，超过该时间后连接关闭。默认为 `0`。

函数签名：

```go
func WithMaxIdleConnDuration(d time.Duration) ClientOption
```

#### WithMaxIdempotentCallAttempts

设置`idempotent calls`的最大尝试次数。

函数签名：

```go
func WithMaxIdempotentCallAttempts(n int) ClientOption
```

#### WithRetryConfig

用于设置与重试有关的配置。

函数签名：

```go
func WithRetryConfig(opts ...retry.Option) ClientOption
```

#### WithClientDisableKeepAlive

用于设置是否在每次请求后关闭连接。默认为 `false`。

函数签名：

```go
func WithClientDisableKeepAlive(disable bool) ClientOption
```

更多用法示例详见 [hertz-contrib/http2](https://github.com/hertz-contrib/http2)。
