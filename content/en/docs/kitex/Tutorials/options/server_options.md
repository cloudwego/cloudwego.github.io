---
title: "Server Option"
date: 2022-06-20
weight: 2
keywords: ["Kitex", "Server", "Option"]
description: Kitex Server Option instructions.
---

## Usage

Add some options when creating a server：

```go
svr := api.NewServer(new(DemoImpl), server.WithXXX...)
```



## Basic Options

### WithServerBasicInfo

```go
func WithServerBasicInfo(ebi *rpcinfo.EndpointBasicInfo) Option
```

Set the service infos for server, including ServiceName and customized Tags, customized Tag such as Cluster, IDC, Env, and it is no need to set Method field of EndpointBasicInfo.
It is strongly recommended to configure this option, and those infos will be used for service registration.



### WithServiceAddr

```go
func WithServiceAddr(addr net.Addr) Option
```

Set the listen address for server. Default port is 8888, you can reset the port to 9999 like this:

```go
  addr, _ := net.ResolveTCPAddr("tcp", "127.0.0.1:9999")
  svr := api.NewServer(new(HelloImpl), server.WithServiceAddr(addr))
```

When local server has multiple IP addresses, you can also use this method to specify them.



### WithMuxTransport

```go
func WithMuxTransport() Option
```

Enable Kitex multiplexing transport feature on the server side. Client side also need to turn on this option, or it won't work.  [More](/docs/kitex/tutorials/basic-feature/connection_type/)



### WithMiddleware

```go
func WithMiddleware(mw endpoint.Middleware) Option
```

Add a middleware.  [More](/docs/kitex/tutorials/framework-exten/middleware/)



### WithMiddlewareBuilder

```go
func WithMiddlewareBuilder(mwb endpoint.MiddlewareBuilder, funcName ...string) Option
```

Add middleware depends on the context passed in by the framework that contains runtime configuration information (the context of non-RPC calls), so that the middleware can take advantage of the framework's information when initializing.



### WithLimit

```go
func WithLimit(lim *limit.Option) Option
```

Set the throttling threshold, which allows you to set a limit on QPS and the number of connections, which uses a built-in throttling implementation that can be scaled if there is a custom throttling requirement, integrating your own throttling policy via `WithConcurrencyLimiter` or `WithQPSLimiter`.



### WithReadWriteTimeout

```go
func WithReadWriteTimeout(d time.Duration) Option
```

Set the server-side read and write timeout.

Note: This feature may be changed or removed in subsequent releases.



### WithExitWaitTime

```go
func WithExitWaitTime(timeout time.Duration) Option
```

Set the wait time for graceful shutdown of graceful shutdown on the server side.



### WithMaxConnIdleTime

```go
func WithMaxConnIdleTime(timeout time.Duration) Option 
```

Set the maximum amount of idle time allowed for the server-side connection to the client.



### WithStatsLevel

```go
func WithStatsLevel(level stats.Level) Option
```

Set the stats level for the server. [More](/docs/kitex/tutorials/observability/tracing/)



### gRPC Options

> These options only works for scenarios where the transport protocol uses gRPC, with some parameter adjustments to gRPC transfers.

#### WithGRPCWriteBufferSize

```go
func WithGRPCWriteBufferSize(s uint32) Option
```

WithGRPCWriteBufferSize determines how much data can be batched before doing a write on the wire. The corresponding memory allocation for this buffer will be twice the size to keep syscalls low. The default value for this buffer is 32KB. Zero will disable the write buffer such that each write will be on underlying connection.
Note: A Send call may not directly translate to a write. It corresponds to the WriteBufferSize ServerOption of gRPC.





#### WithGRPCReadBufferSize

```go
func WithGRPCReadBufferSize(s uint32) Option
```

WithGRPCReadBufferSize lets you set the size of read buffer, this determines how much data can be read at most for one read syscall. The default value for this buffer is 32KB. Zero will disable read buffer for a connection so data framer can access the underlying conn directly. It corresponds to the ReadBufferSize ServerOption of gRPC.



#### WithGRPCInitialWindowSize

```go
func WithGRPCInitialWindowSize(s uint32) Option
```

WithGRPCInitialWindowSize returns a Option that sets window size for stream. The lower bound for window size is 64K and any value smaller than that will be ignored. It corresponds to the InitialWindowSize ServerOption of gRPC.



#### WithGRPCInitialConnWindowSize

```go
func WithGRPCInitialConnWindowSize(s uint32) Option
```

WithGRPCInitialConnWindowSize returns an Option that sets window size for a connection. The lower bound for window size is 64K and any value smaller than that will be ignored. It corresponds to the InitialConnWindowSize ServerOption of gRPC.



#### WithGRPCKeepaliveParams

```go
func WithGRPCKeepaliveParams(kp grpc.ServerKeepalive) Option
```

WithGRPCKeepaliveParams returns an Option that sets keepalive and max-age parameters for the server. It corresponds to the KeepaliveParams ServerOption of gRPC.





#### WithGRPCKeepaliveEnforcementPolicy

```go
func WithGRPCKeepaliveEnforcementPolicy(kep grpc.EnforcementPolicy) Option
```

 WithGRPCKeepaliveEnforcementPolicy returns an Option that sets keepalive enforcement policy for the server. It corresponds to the KeepaliveEnforcementPolicy ServerOption of gRPC.



#### WithGRPCMaxConcurrentStreams

```go
func WithGRPCMaxConcurrentStreams(n uint32) Option
```

WithGRPCMaxConcurrentStreams returns an Option that will apply a limit on the number of concurrent streams to each ServerTransport. It corresponds to the MaxConcurrentStreams ServerOption of gRPC.



#### WithGRPCMaxHeaderListSize

```go
func WithGRPCMaxHeaderListSize(s uint32) Option
```

WithGRPCMaxHeaderListSize returns a ServerOption that sets the max (uncompressed) size of header list that the server is prepared to accept. It corresponds to the MaxHeaderListSize ServerOption of gRPC.





## Advanced Options

### WithSuite

```go
func WithSuite(suite Suite) Option
```

Set up a specific configuration, customize according to the scene, configure multiple options and middlewares combinations and encapsulations in the Suite. [More](/docs/kitex/tutorials/framework-exten/suite/)



### WithProxy

```go
func WithProxy(p proxy.ReverseProxy) Option
```

If the server has a proxy, such as Mesh Ingress, you can modify the listening address through this configuration to communicate with the proxy, such as in the proxy. ReverseProxy modifies to the uds address.



### WithRegistryInfo

```go
func WithRegistryInfo(info *registry.Info) Option
```

Customize the registration information reported by the service. [More](/docs/kitex/tutorials/service-governance/service_discovery/)



### WithGeneric

```go
func WithGeneric(g generic.Generic) Option
```

Specify the generalization call type, which needs to be used in conjunction with the generalization Client/Server. [More](/docs/kitex/tutorials/advanced-feature/generic-call/)



### WithErrorHandler

```go
func WithErrorHandler(f func(error) error) Option
```

Set the error handler function, which is executed after the server handler is executed and before the middleware executes.



### WithACLRules

```go
func WithACLRules(rules ...acl.RejectFunc) Option
```

Set ACL permission access control, which is executed before service discovery. [More](/docs/kitex/tutorials/service-governance/access_control/)



### WithExitSignal

```go
func WithExitSignal(f func() <-chan error) Option 
```

Set the server exit signal. Kitex has a built-in implementation, if you need some customization can be implemented yourself.



### WithReusePort

```go
func WithReusePort(reuse bool) Option
```

Set port reuse, that is, whether to enable the underlying TCP port multiplexing mechanism.



## Extended Options

### WithRegistry

```go
func WithRegistry(r registry.Registry) Option
```

Specify a Registry for service discovery registration reporting. [More](/docs/kitex/tutorials/service-governance/service_discovery/)



### WithTracer

```go
func WithTracer(c stats.Tracer) Option
```

Add an additional Tracer. [More](/docs/kitex/tutorials/observability/tracing/)



### WithCodec

```go
func WithCodec(c remote.Codec) Option
```

Specify a Codec for scenarios that require custom protocol. [More](/docs/kitex/tutorials/framework-exten/codec/)



### WithPayloadCodec

```go
func WithPayloadCodec(c remote.PayloadCodec) Option
```

Specifie a PayloadCodec. [More](/docs/kitex/tutorials/framework-exten/codec/)



### WithMetaHandler

```go
func WithMetaHandler(h remote.MetaHandler) Option
```

Add a meta handler for customizing transparent information in conjunction with the transport protocol, such as service name, invocation method, machine room, cluster, env, tracerInfo. [More](/docs/kitex/tutorials/framework-exten/transmeta/)



### WithBoundHandler

```go
func WithBoundHandler(h remote.BoundHandler) Option
```

Set IO Bound handlers. [More](/docs/kitex/tutorials/framework-exten/trans_pipeline/)



### WithConcurrencyLimiter

```go
func WithConcurrencyLimiter(conLimit limiter.ConcurrencyLimiter) Option
```

Set the concurrency limit for server.



### WithQPSLimiter

```go
func WithQPSLimiter(qpsLimit limiter.RateLimiter) Option
```

Set the QPS limit for server.



### WithLimitReporter

```go
func WithLimitReporter(r limiter.LimitReporter) Option
```

Set LimitReporter, and when QPS throttling or connection limiting occurs, you can customize the escalation through LimitReporter.



### WithTransHandlerFactory

```go
func WithTransHandlerFactory(f remote.ServerTransHandlerFactory) Option
```

Set transHandlerFactory. [More](/docs/kitex/tutorials/framework-exten/transport/)



### WithTransServerFactory

```go
func WithTransServerFactory(f remote.TransServerFactory) Option
```

Set transServerFactory. [More](/docs/kitex/tutorials/framework-exten/transport/)



### WithDiagnosisService

```go
func WithDiagnosisService(ds diagnosis.Service) Option
```

Set diagnosis service. [More](/docs/kitex/tutorials/framework-exten/diagnosis/)
