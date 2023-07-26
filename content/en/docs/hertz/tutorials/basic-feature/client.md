---
title: "Client"
date: 2023-07-25
weight: 3
description: >
---



## Quick Start

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
	fmt.Printf("get response: %s\n", resp.Body()) // status == 200 resp.Body() == []byte("hello hertz")
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

## Client Config

| **Option**                    | **Default**    | **Description**                                              |
| ----------------------------- | -------------- | ------------------------------------------------------------ |
| DialTimeout                   | 1s             | dial timeout.                                            |
| MaxConnsPerHost               | 512            | maximum number of connections per host which may be established. |
| MaxIdleConnDuration           | 10s            | max idle connection duration, idle keep-alive connections are closed after this duration. |
| MaxConnDuration               | 0s             | max connection duration, keep-alive connections are closed after this duration. |
| MaxConnWaitTimeout            | 0s             | maximum duration for waiting for a free connection.       |
| KeepAlive                     | true           | determines whether use keep-alive connection, default use.              |
| ReadTimeout                   | 0s             | maximum duration for full response reading (including body). |
| TLSConfig                     | nil            | tlsConfig to create a tls connection, for specific configuration information, please refer to [tls](/docs/hertz/tutorials/basic-feature/protocol/tls/).                      |
| Dialer                        | network.Dialer | specific dialer.                                           |
| ResponseBodyStream            | false          | determine whether read body in stream or not, default not read in stream.              |
| DisableHeaderNamesNormalizing | false          | whether disable header names normalizing, default not disabled, for example, cONTENT-lenGTH -> Content-Length.                |
| Name                          | ""             | client name which used in User-Agent Header.               |
| NoDefaultUserAgentHeader      | false          | whether no default User-Agent header, default with User-Agent header.                    |
| DisablePathNormalizing        | false          | whether disable path normalizing, default specification path, for example, http://localhost:8080/hello/../ hello -> http://localhost:8080/hello.                         |
| RetryConfig                   | nil            | retry configuration, for specific configuration information, please refer to [retry](/docs/hertz/tutorials/basic-feature/retry/).                                      |
| WriteTimeout                  | 0s             | write timeout.                                             |
| HostClientStateObserve        | nil            | the connection state observation function.                 |
| ObservationInterval           | 5s             | StateObserve execution interval.                             |
| DialFunc                      | network.Dialer | set dialer function.                                       |

Sample Code:

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

## Client Request Config

| **Option**                        | **Default**         | **Description**                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| WithDialTimeout                   | 0s             | Dial timeout time, **this configuration item has a higher priority than the client configuration, which will overwrite the corresponding client configuration item**.                                           |
| WithReadTimeout               | 0s              | The maximum duration of a complete read response (including body), **this configuration item has a higher priority than the client configuration, which will overwrite the corresponding client configuration item**.                            |
| WithWriteTimeout           | 0s            | HTTP client write timeout, **this configuration item has a higher priority than the client configuration, which will overwrite the corresponding client configuration item**.  |
| WithRequestTimeout               | 0s             | The timeout for a complete HTTP request. |
| WithTag            | make(map[string]string)             | Set the tags field in the form of key-value, which is used for the `TargetInfo` structure by the client service discovery.                                 |
| WithSD                     | false          | Set the isSD field, which is used for client service discovery middleware.                             |

Sample Code:

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

## Send Request

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error
func (c *Client) DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
func (c *Client) Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
func (c *Client) Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

### Do

The `Do` function executes the given http request and populates the given http response. The request must contain at least one non-zero RequestURI containing the full URL or a non-zero Host header + RequestURI.

This function does not follow redirects. Please use the [Get](#get) function, [DoRedirects](#doredirects) function, or [Post](#post) function to follow the redirection.

If resp is nil, the response will be ignored. If all DefaultMaxConnsPerHost connections against the requesting host are busy, an `ErrNoFreeConns` error will be returned. In performance-critical code, it is recommended that req and resp be obtained via AcquireRequest and AcquireResponse.

Function Signature:

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error 
```

Sample Code:

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

The `DoRedirects` function executes the given http request and populates the given http response, following a maximum of maxRedirectsCount redirects. When the number of redirects exceeds maxRedirectsCount, an `ErrTooManyRedirects` error is returned.

Function Signature:

```go
func (c *Client) DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
```

Sample Code:

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

The `Get` function returns the status code of the URL and the response body. If dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned.

The function will automatically follow the redirect. 

Function Signature:

```go
func (c *Client) Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

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

The `Post` function sends a POST request to the specified URL using the given POST parameters. If dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned. 

The function will automatically follow the redirect.

If postArgs is nil, then an empty POST request body is sent.

Function Signature:

```go
func (c *Client) Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

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

## Request Timeout

```go
func WithReadTimeout(t time.Duration) RequestOption
func (c *Client) DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
func (c *Client) DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

### WithReadTimeout

Although the `Do`, `DoRedirects`, `Get`, `Post` function cannot set the request timeout by passing parameters, it can be set through the `WithRequestTimeout` configuration item in the [Client Request Configuration](#client-request-config).

Sample Code:

```go
func main() {
	c, err := client.NewClient()
	if err != nil {
		return
	}

	// Do
	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetOptions(config.WithRequestTimeout(5 * time.Second))
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8888/get")
	err = c.Do(context.Background(), req, res)

	// DoRedirects
	err = c.DoRedirects(context.Background(), req, res, 5)

	// Get
	_, _, err = c.Get(context.Background(), nil, "http://localhost:8888/get", config.WithRequestTimeout(5*time.Second))

	// Post
	postArgs := &protocol.Args{}
	_, _, err = c.Post(context.Background(), nil, "http://localhost:8888/post", postArgs, config.WithRequestTimeout(5*time.Second))
}
```

### DoTimeout

The `DoTimeout` function executes the given request and waits for a response within the given timeout period.

This function does not follow redirects. Please use the [Get](#get) function, [DoRedirects](#doredirects) function, or [Post](#post) function to follow the redirection.

If resp is nil, the response is ignored. If the response is not received within the given timeout period, an `errTimeout error` is returned.

Function Signature: 

```go
func (c *Client) DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
```

Sample Code:

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

`DoDeadline` executes the given request and waits for the response until the given deadline.

This function does not follow redirects. Please use the [Get](#get) function, [DoRedirects](#doredirects) function, or [Post](#post) function to follow the redirection.

If resp is nil, the response is ignored. If the response is not received by the given deadline, an `errTimeout error` is returned.

Function Signature: 

```go
func (c *Client) DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

Sample Code:

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

## Request Retry

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

### SetRetryIfFunc

The `SetRetryIfFunc` method is used to customize the conditions under which retry occurs. (For more information, please refer to [retry-condition-configuration](/docs/hertz/tutorials/basic-feature/retry/#retry-condition-configuration))

Function Signature:

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

Sample Code:

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

## Add Request Content

Hertz's client can add various forms of request content in HTTP requests, such as `query` parameters, `www url encoded`, ` multipart/form data`, and `JSON`.

Sample Code:

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

## Upload File

Hertz's client supports uploading files to the server.

Sample Code:

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

## Streaming Read Response Content

Hertz's client supports streaming read HTTP response content. For more information, please refer to [Client](/docs/hertz/tutorials/basic-feature/stream/#client).

Sample Code:

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

## Service Discovery

The Hertz client supports finding target servers through service discovery.

Hertz supports custom service discovery modules. For more information, please refer to [service-discovery-extension](/docs/hertz/tutorials/framework-exten/service_discovery/#service-discovery-extension).

The relevant content of the service discovery center that Hertz has currently accessed can be found in [Service Registration and Service Discovery Extensions](/docs/hertz/tutorials/framework-exten/service_discovery/).

## TLS

The network library `netpoll` used by Hertz client by default does not support TLS. If you want to configure TLS to access https addresses, you should use the Standard library.

For TLS related configuration information, please refer to [tls](/docs/hertz/tutorials/basic-feature/protocol/tls/).

Sample Code:

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

## Forward Proxy

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

### SetProxy

`SetProxy` is used to set the client proxy. (For more information, please refer to [retry-condition-configuration](/docs/hertz/tutorials/basic-feature/proxy/#forward-proxy))

> Note: Multiple proxies cannot be set for the same client. If you need to use another proxy, please create another client and set a proxy for it.

Sample Code:

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

Function Signature:

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

## Close Idle Connections

```go
func (c *Client) CloseIdleConnections()
```

### CloseIdleConnections

The `CloseIdleConnections` method is used to close any `keep-alive` connections that are in an idle state. These connections may have been established by a previous request, but have been idle for some time now. This method does not break any connections that are currently in use.

Function Signature:

```go
func (c *Client) CloseIdleConnections()
```

Sample Code:

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

## Get Dialer Name

```go
func (c *Client) GetDialerName() (dName string, err error)
```

### GetDialerName

The `GetDialerName` method is used to get the name of the dialer currently used by the client. If the dialer name cannot be retrieved, `unknown` is returned.

Function Signature:

```go
func (c *Client) GetDialerName() (dName string, err error)
```

Sample Code:

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

## Middleware

```go
func (c *Client) Use(mws ...Middleware)
func (c *Client) UseAsLast(mw Middleware) error
func (c *Client) TakeOutLastMiddleware() Middleware
```

### Use

Use the `Use` method to add a middleware to the current client. (For more information, please refer to [client-side-middleware](/docs/hertz/tutorials/basic-feature/middleware/#client-side-middleware))

Function Signature:

```go
func (c *Client) Use(mws ...Middleware)
```

### UseAsLast

The `UseAsLast` function adds the middleware to the end of the client middleware chain.

If the client middleware chain has already set the last middleware before, the `UseAsLast` function will return an `errorLastMiddlewareExist` error. Therefore, to ensure that the last middleware in the client middleware chain is empty, you can first use the [TakeOutLastMiddleware](#takeoutlastmiddleware) function to clear the last middleware in the client middleware chain.

>Note: The `UseAsLast` function sets the middleware in `c.lastMiddleware`, while the middleware chain set using the [Use](#use) function is stored in `c.mws`. The two functions are relatively independent. `c.lastMiddleware` is executed only at the end of the client middleware chain. Therefore, the ` UseAsLast` function can be called before or after the [Use](#use) function.

Function Signature:

```go
func (c *Client) UseAsLast(mw Middleware) error
```

Sample Code:

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

The `TakeOutLastMiddleware` function returns the last middleware set in the [UseAsLast](#useaslast) function and clears it. If it is not set, it returns `nil`.

Function Signature:

```go
func (c *Client) TakeOutLastMiddleware() Middleware
```

Sample Code:

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
