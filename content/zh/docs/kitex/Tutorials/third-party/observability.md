---
title: "可观测性"
date: 2021-08-26
weight: 3
keywords: ["Kitex", "可观测性", "Trace", "Metric"]
description: Kitex 框架内置了监控能力，可以通过接口的方式进行扩展，支持 OpenTelemetry 和 Prometheus。
---

## 接口扩展

框架提供了 `Tracer` 接口，用户可以根据需求实现该接口，并通过 `WithTracer` Option 来注入监控与链路追踪的具体实现。

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

详细文档请阅读 [监控拓展](../../framework-exten/monitoring/#监控信息拓展) 章节。

## 监控

[kitex-contrib](https://github.com/kitex-contrib) 中也提供了两种监控拓展 [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus/tree/main) 与 [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry/tree/main) ，它们分别集成了 Prometheus 与 OpenTelemetry 的监控拓展，前者更贴合 Prometheus 生态，使用也比较简单方便，而后者使用起来更灵活。

### Prometheus

拓展库 [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus/tree/main) 中提供了 Prometheus 的监控扩展。

#### 使用方式

Client

```go
import (
    "github.com/kitex-contrib/monitor-prometheus"
    kClient "github.com/cloudwego/kitex/client"
)

...
	client, _ := testClient.NewClient(
	"DestServiceName",
	kClient.WithTracer(prometheus.NewClientTracer(":9091", "/kitexclient")))

	resp, _ := client.Send(ctx, req)
...
```

Server

```go
import (
    "github.com/kitex-contrib/monitor-prometheus"
    kServer "github.com/cloudwego/kitex/server"
)

func main() {
...
	svr := xxxservice.NewServer(
	    &myServiceImpl{},
	    kServer.WithTracer(prometheus.NewServerTracer(":9092", "/kitexserver")))
	svr.Run()
...
}
```

#### Metrics

Client

| 名称                      | 单位 | Tags                                 | 描述                                                          |
| ------------------------- | ---- | ------------------------------------ | ------------------------------------------------------------- |
| `kitex_client_throughput` | -    | type, caller, callee, method, status | Client 端处理的请求总数                                       |
| `kitex_client_latency_us` | us   | type, caller, callee, method, status | Client 端请求处理耗时（收到应答时间 - 发起请求时间，单位 us） |

Server

| 名称                      | 单位 | Tags                                 | 描述                                                            |
| ------------------------- | ---- | ------------------------------------ | --------------------------------------------------------------- |
| `kitex_server_throughput` | -    | type, caller, callee, method, status | Server 端处理的请求总数                                         |
| `kitex_server_latency_us` | us   | type, caller, callee, method, status | Server 端请求处理耗时（处理完请求时间 - 收到请求时间，单位 us） |

基于以上 metrics 可以实现更多复杂的数据监控，使用示例看参考 [Useful Examples](https://github.com/kitex-contrib/monitor-prometheus/?tab=readme-ov-file#useful-examples) 。

#### Runtime Metrics

该库依赖于 [prometheus/client_golang](https://github.com/prometheus/client_golang)，支持其自带的 [runtime metrics](https://golang.bg/src/runtime/metrics/description.go)，详细内容请参考 [WithGoCollectorRuntimeMetrics](https://pkg.go.dev/github.com/prometheus/client_golang@v1.18.0/prometheus/collectors#WithGoCollectorRuntimeMetrics)

### OpenTelemetry

拓展库 [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry/tree/main) 中提供了 opentelemetry 的监控拓展。

#### Metrics

Server

| 名称                  | 指标数据模型 | 单位         | 单位(UCUM) | 描述                  |
| --------------------- | ------------ | ------------ | ---------- | --------------------- |
| `rpc.server.duration` | Histogram    | milliseconds | `ms`       | 测量请求RPC的持续时间 |

Client

| 名称                  | 指标数据模型 | 单位         | 单位(UCUM) | 描述                  |
| --------------------- | ------------ | ------------ | ---------- | --------------------- |
| `rpc.server.duration` | Histogram    | milliseconds | `ms`       | 测量请求RPC的持续时间 |

通过 `rpc.server.duration` 可以计算更多的服务指标，如 R.E.D (Rate, Errors, Duration)，具体示例可参考[此处](https://github.com/kitex-contrib/obs-opentelemetry/blob/main/README_CN.md#%E7%8E%B0%E5%B7%B2%E6%94%AF%E6%8C%81%E7%9A%84-mertrics)。

#### Runtime Metrics

基于 [opentelemetry-go](https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/runtime)，支持以下 runtime metrics：

| 名称                                   | 指标数据模型 | 单位       | 单位(UCUM) | 描述                                             |
| -------------------------------------- | ------------ | ---------- | ---------- | ------------------------------------------------ |
| `process.runtime.go.cgo.calls`         | Sum          | -          | -          | 当前进程调用的cgo数量                            |
| `process.runtime.go.gc.count`          | Sum          | -          | -          | 已完成的 gc 周期的数量                           |
| `process.runtime.go.gc.pause_ns`       | Histogram    | nanosecond | `ns`       | 在GC stop-the-world 中暂停的纳秒数量             |
| `process.runtime.go.gc.pause_total_ns` | Histogram    | nanosecond | `ns`       | 自程序启动以来，GC stop-the-world 的累计微秒计数 |
| `process.runtime.go.goroutines`        | Gauge        | -          | -          | 协程数量                                         |
| `process.runtime.go.lookups`           | Sum          | -          | -          | 运行时执行的指针查询的数量                       |
| `process.runtime.go.mem.heap_alloc`    | Gauge        | bytes      | `bytes`    | 分配的堆对象的字节数                             |
| `process.runtime.go.mem.heap_idle`     | Gauge        | bytes      | `bytes`    | 空闲（未使用）的堆内存                           |
| `process.runtime.go.mem.heap_inuse`    | Gauge        | bytes      | `bytes`    | 已使用的堆内存                                   |
| `process.runtime.go.mem.heap_objects`  | Gauge        | -          | -          | 已分配的堆对象数量                               |
| `process.runtime.go.mem.live_objects`  | Gauge        | -          | -          | 存活对象数量(Mallocs - Frees)                    |
| `process.runtime.go.mem.heap_released` | Gauge        | bytes      | `bytes`    | 已交还给操作系统的堆内存                         |
| `process.runtime.go.mem.heap_sys`      | Gauge        | bytes      | `bytes`    | 从操作系统获得的堆内存                           |
| `runtime.uptime`                       | Sum          | ms         | `ms`       | 自应用程序被初始化以来的毫秒数                   |

## 链路追踪

Kitex 支持流行的链路追踪标准 OpenTelemetry，允许开发者选择合适的工具来适应他们的监控生态，用户可以轻松地在微服务架构中实现请求的全链路监控。这样的监控对于调试、性能分析以及故障排查是至关重要的。

### OpenTelemetry

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
