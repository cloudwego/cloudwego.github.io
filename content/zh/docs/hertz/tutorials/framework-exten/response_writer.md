---
title: "Response 的 Writer 扩展"
linkTitle: "Response 的 Writer 扩展"
date: 2023-09-22
weight: 6
keywords: ["Response 的 Writer 扩展", "Response.HijackWriter"]
description: "Hertz 提供的 Response 的 Writer 扩展。"
---

按照 Hertz 的 [分层架构](/zh/docs/hertz/overview/) 设计，HTTP 响应实际的写操作是在应用层用户处理逻辑返回之后进行的。用户在这个限制下是不能够灵活按需控制写操作的行为的，这个限制在类似控制 chunk 分块编码写逻辑、[SSE](https://github.com/hertz-contrib/sse#hertz-sse) 的场景下尤为明显。

为了解决这个问题，Hertz 提供了一个叫做「Response Writer 劫持」扩展，它能够以正交的方式垂直打通分层架构所带来的写响应局限。让用户可以根据自己的需求在应用层自由的定制写响应的逻辑，提升框架易用性。

## 核心设计

### 接口定义

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

Hertz 在 `app.RequestContext` 中提供了 `Response.HijackWriter` 方法让用户劫持 Response 的 Writer.

用法示例：

```go
	h.GET("/hijack", func(ctx context.Context, c *app.RequestContext) {
		// Hijack the writer of Response
		c.Response.HijackWriter(**yourResponseWriter**)
	})
```

## 已支持 Response 的 Writer 扩展

- `ChunkedBodyWriter`：Hertz 在 `pkg/protocol/http1/resp/writer` 下默认提供了 `NewChunkedBodyWriter` 方法来创建一个 Response 的 Writer，它允许用户在 Handler 中立即刷新分块，用户也可以实现自己的 Response 的 Writer。

### ChunkedBodyWriter

用法示例：

```go
	h.GET("/flush/chunk", func(ctx context.Context, c *app.RequestContext) {
		// Hijack the writer of Response
		c.Response.HijackWriter(resp.NewChunkedBodyWriter(&c.Response, c.GetWriter()))

		for i := 0; i < 10; i++ {
			c.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
			c.Flush()                                                                 // nolint: errcheck
			time.Sleep(200 * time.Millisecond)
		}
	})
```

效果展示：

在 localhost:8888 开启示例中的接口，然后使用如下命令观察效果：

```bash
curl -N --location localhost:8888/flush/chunk
```
