---
title: "HTTP2"
date: 2022-12-15
weight: 2
keywords: ["HTTP/2", "HTTP", "h2", "h2c"]
description: "Hertz supports both h2 and h2c. It uses net/http2 implementation for reference."
---

HTTP/2 is a replacement for how HTTP is expressed “on the wire.” It is not a ground-up rewrite of the protocol; HTTP methods, status codes and semantics are the same, and it should be possible to use the same APIs as HTTP/1.x (possibly with some small additions) to represent the protocol.

The focus of the protocol is on performance; specifically, end-user perceived latency, network and server resource usage. One major goal is to allow the use of a single connection from browsers to a Web site.

Hertz supports both h2 and h2c. It uses [net/http2](https://github.com/golang/net/tree/master/http2) implementation for reference.

## Example

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

	// register HTTP2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(ctx context.Context, c *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(c.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		c.JSON(http.StatusOK, r)
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

	// register HTTP2 server factory
	h.AddProtocol("h2", factory.NewServerFactory())

	h.POST("/", func(ctx context.Context, c *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(c.Request.Body(), &j)
		fmt.Printf("server received request: %+v\n", j)
		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		c.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}

```

## Config

### Server

| **Option**         | **Default** | **Description**                                                                                  |
| :----------------- | :---------- | ------------------------------------------------------------------------------------------------ |
| `ReadTimeout`      | `0`         | The timeout for reading available resources from the server after the connection is established, |
| `DisableKeepAlive` | `false`     | Whether to disable `Keep-Alive` mode                                                             |

Sample Code:

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

	// register HTTP2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(ctx context.Context, c *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(c.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		c.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}
```

#### WithReadTimeout

Used to set `ReadTimeout`, the default value is `0`.

Function Signature:

```go
func WithReadTimeout(t time.Duration) Option
```

#### WithDisableKeepAlive

Used to set whether to disable `keep-alive` or not, and not to disable it by default.

Function Signature:

```go
func WithDisableKeepAlive(disableKeepAlive bool) Option
```

### Client

| **Option**                   | **Default**                             | **Description**                                                                                                      |
| ---------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `MaxHeaderListSize`          | `0`, means use the default limit (10MB) | Refers to `SETTINGS_MAX_HEADER_LIST_SIZE` in the HTTP2 specification.                                                |
| `AllowHTTP`                  | `false`                                 | Set whether to allow HTTP,the h2c switch                                                                             |
| `ReadIdleTimeout`            | `0`,which means no health check         | If the connection does not receive any frames during this interval, a health check is performed using `ping` frames. |
| `PingTimeout`                | `15s`                                   | A timeout period after which the connection will be closed if no response to `Ping` is received.                     |
| `WriteByteTimeout`           | `0`                                     | If no data is written during this time interval, the connection will be closed.                                      |
| `StrictMaxConcurrentStreams` | `false`                                 | Controls whether the server's `SETTINGS_MAX_CONCURRENT_STREAMS`should be respected globally.                         |
| `DialTimeout`                | `1s`                                    | imeout for establishing new connections to hosts.                                                                    |
| `MaxIdleConnDuration`        | `0`                                     | Idle keep-alive connections are closed after this duration.                                                          |
| `DisableKeepAlive`           | `false`                                 | Connection will close after each request when set this to true.                                                      |
| `Dialer`                     | `netpoll.NewDialer()`                   | Default Dialer is used if not set.                                                                                   |
| `TLSConfig`                  | `nil`                                   | Whether to use TLS (aka SSL or HTTPS) for host connections.                                                          |
| `RetryConfig`                | `nil`                                   | All configurations related to retry                                                                                  |

Sample:

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
	"github.com/cloudwego/hertz/pkg/app/client/retry"
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

	// register HTTP2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(
		config.WithReadTimeout(time.Minute),
		config.WithDisableKeepAlive(false)))
	cfg.NextProtos = append(cfg.NextProtos, "h2")

	h.POST("/", func(ctx context.Context, c *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(c.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)

		r := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			r[k] = v
		}
		c.JSON(http.StatusOK, r)
	})

	go runClient()

	h.Spin()
}
```

#### WithMaxHeaderListSize

Used to set `SETTINGS_MAX_HEADER_LIST_SIZE`.

Unlike the HTTP2 specification, `0` here indicates that the default limit is used (currently 10MB). If you want to indicate infinity, you can set it to a value as large as possible (`0xffffff` or `1<<32-1`).

Function Signature:

```go
func WithMaxHeaderListSize(maxHeaderListSize uint32) ClientOption
```

#### WithReadIdleTimeout

Used to set the read timeout interval, after which a health check will be performed using `ping` frames.

Note that a `ping` response will be treated as a receive frame, so if there is no other traffic on the connection, the health check will be performed at every read timeout interval.

The default value of `0` means that no health check will be performed.

Function Signature:

```go
func WithReadIdleTimeout(readIdleTimeout time.Duration) ClientOption
```

#### WithWriteByteTimeout

Used to set the write timeout time, after which the connection will be closed. The timing starts when the data is ready to be written and keeps extending as data is written.

Function Signature:

```go
func WithWriteByteTimeout(writeByteTimeout time.Duration) ClientOption
```

#### WithStrictMaxConcurrentStreams

Used to set whether the server's `SETTINGS_MAX_CONCURRENT_STREAMS` should be used globally.

Function Signature:

```go
func WithStrictMaxConcurrentStreams(strictMaxConcurrentStreams bool) ClientOption
```

#### WithPingTimeout

Set the timeout for `Ping` responses, after which the connection will be closed if no response is received to `Ping`.The default is `15s`.

Function Signature:

```go
func WithPingTimeout(pt time.Duration) ClientOption
```

#### WithAllowHTTP

Used to set whether to allow HTTP. if enabled, the client will use h2c mode. Not enabled by default.

Function Signature:

```go
func WithAllowHTTP(allow bool) ClientOption
```

#### WithDialer

Support custom dialer, default is `netpoll.NewDialer()`.

Function Signature:

```go
func WithDialer(d network.Dialer) ClientOption
```

Interface Definition:

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

Used to set the timeout for establishing a new connection with the host, default is `1s`.

Function Signature:

```go
func WithDialTimeout(timeout time.Duration) ClientOption
```

#### WithTLSConfig

Used to customize the `TLS` configuration.

Function Signature:

```go
func WithTLSConfig(tlsConfig *tls.Config) ClientOption
```

#### WithMaxIdleConnDuration

Used to set the maximum idle time for a long connection, after which the connection is closed. The default is `0`.

Function Signature:

```go
func WithMaxIdleConnDuration(d time.Duration) ClientOption
```

#### WithMaxIdempotentCallAttempts

Sets maximum number of attempts for idempotent calls.

Function Signature:

```go
func WithMaxIdempotentCallAttempts(n int) ClientOption
```

#### WithRetryConfig

Used to set the configuration related to retry.

Function Signature:

```go
func WithRetryConfig(opts ...retry.Option) ClientOption
```

#### WithClientDisableKeepAlive

Used to set whether to close the connection after each request. The default is `false`.

Function Signature:

```go
func WithClientDisableKeepAlive(disable bool) ClientOption
```

For more usage examples, see [hertz-contrib/http2](https://github.com/hertz-contrib/http2).
