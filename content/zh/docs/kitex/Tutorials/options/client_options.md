---
title: "Client Option"
date: 2022-06-20
weight: 1
keywords: ["Kitex", "Client", "Option"]
description: Kitex Client Option 使用说明。
---

## 用法

在创建客户端时，带上 Option 参数即可：

```go
client, err := echo.NewClient("targetService", client.WithXXXX...)
```



## 基础 Option

### 基本信息 - WithClientBasicInfo

```go
func WithClientBasicInfo(ebi *rpcinfo.EndpointBasicInfo) Option
```

设置 Client 侧的 Service 信息，包括 ServiceName 和自定义的 Tags，自定义 Tag 如 Cluster、IDC、Env，无需设置 EndpointBasicInfo 的 Method 字段。强烈建议配置该 Option。



### IP 端口 - WithHostPorts

```go
func WithHostPorts(hostports ...string) Option
```

手动指定一个或者多个目标端，会覆盖掉服务发现的结果，直接直连访问。



### 传输协议 - WithTransportProtocol

```go
func WithTransportProtocol(tp transport.Protocol) Option
```

设置传输协议，在消息协议上配置传输协议。Thrift/KitexProtobuf 可以配置 TTHeader、TTHeaderFramed、Framed，另外，Framed 严格意义上并不算传输协议，为区分用于 PurePayload 将其也作为传输协议配置，PurePayload 表示没有传输协议；如果配置为 GRPC 表示使用 GRPC 协议，GRPC 的传输协议是 HTTP2，但为便于用户理解，直接作为传输协议的配置，注意配置 GRPC 需要用 Protobuf 定义 Service，如果没有配置 GRPC，默认使用的是 KitexProtobuf 协议。

未设置 WithTransportProtocol 时，默认协议为 PurePayload。


### 短连接 - WithShortConnection

```go
func WithShortConnection() Option
```

是否启用短连接，详见[连接类型-短连接](/zh/docs/kitex/tutorials/basic-feature/connection_type/)。



### 长连接 - WithLongConnection

```go
func WithLongConnection(cfg connpool.IdleConfig) Option
```

是否启用长连接，详见[连接类型-长连接](/zh/docs/kitex/tutorials/basic-feature/connection_type/)。



### 多路复用 - WithMuxConnection

```go
func WithMuxConnection(connNum int) Option
```

是否启用连接多路复用，需要同时在服务端也开启设置，详见[连接类型-连接多路复用](/zh/docs/kitex/tutorials/basic-feature/connection_type/)。



### 中间件扩展 - WithMiddleware

```go
func WithMiddleware(mw endpoint.Middleware) Option
```

添加一个中间件，在 Service 熔断和超时中间件之后执行。用法参考 [Middleware 扩展](/zh/docs/kitex/tutorials/framework-exten/middleware/)。



### 中间件扩展 - WithInstanceMW

```go
func WithInstanceMW(mw endpoint.Middleware) Option
```

用于添加一个中间件，在服务发现和负载均衡之后执行，如果有实例熔断器，会在实例熔断器后执行（如果使用了 Proxy 则不会调用到，如 Mesh 模式下）。用法参考 [Middleware 扩展](/zh/docs/kitex/tutorials/framework-exten/middleware/)。



### 中间件扩展 - WithMiddlewareBuilder

```go
func WithMiddlewareBuilder(mwb endpoint.MiddlewareBuilder) Option
```

用于创建并添加中间件，可以根据 ctx 判断场景并创建中间件。 ctx 是框架传入的包含运行时配置信息的上下文（非 RPC 调用的上下文），以便中间件初始化时能利用框架的信息。



### 熔断器 - WithCircuitBreaker

```go
func WithCircuitBreaker(s *circuitbreak.CBSuite) Option
```

设置熔断，默认包含 service 熔断和 instance 熔断，使用示例：

```Go
var opts []client.Option

cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)
opts = append(opts, client.WithCloseCallbacks(func() error {
   // 熔断器的 Close 方法注入到 CloseCallbacks，用于在client销毁时，释放熔断相关资源
   return cs.cbs.Close()
}))
opts = append(opts, client.WithCircuitBreaker(cbs))


// 动态更新熔断配置
cbs.UpdateServiceCBConfig(key, config)
cbs.UpdateInstanceCBConfig(key, config)
```

关于熔断说明，详见[熔断器](/zh/docs/kitex/tutorials/service-governance/circuitbreaker/)。

### 超时重试 - WithFailureRetry

```go
func WithFailureRetry(p *retry.FailurePolicy) Option
```

设置超时重试规则，可以配置最大重试次数，累计最大耗时，重试熔断错误率阈值，DDL 中止和退避策略等，详见[请求重试](/zh/docs/kitex/tutorials/service-governance/retry/)。



### 备份请求 - WithBackupRequest

```go
func WithBackupRequest(p *retry.BackupPolicy) Option
```

设置 Backup Request 的策略，可以配置请求次数、熔断中止、链路中止等，详见[请求重试](/zh/docs/kitex/tutorials/service-governance/retry/)。



### 超时设置 - WithRPCTimeout

```go
func WithRPCTimeout(d time.Duration) Option
```

进行 RPC 超时设置，详见[超时控制](/zh/docs/kitex/tutorials/service-governance/timeout/)。



### 超时设置 - WithConnectTimeout

```go
func WithConnectTimeout(d time.Duration) Option
```

设置连接超时，详见[超时控制](/zh/docs/kitex/tutorials/service-governance/timeout/)。



### 超时设置 - WithTimeoutProvider

```go
func WithTimeoutProvider(p rpcinfo.TimeoutProvider) Option
```

添加一个 TimeoutProvider 来整体设置 RPC 超时，连接超时等策略。若同时使用了 WithRPCTimeout 或 WithConnectTimeout，那么这里的设置会被覆盖。



### 指定服务 - WithDestService

```go
func WithDestService(svr string) Option
```

指定调用目标端的服务名称，在 `NewClient` 中，第一个 string 参数就封装了这个 Option ，服务发现等场景会用到该字段。



### 添加标签 - WithTag

```go
func WithTag(key, val string) Option 
```

为 Client 添加一些元信息，例如 idc，cluster 等，用于辅助服务发现等场景。



### 埋点粒度 - WithStatsLevel

```go
func WithStatsLevel(level stats.Level) Optiong
```

为 Client 设置埋点粒度，详见[埋点粒度](/zh/docs/kitex/tutorials/observability/tracing/)。



### gRPC 相关配置

> 这类设置只对传输协议使用 gRPC 的场景生效，对 gRPC 传输进行一些参数调整。

#### WithGRPCConnPoolSize

```go
func WithGRPCConnPoolSize(s uint32) Option
```

设置 gRPC 的连接池大小。只对传输协议使用 gRPC 的场景生效。



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



#### WithGRPCMaxHeaderListSize

```go
func WithGRPCMaxHeaderListSize(s uint32) Option
```

设置 gRPC MaxHeaderListSize 参数，该参数决定了每次调用允许发送的header的最大条数。该设置只对传输协议使用 gRPC 的场景生效。



#### WithGRPCKeepaliveParams

```go
func WithGRPCKeepaliveParams(kp grpc.ClientKeepalive) Option
```

设置 gRPC 客户端 Keepalive 的各项参数。该设置只对传输协议使用 gRPC 的场景生效。

#### WithGRPCTLSConfig
```go
func WithGRPCTLSConfig(tlsConfig *tls.Config) Option
```

设置 gRPC 客户端的 TLS 配置。 该设置只对传输协议使用 gRPC 的场景生效。


## 高级 Option

### 配套扩展 - WithSuite

```go
func WithSuite(suite Suite) Option
```

设置一套特定配置，可根据场景进行定制，在 Suite 中配置多个 Option 和 Middleware 的组合和封装，详见 [ Suite 扩展](/zh/docs/kitex/tutorials/framework-exten/suite/)。



### 代理 - WithProxy

```go
func WithProxy(p proxy.ForwardProxy) Option
```

用于代理场景（如 Mesh Egress）做一些配置处理、返回代理地址，配置 proxy.ForwardProxy 后，框架不会执行服务发现、熔断、InstanceMWs。



### 重试 - WithRetryContainer

```go
func WithRetryContainer(rc *retry.Container) Option
```

手动设置 RetryContainer。用于结合熔断器进行重试策略。目前提供了 NewRetryContainer，NewRetryContainerWithCB 与 NewRetryContainerWithCBStat 三个快速实现方案。

- NewRetryContainerWithCB（建议）

​      若在已经配置熔断器的情况下，建议与 RetryContainer 复用熔断器，避免额外的统计，可以使用 NewRetryContainerWithCB ，例如下面的示例中，启用熔断器的场景，同时将熔断器透传给 RetryContainer：

```go
   cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)
   retryC := retry.NewRetryContainerWithCB(cbs.ServiceControl(), cbs.ServicePanel())
       var opts []client.Option
   opts = append(opts, client.WithRetryContainer(retryC))
    // enable service circuit breaker
   opts = append(opts, client.WithMiddleware(cbs.ServiceCBMW()))
```

- NewRetryContainer
  -  指定重试策略的默认 RetryContainer，其内置了一个熔断器

- NewRetryContainerWithCBStat 

​      若想对内置的熔断器进行自定义 ServiceCBKeyFunc 设置，则可以使用 NewRetryContainerWithCBStat 方法：

```go
   cbs := circuitbreak.NewCBSuite(YourGenServiceCBKeyFunc)
   retry.NewRetryContainerWithCBStat(cbs.ServiceControl(), cbs.ServicePanel())
```



### 预热 - WithWarmingUp

```go
func WithWarmingUp(wuo *warmup.ClientOption) Option 
```

设置预热。Kitex 支持了客户端预热，可以在创建客户端的时候预先初始化服务发现和连接池的相关组件，避免在首次请求时产生较大的延迟。

预热服务发现：

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    ResolverOption: &warmup.ResolverOption{
        Dests: []*rpcinfo.EndpointBasicInfo{
            &rpcinfo.EndpointBasicInfo{
                ServiceName: psm,
                Method: method,
                Tags: map[string]string{
                    "cluster": "default",
                },
            },
        },
    },
}))
```

预热连接池：

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    PoolOption: &warmup.PoolOption{
        ConnNum: 2,
    },
}))
```



### 设置关闭时回调 - WithCloseCallbacks

```go
func WithCloseCallbacks(callback func() error) Option
```

设置客户端 Close 时的回调函数。



### 异常处理器 - WithErrorHandler

```go
func WithErrorHandler(f func(error) error) Option
```

设置异常处理函数，该函数会在远程调用结束，中间件执行前被执行。



### 泛化调用 - WithGeneric

```go
func WithGeneric(g generic.Generic) Option
```

指定泛化调用类型，泛化需要结合泛化 Client/Server 使用。详见 [Kitex 泛化调用使用指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)。



### 权限控制 - WithACLRules

```go
func WithACLRules(rules ...acl.RejectFunc) Option
```

设置 ACL 权限访问控制，该模块会在服务发现之前执行，具体用法详见[自定义访问控制](/zh/docs/kitex/tutorials/service-governance/access_control/)。



### 连接池监控 - WithConnReporterEnabled

```go
func WithConnReporterEnabled() Option
```

设置连接池状态监控，详见[连接类型-状态监控](/zh/docs/kitex/tutorials/basic-feature/connection_type/)。



### 启用 HTTP 连接 - WithHTTPConnection

```go
func WithHTTPConnection() Option 
```

指定客户端使用 netpoll 提供的 http 连接进行 RPC 交互。



## 扩展 Option

### 链路监控 - WithTracer

```go
func WithTracer(c stats.Tracer) Option
```

额外添加一个 Tracer 进行链路监控，详见[链路跟踪-自定义 tracer](/zh/docs/kitex/tutorials/observability/tracing/)。



### 服务发现 - WithResolver

```go
func WithResolver(r discovery.Resolver) Option
```

指定一个 Resolver 进行服务发现，用法详见[服务发现](/zh/docs/kitex/tutorials/service-governance/service_discovery/)。



### HTTP 解析器 - WithHTTPResolver

```go
func WithHTTPResolver(r http.Resolver) Option
```

指定HTTP Resolver，详见[直连访问-自定义 DNS resolver](/zh/docs/kitex/tutorials/basic-feature/visit_directly/)。



### 负载均衡 - WithLoadBalancer

```go
func WithLoadBalancer(lb loadbalance.Loadbalancer, opts ...*lbcache.Options) Option 
```

设置负载均衡器，详见[负载均衡](/zh/docs/kitex/tutorials/service-governance/loadbalance/)。



### IO Bound 处理器 - WithBoundHandler

```go
func WithBoundHandler(h remote.BoundHandler) Option
```

自定义 IO Bound，详见 [Transport Pipeline-Bound 扩展](/zh/docs/kitex/tutorials/framework-exten/trans_pipeline/)。



### 编解码 - WithCodec

```go
func WithCodec(c remote.Codec) Option
```

指定 Codec，详见[编解码协议扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)



### Payload 编解码 - WithPayloadCodec

```go
func WithPayloadCodec(c remote.PayloadCodec) Option
```

指定 PayloadCodec，详见[编解码协议扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)



### 元信息处理 - WithMetaHandler

```go
func WithMetaHandler(h remote.MetaHandler) Option
```

添加一个元信息处理器，用法详见[元信息传递扩展](/zh/docs/kitex/tutorials/framework-exten/transmeta/)。



### 元信息处理 - WithFirstMetaHandler

```go
func WithFirstMetaHandler(h remote.MetaHandler) Option
```

在 MetaHandler 链的最前面添加一个元信息处理器，功能同 `WithMetaHandler` 类似。



### 传输设置 - WithTransHandlerFactory

```go
func WithTransHandlerFactory(f remote.ClientTransHandlerFactory) Option 
```

自定义传输模块，详见[传输模块扩展](/zh/docs/kitex/tutorials/framework-exten/transport/)。



### 诊断扩展 - WithDiagnosisService

```go
func WithDiagnosisService(ds diagnosis.Service) Option
```

添加一个自定义的 Diagnosis Service，用来获取更多的诊断信息，详见[诊断模块扩展](/zh/docs/kitex/tutorials/framework-exten/diagnosis/)。



### Dialer 扩展 - WithDialer

```go
func WithDialer(d remote.Dialer) Option
```

手动指定 Dialer。通常情况下 Dialer 在其他配置中已经进行了配套实现，一般情况下不建议使用。



### 连接池扩展 - WithConnPool

```go
func WithConnPool(pool remote.ConnPool) Option
```

手动设置连接池。通常情况下 ConnPool 在其他配置中已经进行了配套实现，一般情况下不建议使用。
