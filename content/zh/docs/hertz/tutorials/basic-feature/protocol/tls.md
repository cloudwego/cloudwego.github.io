---
title: "TLS"
date: 2022-09-24
weight: 4
description: >

---

Hertz 支持 TLS 安全传输，帮助用户实现了数据的保密性和完整性。

## 服务配置

Hertz 在 `server` 包和 `client` 包均提供了 `WithTLS` Option 用于配置 TLS 服务。

- server
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
- client
```go
// WithTLSConfig sets tlsConfig to create a tls connection.
func WithTLSConfig(cfg *tls.Config) config.ClientOption {
	return config.ClientOption{F: func(o *config.ClientOptions) {
		o.TLSConfig = cfg
		o.Dialer = standard.NewDialer()
	}}
}
```

本次示例中的 `server.key` 和 `server.crt` 均通过 openssl 生成。
服务端私钥和证书生成命令如下：
```shell
openssl genrsa -out server.key 2048
openssl req -new -x509 -key server.key -out server.crt -days 365
```

服务端示例代码：
```go
package main

// ...

func main() {
	cfg := &tls.Config{}
	// load server certificate and private key
	cert, err := tls.LoadX509KeyPair("./server.crt", "./server.key")
	if err != nil {
		fmt.Println(err.Error())
	}
	cfg.Certificates = append(cfg.Certificates, cert)
    // start a TLS server
	h := server.Default(server.WithTLS(cfg), server.WithHostPorts(":8443"))

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "TLS test\n")
	})

	h.Spin()
}
```

终端输入 `curl` 命令可对该代码进行测试：
```shell
curl -k https://127.0.0.1:8843/ping
```

## 双向证书验证

上述示例代码是客户端对服务端的单向证书验证，下面是服务端和客户端的双向证书验证的示例代码：

主要流程：
- 服务器端
  1. 载入根证书，用于验证客户端的真实性。
      Golang 没有提供便捷的载入自签名根证书的方法，需要自行通过 `x509.NewCertPool()` 去创建 CertPool 然后添加证书。
  2. 载入服务器证书，用于发送给客户端以验证服务器真实性。
      Golang 提供了 `tls.LoadX509KeyPair` 函数去加载证书和私钥对。
  3. 配置 `tls.Config`。
  4. 使用 `WithTLS` 配置服务端 TLS。

- 客户端
  1. 载入根证书，用于验证服务器端的真实性。
  2. 载入客户证书，用于发送给服务器端以验证客户端的真实性。
  3. 配置 `tls.Config`。
  4. 使用 `WithTLS` 配置客户端 TLS。

同样地，客户端私钥和证书也通过 openssl 生成。命令如下：
```shell
openssl genrsa -out client.key 2048
openssl req -new -x509 -key client.key -out client.crt -days 365
```

服务端示例代码：
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
    // load server certificate to send to client
	cert, err := tls.LoadX509KeyPair("./tls/server.crt", "./tls/server.key")
	if err != nil {
		fmt.Println(err.Error())
	}

	cfg := &tls.Config{
		MinVersion:   tls.VersionTLS12,
		Certificates: []tls.Certificate{cert}, // root certificate
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    caCertPool,
		CipherSuites: []uint16{ // cipher suites supported
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		},
	}

	h := server.Default(server.WithTLS(cfg), server.WithHostPorts("localhost:8443"))

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "TLS test\n")
	})

	h.Spin()
}

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

	cfg := &tls.Config{
		MinVersion:   tls.VersionTLS12,
		Certificates: []tls.Certificate{cert},
		// RootCAs:      caCertPool, // root certificate
		InsecureSkipVerify: true,
	}

	c, err := client.NewClient(
		client.WithTLSConfig(cfg),
	)
	if err != nil {
		fmt.Println(err.Error())
	}

	req, res := protocol.AcquireRequest(), protocol.AcquireResponse()
	defer func() {
		protocol.ReleaseRequest(req)
		protocol.ReleaseResponse(res)
	}()
	// set requestContext
	req.SetMethod(consts.MethodGet)
	req.Header.SetContentTypeBytes([]byte("application/json"))
	req.SetRequestURI("https://localhost:8443/ping")
	err = c.Do(context.Background(), req, res)
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Printf("%v\n", string(res.Body()))
}
```

更详细的示例参考 [tls-example](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) 。


## AutoTLS 中间件

Hertz 提供了 [autotls](https://github.com/hertz-contrib/autotls) 扩展适配 [Let's Encrypt](https://letsencrypt.org/) ，方便用户进行 TLS 服务配置。

### 安装

```shell
go get github.com/hertz-contrib/autotls
```

### 函数签名

```go
func NewTlsConfig(domains ...string) *tls.Config
```

### 示例代码

```go
package main

// ...

func main() {
	h := server.Default(
		server.WithTLS(autotls.NewTlsConfig("your domain")),
		server.WithHostPorts(":https"),
	)

	// Ping handler
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(200, map[string]interface{}{
			"ping": "pong",
		})
	})

	hlog.Fatal(autotls.Run(h))
}
```

更详细的示例参考 [autotls-example](https://github.com/hertz-contrib/autotls/tree/main/examples) 。
