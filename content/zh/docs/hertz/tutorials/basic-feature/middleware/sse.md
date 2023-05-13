---
title: "Sse"
date: 2023-05-12
weight: 17
description: >

---

SSE 是 Server-Sent Events 的缩写, 是一种服务器推送技术，它允许服务器端通过简单的 HTTP 响应向客户端发送事件。 只能**单工**通信, 建立连接后, 只能由服务端发往客户端, 且占用一个连接, 如需客户端向服务端通信, 需额外打开一个连接.

简单的来说, sse 适用于实时更新数据或者消息推送等场景.

本项目参考了 [manucorporat/sse](https://github.com/manucorporat/sse) 的实现, hertz 自己的实现则在[这里](https://github.com/hertz-contrib/sse)

## 安装

```shell
go get github.com/hertz-contrib/sse
```

## 示例代码

在下面的示例中, 在访问 `/sse` 时, 服务端将每秒向客户端推送一个时间戳.

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

## 配置

### NewStream

NewStream 用于创建一个流用于发送事件, 在默认情况下, 会设置 `Content-Type` 为 `text/event-stream` (最好不要修改 `Content-Type`), `Cache-Control` 为 `no-cache` 

如果服务器和客户端之间有任何代理, 那将建议设置响应头 `X-Accel-Buffering` 为 `no`

函数签名:

```go
func NewStream(c *app.RequestContext) *Stream
```

示例代码

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

Publish 用于向客户端发送事件, 事件的格式如下

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

GetLastEventID 用于获取客户端发送的最后一个事件标识符, 如果客户端没有发送事件标识符, 则返回空字符串

函数签名:

```go
func GetLastEventID(c *app.RequestContext) string
```
