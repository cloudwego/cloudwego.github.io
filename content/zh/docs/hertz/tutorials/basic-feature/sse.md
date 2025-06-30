---
title: "SSE"
date: 2025-05-21
weight: 19
keywords: ["SSE"]
description: "Hertz 提供的 SSE 能力"
---
```代码：https://github.com/cloudwego/hertz/tree/develop/pkg/protocol/sse```

## 什么是 Server-Sent Events (SSE)

- SSE 是一个 HTML 标准，用于描述浏览器 EventSource API 的实现。严格说，不是 http 协议。
- 流行的 Model Context Protocol (MCP) 或 Agent2Agent (A2A) 协议都一定程度基于 SSE
  - https://www.anthropic.com/news/model-context-protocol
  - https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/

## Server 端实现

### 返回数据

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, c *app.RequestContext) {
    println("Server Got LastEventID", sse.GetLastEventID(&c.Request))
    w := sse.NewWriter(c)
    for i := 0; i < 5; i++ {
        w.WriteEvent("id-x", "message", []byte("hello\n\nworld"))
        time.Sleep(10 * time.Millisecond)
    }
    w.Close() // 发送最后的 chunk 数据，确保优雅退出。可选，Hertz 在 Handler 返回后会自动调用。

    // 请确保 writer 的生命周期和 handler 一致。不要 go 异步后台使用。
}
```

### 常见问题

#### connection has been closed when flush

原因：
Client 连接断开，可能是太久没有响应数据，请检查相应配置。

## Client 端实现

### 发起请求

与正常 Hertz 发起一个普通的 http 请求完全一致。

注意：新 hertz 版本会自动识别 SSE 流，不用显式设置 WithResponseBodyStream(true)

**部分可选 Header**

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

sse.AddAcceptMIME(req) // 部分 SSE Server 可能会要求显式增加 Accept: text/event-stream
sse.SetLastEventID(req, "id-123") // 对于有状态服务，需要通过 SetLastEventID 告诉 Server
```

### 处理返回

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
        // 其他 io 错误 或 ctx cancelled
        return err
    }
    println("Client LastEventID", r.LastEventID()) // 可用于保存最后接收的 Event ID
    return nil
}
```

### 代码示例

- [SSE](https://github.com/cloudwego/hertz-examples/tree/main/sse) : hertz SSE 代码示例

### 常见问题

#### 如何实现多级的 SSE / SSE Proxy?

- 可以同时参考  Client 端和 Server 端的实现
- Server 启用 `WithSenseClientDisconnection` 并且把 context 传入 下一跳的 Reader ForEach
  - 这样当 Client 断开时，会自动识别，并且中断整个流

## Event 结构体

```go
// Event represents a Server-Sent Event (SSE).
type Event struct {
    ID   string // 即 Event ID，sse.Reader 会自动记录最后的 Event ID，可使用 LastEventID() 获取
    Type string // 即 Event Type，常见的如 "message"
    Data []byte // 为了方便使用 Unmarshal/Marshal，这里使用 []byte，但是按 spec 这个字段必须要 utf8 string
    
    // 不建议使用，主要是针对浏览器的 SourceEvent 返回该字段控制其重试策略。
    // 如果使用 Hertz 作为 Client 可以参考：https://www.cloudwego.io/docs/hertz/tutorials/basic-feature/retry/
    Retry time.Duration
}
```
