---
title: "Monitoring Extension"
date: 2021-08-31
weight: 6
description: >
---

Kitex offers a `Tracer` interface, which allows for more flexible customization of data monitoring and link tracing extension capabilities, and can be injected through the `WithTracer` Option.

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

## Monitoring Information Extension

If you want to get the more detailed monitoring, such as message packet size, or want to adopt other data source, such as InfluxDB, you can implement the `Trace` interface according to your requirements.

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

RPCInfo can be obtained from ctx, and further request time cost, package size, and error information returned by the request can be obtained from RPCInfo, for example:

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

## Tracing Extension

In addition, the `Tracer` interface can also be used to customize tracing, for example, integrating OpenTracing in a straightforward manner, as shown below:

Client Side

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

Server Side

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
