---
title: "Server Option"
date: 2022-06-20
weight: 2
keywords: ["Kitex", "Server", "Option"]
description: Kitex Server Option 使用说明。
---

## 用法

在创建服务端时，带上 Option 参数即可：

```go
svr := api.NewServer(new(DemoImpl), server.WithXXX...)
```



## 基础 Option

### 基本信息 - WithServerBasicInfo

```go
func WithServerBasicInfo(ebi *rpcinfo.EndpointBasicInfo) Option
```

设置 Server 侧的 Service 信息，包括 ServiceName 和自定义的 Tags，自定义 Tag 如 Cluster、IDC、Env，无需设置 EndpointBasicInfo 的 Method 字段。强烈建议配置该 Option，会用于服务注册。



### 指定地址 - WithServiceAddr

```go
func WithServiceAddr(addr net.Addr) Option
```

指定服务端监听地址，默认是 8888 端口，配置示例-配置端口为 9999：

```go
  addr, _ := net.ResolveTCPAddr("tcp", "127.0.0.1:9999")
  svr := api.NewServer(new(HelloImpl), server.WithServiceAddr(addr))
```

在遇到本机有多个 IP 地址时，例如服务发现等场景需要 内网/外网 IP 地址，也可以用这个方法进行指定。



### 多路复用 - WithMuxTransport

```go
func WithMuxTransport() Option
```

服务端启用多路复用。需要配合客户端的同时开启，详见[连接类型-连接多路复用](/zh/docs/kitex/tutorials/basic-feature/connection_type/)。



### 中间件扩展 - WithMiddleware

```go
func WithMiddleware(mw endpoint.Middleware) Option
```

添加一个中间件，使用方式和 client 一致。用法参考 [Middleware 扩展](/zh/docs/kitex/tutorials/framework-exten/middleware/)。



### 中间件扩展 - WithMiddlewareBuilder

```go
func WithMiddlewareBuilder(mwb endpoint.MiddlewareBuilder, funcName ...string) Option
```

用于创建并添加中间件，可以根据 ctx 判断场景并创建中间件。 ctx 是框架传入的包含运行时配置信息的上下文（非 RPC 调用的上下文），以便中间件初始化时能利用框架的信息。



### 限流控制 - WithLimit

```go
func WithLimit(lim *limit.Option) Option
```

设置限流阈值，可以设置对 QPS 和连接数的限制，该配置使用内置的限流实现，如果有定制的限流需求可以自行扩展，通过 `WithConcurrencyLimiter` 或者 `WithQPSLimiter` 集成自己的限流策略。



### 超时设置 - WithReadWriteTimeout

```go
func WithReadWriteTimeout(d time.Duration) Option
```

设置服务端读写超时的时间。

注意：这个功能在后续版本中可能会有改动或者删除。



### 退出等待 - WithExitWaitTime

```go
func WithExitWaitTime(timeout time.Duration) Option
```

设置服务端 Graceful Shutdown 优雅关闭的等待的时间。



### 连接闲置设置 - WithMaxConnIdleTime

```go
func WithMaxConnIdleTime(timeout time.Duration) Option 
```

设置服务端对客户端连接的最大允许空闲的时间。



### 埋点粒度 - WithStatsLevel

```go
func WithStatsLevel(level stats.Level) Option
```

为 Server 设置埋点粒度，详见[埋点粒度](/zh/docs/kitex/tutorials/observability/tracing/)。



### gRPC 相关配置

> 这类设置只对传输协议使用 gRPC 的场景生效，对 gRPC 传输进行一些参数调整。

#### WithGRPCWriteBufferSize

```go
func WithGRPCWriteBufferSize(s uint32) Option
```

设置 gRPC 写缓冲大小，写缓冲决定了每次批量调用底层写发送数据的大小。默认值为32KB，如果设置为0，则相当于禁用缓冲区，每次写操作都直接调用底层连接进行发送。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCReadBufferSize

```go
func WithGRPCReadBufferSize(s uint32) Option
```

设置 gRPC 的读缓冲大小，读缓冲决定了每次批量从底层读取多少数据。默认值为32KB，如果设置为0，则相当于禁用缓冲区，每次读操作都直接从底层连接进行读操作。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCInitialWindowSize

```go
func WithGRPCInitialWindowSize(s uint32) Option
```

设置 gRPC 每个 Stream 的初始收发窗口大小，最低为64KB，若设置的值小于最低值，则会被忽略。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCInitialConnWindowSize

```go
func WithGRPCInitialConnWindowSize(s uint32) Option
```

设置 gRPC 单条连接上的初始窗口大小，最低为64KB，若设置的值小于最低值，则会被忽略。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCKeepaliveParams

```go
func WithGRPCKeepaliveParams(kp grpc.ServerKeepalive) Option
```

设置 gRPC 服务端 Keepalive 的各项参数。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCKeepaliveEnforcementPolicy

```go
func WithGRPCKeepaliveEnforcementPolicy(kep grpc.EnforcementPolicy) Option
```

设置 gRPC 服务端 Keepalive 里对于客户端策略的一些检查标准。



#### WithGRPCMaxConcurrentStreams

```go
func WithGRPCMaxConcurrentStreams(n uint32) Option
```

设置 gRPC 服务端最大能接受的 Stream 数量限制。



#### WithGRPCMaxHeaderListSize

```go
func WithGRPCMaxHeaderListSize(s uint32) Option
```

设置 gRPC MaxHeaderListSize 参数，该参数决定了每次调用允许发送的header的最大条数。该设置只对传输协议使用 gRPC 的场景生效。





## 高级 Option

### 配套扩展 - WithSuite

```go
func WithSuite(suite Suite) Option
```

设置一套特定配置，可根据场景进行定制，在 Suite 中配置多个 Option 和 Middleware 的组合和封装，详见 [ Suite 扩展](/zh/docs/kitex/tutorials/framework-exten/suite/)。



### 代理 - WithProxy

```go
func WithProxy(p proxy.ReverseProxy) Option
```

如果服务端有代理，如 Mesh Ingress，可以通过该配置修改监听地址，用于与 Proxy 通信，比如在 proxy.ReverseProxy 修改为 uds 地址。



### 注册信息 - WithRegistryInfo

```go
func WithRegistryInfo(info *registry.Info) Option
```

自定义服务上报的注册信息，用法详见[服务发现](/zh/docs/kitex/tutorials/service-governance/service_discovery/)。



### 泛化调用 - WithGeneric

```go
func WithGeneric(g generic.Generic) Option
```

指定泛化调用类型，泛化需要结合泛化 Client/Server 使用，详见 [Kitex 泛化调用使用指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)。



### 异常处理 - WithErrorHandler

```go
func WithErrorHandler(f func(error) error) Option
```

设置异常处理函数，该函数会在服务端 handler 执行后，中间件执行前被执行。



### 权限控制 - WithACLRules

```go
func WithACLRules(rules ...acl.RejectFunc) Option
```

设置 ACL 权限访问控制，该模块会在服务发现之前执行，具体用法详见[自定义访问控制](/zh/docs/kitex/tutorials/service-governance/access_control/)。



### 退出信号 - WithExitSignal

```go
func WithExitSignal(f func() <-chan error) Option 
```

设置服务端退出信号，Kitex 有内置实现，如果需要一些定制可以自行实现。



### 端口重用 - WithReusePort

```go
func WithReusePort(reuse bool) Option
```

设置端口重用，即是否开启底层的 TCP 端口复用机制。



## 扩展 Option

### 服务发现 - WithRegistry

```go
func WithRegistry(r registry.Registry) Option
```

指定一个 Registry 进行服务发现的注册上报，用法详见[服务发现](/zh/docs/kitex/tutorials/service-governance/service_discovery/)。



### 链路监控 - WithTracer

```go
func WithTracer(c stats.Tracer) Option
```

额外添加一个 Tracer 进行链路监控，详见[链路跟踪-自定义 tracer](/zh/docs/kitex/tutorials/observability/tracing/)。



### 编解码 - WithCodec

```go
func WithCodec(c remote.Codec) Option
```

指定 Codec，用于需要自定义协议的场景，详见[编解码协议扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)。



### Payload 编解码 - WithPayloadCodec

```go
func WithPayloadCodec(c remote.PayloadCodec) Option
```

指定 PayloadCodec，详见[编解码协议扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)。



### 元信息处理 - WithMetaHandler

```go
func WithMetaHandler(h remote.MetaHandler) Option
```

添加一个元信息处理器，用于结合传输协议定制透传信息，如服务名、调用方法、机房、集群、env、TracerInfo，用法详见[元信息传递扩展](/zh/docs/kitex/tutorials/framework-exten/transmeta/)。



### IO Bound 扩展 - WithBoundHandler

```go
func WithBoundHandler(h remote.BoundHandler) Option
```

自定义 IO Bound，详见 [Transport Pipeline-Bound 扩展](/zh/docs/kitex/tutorials/framework-exten/trans_pipeline/)。



### 并发限制 - WithConcurrencyLimiter

```go
func WithConcurrencyLimiter(conLimit limiter.ConcurrencyLimiter) Option
```

设置服务端的连接数限制。



### QPS 限制 - WithQPSLimiter

```go
func WithQPSLimiter(qpsLimit limiter.RateLimiter) Option
```

设置服务端的 QPS 限制。



### 限流报告器 - WithLimitReporter

```go
func WithLimitReporter(r limiter.LimitReporter) Option
```

设置 LimitReporter，当发生 QPS 限流或连接数限流时，可以通过 LimitReporter 进行定制上报。



### 传输扩展 - WithTransHandlerFactory

```go
func WithTransHandlerFactory(f remote.ServerTransHandlerFactory) Option
```

自定义传输模块，详见[传输模块扩展](/zh/docs/kitex/tutorials/framework-exten/transport/)。



### 传输扩展 - WithTransServerFactory

```go
func WithTransServerFactory(f remote.TransServerFactory) Option
```

自定义传输模块，详见[传输模块扩展](/zh/docs/kitex/tutorials/framework-exten/transport/)。



### 诊断扩展 - WithDiagnosisService

```go
func WithDiagnosisService(ds diagnosis.Service) Option
```

添加一个自定义的 DiagnosisService，用来获取更多的诊断信息，详见[诊断模块扩展](/zh/docs/kitex/tutorials/framework-exten/diagnosis/)。
