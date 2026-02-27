---
title: "监控扩展"
date: 2021-08-26
weight: 6
description: >
---

Kitex 提供了 `Tracer` 接口，可以更灵活地自定义数据监控和链路追踪拓展能力，并通过 `WithTracer` Option 来注入。

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

## 监控信息拓展

用户如果需要更详细的打点，例如包大小，或者想要更换其他数据源，例如 influxDB，用户可以根据自己的需求实现 `Tracer` 接口。

从 ctx 中可以获得 RPCInfo，进一步的从 RPCInfo 中获取请求耗时、包大小和请求返回的错误信息等，举例：

```go
type clientTracer struct {
    // contain entities which recording metric
}

// Start record the beginning of an RPC invocation.
func (c *clientTracer) Start(ctx context.Context) context.Context {
    // do nothing
	return ctx
}

// Finish record after receiving the response of server.
func (c *clientTracer) Finish(ctx context.Context) {
	ri := rpcinfo.GetRPCInfo(ctx)
	rpcStart := ri.Stats().GetEvent(stats.RPCStart)
	rpcFinish := ri.Stats().GetEvent(stats.RPCFinish)
	cost := rpcFinish.Time().Sub(rpcStart.Time())
	// TODO: record the cost of request
}
```

## 链路追踪拓展

除此之外，`Tracer` 接口也可用于自定义链路追踪，比如以简单的方式集成 OpenTracing，举例：

Client 端

```go
import "github.com/cloudwego/kitex/client"
...
type myTracer struct {}

func (m *myTracer) Start(ctx context.Context) context.Context {
	_, ctx = opentracing.StartSpanFromContextWithTracer(ctx, o.tracer, "RPC call")
	return ctx
}

func (m *myTracer) Finish(ctx context.Context) {
	span := opentracing.SpanFromContext(ctx)
	span.Finish()
}
...
client, err := echo.NewClient("echo", client.WithTracer(&myTracer{}))
if err != nil {
	log.Fatal(err)
}
```

Server 端

```go
import "github.com/cloudwego/kitex/server"
...
type myTracer struct {}

func (m *myTracer) Start(ctx context.Context) context.Context {
	_, ctx = opentracing.StartSpanFromContextWithTracer(ctx, o.tracer, "RPC handle")
	return ctx
}

func (m *myTracer) Finish(ctx context.Context) {
	span := opentracing.SpanFromContext(ctx)
	span.Finish()
}
...
svr, err := echo.NewServer(server.WithTracer(&myTracer{}))
if err := svr.Run(); err != nil {
	log.Println("server stopped with error:", err)
} else {
	log.Println("server stopped")
}
```
