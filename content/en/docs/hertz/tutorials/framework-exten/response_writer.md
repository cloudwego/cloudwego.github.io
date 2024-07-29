---
title: "Response Writer Extension"
linkTitle: "Response Writer Extension"
date: 2023-09-22
weight: 6
keywords: ["Response Writer Extension", "Response.HijackWriter"]
description: "Response Writer Extension provided by Hertz."
---

According to Hertz's [layered architecture](/zh/docs/hertz/overview/), the actual write
operation of the HTTP response is performed after the application layer user processing logic returns. Under this
constraint, users cannot flexibly control the behavior of write operations on demand. This limitation is especially
obvious in scenarios such as controlling chunked encoding write logic
and [SSE](https://github.com/hertz-contrib/sse#hertz-sse).

To solve this problem, Hertz provides an extension called "Response Writer Hijacking" that can vertically penetrate the
limitations brought by the layered architecture in an orthogonal way. It allows users to freely customize the logic of
writing responses in the application layer according to their own needs, improving the framework's ease of use.

## Core Design

### Interface Definition

interface is defined in `pkg/network/writer`.

```go
type ExtWriter interface {
io.Writer
Flush() error

// Finalize will be called by framework before the writer is released.
// Implementations must guarantee that Finalize is safe for multiple calls.
Finalize() error
}
```

### Hijack Your Own Response Writer

Hertz provides `Response.HijackWriter` in `app.RequestContext` to allow users to hijack their own response writer, which
provides another way for response writing process.

Example:

```go
    h.GET("/hijack", func (ctx context.Context, c *app.RequestContext) {
// Hijack the writer of response
ctx.Response.HijackWriter(**yourResponseWriter**)
})
```

## Supported Response Writer Extension

- `ChunkedBodyWriter`: Hertz provides `NewChunkedBodyWriter` to create a response writer which allow users to flush chunk immediately during
  the handler process, it is defined under `pkg/protocol/http1/resp/writer`, and you can implement your own response
  writer.

### ChunkedBodyWriter

Example:

```go
    h.GET("/flush/chunk", func (ctx context.Context, c *app.RequestContext) {
// Hijack the writer of response
ctx.Response.HijackWriter(resp.NewChunkedBodyWriter(&ctx.Response, ctx.GetWriter()))

for i := 0; i < 10; i++ {
ctx.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
ctx.Flush() // nolint: errcheck
time.Sleep(200 * time.Millisecond)
}
})
```

Effect display:

Open the interface in the example at localhost:8888, and then use the following command to observe the effect:

```bash
curl -N --location localhost:8888/flush/chunk
```
