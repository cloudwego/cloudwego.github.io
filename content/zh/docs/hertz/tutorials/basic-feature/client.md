---
title: "客户端"
date: 2023-07-25
weight: 3
description: >
---

## 快速开始

```go
package main

import (
	"context"
	"fmt"
	
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {
	c, _ := client.NewClient()
	req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
	req.SetRequestURI("http://localhost:8080/hello")

	req.SetMethod("GET")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("get response: %s\n", resp.Body())  // status == 200 resp.Body() == []byte("hello hertz")
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/hello", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, "hello hertz")
	})
	go performRequest()
	h.Spin()
}
```

## Client 配置

| 配置项                        | 默认值         | 描述                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| DialTimeout                   | 1s             | 拨号超时时间                                            |
| MaxConnsPerHost               | 512            | 每个主机可能建立的最大连接数                            |
| MaxIdleConnDuration           | 10s            | 最大的空闲连接持续时间，空闲的连接在此持续时间后被关闭  |
| MaxConnDuration               | 0s             | 最大的连接持续时间，keep-alive 连接在此持续时间后被关闭 |
| MaxConnWaitTimeout            | 0s             | 等待空闲连接的最大时间                                  |
| KeepAlive                     | true           | 是否使用 keep-alive 连接，默认使用                                |
| ReadTimeout                   | 0s             | 完整读取响应（包括 body）的最大持续时间                  |
| TLSConfig                     | nil            | 设置用于创建 tls 连接的 tlsConfig，具体配置信息请看 [tls](/zh/docs/hertz/tutorials/basic-feature/protocol/tls/)                      |
| Dialer                        | network.Dialer | 设置指定的拨号器                                        |
| ResponseBodyStream            | false          | 是否在流中读取 body，默认不在流中读取                                     |
| DisableHeaderNamesNormalizing | false          | 是否禁用头名称规范化，默认不禁用，如 cONTENT-lenGTH -> Content-Length                                    |
| Name                          | ""             | 用户代理头中使用的客户端名称                            |
| NoDefaultUserAgentHeader      | false          | 是否没有默认的 User-Agent 头，默认有 User-Agent 头                             |
| DisablePathNormalizing        | false          | 是否禁用路径规范化，默认规范路径，如 http://localhost:8080/hello/../ hello -> http://localhost:8080/hello                                 |
| RetryConfig                   | nil            | HTTP 客户端的重试配置，重试配置详细说明请看 [重试](/zh/docs/hertz/tutorials/basic-feature/retry/)                                                |
| WriteTimeout                  | 0s             | HTTP 客户端的写入超时时间                                            |
| HostClientStateObserve        | nil            | 观察和记录 HTTP 客户端的连接状态的函数                |
| ObservationInterval           | 5s             | HTTP 客户端连接状态的观察执行间隔                                        |
| DialFunc                      | network.Dialer | 设置 HTTP 客户端拨号器函数，会覆盖自定义拨号器                    |

示例代码：

```go
func main() {
	observeInterval := 10 * time.Second
	stateFunc := func(state config.HostClientState) {
		fmt.Printf("state=%v\n", state.ConnPoolState().Addr)
	}
	var customDialFunc network.DialFunc = func(addr string) (network.Conn, error) {
		return nil, nil
	}
	c, err := client.NewClient(
		client.WithDialTimeout(1*time.Second),
		client.WithMaxConnsPerHost(1024),
		client.WithMaxIdleConnDuration(10*time.Second),
		client.WithMaxConnDuration(10*time.Second),
		client.WithMaxConnWaitTimeout(10*time.Second),
		client.WithKeepAlive(true),
		client.WithClientReadTimeout(10*time.Second),
		client.WithDialer(standard.NewDialer()),
		client.WithResponseBodyStream(true),
		client.WithDisableHeaderNamesNormalizing(true),
		client.WithName("my-client"),
		client.WithNoDefaultUserAgentHeader(true),
		client.WithDisablePathNormalizing(true),
		client.WithRetryConfig(
			retry.WithMaxAttemptTimes(3),
			retry.WithInitDelay(1000),
			retry.WithMaxDelay(10000),
			retry.WithDelayPolicy(retry.DefaultDelayPolicy),
			retry.WithMaxJitter(1000),
		),
		client.WithWriteTimeout(10*time.Second),
		client.WithConnStateObserve(stateFunc, observeInterval),
		client.WithDialFunc(customDialFunc, netpoll.NewDialer()),
	)
	if err != nil {
		return
	}

	status, body, _ := c.Get(context.Background(), nil, "http://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

## Client Request 配置

| 配置项                        | 默认值         | 描述                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| WithDialTimeout                   | 0s             | 拨号超时时间，**该配置项的优先级高于 Client 配置，即会覆盖相应的 Client 配置项**                                            |
| WithReadTimeout               | 0s              | 完整读取响应（包括 body）的最大持续时间，**该配置项的优先级高于 Client 配置，即会覆盖相应的 Client 配置项**                            |
| WithWriteTimeout           | 0s            | HTTP 客户端的写入超时时间，**该配置项的优先级高于 Client 配置，即会覆盖相应的 Client 配置项**  |
| WithRequestTimeout               | 0s             | 完整的 HTTP 请求的超时时间 |
| WithTag            | make(map[string]string)             | 以 key-value 形式设置 tags 字段，该字段用于客户端服务发现的 `TargetInfo` 结构体                                 |
| WithSD                     | false          | 设置 isSD 字段，该字段用于客户端服务发现中间件                             |

示例代码：

```go
func main() {
	cli, err := client.NewClient()
	if err != nil {
		return
	}
	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetOptions(config.WithDialTimeout(1*time.Second),
		config.WithReadTimeout(3*time.Second),
		config.WithWriteTimeout(3*time.Second),
		config.WithReadTimeout(5*time.Second),
		config.WithSD(true),
		config.WithTag("tag", "tag"))
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://www.example.com")
	err = cli.Do(context.Background(), req, res)
	fmt.Printf("resp = %v,err = %+v", string(res.Body()), err)
}
```

## 发送请求

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error
func (c *Client) DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
func (c *Client) Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
func (c *Client) Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

### Do

Do 函数执行给定的 http 请求并填充给定的 http 响应。请求必须包含至少一个非零的 RequestURI，其中包含完整的 URL 或非零的 Host header + RequestURI。

该函数不会跟随重定向，请使用 [Get](#get) 函数或 [DoRedirects](#doredirects) 函数或 [Post](#post) 函数来跟随重定向。

如果 resp 为 nil，则会忽略响应。如果所有针对请求主机的 DefaultMaxConnsPerHost 连接都已忙，则会返回 `ErrNoFreeConns` 错误。在性能关键的代码中，建议通过 AcquireRequest 和 AcquireResponse 获取 req 和 resp。

函数签名：

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error 
```

示例代码：

```go
func main() {
	// hertz server:http://localhost:8080/ping ctx.String(consts.StatusOK, "pong")
	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.Do(context.Background(), req, res)
	fmt.Printf("resp = %v,err = %+v", string(res.Body()), err)
	// resp.Body() == []byte("pong") err == <nil>
}
```

### DoRedirects

DoRedirects 函数执行给定的 http 请求并填充给定的 http 响应，遵循最多 maxRedirectsCount 次重定向。当重定向次数超过 maxRedirectsCount 时，将返回 `ErrTooManyRedirects` 错误。

函数签名：

```go
func (c *Client) DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
```

示例代码：

```go
func main() {
	// hertz server
	// http://localhost:8080/redirect ctx.Redirect(consts.StatusMovedPermanently, []byte("/redirect2"))
	// http://localhost:8080/redirect2 ctx.Redirect(consts.StatusMovedPermanently, []byte("/redirect3"))
	// http://localhost:8080/redirect3 ctx.String(consts.StatusOK, "pong")

	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/redirect")

	err = c.DoRedirects(context.Background(), req, res, 1)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("") err.Error() == "too many redirects detected when doing the request"

	err = c.DoRedirects(context.Background(), req, res, 2)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("pong") err == <nil>
}
```

### Get

Get 函数返回 URL 的状态码和响应体。如果 dst 太小，则将被响应体替换并返回，否则将分配一个新的切片。

该函数会自动跟随重定向。

函数签名：

```go
func (c *Client) Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

```go
func main() {
	// hertz server:http://localhost:8080/ping ctx.String(consts.StatusOK, "pong")
	c, err := client.NewClient()
	if err != nil {
		return
	}
	status, body, err := c.Get(context.Background(), nil, "http://localhost:8080/ping")
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
	// status == 200 res.Body() == []byte("pong") err == <nil>
}
```

### Post

Post 函数使用给定的 POST 参数向指定的 URL 发送 POST 请求。如果 dst 太小，则将被响应体替换并返回，否则将分配一个新的切片。

该函数会自动跟随重定向。

如果 postArgs 为 nil ，则发送空的 POST 请求体。

函数签名：

```go
func (c *Client) Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

```go
func main() {
	// hertz server:http://localhost:8080/hello ctx.String(consts.StatusOK, "hello %s", ctx.PostForm("name"))
	c, err := client.NewClient()
	if err != nil {
		return
	}

	var postArgs protocol.Args
	postArgs.Set("name", "cloudwego") // Set post args
	status, body, err := c.Post(context.Background(), nil, "http://localhost:8080/hello", &postArgs)
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
	// status == 200 res.Body() == []byte("hello cloudwego") err == <nil>
}
```

## 请求超时

```go
func (c *Client) DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
func (c *Client) DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

### DoTimeout

DoTimeout 函数执行给定的请求并在给定的超时时间内等待响应。

该函数不会跟随重定向，请使用 [Get](#get) 函数或 [DoRedirects](#doredirects) 函数或 [Post](#post) 函数来跟随重定向。

如果 resp 为 nil，则会忽略响应。如果在给定的超时时间内未能收到响应，则会返回 `errTimeout` 错误。

函数签名： 

```go
func (c *Client) DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
```

示例代码：

```go
func main() {
	// hertz server:http://localhost:8080/ping ctx.String(consts.StatusOK, "pong")
	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.DoTimeout(context.Background(), req, res, time.Second*3)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("pong") err == <nil>

	err = c.DoTimeout(context.Background(), req, res, time.Second)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("") err.Error() == "timeout"
}
```

### DoDeadline

DoDeadline 执行给定的请求并等待响应，直至给定的最后期限。

该函数不会跟随重定向，请使用 [Get](#get) 函数或 [DoRedirects](#doredirects) 函数或 [Post](#post) 函数来跟随重定向。

如果 resp 为 nil，则会忽略响应。如果在给定的截止日期之前未能收到响应，则会返回 `errTimeout` 错误。

函数签名： 

```go
func (c *Client) DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

示例代码：

```go
func main() {
	// hertz server:http://localhost:8080/ping ctx.String(consts.StatusOK, "pong")
	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.DoDeadline(context.Background(), req, res, time.Now().Add(3*time.Second))
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("pong") err == <nil>

	err = c.DoDeadline(context.Background(), req, res, time.Now().Add(1*time.Second))
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	// res.Body() == []byte("") err.Error() == "timeout"
}
```

## 请求重试

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

### SetRetryIfFunc

`SetRetryIfFunc` 方法用于自定义配置重试发生的条件。（更多内容请参考 [retry-条件配置](/zh/docs/hertz/tutorials/basic-feature/retry/#retry-条件配置)）

函数签名：

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

示例代码：

```go
func main() {
	c, err := client.NewClient()
	if err != nil {
		return
	}
	var customRetryIfFunc = func(req *protocol.Request, resp *protocol.Response, err error) bool {
		return true
	}
	c.SetRetryIfFunc(customRetryIfFunc)
	status2, body2, _ := c.Get(context.Background(), nil, "http://www.example.com")
	fmt.Printf("status=%v body=%v\n", status2, string(body2))
}
```

## 添加请求内容

Hertz 客户端可以在 HTTP 请求中添加 `query` 参数、`www-url-encoded`、`multipart/form-data`、`json` 等多种形式的请求内容。

示例代码：

```go
func main() {
	client, err := client.NewClient()
	if err != nil {
		return
	}
	req := &protocol.Request{}
	res := &protocol.Response{}

	// Use SetQueryString to set query parameters
	req.Reset()
	req.Header.SetMethod(consts.MethodPost)
	req.SetRequestURI("http://127.0.0.1:8080/v1/bind")
	req.SetQueryString("query=query&q=q1&q=q2&vd=1")
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}

	// Send "www-url-encoded" request
	req.Reset()
	req.Header.SetMethod(consts.MethodPost)
	req.SetRequestURI("http://127.0.0.1:8080/v1/bind?query=query&q=q1&q=q2&vd=1")
	req.SetFormData(map[string]string{
		"form": "test form",
	})
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}

	// Send "multipart/form-data" request
	req.Reset()
	req.Header.SetMethod(consts.MethodPost)
	req.SetRequestURI("http://127.0.0.1:8080/v1/bind?query=query&q=q1&q=q2&vd=1")
	req.SetMultipartFormData(map[string]string{
		"form": "test form",
	})
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}

	// Send "Json" request
	req.Reset()
	req.Header.SetMethod(consts.MethodPost)
	req.Header.SetContentTypeBytes([]byte("application/json"))
	req.SetRequestURI("http://127.0.0.1:8080/v1/bind?query=query&q=q1&q=q2&vd=1")
	data := struct {
		Json string `json:"json"`
	}{
		"test json",
	}
	jsonByte, _ := json.Marshal(data)
	req.SetBody(jsonByte)
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}
}
```

## 上传文件

Hertz 客户端支持向服务器上传文件。

示例代码：

```go
func main() {
	client, err := client.NewClient()
	if err != nil {
		return
	}
	req := &protocol.Request{}
	res := &protocol.Response{}
	req.SetMethod(consts.MethodPost)
	req.SetRequestURI("http://127.0.0.1:8080/singleFile")
	req.SetFile("file", "your file path")

	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}
	fmt.Println(err, string(res.Body()))
}
```

## 流式读响应内容

Hertz 客户端支持流式读取 HTTP 响应内容。（更多内容请参考 [Client](/zh/docs/hertz/tutorials/basic-feature/stream/#client)）

示例代码：

```go
func main() {
	c, _ := client.NewClient(client.WithResponseBodyStream(true))
	req := &protocol.Request{}
	resp := &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://127.0.0.1:8080/streamWrite")
	err := c.Do(context.Background(), req, resp)
	if err != nil {
		return
	}
	bodyStream := resp.BodyStream()
	p := make([]byte, resp.Header.ContentLength()/2)
	_, err = bodyStream.Read(p)
	if err != nil {
		fmt.Println(err.Error())
	}
	left, _ := ioutil.ReadAll(bodyStream)
	fmt.Println(string(p), string(left))
}
```

## 服务发现

Hertz 客户端支持通过服务发现寻找目标服务器。

Hertz 支持自定义服务发现模块，更多内容可参考 [服务发现拓展](/zh/docs/hertz/tutorials/framework-exten/service_discovery/#服务发现扩展)。

Hertz 目前已接入的服务发现中心相关内容可参考 [服务注册与发现](/zh/docs/hertz/tutorials/service-governance/service_discovery/)。

## TLS

Hertz 客户端默认使用的网络库 netpoll 不支持 TLS，如果要配置 TLS 访问 https 地址，应该使用标准库。

TLS 相关的配置信息可参考 [tls](/zh/docs/hertz/tutorials/basic-feature/protocol/tls/)。

示例代码：

```go
func main() {
	clientCfg := &tls.Config{
		InsecureSkipVerify: true,
	}
	c, err := client.NewClient(
		client.WithTLSConfig(clientCfg),
		client.WithDialer(standard.NewDialer()),
	)
	if err != nil {
		return
	}
	
	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("https://www.example.com")

	err = c.Do(context.Background(), req, res)
	fmt.Printf("resp = %v,err = %+v", string(res.Body()), err)
}
```

## 正向代理

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

### SetProxy

SetProxy 用来设置客户端代理。（更多内容请参考 [正向代理](/zh/docs/hertz/tutorials/basic-feature/proxy/#正向代理)）

> 注意：同一个客户端不能设置多个代理，如果需要使用另一个代理，请创建另一个客户端并为其设置代理。

示例代码：

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

函数签名：

```go
func main() {
	// Proxy address
	proxyURL := "http://<__user_name__>:<__password__>@<__proxy_addr__>:<__proxy_port__>"

	parsedProxyURL := protocol.ParseURI(proxyURL)
	client, err := client.NewClient(client.WithDialer(standard.NewDialer()))
	if err != nil {
		return
	}
	client.SetProxy(protocol.ProxyURI(parsedProxyURL))
	upstreamURL := "http://google.com"
	_, body, _ := client.Get(context.Background(), nil, upstreamURL)
	fmt.Println(string(body))
}
```

## 关闭空闲连接

```go
func (c *Client) CloseIdleConnections()
```

### CloseIdleConnections

`CloseIdleConnections` 方法用于关闭任何处于空闲状态的 `keep-alive` 连接。这些连接可能是之前的请求所建立的，但现在已经空闲了一段时间。该方法不会中断任何当前正在使用的连接。

函数签名：

```go
func (c *Client) CloseIdleConnections()
```

示例代码：

```go
func main() {
    c, err := client.NewClient()
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "http://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))

    // close idle connections
    c.CloseIdleConnections()
}
```

## 获取拨号器名称

```go
func (c *Client) GetDialerName() (dName string, err error)
```

### GetDialerName

`GetDialerName` 方法用于获取客户端当前使用的拨号器的名称。如果无法获取拨号器名称，则返回 `unknown`。

函数签名：

```go
func (c *Client) GetDialerName() (dName string, err error)
```

示例代码：

```go
func main() {
	c, err := client.NewClient()
	if err != nil {
		return
	}
	// get dialer name
	dName, err := c.GetDialerName()
	if err != nil {
		fmt.Printf("GetDialerName failed: %v", err)
		return
	}
	fmt.Printf("dialer name=%v\n", dName)
	// dName == "standard"
}
```

## 中间件

```go
func (c *Client) Use(mws ...Middleware)
func (c *Client) UseAsLast(mw Middleware) error
func (c *Client) TakeOutLastMiddleware() Middleware
```

### Use

使用 `Use` 方法对当前 client 增加一个中间件。（更多内容请参考 [客户端中间件](/zh/docs/hertz/tutorials/basic-feature/middleware/#客户端中间件)）

函数签名：

```go
func (c *Client) Use(mws ...Middleware)
```

### UseAsLast

`UseAsLast` 函数将中间件添加到客户端中间件链的最后。

如果客户端中间件链在之前已经设置了最后一个中间件，`UseAsLast` 函数将会返回 `errorLastMiddlewareExist` 错误。因此，为确保客户端中间件链的最后一个中间件为空，可以先使用 [TakeOutLastMiddleware](#takeoutlastmiddleware) 函数清空客户端中间件链的最后一个中间件。

>注意：`UseAsLast` 函数将中间件设置在了 `c.lastMiddleware` 中，而使用[Use](#use) 函数设置的中间件链存放在`c.mws`中，两者相对独立，只是在执行客户端中间件链的最后才执行 `c.lastMiddleware`，因此 `UseAsLast` 函数在 [Use](#use) 函数之前或之后调用皆可。

函数签名：

```go
func (c *Client) UseAsLast(mw Middleware) error
```

示例代码：

```go
func main() {
	client, err := client.NewClient()
	if err != nil {
		return
	}
	client.Use(MyMiddleware)
	client.UseAsLast(LastMiddleware)
	req := &protocol.Request{}
	res := &protocol.Response{}
	req.SetRequestURI("http://www.example.com")
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}
}
```

### TakeOutLastMiddleware

`TakeOutLastMiddleware` 函数返回 [UseAsLast](#useaslast) 函数中设置的最后一个中间件并将其清空，若没有设置则返回 `nil`。

函数签名：

```go
func (c *Client) TakeOutLastMiddleware() Middleware
```

示例代码：

```go
func main() {
	client, err := client.NewClient()
	if err != nil {
		return
	}
	client.Use(MyMiddleware)
	client.UseAsLast(LastMiddleware)
	req := &protocol.Request{}
	res := &protocol.Response{}
	req.SetRequestURI("http://www.example.com")
	err = client.Do(context.Background(), req, res)
	if err != nil {
		return
	}
	middleware := client.TakeOutLastMiddleware() // middleware == LastMiddleware
	middleware = client.TakeOutLastMiddleware() // middleware == nil
}
```
