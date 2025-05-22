---
title: "SSE"
date: 2025-05-21
weight: 19
keywords: ["SSE"]
description: "SSE capabilities provided by Hertz"
---
```code: https://github.com/cloudwego/hertz/tree/develop/pkg/protocol/sse```

## What is Server-Sent Events (SSE)

- SSE is an HTML standard used to describe the implementation of browser EventSource API. Strictly speaking, it's not an HTTP protocol.
- Popular protocols like Model Context Protocol (MCP) or Agent2Agent (A2A) are based on SSE to some extent
  - https://www.anthropic.com/news/model-context-protocol
  - https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/

## Server-side Implementation

### Returning Data

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, c *app.RequestContext) {
    println("Server Got LastEventID", sse.GetLastEventID(&c.Request))
    w := sse.NewWriter(c)
    for i := 0; i < 5; i++ {
        w.WriteEvent("id-x", "message", []byte("hello\n\nworld"))
        time.Sleep(10 * time.Millisecond)
    }
    w.Close() // Send the last chunk of data to ensure graceful exit. Optional, Hertz will automatically call it after the Handler returns.

    // Please ensure the writer's lifecycle is consistent with the handler. Don't use it asynchronously in the background.
}
```

### Common Issues

#### connection has been closed when flush

Reason:
Client connection is disconnected, possibly due to no response data for too long. Please check the relevant configuration.

## Client-side Implementation

### Initiating a Request

It's exactly the same as initiating a regular HTTP request with Hertz.
Note: New Hertz versions will automatically identify SSE streams, so you don't need to explicitly set WithResponseBodyStream(true)

**Some Optional Headers**

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

sse.AddAcceptMIME(req) // Some SSE Servers may require explicitly adding Accept: text/event-stream
sse.SetLastEventID(req, "id-123") // For stateful services, you need to tell the Server through SetLastEventID
```

### Handling Responses

```go
import "github.com/cloudwego/hertz/pkg/protocol/sse"

func HandleSSE(ctx context.Context, resp *protocol.Response) error {
    r, err := sse.NewReader(resp)
    if err != nil {
    return err
    }

    // You can also manually call the r.Read method
    err = r.ForEach(ctx, func(e *Event) error {
        println("Event:", e.String())
        return nil
    })
    if err != nil { // If the Server disconnects normally, err == nil, no error will be reported
        // Other IO errors or ctx cancelled
        return err
    }
    println("Client LastEventID", r.LastEventID()) // Can be used to save the last received Event ID
    return nil
}
```

### Common Issues

#### How to implement multi-level SSE / SSE Proxy?

- You can refer to both Client-side and Server-side implementations
- Enable `WithSenseClientDisconnection` on the Server and pass the context to the next hop's Reader ForEach
  - This way, when the Client disconnects, it will be automatically detected and the entire stream will be interrupted

## Event Structure

```go
// Event represents a Server-Sent Event (SSE).
type Event struct {
    ID   string // This is the Event ID, sse.Reader will automatically record the last Event ID, which can be obtained using LastEventID()
    Type string // This is the Event Type, common ones like "message"
    Data []byte // For convenience with Unmarshal/Marshal, []byte is used here, but according to the spec, this field must be a utf8 string
    
    // Not recommended to use, mainly for controlling the retry strategy of the browser's SourceEvent.
    // If using Hertz as a Client, you can refer to: https://www.cloudwego.io/docs/hertz/tutorials/basic-feature/retry/
    Retry time.Duration
}
```
