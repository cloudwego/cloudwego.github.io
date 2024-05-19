---
title: "Monitoring Extension"
linkTitle: "Monitoring Extension"
date: 2022-06-22
weight: 1
keywords: ["Monitoring Extension"]
description: "Monitoring extension provided by Hertz."
---

If you want to get more detailed monitoring data, e.g. message packet size, or want to adopt other data source, e.g. InfluxDB, you can implement the `Trace` interface according to your requirements and inject it by `WithTracer` Option.

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
   Start(ctx context.Context, c *app.RequestContext) context.Context
   Finish(ctx context.Context, c *app.RequestContext)
}
```

You can get `TraceInfo` from ctx. What is more, from `TraceInfo` you can get request time cost, package size, and error information returned from request, etc. Usage example：

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
