---
title: "Prometheus"
linkTitle: "Prometheus"
date: 2022-06-21
weight: 5
keywords: ["Prometheus"]
description: "Prometheus extension provided by Hertz."
---

The default prometheus monitoring extension is available in [monitor-prometheus](https://github.com/hertz-contrib/monitor-prometheus), providing:

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
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
      c.JSON(200, utils.H{"ping": "pong"})
    })
    h.Spin()
    ···
}
```

Currently, `Client` doesn't expose `Tracer` interface, but monitoring capabilities can be implemented through [middleware](/docs/hertz/tutorials/basic-feature/middleware/).

Related Repository https://github.com/hertz-contrib/monitor-prometheus
