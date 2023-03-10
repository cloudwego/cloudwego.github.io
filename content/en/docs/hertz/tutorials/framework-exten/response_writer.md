---
title: "Response Writer Extension"
linkTitle: "Response Writer Extension"
date: 2023-03-10
weight: 2
description: >

---

Hertz provides response writer extension, if users need to hijack the writer of the response, they can implement the corresponding interfaces according to their needs.

## Interface Definition

interface is defined in `pkg/network/write`.

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

Hertz provides `Response.HijackWriter` in `app.RequestContext` to allow users to hijack their own response writer, which provides another way for response writing process.

## Supported Response Writer Extension

Hertz provides `NewChunkedBodyWriter` to create a response writer which allow users to flush chunk immediately during the handler process, it is defined under `pkg/protocol/http1/resp/writer`, and you can implement your own response writer.

### Chunked body Writer 
Example：
```go
	h.GET("/flush/chunk", func(c context.Context, ctx *app.RequestContext) {
		// Hijack the writer of response
		ctx.Response.HijackWriter(resp.NewChunkedBodyWriter(&ctx.Response, ctx.GetWriter()))

		for i := 0; i < 10; i++ {
			ctx.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
			ctx.Flush()                                                                 // nolint: errcheck
			time.Sleep(200 * time.Millisecond)
		}
	})
```