---
title: "客户端"
date: 2023-04-12
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

## 配置

| 配置项                        | 默认值         | 描述                                                    |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| DialTimeout                   | 1s             | 拨号超时时间                                            |
| MaxConnsPerHost               | 512            | 每个主机可能建立的最大连接数                            |
| MaxIdleConnDuration           | 10s            | 最大的空闲连接持续时间，空闲的连接在此持续时间后被关闭  |
| MaxConnDuration               | 0s             | 最大的连接持续时间，keep-alive 连接在此持续时间后被关闭 |
| MaxConnWaitTimeout            | 0s             | 等待空闲连接的最大时间                                  |
| KeepAlive                     | true           | 是否使用 keep-alive 连接                                |
| ReadTimeout                   | 0s             | 完整读取响应（包括body）的最大持续时间                  |
| TLSConfig                     | nil            | 用来创建一个 tls 连接的 tlsConfig                       |
| Dialer                        | network.Dialer | 设置指定的拨号器                                        |
| ResponseBodyStream            | false          | 是否在流中读取 body                                     |
| DisableHeaderNamesNormalizing | false          | 是否禁用头名称规范化                                    |
| Name                          | ""             | 用户代理头中使用的客户端名称                            |
| NoDefaultUserAgentHeader      | false          | 是否没有默认的User-Agent头                              |
| DisablePathNormalizing        | false          | 是否禁用路径规范化。                                    |
| RetryConfig                   | nil            | 重试配置                                                |
| WriteTimeout                  | 0s             | 写入超时时间                                            |
| HostClientStateObserve        | nil            | 观察和记录`HostClientState`的状态的函数                 |
| ObservationInterval           | 5s             | 状态观察执行间隔                                        |
| DialFunc                      | network.Dialer | 自定义拨号器功能，会覆盖自定义拨号器                    |


### WithDialTimeout

`WithDialTimeout` 函数用于设置拨号超时时间。

函数签名：

```go
func WithDialTimeout(dialTimeout time.Duration) config.ClientOption
```

示例代码：

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

`WithMaxConnsPerHost` 函数用于设置每个主机最大连接数。

函数签名：

```go
func WithMaxConnsPerHost(maxConns int) config.ClientOption
```

示例代码：

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

`WithMaxIdleConnDuration` 函数用于设置空闲连接的最大持续时间。如果一条连接的空闲时间超过了设置的最大持续时间，它将被关闭。

函数签名：

```go
func WithMaxIdleConnDuration(maxIdleConnDuration time.Duration) config.ClientOption
```

示例代码：

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

`WithMaxConnDuration` 函数用于设置连接的最大持续时间。如果一条连接的持续时间超过了设置的最大持续时间，它将被关闭。

函数签名：

```go
func WithMaxConnDuration(maxConnDuration time.Duration) config.ClientOption
```

示例代码：

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

`WithMaxConnWaitTimeout` 函数用于设置等待空闲连接的最大持续时间。当 HTTP 客户端需要新的连接时，如果没有可用的空闲连接，它将等待最长时间来获得一个新的连接。如果等待时间超过了设置的最大持续时间，它将返回一个错误。

函数签名：

```go
func WithMaxConnWaitTimeout(t time.Duration) config.ClientOption
```

示例代码：

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

`WithKeepAlive` 函数用于设置 HTTP 客户端是否使用 keep-alive 连接。keep-alive 是一种 HTTP 的持久连接技术，它可以在一次 TCP 连接中处理多个 HTTP 请求和响应，减少了建立和关闭连接的开销，提高了网络性能。

函数签名：

```go
func WithKeepAlive(b bool) config.ClientOption
```

示例代码：

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

`WithClientReadTimeout` 函数用于设置客户端读取完整响应（包括 body）的最大持续时间。它接受一个 `time.Duration` 类型的参数，表示最大持续时间。如果读取完整响应的时间超过了设置的最大持续时间，客户端将返回一个错误。

函数签名：

```go
func WithClientReadTimeout(t time.Duration) config.ClientOption
```

示例代码：

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

`WithTLSConfig` 函数用于设置 TLS 配置，以创建 TLS 连接。TLS（Transport Layer Security）是一种加密协议，用于保护网络通信的安全。

函数签名：

```go
func WithTLSConfig(cfg *tls.Config) config.ClientOption
```

示例代码：

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

`WithDialer` 函数用于设置 HTTP 客户端使用的特定 dialer（拨号器）。dialer 用于创建网络连接。

函数签名：

```go
func WithDialer(d network.Dialer) config.ClientOption
```

示例代码：

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

`WithResponseBodyStream` 函数用于设置 HTTP 客户端是否以流式方式读取响应体。如果设置为 true，客户端将在读取响应时使用流式读取，以避免一次性将整个响应体加载到内存中。如果设置为 false，客户端将一次性将整个响应体加载到内存中。

函数签名：

```go
func WithResponseBodyStream(b bool) config.ClientOption
```

示例代码：

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

`WithDisableHeaderNamesNormalizing` 函数用于设置 HTTP 客户端是否禁用标准化请求和响应头中的 header 名称。如果设置为 true，客户端将不会标准化请求和响应头中的 header 名称。否则，客户端将标准化请求和响应头中的 header 名称。

函数签名：

```go
func WithDisableHeaderNamesNormalizing(disable bool) config.ClientOption
```

示例代码：

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

`WithName` 函数用于设置 HTTP 客户端的名称，该名称将用于 User-Agent 头中。User-Agent 头是 HTTP 请求中的一个标头字段，它向服务器发送有关客户端应用程序、操作系统、版本和其他相关信息的字符串。

函数签名：

```go
func WithName(name string) config.ClientOption
```

示例代码：

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

`WithNoDefaultUserAgentHeader` 函数用于设置 HTTP 客户端是否禁用默认的 User-Agent 头。如果设置为 true，客户端将不会在请求中发送默认的 User-Agent 头。否则，客户端将发送默认的 User-Agent 头。

函数签名：

```go
func WithNoDefaultUserAgentHeader(isNoDefaultUserAgentHeader bool) config.ClientOption
```

示例代码：

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

`WithDisablePathNormalizing` 函数用于设置 HTTP 客户端是否禁用标准化请求路径。如果设置为 true，客户端将不会标准化请求路径。否则，客户端将标准化请求路径。

函数签名：

```go
func WithDisablePathNormalizing(isDisablePathNormalizing bool) config.ClientOption
```

示例代码：

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

`WithRetryConfig` 函数用于设置 HTTP 客户端的重试配置。在发生网络故障或超时等问题时，客户端可以通过重试来尝试重新建立连接或重新发送请求。

[重试配置的详细信息](/zh/docs/hertz/tutorials/basic-feature/retry)

函数签名：

```go
func WithRetryConfig(opts ...retry.Option) config.ClientOption
```

示例代码：

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

`WithWriteTimeout` 函数用于设置 HTTP 客户端的写入超时时间。在发送请求时，如果写入请求的数据超过了指定的超时时间，则客户端会中止请求并返回错误。

函数签名：

```go
func WithWriteTimeout(t time.Duration) config.ClientOption
```

示例代码：

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

`WithConnStateObserve` 函数用于设置 HTTP 客户端的连接状态观察函数。在客户端建立连接、关闭连接或发生其他连接状态变化时，该观察函数会被调用。

函数签名：

```go
func WithConnStateObserve(hs config.HostClientStateFunc, interval ...time.Duration) config.ClientOption
```

示例代码：

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

`WithDialFunc` 函数用于设置 HTTP 客户端的拨号函数，即客户端用于建立连接的底层网络拨号器。该函数接受一个 `network.DialFunc` 类型的参数，表示客户端使用的自定义拨号函数。

函数签名：

```go
func WithDialFunc(f network.DialFunc, dialers ...network.Dialer) config.ClientOption
```

示例代码：

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

Do 函数执行给定的 http 请求并填充给定的 http 响应。请求必须包含至少一个非零的RequestURI，其中包含完整的URL或非零的 Host header + RequestURI。

该函数不会跟随重定向。请使用 Get 函数来跟随重定向。

如果resp为nil，则会忽略响应。如果所有针对请求主机的DefaultMaxConnsPerHost连接都已忙，则会返回`ErrNoFreeConns`错误。在性能关键的代码中，建议通过 AcquireRequest 和 AcquireResponse 获取 req 和 resp。

函数签名：

```go
func (c *Client) Do(ctx context.Context, req *protocol.Request, resp *protocol.Response) error 
```

示例代码：

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

DoTimeout函数执行给定的请求并在给定的超时时间内等待响应。

如果 resp 为 nil，则会忽略响应。如果在给定的超时时间内未能收到响应，则会返回 errTimeout 错误。

函数签名： 

```go
func DoTimeout(ctx context.Context, req *protocol.Request, resp *protocol.Response, timeout time.Duration) error
```

示例代码：

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

DoDeadline 执行给定的请求并等待响应，直至给定的最后期限。
如果resp为 nil，则会忽略响应。如果在给定的截止日期之前未能收到响应，则会返回 errTimeout 错误。

函数签名： 

```go
func DoDeadline(ctx context.Context, req *protocol.Request, resp *protocol.Response, deadline time.Time) error
```

示例代码：

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

DoRedirects 函数执行给定的 http 请求并填充给定的 http 响应，遵循最多 maxRedirectsCount 次重定向。当重定向次数超过maxRedirectsCount 时，将返回 ErrTooManyRedirects 错误。

函数签名：

```go
func DoRedirects(ctx context.Context, req *protocol.Request, resp *protocol.Response, maxRedirectsCount int) error
```

示例代码：

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

Get 函数返回 URL 的状态码和响应体。如果 dst 太小，则将被响应体替换并返回，否则将分配一个新的切片。

该函数会自动跟随重定向。如果需要手动处理重定向，请使用 Do 函数。

函数签名：

```go
func Get(ctx context.Context, dst []byte, url string, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

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

GetTimeout函数返回URL的状态码和响应体。如果dst太小，则将被响应体替换并返回，否则将分配一个新的切片。该函数会自动跟随重定向。如果需要手动处理重定向，请使用Do函数。

如果在给定的超时时间内无法获取URL的内容，则会返回`errTimeout`错误。

警告：GetTimeout不会终止请求本身。该请求将在后台继续进行，并且响应将被丢弃。如果请求时间过长且连接池已满，请尝试使用具有ReadTimeout配置的自定义Client实例或像下面这样设置请求级别的读取超时时间：

```go
 codeGetTimeout(ctx, dst, url, timeout, config.WithReadTimeout(1 * time.Second)) 
```

函数签名：

```go
func GetTimeout(ctx context.Context, dst []byte, url string, timeout time.Duration, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

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

GetDeadline函数返回URL的状态码和响应体。如果dst太小，则将被响应体替换并返回，否则将分配一个新的切片。该函数会自动跟随重定向。如果需要手动处理重定向，请使用Do函数。

如果在给定的截止时间之前无法获取URL的内容，则会返回`errTimeout`错误。

警告：GetDeadline不会终止请求本身。该请求将在后台继续进行，并且响应将被丢弃。如果请求时间过长且连接池已满，请尝试使用具有ReadTimeout配置的自定义Client实例或像下面这样设置请求级别的读取超时时间：

```gi
GetDeadline(ctx, dst, url, deadline, config.WithReadTimeout(1 * time.Second))
```

函数签名：

```go
func GetDeadline(ctx context.Context, dst []byte, url string, deadline time.Time, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

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

Post 函数使用给定的 POST 参数向指定的 URL 发送 POST 请求。如果 dst 太小，则将被响应体替换并返回，否则将分配一个新的切片。该函数会自动跟随重定向。如果需要手动处理重定向，请使用 Do 函数。

如果 postArgs 为 nil ，则发送空的 POST 请求体。

函数签名：

```go
func Post(ctx context.Context, dst []byte, url string, postArgs *protocol.Args, requestOptions ...config.RequestOption) (statusCode int, body []byte, err error)
```

示例代码：

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

SetProxy 用来设置客户端代理。

注意，同一个客户端不能设置多个代理，如果需要使用另一个代理，请创建另一个客户端并为其设置代理。

示例代码：

```go
func (c *Client) SetProxy(p protocol.Proxy)
```

函数签名：

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

`SetRetryIfFunc` 方法用于设置客户端的重试函数，该函数用于判断在请求失败时是否应该重试。

函数签名：

```go
func (c *Client) SetRetryIfFunc(retryIf client.RetryIfFunc)
```

示例代码：

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

`SetClientFactory` 方法用于设置客户端工厂对象，该工厂对象用于创建 HTTP 客户端对象。

函数签名：

```go
func (c *Client) SetClientFactory(cf suite.ClientFactory)
```

示例代码：

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

`CloseIdleConnections` 方法用于关闭任何处于空闲状态的 "keep-alive" 连接。这些连接可能是之前的请求所建立的，但现在已经空闲了一段时间。该方法不会中断任何当前正在使用的连接。

函数签名：

```go
func (c *Client) CloseIdleConnections()
```

示例代码：

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

`GetDialerName` 方法用于获取客户端当前使用的拨号器的名称。如果无法获取拨号器名称，则返回 "unknown"。

函数签名：

```go
func (c *Client) GetDialerName() (dName string, err error)
```

示例代码：

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

`GetOptions` 函数返回 `Client` 实例的 `ClientOptions` 结构体指针。

函数签名：

```go
func (c *Client) GetOptions() *config.ClientOptions
```

示例代码：

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

使用 `Use` 方法对当前 client 增加一个中间件。

函数签名：

```go
type Middleware func(Endpoint) Endpoint
```

示例代码：

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
