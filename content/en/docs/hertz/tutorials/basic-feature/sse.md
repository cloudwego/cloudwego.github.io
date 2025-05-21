---
title: "SSE"
date: 2025-05-21
weight: 12
keywords: ["SSE"]
description: "Hertz Support SSE。"
---
```Code：https://github.com/cloudwego/hertz/tree/develop/pkg/protocol/sse```

**Changelog**
- 2025/05/15 Has been released to the open-source version v0.10.0
- 2025/05/13 [d3c68463] Added Get / SetLastEventID.
- 2025/05/13 [3952e956] The Reader ForEach interface supports passing in ctx.
- 2025/04/24 [cf38573ce] First version completed

## 什么是Server-Sent Events (SSE)
- SSE is an HTML standard used to describe the implementation of the EventSource API in browsers. Strictly speaking, it is not an HTTP protocol.
- Both the popular Model Context Protocol (MCP) and Agent2Agent (A2A) protocols are based to some extent on SSE
    - https://www.anthropic.com/news/model-context-protocol
    - https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/

## Server Implementation
### Return data
```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, c *app.RequestContext) {
    println("Server Got LastEventID", sse.GetLastEventID(&c.Request))
    w := sse.NewWriter(c)
    for i := 0; i < 5; i++ {
        w.WriteEvent("id-x", "message", []byte("hello\n\nworld"))
        time.Sleep(10 * time.Millisecond)
    }
    w.Close() // 发送最后的chunk数据，确保优雅退出。可选，Hertz 在 Handler 返回后会自动调用。

    // 请确保 writer 的生命周期和handler一致。不要go异步后台使用。
}
```


### FAQ
#### connection has been closed when flush
Reason: The client connection has been disconnected, possibly due to a long time without response data. Please check the corresponding configuration.


## Client Implementation

### Initiate a request
It's exactly the same as making a normal HTTP request to Hertz.
Note: The new Hertz version will automatically recognize SSE streams, so you don't need to explicitly set `WithResponseBodyStream(true)`

**Some optional headers**
```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

sse.AddAcceptMIME(req) // 部分SSE Server可能会要求显式增加 Accept: text/event-stream
sse.SetLastEventID(req, "id-123") // 对于有状态服务，需要通过 SetLastEventID 告诉 Server
```

### Handle response
```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, resp *protocol.Response) error {
    r, err := sse.NewReader(resp)
    if err != nil {
    return err
    }

    // 也可以手动调用 r.Read 方法
    err = r.ForEach(ctx, func(e *Event) error {
        println("Event:", e.String())
        return nil
    })
    if err != nil { // 如果 Server 正常断开，这里 err == nil，不会报错
        // 其他io错误 或 ctx cancelled
        return err
    }
    println("Client LastEventID", r.LastEventID()) // 可用于保存最后接收的 Event ID
    return nil
}
```

### FAQ

#### How to implement multi-level SSE/SSE Proxy?
- You can refer to the implementations on both the Client and Server sides simultaneously
- Enable `WithSenseClientDisconnection` in the server and pass the context to the next hop's Reader ForEach
    - In this way, when the Client disconnects, it will be automatically recognized, and the entire stream will be interrupted

## Event Struct
```go
// Event represents a Server-Sent Event (SSE).
type Event struct {
    ID   string // 即 Event ID，sse.Reader 会自动记录最后的 Event ID，可使用 LastEventID() 获取
    Type string // 即 Event Type，常见的如 "message"
    Data []byte // 为了方便使用 Unmarshal/Marshal，这里使用 []byte，但是按spec这个字段必须要 utf8 string
    
    // 不建议使用，主要是针对浏览器的 SourceEvent 返回该字段控制其重试策略。
    // 如果使用Hertz作为Client可以参考：https://www.cloudwego.io/docs/hertz/tutorials/basic-feature/retry/
    Retry time.Duration
}
```
