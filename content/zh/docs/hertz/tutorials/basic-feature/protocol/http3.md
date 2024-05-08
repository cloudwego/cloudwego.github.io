---
title: "HTTP3"
date: 2023-07-29
weight: 3
keywords: ["QUIC", "HTTP", "HTTP3"]
description: "Hertz-HTTP3 基于 quic-go 实现。"
---

QUIC 协议是一种传输层网络协议，提供与 TLS/SSL 相当的安全性，同时具有更低的连接和传输延迟。QUIC 目前主要应用于 HTTP 协议，HTTP-over-QUIC 协议即为 HTTP/3，是 HTTP 协议的第三个正式版本。

Hertz-HTTP3 基于 [quic-go](https://github.com/quic-go/quic-go) 实现，[实现链接](https://github.com/hertz-contrib/http3)。

关于 Hertz 为支持 Hertz-HTTP3 在网络传输层和协议层提供的接口设计方案可参考 [Hertz 支持 QUIC & HTTP/3](/zh/blog/2023/08/02/hertz-支持-quic-http/3/)。

## 安装

```go
go get github.com/hertz-contrib/http3
```

> 注意：go 版本需大于等于 1.19。

## 网络层与协议层注册

### 网络层注册

```go
server.New(server.WithTransport(quic.NewTransporter))
```

### 协议层注册

```go
server.New(server.WithTransport(quic.NewTransporter))
h.AddProtocol(suite.HTTP3, factory.NewServerFactory(&http3.Option{}))
```

## 配置说明

### 服务端

| 配置             | 说明                                                                      |
| :--------------- | ------------------------------------------------------------------------- |
| WithTransport    | 设置 HTTP3 实现的网络库 `quic.NewTransporter`                             |
| WithAltTransport | 设置备用网络库 `netpoll` 或 `go net`，适用于同时在 TCP 和 QUIC 监听的场景 |
| WithALPN         | 设置是否启用 ALPN                                                         |
| WithTLS          | 设置 TLS 配置                                                             |
| WithHostPorts    | 设置开启服务的域名和端口号                                                |

## 示例代码

### 服务端

> 注意：QUIC 协议依赖于 TLS 协议，因此需要提供 TLS 配置。

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/network/netpoll"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/cloudwego/hertz/pkg/protocol/suite"
	"github.com/hertz-contrib/http3/network/quic-go"
	"github.com/hertz-contrib/http3/network/quic-go/testdata"
	http3 "github.com/hertz-contrib/http3/server/quic-go"
	"github.com/hertz-contrib/http3/server/quic-go/factory"
)

type Test struct {
	A string
	B string
}

func main() {
	run()
}

func run() {
	h := server.New(server.WithALPN(true), server.WithTLS(testdata.GetTLSConfig()), server.WithTransport(quic.NewTransporter), server.WithAltTransport(netpoll.NewTransporter), server.WithHostPorts("127.0.0.1:8080"))
	h.AddProtocol(suite.HTTP3, factory.NewServerFactory(&http3.Option{}))

	h.GET("/demo/tile", func(c context.Context, ctx *app.RequestContext) {
		// Small 40x40 png
		ctx.Write([]byte{
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
			0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x28,
			0x01, 0x03, 0x00, 0x00, 0x00, 0xb6, 0x30, 0x2a, 0x2e, 0x00, 0x00, 0x00,
			0x03, 0x50, 0x4c, 0x54, 0x45, 0x5a, 0xc3, 0x5a, 0xad, 0x38, 0xaa, 0xdb,
			0x00, 0x00, 0x00, 0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x01, 0x63, 0x18,
			0x61, 0x00, 0x00, 0x00, 0xf0, 0x00, 0x01, 0xe2, 0xb8, 0x75, 0x22, 0x00,
			0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
		})
	})

	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.GET("/struct", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, &Test{
			A: "aaa",
			B: "bbb",
		})
	})

	v1 := h.Group("/v1")
	{
		v1.GET("/hello/:name", func(c context.Context, ctx *app.RequestContext) {
			fmt.Fprintf(ctx, "Hi %s, this is the response from Hertz.\n", ctx.Param("name"))
		})
	}

	h.Spin()
}
```

### 客户端

Hertz-HTTP3 目前没有提供客户端的实现，但 [服务端](#服务端) 示例代码的 TLS 配置直接拷贝于 [quic-go](https://github.com/quic-go/quic-go)，因此可以直接使用 [quic-go](https://github.com/quic-go/quic-go) 中的 [客户端示例代码](https://github.com/quic-go/quic-go/blob/master/example/client/main.go) 。

```go
package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/quic-go/quic-go"
	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/quic-go/internal/testdata"
	"github.com/quic-go/quic-go/internal/utils"
	"github.com/quic-go/quic-go/logging"
	"github.com/quic-go/quic-go/qlog"
)

func main() {
	verbose := flag.Bool("v", false, "verbose")
	quiet := flag.Bool("q", false, "don't print the data")
	keyLogFile := flag.String("keylog", "", "key log file")
	insecure := flag.Bool("insecure", false, "skip certificate verification")
	enableQlog := flag.Bool("qlog", false, "output a qlog (in the same directory)")
	flag.Parse()
	urls := flag.Args()

	logger := utils.DefaultLogger

	if *verbose {
		logger.SetLogLevel(utils.LogLevelDebug)
	} else {
		logger.SetLogLevel(utils.LogLevelInfo)
	}
	logger.SetLogTimeFormat("")

	var keyLog io.Writer
	if len(*keyLogFile) > 0 {
		f, err := os.Create(*keyLogFile)
		if err != nil {
			log.Fatal(err)
		}
		defer f.Close()
		keyLog = f
	}

	pool, err := x509.SystemCertPool()
	if err != nil {
		log.Fatal(err)
	}
	testdata.AddRootCA(pool)

	var qconf quic.Config
	if *enableQlog {
		qconf.Tracer = func(ctx context.Context, p logging.Perspective, connID quic.ConnectionID) logging.ConnectionTracer {
			filename := fmt.Sprintf("client_%x.qlog", connID)
			f, err := os.Create(filename)
			if err != nil {
				log.Fatal(err)
			}
			log.Printf("Creating qlog file %s.\n", filename)
			return qlog.NewConnectionTracer(utils.NewBufferedWriteCloser(bufio.NewWriter(f), f), p, connID)
		}
	}
	roundTripper := &http3.RoundTripper{
		TLSClientConfig: &tls.Config{
			RootCAs:            pool,
			InsecureSkipVerify: *insecure,
			KeyLogWriter:       keyLog,
		},
		QuicConfig: &qconf,
	}
	defer roundTripper.Close()
	hclient := &http.Client{
		Transport: roundTripper,
	}

	var wg sync.WaitGroup
	wg.Add(len(urls))
	for _, addr := range urls {
		logger.Infof("GET %s", addr)
		go func(addr string) {
			rsp, err := hclient.Get(addr)
			if err != nil {
				log.Fatal(err)
			}
			logger.Infof("Got response for %s: %#v", addr, rsp)

			body := &bytes.Buffer{}
			_, err = io.Copy(body, rsp.Body)
			if err != nil {
				log.Fatal(err)
			}
			if *quiet {
				logger.Infof("Response Body: %d bytes", body.Len())
			} else {
				logger.Infof("Response Body:")
				logger.Infof("%s", body.Bytes())
			}
			wg.Done()
		}(addr)
	}
	wg.Wait()
}
```
