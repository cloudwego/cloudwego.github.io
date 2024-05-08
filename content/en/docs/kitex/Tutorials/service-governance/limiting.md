---
title: "Rate Limiting"
date: 2022-10-08
weight: 7
keywords: ["Kitex", "Rate Limit", "Limiter"]
description: "Usage guide for Kitex Default and Custom rate limiting."
---

Rate limiting is an imperative technique to protect server, which prevents server from overloaded by sudden traffic increase from a client.

Kitex supports the user-defined QPS limiter and connections limiter, and provides default implementation.

## Note

- When `server.WithLimit` and `server.WithQPSLimiter` or `server.WithLimit` and `server.WithConnectionLimiter` are used at the same time, only the latter will take effect.
- To save request deserialization overhead and improve performance, in non-multiplexing scenarios, Kitex's default QPS limiter takes effect at the `OnRead` hook, while in multiplexing or user-defined QPS limiter scenarios, the current limiter takes effect at the `OnMessage` hook. This is to ensure that the user-defined QPS limiter can obtain the basic information of the request such as rpc method.
- Rate limiting only works on Thrift or Kitexpb protocols, but not for gRPC protocols. gRPC can use flow control to limit traffic at transport layer. Kitex provides `WithGRPCInitialWindowSize` and `WithGRPCInitialConnWindowSize` to set the flow control window size of stream and connection respectively. For details, see [gRPC official documentation](https://pkg.go.dev/google.golang.org/grpc#InitialConnWindowSize)

## Use default rate limiter

### code example

```go
import "github.com/cloudwego/kitex/pkg/limit"

func main() {
	svr := xxxservice.NewServer(handler, server.WithLimit(&limit.Option{MaxConnections: 10000, MaxQPS: 1000}))
	svr.Run()
}
```

Parameter description：

- `MaxConnections`: max connections

- `MaxQPS`: max QPS (Queries Per Second)

- `UpdateControl`: provide the ability to modify the rate limit threshold dynamically, for example:

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

### Implementation

The default ConcurrencyLimiter and RateLimiter are used respectively to limit max connection and max QPS.

- ConcurrencyLimiter：a simple counter；
- RateLimiter：token bucket algorithm is used here.

### Monitoring

The default limiters define the `LimitReporter` interface, which is used by rate limiting status monitoring, e.g. connection overloaded, QPS overloaded, etc.

Users may implement this interface and inject this implementation by `WithLimitReporter` if required.

```go
// LimitReporter is the interface define to report(metric or print log) when limit happen
type LimitReporter interface {
    ConnOverloadReport()
    QPSOverloadReport()
}
```

## Use user-defined rate limiter

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
