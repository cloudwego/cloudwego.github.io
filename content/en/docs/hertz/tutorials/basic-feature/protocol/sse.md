---
title: "SSE"
date: 2023-05-12
weight: 6
description: >

---

SSE is short for Server-Sent Events, which is a server push technology that allows the server to send events to clients through simple HTTP responses.

Hertz's implementation can be found [here](https://github.com/hertz-contrib/sse).

## Installation

```shell
go get github.com/hertz-contrib/sse
```

## Example Code

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

## Configuration

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
