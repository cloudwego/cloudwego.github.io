---
title: "Monitoring"
linkTitle: "Monitoring"
date: 2022-06-21
weight: 4
keywords: ["Monitoring"]
description: "Hertz provides monitoring capabilities."
---

The framework doesn't provide any monitoring, but only provides a `Tracer` interface. This interface can be implemented by yourself and be injected via `WithTracer` Option.

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
    Start(ctx context.Context, c *app.RequestContext) context.Context
    Finish(ctx context.Context, c *app.RequestContext)
}
```

[hertz-contrib](https://github.com/hertz-contrib/monitor-prometheus) provides a default prometheus monitoring extension，which can be used to do:

- Server throughput monitoring
- Request latency monitoring

The default tags include: HTTP Method, statusCode. Requests related information are stored in `RequestContext`, and this variable can be accessed after monitoring metrics scraped. You can implement and extend the monitoring functions according to your own requirements. Usage example:

Server

```go
import (
  "context"

  "github.com/cloudwego/hertz/pkg/app"
  "github.com/cloudwego/hertz/pkg/app/server"
  "github.com/cloudwego/hertz/pkg/common/utils"
  "github.com/hertz-contrib/monitor-prometheus"
  )

func main() {
    ···
    h := server.Default(server.WithTracer(prometheus.NewServerTracer(":9091", "/hertz")))
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
      ctx.JSON(200, utils.H{"ping": "pong"})
    })
    h.Spin()
    ···
}
```

Currently, `Client` doesn't expose `Tracer` interface, but monitoring capabilities can be implemented through [middleware](/docs/hertz/tutorials/basic-feature/middleware/).

Related Repository https://github.com/hertz-contrib/monitor-prometheus
