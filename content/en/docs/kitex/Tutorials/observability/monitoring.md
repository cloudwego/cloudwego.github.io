---
title: "Monitoring"
date: 2021-08-31
weight: 4
keywords: ["Kitex", "Monitoring", "Tracer"]
description: Kitex has monitoring capability built in, but does not have any monitoring features itself, and can be extended by the interface.
---

The framework provides a `Tracer` interface. Users can implement it and inject it by `WithTracer` Option.

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

Kitex-contrib also provides two monitoring extensions [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus/tree/main) and [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry/tree/main). They integrate Prometheus and OpenTelemetry monitoring extensions, respectively. The former is more aligned with the Prometheus ecosystem and is easier to use, while the latter provides more flexibility.

## Prometheus

The extension repository [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus/tree/main) offers Prometheus monitoring extension.

#### usage example:

##### Client Side:

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

##### Server Side:

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

##### Kitex Client

| Name                        | Unit | Tags                                 | Description                             |
|-----------------------------|------|--------------------------------------|-----------------------------------------|
| `kitex_client_throughput`   | -    | type, caller, callee, method, status | Total number of requests handled by the Client |
| `kitex_client_latency_us`   | us   | type, caller, callee, method, status | Latency of request handling at the Client (Response received time - Request initiation time, in microseconds) |

##### Kitex Server

| Name                        | Unit | Tags                                 | Description                             |
|-----------------------------|------|--------------------------------------|-----------------------------------------|
| `kitex_server_throughput`   | -    | type, caller, callee, method, status | Total number of requests handled by the Server |
| `kitex_server_latency_us`   | us   | type, caller, callee, method, status | Latency of request handling at the Server (Processing completion time - Request received time, in microseconds) |

More complex data monitoring can be implemented based on the above metrics. Examples can be found in the [Useful Examples](https://github.com/kitex-contrib/monitor-prometheus/?tab=readme-ov-file#useful-examples) section.

## OpenTelemetry

The extension repository [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry/tree/main) provides OpenTelemetry monitoring extension.

#### usage example:

##### Client Side:

```go
import (
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
    cli, _ := echo.NewClient(
        "echo",
        client.WithSuite(tracing.NewClientSuite()),
        // Please keep the same as provider.WithServiceName
        client.WithClientBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
    )
}
```

##### Server Side:

```go
import (
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
}
```

#### Metrics

##### Kitex Server

| Name                        | Metric Data Model | Unit        | Unit(UCUM) | Description                               |
|-----------------------------|-------------------|-------------|------------|-------------------------------------------|
| `rpc.server.duration`       | Histogram         | milliseconds| `ms`       | measures duration of inbound RPC     |

##### Kitex Client

| Name                        | Metric Data Model | Unit        | Unit(UCUM) | Description                               |
|-----------------------------|-------------------|-------------|------------|-------------------------------------------|
| `rpc.server.duration`       | Histogram         | milliseconds| `ms`       | measures duration of outbound RPC     |

##### Runtime Metrics

| Name                                   | Instrument | Unit       | Unit (UCUM)) | Description                                                                   |
|----------------------------------------|------------|------------|--------------|-------------------------------------------------------------------------------|
| `process.runtime.go.cgo.calls`         | Sum        | -          | -            | Number of cgo calls made by the current process.                              |
| `process.runtime.go.gc.count`          | Sum        | -          | -            | Number of completed garbage collection cycles.                                |
| `process.runtime.go.gc.pause_ns`       | Histogram  | nanosecond | `ns`         | Amount of nanoseconds in GC stop-the-world pauses.                            |
| `process.runtime.go.gc.pause_total_ns` | Histogram  | nanosecond | `ns`         | Cumulative nanoseconds in GC stop-the-world pauses since the program started. |
| `process.runtime.go.goroutines`        | Gauge      | -          | -            | measures duration of outbound RPC.                                            | 
| `process.runtime.go.lookups`           | Sum        | -          | -            | Number of pointer lookups performed by the runtime.                           |
| `process.runtime.go.mem.heap_alloc`    | Gauge      | bytes      | `bytes`      | Bytes of allocated heap objects.                                              |
| `process.runtime.go.mem.heap_idle`     | Gauge      | bytes      | `bytes`      | Bytes in idle (unused) spans.                                                 |
| `process.runtime.go.mem.heap_inuse`    | Gauge      | bytes      | `bytes`      | Bytes in in-use spans.                                                        |
| `process.runtime.go.mem.heap_objects`  | Gauge      | -          | -            | Number of allocated heap objects.                                             |
| `process.runtime.go.mem.live_objects`  | Gauge      | -          | -            | Number of live objects is the number of cumulative Mallocs - Frees.           |
| `process.runtime.go.mem.heap_released` | Gauge      | bytes      | `bytes`      | Bytes of idle spans whose physical memory has been returned to the OS.        |
| `process.runtime.go.mem.heap_sys`      | Gauge      | bytes      | `bytes`      | Bytes of idle spans whose physical memory has been returned to the OS.        |
| `runtime.uptime`                       | Sum        | ms         | `ms`         | Milliseconds since application was initialized.                               |

Additional service metrics can be calculated using `rpc.server.duration`, such as R.E.D (Rate, Errors, Duration). Examples can be found [here](https://github.com/kitex-contrib/obs-opentelemetry/blob/main/README_CN.md#%E7%8E%B0%E5%B7%B2%E6%94%AF%E6%8C%81%E7%9A%84-mertrics).
