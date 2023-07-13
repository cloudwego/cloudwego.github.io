---
title: "Client"
date: 2023-04-12
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
	fmt.Printf("get response: %s\n", resp.Body())

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

## Config

| **Option**                    | **Default**    | **Description**                                              |
| ----------------------------- | -------------- | ------------------------------------------------------------ |
| DialTimeout                   | 1s             | *dial timeout.*                                              |
| MaxConnsPerHost               | 512            | *maximum number of connections per host which may be established.* |
| MaxIdleConnDuration           | 10s            | *max idle connection duration, idle keep-alive connections are closed after this duration.* |
| MaxConnDuration               | 0s             | *max connection duration, keep-alive connections are closed after this duration.* |
| MaxConnWaitTimeout            | 0s             | *maximum duration for waiting for a free connection.*        |
| KeepAlive                     | true           | *determines whether use keep-alive connection.*              |
| ReadTimeout                   | 0s             | *maximum duration for full response reading (including body).* |
| TLSConfig                     | nil            | *tlsConfig to create a tls connection.*                      |
| Dialer                        | network.Dialer | *specific dialer.*                                           |
| ResponseBodyStream            | false          | *determine whether read body in stream or not.*              |
| DisableHeaderNamesNormalizing | false          | *whether disable header names normalizing.*                  |
| Name                          | ""             | *client name which used in User-Agent Header.*               |
| NoDefaultUserAgentHeader      | false          | *whether no default User-Agent header.*                      |
| DisablePathNormalizing        | false          | *whether disable path normalizing.*                          |
| RetryConfig                   | nil            | *retry configuration.*                                       |
| WriteTimeout                  | 0s             | *write timeout.*                                             |
| HostClientStateObserve        | nil            | *the connection state observation function.*                 |
| ObservationInterval           | 5s             | StateObserve execution interval.                             |
| DialFunc                      | network.Dialer | *set dialer function.*                                       |



### WithDialTimeout

The `WithDialTimeout` function is used to set the dialing timeout.

Function Signature:

```go
func WithDialTimeout(dialTimeout time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
	c, err := client.NewClient(client.WithDialTimeout(1 * time.Second))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithMaxConnsPerHost

The `WithMaxConnsPerHost` function is used to set the maximum number of connections per host.

Function Signature:

```go
func WithMaxConnsPerHost(maxConns int) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
	c, err := client.NewClient(client.WithMaxConnsPerHost(10))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithMaxIdleConnDuration

The `WithMaxIdleConnDuration` function is used to set the maximum duration of an idle connection. If a connection is idle for longer than the set maximum duration, it will be closed.

Function Signature:

```go
func WithMaxIdleConnDuration(maxIdleConnDuration time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithMaxIdleConnDuration(30 * time.Second))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithMaxConnDuration

The `WithMaxConnDuration` function is used to set the maximum duration of a connection. If a connection lasts longer than the set maximum duration, it will be closed.

Function Signature:

```go
func WithMaxConnDuration(maxConnDuration time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithMaxConnDuration(10 * time.Second))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithMaxConnWaitTimeout

The `WithMaxConnWaitTimeout` function is used to set the maximum duration of waiting for an idle connection. When the HTTP client needs a new connection, it will wait for the maximum time to get a new connection if there is no free connection available. If the wait time exceeds the set maximum duration, it will return an error.

Function Signature:

```go
func WithMaxConnWaitTimeout(t time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithMaxConnWaitTimeout(5 * time.Second))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithKeepAlive

The `WithKeepAlive` function is used to set whether the HTTP client uses keep-alive connections. keep-alive is an HTTP persistent connection technique that allows multiple HTTP requests and responses to be handled in a single TCP connection, reducing the overhead of establishing and closing connections and improving network performance.

Function Signature:

```go
func WithKeepAlive(b bool) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithKeepAlive(true))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithClientReadTimeout

The `WithClientReadTimeout` function is used to set the maximum duration for the client to read the full response (including the body). It accepts a parameter of type `time.Duration`, indicating the maximum duration. If the time taken to read the full response exceeds the set maximum duration, the client will return an error.

Function Signature:

```go
func WithClientReadTimeout(t time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithClientReadTimeout(10 * time.Second))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithTLSConfig

The `WithTLSConfig` function is used to set the TLS configuration to create a TLS connection, TLS (Transport Layer Security) is an encryption protocol used to secure network communications.

Function Signature:

```go
func WithTLSConfig(cfg *tls.Config) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}
	c, err := client.NewClient(client.WithTLSConfig(tlsConfig))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithDialer

The `WithDialer` function is used to set a specific dialer to be used by the HTTP client. dialer is used to create a network connection.

Function Signature:

```go
func WithDialer(d network.Dialer) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/network/netpoll"
)

func main() {
	c, err := client.NewClient(client.WithDialer(netpoll.NewDialer()))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithResponseBodyStream

The `WithResponseBodyStream` function is used to set whether the HTTP client reads the response body as a stream. If set to true, the client will use streaming when reading the response to avoid loading the entire response body into memory at once. If set to false, the client will load the entire response body into memory at once.

Function Signature:

```go
func WithResponseBodyStream(b bool) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithResponseBodyStream(true))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithDisableHeaderNamesNormalizing

The `WithDisableHeaderNamesNormalizing` function is used to set whether the HTTP client disables normalizing the header names in the request and response headers. If set to true, the client will not normalize the header names in the request and response headers. Otherwise, the client will normalize the header names in the request and response headers.

Function Signature:

```go
func WithDisableHeaderNamesNormalizing(disable bool) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithDisableHeaderNamesNormalizing(true))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithName

The `WithName` function is used to set the name of the HTTP client that will be used in the User-Agent header, which is a header field in an HTTP request that sends the server a string of information about the client application, operating system, version, and other relevant information.

Function Signature:

```go
func WithName(name string) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithName("my-client"))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithNoDefaultUserAgentHeader

The `WithNoDefaultUserAgentHeader` function is used to set whether the HTTP client disables the default User-Agent header. If set to true, the client will not send the default User-Agent header in the request. Otherwise, the client will send the default User-Agent header.

Function Signature:

```go
func WithNoDefaultUserAgentHeader(isNoDefaultUserAgentHeader bool) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithNoDefaultUserAgentHeader(true))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithDisablePathNormalizing

The `WithDisablePathNormalizing` function is used to set whether the HTTP client disables normalizing the request path. If set to true, the client will not normalize the request path. Otherwise, the client will normalize the request path.

Function Signature:

```go
func WithDisablePathNormalizing(isDisablePathNormalizing bool) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithDisablePathNormalizing(true))
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com/path/../path/./subpath")
    fmt.Printf("status=%v body=%v\n", status, string(body))
}

```

### WithRetryConfig

The `WithRetryConfig` function is used to set the retry configuration of the HTTP client. In case of problems such as network failure or timeout, the client can retry to try to re-establish the connection or resend the request.

[retryConfig detail](/docs/hertz/tutorials/basic-feature/retry/)

Function Signature:

```go
func WithRetryConfig(opts ...retry.Option) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/client/retry"
)

func main() {
	c, err := client.NewClient(client.WithRetryConfig(
		retry.WithMaxAttemptTimes(3),
		retry.WithInitDelay(1000),
		retry.WithMaxDelay(10000),
		retry.WithDelayPolicy(retry.DefaultDelayPolicy),
		retry.WithMaxJitter(1000),
	))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithWriteTimeout

The `WithWriteTimeout` function is used to set the write timeout for HTTP clients. When sending a request, if the data written to the request exceeds the specified timeout, the client will abort the request and return an error.

Function Signature:

```go
func WithWriteTimeout(t time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, err := client.NewClient(client.WithWriteTimeout(1*time.Second))
    if err != nil {
        return
    }
    status, body, _ := c.Post(context.Background(), nil, "https://www.example.com", []byte("hello, world!"))
    fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithConnStateObserve

The `WithConnStateObserve` function is used to set the connection state watch function for the HTTP client. This watch function is called when a client establishes a connection, closes a connection, or when other connection state changes occur.

Function Signature:

```go
func WithConnStateObserve(hs config.HostClientStateFunc, interval ...time.Duration) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/common/config"
)

func main() {
	observeInterval := 10 * time.Second
	stateFunc := func(state config.HostClientState) {
		fmt.Printf("state=%v\n", state)
	}
	c, err := client.NewClient(client.WithConnStateObserve(stateFunc, observeInterval))
	if err != nil {
		return
	}
  
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

### WithDialFunc

The `WithDialFunc` function is used to set the HTTP client's dial function, the underlying network dialer used by the client to establish a connection. This function accepts a parameter of type `network.DialFunc`, indicating the custom dialer function used by the client.

Function Signature:

```go
func WithDialFunc(f network.DialFunc, dialers ...network.Dialer) config.ClientOption
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/network"
	"github.com/cloudwego/hertz/pkg/network/netpoll"
)

func main() {
	var customDialFunc network.DialFunc = func(addr string) (network.Conn, error) {
		return nil, nil
	}
	c, err := client.NewClient(client.WithDialFunc(customDialFunc, netpoll.NewDialer()))
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

## Do

The Do function executes the given http request and populates the given http response. The request must contain at least one non-zero RequestURI containing the full URL or a non-zero Host header + RequestURI.

This function does not follow redirects. Please use the Get function to follow the redirect.

If resp is nil, the response will be ignored. If all DefaultMaxConnsPerHost connections against the requesting host are busy, an `ErrNoFreeConns` error will be returned. In performance-critical code, it is recommended that req and resp be obtained via AcquireRequest and AcquireResponse.

Function Signature:

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error 
```

Sample Code:

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

	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.Do(context.Background(), req, res)
	fmt.Printf("resp = %v,err = %+v", string(res.Body()), err)

}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "pong")
	})

	go performRequest()

	h.Spin()
}

```

## DoTimeout

The DoTimeout function executes the given request and waits for a response within the given timeout period.

If resp is nil, the response is ignored. If the response is not received within the given timeout period, an errTimeout error is returned.

Function Signature: 

```go
func DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {

	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.DoTimeout(context.Background(), req, res, time.Second*3)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	err = c.DoTimeout(context.Background(), req, res, time.Second)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)

}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		time.Sleep(2 * time.Second)
		ctx.String(consts.StatusOK, "pong")
	})

	go performRequest()

	h.Spin()
}

```

## DoDeadline

DoDeadline executes the given request and waits for the response until the given deadline.
If resp is nil, the response is ignored. If the response is not received by the given deadline, an errTimeout error is returned.

Function Signature: 

```go
func DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {

	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/ping")

	err = c.DoDeadline(context.Background(), req, res, time.Now().Add(3*time.Second))
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
	err = c.DoDeadline(context.Background(), req, res, time.Now().Add(1*time.Second))
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)

}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		time.Sleep(2 * time.Second)
		ctx.String(consts.StatusOK, "pong")
	})

	go performRequest()

	h.Spin()
}
```

## DoRedirects

The DoRedirects function executes the given http request and populates the given http response, following a maximum of maxRedirectsCount redirects. When the number of redirects exceeds maxRedirectsCount, an ErrTooManyRedirects error is returned.

Function Signature:

```go
func DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
```

Sample Code:

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
	c, err := client.NewClient()
	if err != nil {
		return
	}

	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8080/redirect")

	err = c.DoRedirects(context.Background(), req, res, 1)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)

	err = c.DoRedirects(context.Background(), req, res, 2)
	fmt.Printf("resp = %v,err = %+v\n", string(res.Body()), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/redirect", func(c context.Context, ctx *app.RequestContext) {
		ctx.Redirect(consts.StatusMovedPermanently, []byte("/redirect2"))
	})
	h.GET("/redirect2", func(c context.Context, ctx *app.RequestContext) {
		ctx.Redirect(consts.StatusMovedPermanently, []byte("/redirect3"))
	})
	h.GET("/redirect3", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "pong")
	})

	go performRequest()

	h.Spin()
}
```

## Get

The Get function returns the status code of the URL and the response body. If dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned.

The function will automatically follow the redirect. If you need to handle redirects manually, use the Do function.

Function Signature:

```go
func Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {
	c, err := client.NewClient()
	if err != nil {
		return
	}
	status, body, err := c.Get(context.Background(), nil, "http://localhost:8080/ping")
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "pong")
	})
	go performRequest()

	h.Spin()
}
```

## GetTimeOut

The GetTimeout function returns the status code of the URL and the response body. If the dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned. This function will automatically follow the redirect. If the redirect needs to be handled manually, use the Do function.

If the content of the URL cannot be fetched within the given timeout, an `errTimeout` error will be returned.

Warning: GetTimeout will not terminate the request itself. The request will continue in the background and the response will be discarded. If the request takes too long and the connection pool is full, try using a custom Client instance with a ReadTimeout configuration or set a request-level read timeout like this:

```go
 codeGetTimeout(ctx, dst, url, timeout, config.WithReadTimeout(1 * time.Second)) 
```

Function Signature:

```go
func GetTimeout(ctx context.Context, dst []byte, url string, timeout time.Duration, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {
	c, err := client.NewClient()
	if err != nil {
		return
	}
	status, body, err := c.GetTimeout(context.Background(), nil, "http://localhost:8080/ping", 3*time.Second)
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)

	status, body, err = c.GetTimeout(context.Background(), nil, "http://localhost:8080/ping", 1*time.Second)
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		time.Sleep(2 * time.Second)
		ctx.String(consts.StatusOK, "pong")
	})
	go performRequest()

	h.Spin()
}

```

## GetDeadline

The GetDeadline function returns the status code of the URL and the response body. If the dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned. This function will automatically follow the redirect. If the redirect needs to be handled manually, use the Do function.

If the content of the URL cannot be fetched before the given deadline, an `errTimeout` error will be returned.

Warning: GetDeadline will not terminate the request itself. The request will continue in the background and the response will be discarded. If the request takes too long and the connection pool is full, try using a custom Client instance with a ReadTimeout configuration or set a request-level read timeout like the following:

```gi
GetDeadline(ctx, dst, url, deadline, config.WithReadTimeout(1 * time.Second))
```

Function Signature:

```go
func GetDeadline(ctx context.Context, dst []byte, url string, deadline time.Time, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {
	c, err := client.NewClient()
	if err != nil {
		return
	}
	status, body, err := c.GetDeadline(context.Background(), nil, "http://localhost:8080/ping", time.Now().Add(3*time.Second))
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)

	status, body, err = c.GetDeadline(context.Background(), nil, "http://localhost:8080/ping", time.Now().Add(time.Second))
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		time.Sleep(2 * time.Second)
		ctx.String(consts.StatusOK, "pong")
	})
	go performRequest()

	h.Spin()
}
```

## Post

The Post function sends a POST request to the specified URL using the given POST parameters. If dst is too small, it will be replaced by the response body and returned, otherwise a new slice will be assigned. The function will automatically follow the redirect. If you need to handle redirects manually, use the Do function.

If postArgs is nil, then an empty POST request body is sent.

Function Signature:

```go
func Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

Sample Code:

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
	c, err := client.NewClient()
	if err != nil {
		return
	}
  
	var postArgs protocol.Args
	postArgs.Set("name", "cloudwego") // Set post args
	status, body, err := c.Post(context.Background(), nil, "http://localhost:8080/hello", &postArgs)
	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.POST("/hello", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "hello %s", ctx.PostForm("name"))
	})
	go performRequest()

	h.Spin()
}
```

## SetProxy

SetProxy is used to set the client proxy.

Note that multiple proxies cannot be set for the same client. If you need to use another proxy, please create another client and set a proxy for it.

Sample Code:

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

Function Signature:

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/network/standard"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {

	client, err := client.NewClient(client.WithDialer(standard.NewDialer()))
	if err != nil {
		log.Print(err)
		return
	}
	client.SetProxy(protocol.ProxyURI(protocol.ParseURI("http://localhost:8080")))
	status, body, err := client.Get(context.Background(), nil, "http://localhost:8081/ping")

	fmt.Printf("status=%v body=%v err=%v\n", status, string(body), err)
}

func main() {

	h1 := server.New(server.WithHostPorts(":8080"))

	h1.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		cli, err := client.NewClient()
		if err != nil {
			log.Printf("client.NewClient err: %v", err)
		}

		req, res := &protocol.Request{}, &protocol.Response{}
		req.SetMethod(consts.MethodGet)
		req.SetRequestURI("http://localhost:8081/ping")

		cli.Do(context.Background(), req, res)
		ctx.String(res.StatusCode(), res.BodyBuffer().String())

	})
	go h1.Spin()

	h2 := server.New(server.WithHostPorts(":8081"))
	h2.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "pong")
	})
	go h2.Spin()

	performRequest()

}
```

## SetRetryIfFunc

The `SetRetryIfFunc` method is used to set the client's retry function, which is used to determine whether a request should be retried if it fails.

Function Signature:

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/protocol"
)

func main() {

	c, err := client.NewClient()
	if err != nil {
		return
	}
	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))

	var customRetryIfFunc = func(req *protocol.Request, resp *protocol.Response, err error) bool {
		return true
	}

	c.SetRetryIfFunc(customRetryIfFunc)

	status2, body2, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status2, string(body2))
}
```

## SetClientFactory

The `SetClientFactory` method is used to set the client factory object, which is used to create the HTTP client object.

Function Signature:

```go
func (c *Client) SetClientFactory(cf suite.ClientFactory)
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/protocol/http1/factory"
)

func main() {

	c, err := client.NewClient()
	if err != nil {
		return
	}

	c.SetClientFactory(factory.NewClientFactory(nil))

	status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

## CloseIdleConnections

The `CloseIdleConnections` method is used to close any "keep-alive" connections that are in an idle state. These connections may have been established by a previous request, but have been idle for some time now. This method does not break any connections that are currently in use.

Function Signature:

```go
func (c *Client) CloseIdleConnections()
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {

    c, err := client.NewClient()
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))

    // 关闭空闲连接
    c.CloseIdleConnections()
}
```

## GetDialerName

The `GetDialerName` method is used to get the name of the dialer currently used by the client. If the dialer name cannot be retrieved, `unknown` is returned.

Function Signature:

```go
func (c *Client) GetDialerName() (dName string, err error)
```

Sample Code:

```go
package main

import (
    "context"
    "fmt"
    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {

    c, err := client.NewClient()
    if err != nil {
        return
    }
    status, body, _ := c.Get(context.Background(), nil, "https://www.example.com")
    fmt.Printf("status=%v body=%v\n", status, string(body))

    // 获取拨号器名称
    dName, err := c.GetDialerName()
    if err != nil {
        fmt.Printf("GetDialerName failed: %v", err)
        return
    }
    fmt.Printf("dialer name=%v\n", dName)
}

```

## GetOptions

The `GetOptions` function returns a pointer to the `ClientOptions` structure of the `Client` instance.

Function Signature:

```go
func (c *Client) GetOptions() *config.ClientOptions
```

Sample Code:

```go
package main

import (
	"fmt"

	"github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
	c, err := client.NewClient()
	if err != nil {
		return
	}

	options := c.GetOptions()
	fmt.Println(options.DialTimeout)
}

```

## Middleware

Use the `Use` method to add a middleware to the current client.

Function Signature:

```go
type Middleware func(Endpoint) Endpoint
```

Sample Code:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func MyMiddleware(next client.Endpoint) client.Endpoint {
	return func(ctx context.Context, req *protocol.Request, resp *protocol.Response) (err error) {
		// pre-handle
		fmt.Println("pre-clientHandle")
		if err = next(ctx, req, resp); err != nil {
			fmt.Println(err)
			return err
		}
		// post-handle
		fmt.Println("post-clientHandle")
		return nil
	}
}

func performRequest() {

	time.Sleep(1 * time.Second)
	client, err := client.NewClient()
	if err != nil {
		return
	}

	client.Use(MyMiddleware)
	req, res := &protocol.Request{}, &protocol.Response{}
	req.SetRequestURI("http://127.0.0.1:8080/ping")

	err = client.Do(context.Background(), req, res)
	fmt.Printf("resp = %v,err = %+v", string(res.Body()), err)
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "pong")
	})

	go performRequest()

	h.Spin()
}
```
