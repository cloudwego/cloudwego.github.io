---
title: "SSE"
date: 2025-05-21
weight: 19
keywords: ["SSE"]
description: "SSE in Hertz"
---
```Code：https://github.com/cloudwego/hertz/tree/develop/pkg/protocol/sse```

**Changelog**

- 2025/05/15 Has been released to the open-source version v0.10.0
- 2025/05/13 [d3c68463] Added Get / SetLastEventID.
- 2025/05/13 [3952e956] The Reader ForEach interface supports passing in ctx.
- 2025/04/24 [cf38573ce] First version completed

## What is Server-Sent Events (SSE)

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
    w.Close() // Send the last chunk of data to ensure graceful exit. Optional, Hertz will automatically call this after the Handler returns.

    // Please make sure that the lifecycle of the writer is consistent with that of the handler. Do not use it in asynchronous background.
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

sse.AddAcceptMIME(req) // Some SSE Servers may require explicit addition of Accept: text/event-stream
sse.SetLastEventID(req, "id-123") // For stateful services, you need to tell the Server via SetLastEventID
```

### Handle response

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, resp *protocol.Response) error {
    r, err := sse.NewReader(resp)
    if err != nil {
        return err
    }
    
    // You can also call the r.Read method manually
    err = r.ForEach(ctx, func(e *Event) error {
        println("Event:", e.String())
        return nil
    })
    if err != nil { // If the Server is disconnected normally, err == nil here, no error will be reported
        // Other io errors or ctx cancelled
        return err
    }
    println("Client LastEventID", r.LastEventID()) // Can be used to save the last received Event ID
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
    ID string // Event ID, sse.Reader will automatically record the last Event ID, which can be obtained using LastEventID()
    Type string // Event Type, such as "message"
    Data []byte // []byte is used here for the convenience of Unmarshal/Marshal, but according to spec, this field must be utf8 string
    
    // Not recommended, mainly for the browser's SourceEvent to return this field to control its retry strategy.
    // If you use Hertz as a client, you can refer to: https://www.cloudwego.io/docs/hertz/tutorials/basic-feature/retry/
    Retry time.Duration
}
```
