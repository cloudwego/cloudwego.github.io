---
title: "监控"
linkTitle: "监控"
weight: 4
keywords: ["监控"]
description: "Hertz 提供的监控能力。"
---

框架自身不带任何监控打点，只是提供了 `Tracer` 接口，用户可以根据需求实现该接口，并通过 `WithTracer` Option 来注入。

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
    Start(ctx context.Context, c *app.RequestContext) context.Context
    Finish(ctx context.Context, c *app.RequestContext)
}
```

[hertz-contrib](https://github.com/hertz-contrib/monitor-prometheus) 中提供了默认的 prometheus 的监控扩展，能够实现:

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
      ctx.JSON(200, utils.H{"ping": "pong"})
    })
    h.Spin()
    ···
}
```

目前 Client 暂没有暴露 Tracer 接口，但是提供了 [中间件](/zh/docs/hertz/tutorials/basic-feature/middleware/) 能力，可以通过中间件实现监控能力。

仓库 https://github.com/hertz-contrib/monitor-prometheus
