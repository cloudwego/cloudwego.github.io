---
title: "限流"
date: 2022-10-08
weight: 7
keywords: ["Kitex", "限流", "限流器"]
description: "Kitex 默认限流和自定义限流使用指南。"
---

限流是一种保护 server 的措施，防止上游某个 client 流量突增导致 server 端过载。

目前 Kitex 支持用户自定义的 QPS 限流器和连接数限流器，同时提供了默认的实现。

## 注意事项

- 同时定义 `server.WithLimit` 和 `server.WithQPSLimiter` 或同时定义 `server.WithLimit` 和 `server.WithConnectionLimiter` 时，只有后者会生效。
- 为节省请求反序列化开销提高性能，在非多路复用场景下，Kitex 默认的 QPS 限流器是在 `OnRead` hook 处生效的，而在多路复用或使用自定义 QPS 限流器场景下，限流器在 `OnMessage` hook 处生效。这是为了保证自定义限流器能获取到请求的基本信息，避免在例如按 method 限流等场景下无法生效的问题。
- 目前的限流功能只对 Thrift、Kitexpb 协议生效，对 gRPC 协议暂不生效。gRPC 可采用流控在传输层面做流量限制，Kitex 提供了 `WithGRPCInitialWindowSize` 和 `WithGRPCInitialConnWindowSize` 分别用于设置 stream 和连接的流控窗口大小，详见[gRPC官方文档](https://pkg.go.dev/google.golang.org/grpc#InitialConnWindowSize)

## 使用默认的限流器

### 代码示例

```go
import "github.com/cloudwego/kitex/pkg/limit"

func main() {
	svr := xxxservice.NewServer(handler, server.WithLimit(&limit.Option{MaxConnections: 10000, MaxQPS: 1000}))
	svr.Run()
}
```

参数说明：

- `MaxConnections` 表示最大连接数

- `MaxQPS` 表示最大 QPS

- `UpdateControl` 提供动态修改限流阈值的能力，举例：

```go
import "github.com/cloudwego/kitex/pkg/limit"

// define your limiter updater to update limit threshold
type MyLimiterUpdater struct {
	updater limit.Updater
}

func (lu *MyLimiterUpdater) YourChange() {
	// your logic: set new option as needed
	newOpt := &limit.Option{
		MaxConnections: 20000,
		MaxQPS:         2000,
	}
	// update limit config
	isUpdated := lu.updater.UpdateLimit(newOpt)
	// your logic
}

func (lu *MyLimiterUpdater) UpdateControl(u limit.Updater) {
	lu.updater = u
}

//--- init server ---
var lu  = MyLimiterUpdater{}
svr := xxxservice.NewServer(handler, server.WithLimit(&limit.Option{MaxConnections: 10000, MaxQPS: 1000, UpdateControl: lu.UpdateControl}))
```

### 实现

默认限流器分别使用 ConcurrencyLimiter 和 RateLimiter 对最大连接数和最大 QPS 进行限流。

- ConcurrencyLimiter：简单的计数器；
- RateLimiter：这里的限流算法采用了 " 令牌桶算法 "。

### 监控

默认限流器定义了 `LimitReporter` 接口，用于限流状态监控，例如当前连接数过多、QPS 过大等。

如有需求，用户需要自行实现该接口，并通过 `WithLimitReporter` 注入。

```go
// LimitReporter is the interface define to report(metric or print log) when limit happen
type LimitReporter interface {
    ConnOverloadReport()
    QPSOverloadReport()
}
```

## 使用自定义的限流器

```go
import (
    "context"
    "time"

    "github.com/cloudwego/kitex/pkg/limiter"
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/server"
)

type qpsLimiter struct{}

func (l *qpsLimiter) Acquire(ctx context.Context) bool {
    ri := rpcinfo.GetRPCInfo(ctx)
    md := ri.From().Method()
    return acquire(md) // return true to allow this request
}

func (l *qpsLimiter) Status(ctx context.Context) (max, current int, interval time.Duration) {
    // max: the maximum number of requests allowed in the interval;
    // current: the remaining number of requests allowed in the interval;
    return
}

type connectionLimiter struct{}

func (l *connectionLimiter) Acquire(ctx context.Context) bool {
    ri := rpcinfo.GetRPCInfo(ctx)
    addr := ri.From().Address()
    return acquire(addr) // return true to allow this connection
}

func (l *connectionLimiter) Release(ctx context.Context) {
    ri := rpcinfo.GetRPCInfo(ctx)
    addr := ri.From().Address()
    return release(addr) // release occupied resource by the connection, only called after the release is successful.
}

func (l *connectionLimiter) Status(ctx context.Context) (limit, occupied int) {
    // limit: the maximum number of connections allowed.
    // occupied: the number of existing connections.
    return
}

func main() {
    myQPSLimiter := &qpsLimiter{}
    myConnectionLimiter := &connectionLimiter{}
    svr := xxxservice.NewServer(handler, server.WithQPSLimiter(myQPSLimiter), server.WithConnectionLimiter(myConnectionLimiter))
    svr.Run()
}
```
