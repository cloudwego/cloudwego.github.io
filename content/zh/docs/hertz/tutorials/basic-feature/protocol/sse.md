---
title: "SSE"
date: 2023-05-12
weight: 6
keywords: ["SSE", "HTTP", "Server-Sent Events"]
description: "Hertz 支持 SSE，允许服务器端通过简单的 HTTP 响应向客户端发送事件。"
---

SSE 是 Server-Sent Events 的缩写，是一种服务器推送技术，它允许服务器端通过简单的 HTTP 响应向客户端发送事件。

hertz 的实现见 [这里](https://github.com/hertz-contrib/sse)。

## 安装

```shell
go get github.com/hertz-contrib/sse
```

## 示例代码

### 服务端

在下面的示例中，在访问 `/sse` 时，服务端将每秒向客户端推送一个时间戳。

```go
package main

import (
	"context"
	"net/http"
	"time"

	"github.com/hertz-contrib/sse"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
)

func main() {
	h := server.Default()

	h.GET("/sse", func(ctx context.Context, c *app.RequestContext) {
		// 客户端可以通过 Last-Event-ID 告知服务器收到的最后一个事件
		lastEventID := sse.GetLastEventID(c)
		hlog.CtxInfof(ctx, "last event ID: %s", lastEventID)

		// 在第一次渲染调用之前必须先行设置状态代码和响应头文件
		c.SetStatusCode(http.StatusOK)
		s := sse.NewStream(c)
		for t := range time.NewTicker(1 * time.Second).C {
			event := &sse.Event{
				Event: "timestamp",
				Data:  []byte(t.Format(time.RFC3339)),
			}
			err := s.Publish(event)
			if err != nil {
				return
			}
		}
	})

	h.Spin()
}
```

### 客户端

```go
package main

import (
	"context"
	"sync"

	"github.com/hertz-contrib/sse"

	"github.com/cloudwego/hertz/pkg/common/hlog"
)

var wg sync.WaitGroup

func main() {
  wg.Add(2)
  go func() {
    // 传入 server 端 URL 初始化客户端
    c := sse.NewClient("http://127.0.0.1:8888/sse")

    // 连接到服务端的时候触发
    c.OnConnect(func(ctx context.Context, client *sse.Client) {
      hlog.Infof("client1 connect to server %s success with %s method", c.URL, c.Method)
    })

    // 服务端断开连接的时候触发
    c.OnDisconnect(func(ctx context.Context, client *sse.Client) {
      hlog.Infof("client1 disconnect to server %s success with %s method", c.URL, c.Method)
    })

    events := make(chan *sse.Event)
    errChan := make(chan error)
    go func() {
      cErr := c.Subscribe(func(msg *sse.Event) {
        if msg.Data != nil {
          events <- msg
          return
        }
      })
      errChan <- cErr
    }()
    for {
      select {
      case e := <-events:
        hlog.Info(e)
      case err := <-errChan:
        hlog.CtxErrorf(context.Background(), "err = %s", err.Error())
		wg.Done()
        return
      }
    }
  }()

  go func() {
    // 传入 server 端 URL 初始化客户端
    c := sse.NewClient("http://127.0.0.1:8888/sse")

    // 连接到服务端的时候触发
    c.OnConnect(func(ctx context.Context, client *sse.Client) {
      hlog.Infof("client2 %s connect to server success with %s method", c.URL, c.Method)
    })

    // 服务端断开连接的时候触发
    c.OnDisconnect(func(ctx context.Context, client *sse.Client) {
      hlog.Infof("client2 %s disconnect to server success with %s method", c.URL, c.Method)
    })

    events := make(chan *sse.Event)
    errChan := make(chan error)
    go func() {
      cErr := c.Subscribe(func(msg *sse.Event) {
        if msg.Data != nil {
          events <- msg
          return
        }
      })
      errChan <- cErr
    }()
    for {
      select {
      case e := <-events:
        hlog.Info(e)
      case err := <-errChan:
        hlog.CtxErrorf(context.Background(), "err = %s", err.Error())
		wg.Done()
        return
      }
    }
  }()

  select {}
}
```

## 服务端配置

### NewStream

NewStream 用于创建一个流用于发送事件。在默认情况下，会设置 `Content-Type` 为 `text/event-stream` (最好不要修改 `Content-Type`)，`Cache-Control` 为 `no-cache`。

如果服务器和客户端之间有任何代理，那将建议设置响应头 `X-Accel-Buffering` 为 `no`。

函数签名:

```go
func NewStream(c *app.RequestContext) *Stream
```

示例代码:

```go
package main

func main() {
    h := server.Default()

    h.GET("/sse", func(ctx context.Context, c *app.RequestContext) {
        c.SetStatusCode(http.StatusOK)
        c.Response.Header.Set("X-Accel-Buffering", "no")
        s := sse.NewStream(c)
		// ...
    })

}
```

### Publish

Publish 用于向客户端发送事件，事件的格式如下:

```go
type Event struct {
	// 事件名称
    Event string
    // 事件数据
    Data []byte
    // 事件标识符
    ID string
    // 事件重试时间
    Retry time.Duration
}
```

函数签名:

```go
func (c *Stream) Publish(event *Event) error
```

### GetLastEventID

GetLastEventID 用于获取客户端发送的最后一个事件标识符。

函数签名:

```go
func GetLastEventID(c *app.RequestContext) string
```

## 客户端配置

### NewClient

传入 server 端 URL 完成对客户端的初始化，默认设置 `maxBufferSize` 为 1 << 16，`Method` 请求方法为 `GET`

可以设置 Client.Onconnect 和 Client.OnDisconnect 来进行连接和中断连接之后的自定义处理

目前暂不支持中断重连

函数签名:

`func NewClient(url string) *Client`

### Subscribe

客户端对服务端进行订阅监听，`handler` 是自定义的对收到事件的处理函数

函数签名:

`func (c *Client) Subscribe(handler func(msg *Event)) error`

示例代码:

```go
package main

func main() {
    events := make(chan *sse.Event)
    errChan := make(chan error)
    go func() {
        cErr := c.Subscribe(func(msg *sse.Event) {
            if msg.Data != nil {
                events <- msg
                return
            }
        })
        errChan <- cErr
    }()
    for {
        select {
        case e := <-events:
            hlog.Info(e)
        case err := <-errChan:
            hlog.CtxErrorf(context.Background(), "err = %s", err.Error())
            wg.Done()
            return
        }
    }
}
```

### SubscribeWithContext

客户端对服务端进行订阅监听，可传入一个自定义的 `ctx`，其他功能与 `Subscribe` 相同

函数签名:

`func (c *Client) SubscribeWithContext(ctx context.Context, handler func(msg *Event)) error`

示例代码:

```go
package main

import "context"

func main() {
    events := make(chan *sse.Event)
    errChan := make(chan error)
    go func() {
        cErr := c.SubscribeWithContext(context.Background(), func(msg *sse.Event) {
            if msg.Data != nil {
                events <- msg
                return
            }
        })
        errChan <- cErr
    }()
    for {
        select {
        case e := <-events:
            hlog.Info(e)
        case err := <-errChan:
            hlog.CtxErrorf(context.Background(), "err = %s", err.Error())
            wg.Done()
            return
        }
    }
}
```

### SetDisconnectCallback

设置服务端连接中断时触发的函数

函数签名:

`func (c *Client) SetDisconnectCallback(fn ConnCallback)`

`type ConnCallback func(ctx context.Context, client *Client)`

### SetOnConnectCallback

设置连接服务端时触发的函数

函数签名:

`func (c *Client) SetOnConnectCallback(fn ConnCallback)`

`type ConnCallback func(ctx context.Context, client *Client)`

### SetMaxBufferSize

设置 sse client 的最大缓冲区大小

函数签名:

`func (c *Client) SetMaxBufferSize(size int)`

### SetURL

设置 sse client 连接的 URL

函数签名:

`func (c *Client) SetURL(url string)`

### SetMethod

设置 sse client 连接请求的 Method

函数签名:

`func (c *Client) SetMethod(method string)`

### SetHeaders

设置 sse client 的 Headers

函数签名:

`func (c *Client) SetHeaders(headers map[string]string)`

### SetResponseCallback

设置 sse client 的请求响应自定义处理

函数签名:

`func (c *Client) SetResponseCallback(responseCallback ResponseCallback)`

`type ResponseCallback func(ctx context.Context, req *protocol.Request, resp *protocol.Response) error`

### SetHertzClient

设置 sse client

函数签名:

`func (c *Client) SetHertzClient(hertzClient *client.Client)`

### SetEncodingBase64

设置 sse client 是否使用了 Base64 编码

函数签名:

`func (c *Client) SetEncodingBase64(encodingBase64 bool)`

### SetBody

设置 sse client 请求的 Body

函数签名:

`func (c *Client) SetBody(body []byte)`

### GetURL

获取 sse client 连接的 URL

函数签名:

`func (c *Client) GetURL() string`

### GetMethod

获取 sse client 请求的 Method

函数签名:

`func (c *Client) GetMethod() string`

### GetHeaders

获取 sse client 的 Headers

函数签名:

`func (c *Client) GetHeaders() map[string]string`

### GetHertzClient

获取 sse client

函数签名:

`func (c *Client) GetHertzClient() *client.Client`

### GetLastEventID

获取 sse client 的 LastEventID

函数签名:

`func (c *Client) GetLastEventID() []byte`

### GetBody

获取 sse client 请求的 Body

函数签名:

`func (c *Client) GetBody() []byte`
