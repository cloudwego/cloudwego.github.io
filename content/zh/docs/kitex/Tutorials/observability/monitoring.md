---
title: "监控"
date: 2021-08-26
weight: 4
keywords: ["Kitex", "监控", "Tracer"]
description: Kitex 框架内置了监控能力，但是本身不带任何监控打点，通过接口的方式进行扩展。
---

框架提供了 `Tracer` 接口，用户可以根据需求实现该接口，并通过 `WithTracer` Option 来注入监控的具体实现。

```go
// Tracer is executed at the start and finish of an RPC.
type Tracer interface {
    Start(ctx context.Context) context.Context
    Finish(ctx context.Context)
}
```

[kitex-contrib](https://github.com/kitex-contrib) 中提供了 prometheus 的监控扩展，使用方式：

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
