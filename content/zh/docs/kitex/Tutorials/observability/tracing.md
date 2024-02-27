---
title: "链路跟踪"
date: 2021-08-26
weight: 2
keywords: ["Kitex", "链路追踪", "OpenTelemetry", "OpenTracing"]
description: Kitex 提供了对 OpenTelemetry 和 OpenTracing 的支持，也支持用户自定义链路跟踪。
---

## 背景

Kitex 支持流行的链路追踪标准 OpenTelemetry 和 OpenTracing，允许开发者选择合适的工具来适应他们的监控生态，用户可以轻松地在微服务架构中实现请求的全链路监控。这样的监控对于调试、性能分析以及故障排查是至关重要的。

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
## OpenTracing

[tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing) 拓展集成了 OpenTracing 标准的链路追踪。

**使用示例**

Client

```go
import (
	"github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	internal_opentracing "github.com/kitex-contrib/tracer-opentracing"
)
...
tracer := internal_opentracing.NewDefaultClientSuite()
client, err := echo.NewClient("echo", client.WithSuite(tracer))
if err != nil {
	log.Fatal(err)
}
```

Server

```go
import (
  "github.com/cloudwego/kitex/server"
  "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
  internal_opentracing "github.com/kitex-contrib/tracer-opentracing"
)
...
tracer := internal_opentracing.NewDefaultServerSuite()
svr, err := echo.NewServer(new(EchoImpl), server.WithSuite(tracer))
if err := svr.Run(); err != nil {
	log.Println("server stopped with error:", err)
} else {
	log.Println("server stopped")
}
```
### 自定义 Opentracing Tracer 和 Operation Name

通过 `NewDefaultServerSuite` 和 `NewDefaultClientSuite` 会创建出默认使用 OpenTracing GlobalTracer 的 Suite。若需自定义 Opentracing Tracer 和 Operation Name，可选择使用 `NewServerSuite` 和 `NewClientSuite` 方法创建 Suite。

以 Client 端为例（Server 端类似）：

```go
import (
	...
	"github.com/opentracing/opentracing-go"
	"github.com/cloudwego/kitex/pkg/endpoint"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
  internal_opentracing "github.com/kitex-contrib/tracer-opentracing"
  ...
)
...
myTracer := opentracing.GlobalTracer()
operationNameFunc := func(ctx context.Context) string {
	endpoint := rpcinfo.GetRPCInfo(ctx).To()
	return endpoint.ServiceName() + "::" + endpoint.Method()
}
...
client, err := echo.NewClient("echo", client.WithSuite(internal_opentracing.NewClientSuite(myTracer, operationNameFunc)))
if err != nil {
	log.Fatal(err)
}
```

### 支持的组件

#### Redis

[tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing) 提供了 Redis Hook，可以快速集成 Redis 链路追踪。使用方式如下：

```go
import (
    ...
    "github.com/go-redis/redis/v8"
    internal_opentracing "github.com/kitex-contrib/tracer-opentracing"
    ...
)

func main() {
    ...
    rdb := redis.NewClient(&redis.Options{...})
  	// add the hook provided by tracer-opentracing to instrument Redis client
    rdb.AddHook(internal_opentracing.NewTracingHook())
    ...
}
```

## 自定义 Tracer

框架提供了 Tracer 接口，可以实现该接口来自定义 Tracer ：

```go
type Tracer interface {
	Start(ctx context.Context) context.Context
	Finish(ctx context.Context)
}
```

详细文档请阅读 [监控拓展](../../framework-exten/monitoring/#链路追踪拓展) 章节。

## 自定义跟踪事件

Kitex 提供了一些默认的跟踪事件，例如 RPC 调用开始、RPC 调用结束等，有关内置的跟踪事件请参考 [埋点](../instrumentation) 章节。除此之外，也可以手动添加更多的追踪数据，以收集更详细的链路信息。跟踪事件通过创建和结束 span 来记录，可以使用对应组件的原生 API 来完成。

以 OpenTelemetry 为例，可以这样使用：

```go
ctx, span := otel.Tracer("client").Start(ctx, "root")
defer span.End()
```

更多内容请参考：[OpenTelemetry Creating Spans](https://opentelemetry.io/docs/languages/go/instrumentation/#creating-spans)、[OpenTracing Golang API](https://opentracing.io/guides/golang/)。

