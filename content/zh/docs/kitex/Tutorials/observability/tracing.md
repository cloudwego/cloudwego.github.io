---
title: "链路跟踪"
date: 2025-02-07
weight: 2
keywords: ["Kitex", "链路追踪"]
description: Kitex 提供接口支持自定义 Tracer 和追踪事件。
---

## 背景

Kitex 提供接口，允许开发者通过扩展实现，选择合适的工具来适应他们的监控生态，用户可以轻松地在微服务架构中实现请求的全链路监控。这样的监控对于调试、性能分析以及故障排查是至关重要的。

## 自定义 Tracer

框架提供了 Tracer 接口，可以实现该接口来自定义 Tracer ：

```go
type Tracer interface {
	Start(ctx context.Context) context.Context
	Finish(ctx context.Context)
}
```

详细文档请阅读 [监控拓展](/zh/docs/kitex/tutorials/framework-exten/monitoring/#链路追踪拓展) 章节。

## 自定义跟踪事件

Kitex 提供了一些默认的跟踪事件，例如 RPC 调用开始、RPC 调用结束等，有关内置的跟踪事件请参考 [埋点](/zh/docs/kitex/tutorials/observability/instrumentation/) 章节。除此之外，也可以手动添加更多的追踪数据，以收集更详细的链路信息。跟踪事件通过创建和结束 span 来记录，可以使用对应组件的原生 API 来完成。

以 OpenTelemetry 为例，可以这样使用：

```go
ctx, span := otel.Tracer("client").Start(ctx, "root")
defer span.End()
```

更多内容请参考：[OpenTelemetry Creating Spans](https://opentelemetry.io/docs/languages/go/instrumentation/#creating-spans)。
