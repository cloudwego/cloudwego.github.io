---
title: "Prometheus"
linkTitle: "Prometheus"
weight: 5
keywords: ["Prometheus"]
description: "Hertz 提供的 Prometheus 扩展。"
---

[monitor-prometheus](https://github.com/hertz-contrib/monitor-prometheus) 中提供了默认的 prometheus 的监控扩展，能够实现:

- 请求量监控
- 时延监控

默认的 tag 有：HTTP Method，statusCode。请求相关的信息存在 `RequestContext`，在打点上报时可以获取到该变量，用户可以根据自己的需要自行扩展打点功能。使用方式：

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

目前 Client 暂没有暴露 Tracer 接口，但是提供了 [中间件](/zh/docs/hertz/tutorials/basic-feature/middleware/) 能力，可以通过中间件实现监控能力。
