---
title: "OpenTelemetry"
date: 2022-09-13
weight: 5
keywords: ["OpenTelemetry"]
description: "Hertz provides openTelemetry capabilities."
---

[OpenTelemetry](https://opentelemetry.io/) is an open source observability framework
from [CNCF](https://www.cncf.io/) that consist of a series of tools, APIs and SDKs, and it enables IT teams to detect, generate,
collect, and export remote monitoring data for analysis and understanding of software performance and behavior.

The [obs-opentelemetry](https://github.com/hertz-contrib/obs-opentelemetry) extension is available in the hertz-contrib,
which allows hertz to integrate OpenTelemetry with a simple setup.

## Features

### Tracing

Tracing provides a full view of the entire lifecycle from the time a request is received to the time it is processed.

What obs-opentelemetry implements:

- Support server and client hertz http tracing
- Support automatic transparent transmission of peer service through http headers

Examples:

Server:

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

Client:

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

[Code](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/tracing)

#### Tracing Options

| 函数名                          | 描述                                                                                                |
|------------------------------|---------------------------------------------------------------------------------------------------|
| WithTextMapPropagator        | Configures `propagation.TextMapPropagator`                                                        |
| WithCustomResponseHandler    | Configures Custom `ResponseHandler`                                                               |
| WithClientHttpRouteFormatter | Configure the custom formatting function for the 'http_route' dimension of the client-side metric |
| WithServerHttpRouteFormatter | Configure the custom formatting function for the 'http_route' dimension of the server-side metric |


### Metric

Metric contains a wide variety of methods and implementations.

Metric includes tracing samples and automatically associates metrics with them. Manually linking metrics to tracing is
often a tedious and error-prone task, and OpenTelemetry automating it will save Ops a lot of time.

What obs-opentelemetry implements:

- Support hertz http metrics: [Rate, Errors, Duration]
- Support service topology map metrics [Service Topology Map]
- Support go runtime metrics

[More](https://github.com/hertz-contrib/obs-opentelemetry#supported-metrics)

### Logging

OpenTelemetry combines a highly structured logging API with a high-speed log processing system. Existing logging APIs
can be connected to OpenTelemetry to avoid re-measurement of applications.

What obs-opentelemetry implements:

- Extend hertz logger based on logrus
- Implement tracing auto associated logs

```go
import (
    hertzlogrus "github.com/hertz-contrib/obs-opentelemetry/logging/logrus"
)

func main()  {
    hlog.SetLogger(hertzlogrus.NewLogger())
    // ...
}
```

[Code](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/logging/logrus)

### Provider

- Out-of-the-box default opentelemetry provider
- Support setting via environment variables:
  - [Exporter](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)
  - [SDK](https://opentelemetry.io/docs/reference/specification/sdk-environment-variables/#general-sdk-configuration)

Examples:

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

[Code](https://github.com/hertz-contrib/obs-opentelemetry/tree/main/provider)

#### Provider Options

| Function                  | Description                                                              |
|---------------------------|--------------------------------------------------------------------------|
| WithServiceName           | Configure the resource properties of `service.name`                      |
| WithDeploymentEnvironment | Configure the resource properties of `deployment.environment`            |
| WithServiceNamespace      | Configure the resource properties of `service.namespace`                 |
| WithResourceAttributes    | Configure the resource properties                                        |
| WithResource              | Configure resources (`resource.Resource`)                                |
| WithEnableTracing         | Enable `tracing`                                                         |
| WithEnableMetrics         | Enable `metrics`                                                         |
| WithTextMapPropagator     | Configure `propagation.TextMapPropagator`                                |
| WithResourceDetector      | Configure `resource.Detector`                                            |
| WithHeaders               | Configure the gRPC request header for exporting telemetry data           |
| WithInsecure              | Configure whether to use secure authentication for exported gRPC clients |
| WithEnableCompression     | Configure whether to enable gzip transport compression                   |
| WithSampler               | Configure Trace sampler                                                  |
| WithSdkTracerProvider     | Configure `sdktrace.TracerProvider`                                      |
| WithMeterProvider         | Configure `metric.MeterProvider`                                         |

## Full Examples

For a full usage: [example](https://github.com/cloudwego/hertz-examples/tree/main/opentelemetry)
