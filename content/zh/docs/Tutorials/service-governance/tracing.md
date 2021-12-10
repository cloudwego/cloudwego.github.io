---
title: "链路跟踪"
date: 2021-08-26
weight: 3
description: >
---

Kitex 提供了对 opentracing 的支持，也支持用户自定义链路跟踪。

## opentracing

client 侧，默认使用 opentracing `GlobalTracer`

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

server 侧，默认使用 opentracing `GlobalTracer`

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

### 自定义 opentracing tracer 和 operation name

client 侧

```go
import (
	...
	ko "github.com/kitex-contrib/opentracing"
	"github.com/opentracing/opentracing-go"
	"github.com/cloudwego/kitex/pkg/endpoint"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
  ...
)
...
myTracer := opentracing.GlobalTracer()
operationNameFunc := func(ctx context.Context) string {
	endpoint := rpcinfo.GetRPCInfo(ctx).To()
	return endpoint.ServiceName() + "::" + endpoint.Method()
}
...
client, err := echo.NewClient("echo", ko.ClientOption(myTracer, operationNameFunc))
if err != nil {
	log.Fatal(err)
}
```

server 侧

```go
import (
	...
	ko "github.com/kitex-contrib/opentracing"
	"github.com/opentracing/opentracing-go"
	"github.com/cloudwego/kitex/pkg/endpoint"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	...
)
...
myTracer := opentracing.GlobalTracer()
operationNameFunc := func(ctx context.Context) string {
	endpoint := rpcinfo.GetRPCInfo(ctx).To()
	return endpoint.ServiceName() + "::" + endpoint.Method()
}
...
svr, err := echo.NewServer(ko.ClientOption(myTracer, operationNameFunc))
if err := svr.Run(); err != nil {
	log.Println("server stopped with error:", err)
} else {
	log.Println("server stopped")
}
```

## 自定义 tracer

tracer 的定义如下：

```go
type Tracer interface {
	Start(ctx context.Context) context.Context
	Finish(ctx context.Context)
}
```

示例：

client 侧

```go
import "github.com/cloudwego/kitex/client"
...
type myTracer struct {}

func (m *myTracer) Start(ctx context.Context) context.Context {
	_, ctx = opentracing.StartSpanFromContextWithTracer(ctx, o.tracer, "RPC call")
	return ctx
}

func (m *myTracer) Finish(ctx context.Context) {
	span := opentracing.SpanFromContext(ctx)
	span.Finish()
}
...
client, err := echo.NewClient("echo", client.WithTracer(&myTracer{}))
if err != nil {
	log.Fatal(err)
}
```

server 侧

```go
import "github.com/cloudwego/kitex/server"
...
type myTracer struct {}

func (m *myTracer) Start(ctx context.Context) context.Context {
	_, ctx = opentracing.StartSpanFromContextWithTracer(ctx, o.tracer, "RPC handle")
	return ctx
}

func (m *myTracer) Finish(ctx context.Context) {
	span := opentracing.SpanFromContext(ctx)
	span.Finish()
}
...
svr, err := echo.NewServer(server.WithTracer(&myTracer{}))
if err := svr.Run(); err != nil {
	log.Println("server stopped with error:", err)
} else {
	log.Println("server stopped")
}
```
