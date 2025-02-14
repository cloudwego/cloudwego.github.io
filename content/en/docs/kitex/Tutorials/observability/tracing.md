---
title: "Tracing"
date: 2021-08-31
weight: 2
keywords: ["Kitex", "Tracing"]
description: Kitex supports custom tracer and custom tracking events.
---

## Background

Kitex provides interfaces that allow developers to extend the implementation, choose the right tool to fit their monitoring ecosystem, and users can easily implement requested full-link monitoring in a microservices architecture. 
Such monitoring is essential for debugging, performance analysis, and troubleshooting.

## Custom Tracer

The framework provides a Tracer interface, which you can implement to create a custom tracer:

```go
type Tracer interface {
	Start(ctx context.Context) context.Context
	Finish(ctx context.Context)
}
```

For detailed documentation, refer to the [Monitoring Extension](/docs/kitex/tutorials/framework-exten/monitoring/#monitoring-information-expansion) section.

## Custom Tracking Events

Kitex provides some default tracking events, such as RPC call start, RPC call end, etc. For more information about built-in tracking events, please refer to the [Instrumentation](/docs/kitex/tutorials/observability/instrumentation/) section. Additionally, you can manually add more tracking data to collect more detailed trace information. Tracking events are recorded by creating and ending spans, which can be done using the native API of the corresponding component.

For example, using OpenTelemetry:

```go
ctx, span := otel.Tracer("client").Start(ctx, "root")
defer span.End()
```

For more information, see [OpenTelemetry Creating Spans](https://opentelemetry.io/docs/languages/go/instrumentation/#creating-spans).
