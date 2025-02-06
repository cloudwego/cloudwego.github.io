---
title: "SSE"
date: 2023-05-12
weight: 6
keywords: ["SSE", "HTTP", "Server-Sent Events"]
description: "Hertz supports SSE, allowing the server to send events to the client through simple HTTP response."
---

SSE is short for Server-Sent Events, which is a server push technology that allows the server to send events to clients through simple HTTP responses.

Hertz's implementation can be found [here](https://github.com/hertz-contrib/sse).

## Installation

```shell
go get github.com/hertz-contrib/sse
```

## Example Code

### Server

In the following example code, when accessing `/sse`, the server will push a timestamp to the client every second.

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
		lastEventID := sse.GetLastEventID(c)

        // The client can inform the server of the last event received through Last-Event-ID.
        hlog.CtxInfof(ctx, "last event ID: %s", lastEventID)

        // You must set status code and response headers before calling Render for first time.
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

### Client

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
        c := sse.NewClient("http://127.0.0.1:8888/sse")

        // touch off when connected to the server
        c.OnConnect(func(ctx context.Context, client *sse.Client) {
            hlog.Infof("client1 connect to server %s success with %s method", c.URL, c.Method)
        })

        // touch off when the connection is shutdown
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
        c := sse.NewClient("http://127.0.0.1:8888/sse")

        // touch off when connected to the server
        c.OnConnect(func(ctx context.Context, client *sse.Client) {
            hlog.Infof("client2 %s connect to server success with %s method", c.URL, c.Method)
        })

        // touch off when the connection is shutdown
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

    wg.Wait()
}
```

## Server-Configuration

### NewStream

NewStream is used to create a stream for sending events. By default, `Content-Type` is set as `text/event-stream` (it's better not to modify the `Content-Type`). `Cache-Control` is set as `no-cache`.

If there are any proxies between server and client, it's recommended to set the response header of `X-Accel-Buffering` as `no`.

Function signature:

```go
func NewStream(c *app.RequestContext) *Stream
```

Example code:

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

Publish is used to send an event message to the client. The format of the event message should be as follows:

```go
type Event struct {
	// Name of this event.
	Event string

	// Data associated with this event.
	Data []byte

	// ID number assigned by Server Sent Events protocol.
	ID string

	// Retry duration time specified in milliseconds; if present then browser will attempt reconnect after that many milliseconds have elapsed since last message received from server.
	Retry time.Duration
}
```

Function signature:

```go
func (c *Stream) Publish(event *Event) error
```

### GetLastEventID

GetLastEventID retrieves the ID number of last received SSE message from client. If no SSE messages were sent yet returns empty string.

Function signature:

```go
func GetLastEventID(c *app.RequestContext) string
```

## Client-Configuration

### NewClient

Pass in the server-side URL to complete the initialization of the client. The default setting of `maxBufferSize` is 1 << 16, and the `Method` request method is `GET`

You can set Client.Onconnect and Client.OnDisconnect to perform custom processing after connecting and disconnecting.

Interruption and reconnection are currently not supported

Function signature:

`func NewClient(url string) *Client`

### Subscribe

The client subscribes and monitors the server. `handler` is a custom processing function for received events.
Function signature:

`func (c *Client) Subscribe(handler func(msg *Event)) error`

Example code:

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

The client subscribes to the server and can pass in a custom `ctx`. Other functions are the same as `Subscribe`.

Function signature:

`func (c *Client) SubscribeWithContext(ctx context.Context, handler func(msg *Event)) error`

Example code:

```go
package main

import "context"

func main() {
    events := make(chan *sse.Event)
    errChan := make(chan error)
    go func() {
        cErr := c.Subscribe(context.Background(), func(msg *sse.Event) {
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

Set the function that is triggered when the server connection is interrupted

Function signature:

`func (c *Client) OnDisconnect(fn ConnCallback)`

`type ConnCallback func(ctx context.Context, client *Client)`

### SetOnConnectCallback

Set the function that is triggered when connecting to the server

Function signature:

`func (c *Client) OnConnect(fn ConnCallback)`

`type ConnCallback func(ctx context.Context, client *Client)`

### SetMaxBufferSize

Set the maximum buffer size for sse client

Function signature:

`func (c *Client) SetMaxBufferSize(size int)`

### SetURL

Set the request url for sse client

Function signature:

`func (c *Client) SetURL(url string)`

### SetMethod

Set the request method for sse client

Function signature:

`func (c *Client) SetMethod(method string)`

### SetHeaders

Set the headers for sse client

Function signature:

`func (c *Client) SetHeaders(headers map[string]string)`

### SetResponseCallback

Set the request response custom processing of sse client

Function signature:

`func (c *Client) SetResponseCallback(responseCallback ResponseCallback)`

`type ResponseCallback func(ctx context.Context, req *protocol.Request, resp *protocol.Response) error`

### SetHertzClient

set sse client

Function signature:

`func (c *Client) SetHertzClient(hertzClient *client.Client)`

### SetEncodingBase64

set whether you use Base64 for sse client

Function signature:

`func (c *Client) SetEncodingBase64(encodingBase64 bool)`

### SetBody

set request body for sse client

Function signature:

`func (c *Client) SetBody(body []byte)`

### GetURL

get request url for sse client

Function signature:

`func (c *Client) GetURL() string`

### GetMethod

get request method for sse client

Function signature:

`func (c *Client) GetMethod() string`

### GetHeaders

get headers for sse client

Function signature:

`func (c *Client) GetHeaders() map[string]string`

### GetHertzClient

get sse client

Function signature:

`func (c *Client) GetHertzClient() *client.Client`

### GetLastEventID

get LastEventID for sse client

Function signature:

`func (c *Client) GetLastEventID() []byte`

### GetBody

get request body for sse client

Function signature:

`func (c *Client) GetBody() []byte`
