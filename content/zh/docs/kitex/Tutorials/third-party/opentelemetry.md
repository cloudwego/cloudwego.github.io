---
title: "OpenTelemetry"
date: 2025-02-07
weight: 4
keywords: ["Kitex", "链路追踪", "OpenTelemetry"]
description: Kitex 提供了对 OpenTelemetry 的支持。
---

## 背景

Kitex 支持流行的链路追踪标准 OpenTelemetry，允许开发者选择合适的工具来适应他们的监控生态，用户可以轻松地在微服务架构中实现请求的全链路监控。这样的监控对于调试、性能分析以及故障排查是至关重要的。

## OpenTelemetry

[obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) 扩展集成了 OpenTelemetry 标准的 Tracing。

**使用示例**

Client

```go
import (
    ...
    "github.com/kitex-contrib/obs-opentelemetry/provider"
    "github.com/kitex-contrib/obs-opentelemetry/tracing"
)

func main(){
    serviceName := "echo-client"

    p := provider.NewOpenTelemetryProvider(
        provider.WithServiceName(serviceName),
        provider.WithExportEndpoint("localhost:4317"),
        provider.WithInsecure(),
    )
    defer p.Shutdown(context.Background())

    c, err := echo.NewClient(
        "echo",
        client.WithSuite(tracing.NewClientSuite()),
        // Please keep the same as provider.WithServiceName
        client.WithClientBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
    )
    if err != nil {
        klog.Fatal(err)
    }

}

```

Server

```go
import (
    ...
    "github.com/kitex-contrib/obs-opentelemetry/provider"
    "github.com/kitex-contrib/obs-opentelemetry/tracing"
)


func main()  {
    serviceName := "echo"

    p := provider.NewOpenTelemetryProvider(
        provider.WithServiceName(serviceName),
        provider.WithExportEndpoint("localhost:4317"),
        provider.WithInsecure(),
    )
    defer p.Shutdown(context.Background())

    svr := echo.NewServer(
        new(EchoImpl),
        server.WithSuite(tracing.NewServerSuite()),
        // Please keep the same as provider.WithServiceName
        server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
    )
    if err := svr.Run(); err != nil {
        klog.Fatalf("server stopped with error:", err)
    }
}
```
