---
title: "HTTP2"
date:  2022-12-12
weight: 2
description: >


---

HTTP/2 is a replacement for how HTTP is expressed “on the wire.” It is not a ground-up rewrite of the protocol; HTTP methods, status codes and semantics are the same, and it should be possible to use the same APIs as HTTP/1.x (possibly with some small additions) to represent the protocol.

The focus of the protocol is on performance; specifically, end-user perceived latency, network and server resource usage. One major goal is to allow the use of a single connection from browsers to a Web site.

Hertz supports both h2 and h2c.  It uses [net/http2](https://github.com/golang/net/tree/master/http2)  implementation for reference.

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
		fmt.Printf("server çreceived request: %+v\n", j)
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



## Config

### Server

| **Option**         | **Default** |
| :----------------- | :---------- |
| `ReadTimeout`      | `0`         |
| `DisableKeepAlive` | `false`     |


####  WithReadTimeout

Used to set `ReadTimeout`, the default value is `0`.

Function Signature:

```go
func WithReadTimeout(t time.Duration) Option
```

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

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(config.WithReadTimeout(2*time.Second))) //Set ReadTimeout to two seconds
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

#### WithDisableKeepAlive

Used to set whether to disable `keep-alive` or not, and not to disable it by default.

Function Signature:

```go
func WithDisableKeepAlive(disableKeepAlive bool) Option
```

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

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory(config.WithDisableKeepAlive(true))) // disable keep-alive
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



### Client



| **Option**                   | **Default**                             | **Description**                                              |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `MaxHeaderListSize`          | `0`, means use the default limit (10MB) | Refers to `SETTINGS_MAX_HEADER_LIST_SIZE` in the http2 specification. |
| `AllowHTTP`                  | `false`                                 | Set whether to allow http.                                   |
| `ReadIdleTimeout`            | `0`,which means no health check         | If the connection does not receive any frames during this interval, a health check is performed using `ping` frames. |
| `PingTimeout`                | `15s`                                   | A timeout period after which the connection will be closed if no response to `Ping ` is received. |
| `WriteByteTimeout`           | `0`                                     | If no data is written during this time interval, the connection will be closed. |
| `StrictMaxConcurrentStreams` | `false`                                 | Controls whether the server's `SETTINGS_MAX_CONCURRENT_STREAMS `should be respected globally. |
| `DialTimeout`                | `1s`                                    | imeout for establishing new connections to hosts.            |
| `MaxIdleConnDuration`        | `0`                                     | Idle keep-alive connections are closed after this duration.  |
| `DisableKeepAlive`           | `false`                                 | Connection will close after each request when set this to true. |
| `Dialer`                     | `netpoll.NewDialer()`                   | Default Dialer is used if not set.                           |
| `TLSConfig`                  | `nil`                                   | Whether to use TLS (aka SSL or HTTPS) for host connections.  |
| `RetryConfig `               | `nil`                                   | All configurations related to retry                          |




#### WithMaxHeaderListSize

Used to set `SETTINGS_MAX_HEADER_LIST_SIZE`.

Unlike the http2 specification, `0` here indicates that the default limit is used (currently 10MB). If you want to indicate infinity, you can set it to a value as large as possible (`0xffffff` or `1<<32-1`).

Function Signature:

```go
func WithMaxHeaderListSize(maxHeaderListSize uint32) ClientOption
```

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
		config.WithMaxHeaderListSize(0xffffffff), // Set SETTINGS_MAX_HEADER_LIST_SIZE to unlimited.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":                         "world",
		"protocol":                      "h2",
		"SETTINGS_MAX_HEADER_LIST_SIZE": "unlimited",
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



#### WithReadIdleTimeout

Used to set the read timeout interval, after which a health check will be performed using `ping` frames.

Note that a `ping` response will be treated as a receive frame, so if there is no other traffic on the connection, the health check will be performed at every read timeout interval.

The default value of `0` means that no health check will be performed.



Function Signature:

```go
func WithReadIdleTimeout(readIdleTimeout time.Duration) ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"github.com/cloudwego/hertz/pkg/protocol"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
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
		config.WithReadIdleTimeout(1*time.Second),  // Set ReadIdleTimeout to 1s
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":           "world",
		"protocol":        "h2",
		"ReadIdleTimeout": "1s",
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



#### WithWriteByteTimeout

Used to set the write timeout time, after which the connection will be closed. The timing starts when the data is ready to be written and keeps extending as data is written.

Function Signature:

```go
func WithWriteByteTimeout(writeByteTimeout time.Duration) ClientOption
```

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
		config.WithWriteByteTimeout(time.Second), //Set WriteByteTimeout to 1 second.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":            "world",
		"protocol":         "h2",
		"WriteByteTimeout": "1s",
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



#### WithStrictMaxConcurrentStreams

Used to set whether the server's `SETTINGS_MAX_CONCURRENT_STREAMS` should be used globally.

Function Signature:

```go
func WithStrictMaxConcurrentStreams(strictMaxConcurrentStreams bool) ClientOption
```

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
		config.WithStrictMaxConcurrentStreams(true), // Set the server's SETTINGS_MAX_CONCURRENT_STREAMS to be respected globally.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":                      "world",
		"protocol":                   "h2",
		"StrictMaxConcurrentStreams": "true",
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



#### WithPingTimeout

Sets the timeout for `Ping` responses, after which the connection will be closed if no response is received to `Ping `.The default is `15s`.

Function Signature:

```go
func WithPingTimeout(pt time.Duration) ClientOption 
```

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
		config.WithPingTimeout(time.Minute), // Set PingTimeOut to 1 minute.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":       "world",
		"protocol":    "h2",
		"PingTimeOut": "60s",
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



#### WithAllowHTTP

Used to set whether to allow http. if enabled, the client will use h2c mode. Not enabled by default.



Function Signature:

```go
func WithAllowHTTP(allow bool) ClientOption 
```

Sample Code:

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
	cli, _ := client.NewClient()
	cli.SetClientFactory(factory.NewClientFactory(config.WithAllowHTTP(true))) //enable http, client will use h2c mode.
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
		err := cli.Do(context.Background(), req, rsp)
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Printf("[client]: received body: %s\n", string(rsp.Body()))
	}
}

func main() {
	h := server.New(server.WithHostPorts(":8888"), server.WithH2C(true))

	// register http2 server factory
	h.AddProtocol("h2", factory.NewServerFactory())

	h.POST("/", func(c context.Context, ctx *app.RequestContext) {
		var j map[string]string
		_ = json.Unmarshal(ctx.Request.Body(), &j)
		fmt.Printf("[server]: received request: %+v\n", j)
		rsp := map[string]string{
			"msg": "hello world",
		}
		for k, v := range j {
			rsp[k] = v
		}
		ctx.JSON(http.StatusOK, rsp)
	})

	go runClient()

	h.Spin()
}
```



####  WithDialer

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

	// Customize your dialer here
	yourDialer := standard.NewDialer()
	cli.SetClientFactory(factory.NewClientFactory(
		config.WithDialer(yourDialer), //Configure your custom dialer into the client
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":    "world",
		"protocol": "h2",
		"Dialer":   "customised",
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



#### WithDialTimeout

Used to set the timeout for establishing a new connection with the host, default is `1s`.

Function Signature:

```go
func WithDialTimeout(timeout time.Duration) ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"github.com/cloudwego/hertz/pkg/protocol"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
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
		config.WithDialTimeout(3*time.Second), // Set hDialTimeout to 3s
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":       "world",
		"protocol":    "h2",
		"DialTimeout": "3s",
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



#### WithTLSConfig

Used to customize the `TLS` configuration.

Function Signature:

```go
func WithTLSConfig(tlsConfig *tls.Config) ClientOption
```

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

	// Customize TLS config here.
	yourTLSConfig := &tls.Config{
		SessionTicketsDisabled: false,
		InsecureSkipVerify:     true,
	}
	cli, _ := client.NewClient()
	cli.SetClientFactory(factory.NewClientFactory(
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(yourTLSConfig)), // apply your tls config to the client.
	)

	v, _ := json.Marshal(map[string]string{
		"hello":     "world",
		"protocol":  "h2",
		"TLSConfig": "customized",
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





#### WithMaxIdleConnDuration

Used to set the maximum idle time for a long connection, after which the connection is closed. The default is `0`.

Function Signature:

```go
func WithMaxIdleConnDuration(d time.Duration) ClientOption
```

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
		config.WithMaxIdleConnDuration(2*time.Second), //set MaxIdleConnDuration to 2s.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":               "world",
		"protocol":            "h2",
		"MaxIdleConnDuration": "2s",
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



#### WithMaxIdempotentCallAttempts

Sets maximum number of attempts for idempotent calls.

Function Signature:

```go
func WithMaxIdempotentCallAttempts(n int) ClientOption
```


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
		config.WithMaxIdempotentCallAttempts(3), //Sets maximum number of attempts for idempotent calls to 3.
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":                     "world",
		"protocol":                  "h2",
		"MaxIdempotentCallAttempts": "3",
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



#### WithRetryConfig

Used to set the configuration related to retry.

Function Signature:

```go
func WithRetryConfig(opts ...retry.Option) ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"github.com/cloudwego/hertz/pkg/app/client/retry"
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

		// Custom retry configuration
		config.WithRetryConfig(
			retry.WithMaxAttemptTimes(3),
			retry.WithInitDelay(2*time.Millisecond),
			retry.WithMaxDelay(200*time.Millisecond),
			retry.WithMaxJitter(30*time.Millisecond),
			retry.WithDelayPolicy(retry.FixedDelayPolicy),
		),
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":       "world",
		"protocol":    "h2",
		"reTryConfig": "customized",
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



#### WithClientDisableKeepAlive

Used to set whether to close the connection after each request. The default is `false`.

Function Signature:

```go
func WithClientDisableKeepAlive(disable bool) ClientOption
```

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
		config.WithClientDisableKeepAlive(true), //Close Connection after each request
		config.WithDialer(standard.NewDialer()),
		config.WithTLSConfig(&tls.Config{InsecureSkipVerify: true})))

	v, _ := json.Marshal(map[string]string{
		"hello":                  "world",
		"protocol":               "h2",
		"ClientDisableKeepAlive": "true",
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




For more usage examples, see [hertz-contrib/http2](https://github.com/hertz-contrib/http2).

