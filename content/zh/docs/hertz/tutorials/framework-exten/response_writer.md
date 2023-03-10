---
title: "Response 的 Writer 扩展"
linkTitle: "Response 的 Writer 扩展"
date: 2023-03-10
weight: 4
description: >

---

Hertz 提供了 response 的 writer 扩展， 用户可以根据自己的需要实现相应的接口去劫持 response 的 writer。

## 接口定义

接口定义在 `pkg/network/writer`.

```go
type ExtWriter interface {
	io.Writer
	Flush() error

	// Finalize will be called by framework before the writer is released.
	// Implementations must guarantee that Finalize is safe for multiple calls.
	Finalize() error
}
```

### 劫持 Response 的 Writer

Hertz 在 `app.RequestContext` 中提供了 `Response.HijackWriter` 方法让用户劫持 response 的 writer.

用法示例：
```go
	h.GET("/hijack", func(c context.Context, ctx *app.RequestContext) {
		// Hijack the writer of response
		ctx.Response.HijackWriter(yourResponseWriter)
	}
```

## 已支持 Response 的 Writer 扩展

Hertz 在 `pkg/protocol/http1/resp/writer` 下提供了 `NewChunkedBodyWriter` 方法来创建一个 response 的 writer，它允许用户在 handler 中立即刷新分块，用户也可以实现自己的 response 的 writer。

### ChunkedBodyWriter 
用法示例：
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