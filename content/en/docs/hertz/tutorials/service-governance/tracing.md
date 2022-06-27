---
title: "Tracing"
linkTitle: "Tracing"
weight: 2
description: >

---

In microservices, link tracing is a very important capability, which plays an important role in quickly locating problems, analyzing business bottlenecks, and restoring the link status of a request. Hertz provides the capability of link tracking and also supports user-defined link tracking.

Hertz abstracts trace as the following interface：

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
	Start(ctx context.Context, c *app.RequestContext) context.Context
	Finish(ctx context.Context, c *app.RequestContext)
}
```

Use the `server.WithTracer()` configuration to add a tracer, you can add multiple tracers.

Hertz will execute the Start method of all tracers before the request starts (before reading the packet), and execute the Finish method of all tracers after the request ends (after writing back the data). Care should be taken when implementing this：

- When the Start method is executed, it just starts accepting packets, and at this time `requestContext` is an "empty" `requestContext`, so we can't get information about this request. If you want to get some information (such as the traceID in the header, etc.) after unpacking, you can use the middleware capability to inject the traceID into the span.
- Changes to the context within the middleware are invalid.

There is `traceInfo` in the `requestContext` memory, which has the following information

```go
type HTTPStats interface {
   Record(event stats.Event, status stats.Status, info string) // Recording events
   GetEvent(event stats.Event) Event // Get events
   SendSize() int // Get SendSize
   RecvSize() int // Get RecvSize
   Error() error // Get Error
   Panicked() (bool, interface{}) // Get Panic
   Level() stats.Level // Get the current trace level
   SetLevel(level stats.Level) // Set the trace level to not report when the event level is higher than the trace level
   ...
}
```

Events include：

```go
HTTPStart  = newEvent(httpStart, LevelBase) // Request start
HTTPFinish = newEvent(httpFinish, LevelBase) // Request end

ServerHandleStart  = newEvent(serverHandleStart, LevelDetailed) // Business handler start
ServerHandleFinish = newEvent(serverHandleFinish, LevelDetailed) // Business handler end
ReadHeaderStart    = newEvent(readHeaderStart, LevelDetailed) // Read header start
ReadHeaderFinish   = newEvent(readHeaderFinish, LevelDetailed) // Read header end
ReadBodyStart      = newEvent(readBodyStart, LevelDetailed) // Read body start
ReadBodyFinish     = newEvent(readBodyFinish, LevelDetailed) // Read body end
WriteStart         = newEvent(writeStart, LevelDetailed) // Write response start
WriteFinish        = newEvent(writeFinish, LevelDetailed) // Write response end
```

The above information is available at Finish

At the same time, if you don't want to log this information, you don't have to register any tracer, and the framework stops logging this information.

An extension for opentracing is provided in hertz-contrib, and a demo for calling from http to rpc is also available in hertz-examples.Related Repository： https://github.com/hertz-contrib/tracer
