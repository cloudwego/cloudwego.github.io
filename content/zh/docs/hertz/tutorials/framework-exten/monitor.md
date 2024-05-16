---
title: "监控扩展"
linkTitle: "监控扩展"
weight: 1
keywords: ["监控扩展"]
description: "Hertz 提供的监控扩展。"
---

用户如果需要更详细的打点，例如包大小，或者想要更换其他数据源，例如 influxDB，用户可以根据自己的需求实现 `Tracer` 接口，并通过 `WithTracer` Option 来注入。

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
   Start(ctx context.Context, c *app.RequestContext) context.Context
   Finish(ctx context.Context, c *app.RequestContext)
}
```

从 ctx 中可以获得 `TraceInfo`，进一步的从 `TraceInfo` 中获取请求耗时、包大小和请求返回的错误信息等，举例：

```go
type ServerTracer struct{
	// contain entities which recording metric
}

// Start record the beginning of an RPC invocation.
func (s *ServerTracer) Start(ctx context.Context, _ *app.RequestContext) context.Context {
	// do nothing
	return ctx
}

// Finish record after receiving the response of server.
func (s *ServerTracer) Finish(ctx context.Context, c *app.RequestContext) {
	ti := c.GetTraceInfo()
	rpcStart := ti.Stats().GetEvent(stats.HTTPStart)
	rpcFinish := ti.Stats().GetEvent(stats.HTTPFinish)
	cost := rpcFinish.Time().Sub(rpcStart.Time())
	// TODO: record the cost of request
}
```
