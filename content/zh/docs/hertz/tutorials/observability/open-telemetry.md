---
title: "OpenTelemetry"
date: 2022-09-01
weight: 5
keywords: ["OpenTelemetry"]
description: "Hertz 提供的 OpenTelemetry 能力。"
---


[OpenTelemetry](https://opentelemetry.io/) 是 [CNCF](https://www.cncf.io/) 的一个开源可观测能力框架，是由一系列工具，API 和 SDK 组成的。可以使 IT 团队能够检测、生成、收集和导出远程监测数据以进行分析和了解软件性能和行为。

hertz-contrib 中提供了 [obs-opentelemetry](https://github.com/hertz-contrib/obs-opentelemetry) 扩展，
可以使 hertz 通过简易设置就能集成 OpenTelemetry。

## 特性

### Tracing

Tracing 提供了从请求开始接收到处理完毕的整个生命周期的全貌。

obs-opentelemetry 实现了什么:

- 支持在 hertz 服务端和客户端之间启用 http 链路追踪
- 支持通过设置 http header 以启动自动透明地传输对端服务

使用示例

服务端:

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    hertztracing "github.com/hertz-contrib/obs-opentelemetry/tracing"
)

func main() {
    tracer, cfg := hertztracing.NewServerTracer()
    h := server.Default(tracer)
    h.Use(hertztracing.ServerMiddleware(cfg))
    // ...
    h.Spin()
}
```

客户端:

```go
package main

import (
    hertztracing "github.com/hertz-contrib/obs-opentelemetry/tracing"
    "github.com/cloudwego/hertz/pkg/app/client"
)

func main() {
    c, _ := client.NewClient()
    c.Use(hertztracing.ClientMiddleware())
    // ...
}
```

[代码地址](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/tracing)


#### Tracing Options

| 函数名                          | 描述                                 |
|------------------------------|------------------------------------|
| WithTextMapPropagator        | 设置 `propagation.TextMapPropagator` |
| WithCustomResponseHandler    | 配置自定义的`ResponseHandler`            |
| WithClientHttpRouteFormatter | 配置客户端指标 `http_route` 维度自定义格式化取值函数  |
| WithServerHttpRouteFormatter | 配置服务端端指标 `http_route` 维度自定义格式化取值函数 |


### Metric

度量指标（Metric）包含了各种各样的方法和实现。

Metric 包括了追踪样本以及自动将指标与产生它们的追踪样本联系起来。手动将指标和追踪联系起来往往是一项繁琐且容易出错的任务。OpenTelemetry 自动执行这项任务将为运维人员节省大量的时间。

obs-opentelemetry 实现了什么:

- 支持的 hertz http 指标有 [Rate, Errors, Duration]
- 支持服务拓扑图指标 [服务拓扑图]
- 支持 go runtime 指标

[更多详细的说明](https://github.com/hertz-contrib/obs-opentelemetry/blob/main/README_CN.md#%E7%8E%B0%E5%B7%B2%E6%94%AF%E6%8C%81%E7%9A%84-mertrics)

### Logging

OpenTelemetry 结合了高度结构化的日志 API 以及高速日志处理系统。现有的日志 API 可以通过连接到 OpenTelemetry，以避免对应用程序进行重新测量。

obs-opentelemetry 实现了什么:

- 在 logrus 的基础上适配了 hertz 日志工具
- 实现了链路追踪自动关联日志的功能

```go
import (
    hertzlogrus "github.com/hertz-contrib/obs-opentelemetry/logging/logrus"
)

func main()  {
    hlog.SetLogger(hertzlogrus.NewLogger())
    // ...
}
```

[代码地址](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/logging/logrus)

### Provider

- 通过集成默认的 OpenTelemetry 程序，使其达到开箱即用的程度
- 支持设置环境变量:
  - [Exporter](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)
  - [SDK](https://opentelemetry.io/docs/reference/specification/sdk-environment-variables/#general-sdk-configuration)

使用示例

```go
package main

import (
    "context"

    hertztracing "github.com/hertz-contrib/obs-opentelemetry/tracing"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/obs-opentelemetry/provider"
)

func main() {
    serviceName := "echo"

    p := provider.NewOpenTelemetryProvider(
      provider.WithServiceName(serviceName),
      provider.WithExportEndpoint("localhost:4317"),
      provider.WithInsecure(),
    )
    defer p.Shutdown(context.Background())

    tracer, cfg := hertztracing.NewServerTracer()
    h := server.Default(tracer)
    h.Use(hertztracing.ServerMiddleware(cfg))

    // ...
    h.Spin()
}
```

[代码地址](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/provider)

#### Provider Options

| 函数名                       | 描述                                 |
|---------------------------|------------------------------------|
| WithServiceName           | 配置 `service.name` 的资源属性            |
| WithDeploymentEnvironment | 配置`deployment.environment`资源属性     |
| WithServiceNamespace      | 配置了`service.namespace`资源属性         |
| WithResourceAttributes    | 配置资源属性                             |
| WithResource              | 配置资源 (`resource.Resource`)         |
| WithEnableTracing         | 是否启用 `tracing`                     |
| WithEnableMetrics         | 是否启用 `metrics`                     |
| WithTextMapPropagator     | 设置 `propagation.TextMapPropagator` |
| WithResourceDetector      | 配置 `resource.Detector`             |
| WithHeaders               | 配置导出 telemetry 数据的 gRPC 请求头        |
| WithInsecure              | 配置是否对导出的 gRPC 客户端使用安全认证            |
| WithEnableCompression     | 配置是否对导出数据的进行压缩                     |
| WithSampler               | 配置 Trace 采样器                       |
| WithSdkTracerProvider     | 配置自定义的`sdktrace.TracerProvider`    |
| WithMeterProvider         | 配置自定义的`metric.MeterProvider`       |

## 完整使用示例

完整的使用示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/opentelemetry)
