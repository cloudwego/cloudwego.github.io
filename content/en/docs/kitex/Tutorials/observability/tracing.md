---
title: "Tracing"
date: 2021-08-31
weight: 2
keywords: ["Kitex", "Tracing", "OpenTelemetry", "OpenTracing"]
description: Kitex supports OpenTelemetry tracer, OpenTracing tracer and also customized tracer.
---

## Background

Kitex supports popular tracing standards like OpenTelemetry and OpenTracing, enabling developers to choose suitable tools for their monitoring ecosystem. Users can easily implement end-to-end request monitoring in a microservices architecture. Such monitoring is crucial for debugging, performance analysis, and troubleshooting.

## OpenTelemetry

[obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) extension integrates with the OpenTelemetry standard for tracing.

**Usage Example**

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

[tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing) extension integrates with the OpenTracing standard for tracing.

**Usage Example**

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

### Custom Opentracing Tracer and Operation Name

To create a Suite using a custom Opentracing Tracer and Operation Name, you can use the `NewServerSuite` and `NewClientSuite` methods. Here's an example for the client side (similar for the server side):

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

### Supported Components

#### Redis

[tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing) provides a Redis Hook for quick integration with Redis tracing. Here's how to use it:

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

For more information, see [OpenTelemetry Creating Spans](https://opentelemetry.io/docs/languages/go/instrumentation/#creating-spans) and [OpenTracing Golang API](https://opentracing.io/guides/golang/).
