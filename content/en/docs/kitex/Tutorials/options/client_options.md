---
title: "Client Option"
date: 2022-06-20
weight: 1
keywords: ["Kitex", "Client", "Option"]
description: Kitex Client Option instructions.
---

## Usage

Add some options when creating a client：

```go
client, err := echo.NewClient("targetService", client.WithXXXX...)
```



## Basic Options

### WithClientBasicInfo

```go
func WithClientBasicInfo(ebi *rpcinfo.EndpointBasicInfo) Option
```

Set the service infos for client, including ServiceName and customized Tags, customized Tag such as Cluster, IDC, Env, and it is no need to set Method field of EndpointBasicInfo.
It is strongly recommended to configure this option.



### WithHostPorts

```go
func WithHostPorts(hostports ...string) Option
```

Manually specifie one or more targets overrides the results discovered by the service and directly connects to the access.



### WithTransportProtocol

```go
func WithTransportProtocol(tp transport.Protocol) Option
```

Set the transport protocol, configure the transport protocol on the message protocol. Thrift/KitexProtobuf can configure TTHeader, TTHeaderFramed, and Framed. In addition, Framed is not strictly a transmission protocol. In order to distinguish it for PurePayload, it is also configured as a transmission protocol. PurePayload means that there is no transmission protocol; if it is configured as GRPC, it means that the GRPC protocol is used. , the transmission protocol of GRPC is HTTP2, but for the convenience of users' understanding, it is directly used as the configuration of the transmission protocol. Note that configuring GRPC needs to use Protobuf to define Service. If GRPC is not configured, KitexProtobuf protocol is used by default.

When WithTransportProtocol is not set, the default protocol is PurePayload

### WithShortConnection

```go
func WithShortConnection() Option
```

Enable short connections. [More](/docs/kitex/tutorials/basic-feature/connection_type/)



### WithLongConnection

```go
func WithLongConnection(cfg connpool.IdleConfig) Option
```

Enable long connections. [More](/docs/kitex/tutorials/basic-feature/connection_type/)



### WithMuxConnection

```go
func WithMuxConnection(connNum int) Option
```

Enable mux connections. Server side also need to turn on this option, or it won't work. [More](/docs/kitex/tutorials/basic-feature/connection_type/)



### WithMiddleware

```go
func WithMiddleware(mw endpoint.Middleware) Option
```

Add a middleware that executes after service level circuit breaker and timeout middleware.  [More](/docs/kitex/tutorials/framework-exten/middleware/)



### WithInstanceMW

```go
func WithInstanceMW(mw endpoint.Middleware) Option
```

Add a middleware that executes after service discovery and load balance. If instance level circuit breaker exists, then it will execute after that. (If proxy is used, it will not be called, such as mesh mode). [More](/docs/kitex/tutorials/framework-exten/middleware/)



### WithMiddlewareBuilder

```go
func WithMiddlewareBuilder(mwb endpoint.MiddlewareBuilder) Option
```

Add middleware depends on the context passed in by the framework that contains runtime configuration information (the context of non-RPC calls), so that the middleware can take advantage of the framework's information when initializing.



### WithCircuitBreaker

```go
func WithCircuitBreaker(s *circuitbreak.CBSuite) Option
```

Set the circuit breaker, which includes service circuit break and instance circuit break by default, using the example:

```Go
var opts []client.Option

cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)
opts = append(opts, client.WithCloseCallbacks(func() error {
   // Circuit Breaker Close method is injected into CloseCallbacks to release circuit breaker related resources when the client is destroyed
   return cs.cbs.Close()
}))
opts = append(opts, client.WithCircuitBreaker(cbs))


// Dynamically updates the circuit breaker configuration
cbs.UpdateServiceCBConfig(key, config)
cbs.UpdateInstanceCBConfig(key, config)
```

For more details, please visit [Circuit Breaker](/docs/kitex/tutorials/service-governance/circuitbreaker/).

### WithFailureRetry

```go
func WithFailureRetry(p *retry.FailurePolicy) Option
```

Set timeout retry rules, you can configure the maximum number of retries, the maximum time spent accumulated, the threshold of the retry circuit fault rate, the DDL abort and backoff policy. [More](/docs/kitex/tutorials/service-governance/retry/)



### WithBackupRequest

```go
func WithBackupRequest(p *retry.BackupPolicy) Option
```

Set the policy for Backup Request, which can configure the number of requests, circuit breaker abort, and link abort. [More](/docs/kitex/tutorials/service-governance/retry/)



### WithRPCTimeout

```go
func WithRPCTimeout(d time.Duration) Option
```

Set RPC timeout. [More](/docs/kitex/tutorials/service-governance/timeout/)



### WithConnectTimeout

```go
func WithConnectTimeout(d time.Duration) Option
```

Set connect timeout. [More](/docs/kitex/tutorials/service-governance/timeout/)



### WithTimeoutProvider

```go
func WithTimeoutProvider(p rpcinfo.TimeoutProvider) Option
```

Add a TimeoutProvider to set the RPC timeout, connection timeout, etc. policies as a whole. If You use Both `WithRPCTimeout` or `WithConnectTimeout`, the settings here will be overridden.



### WithDestService

```go
func WithDestService(svr string) Option
```

Specify the service name of the target side of the call.



### WithTag

```go
func WithTag(key, val string) Option 
```

Add some meta information to the client, such as idc, cluster, etc., for scenarios such as auxiliary service discovery.



### WithStatsLevel

```go
func WithStatsLevel(level stats.Level) Optiong
```

Set the stats level for client. [More](/docs/kitex/tutorials/observability/tracing/)



### gRPC Options

> These options only works for scenarios where the transport protocol uses gRPC, with some parameter adjustments to gRPC transfers.

#### WithGRPCConnPoolSize

```go
func WithGRPCConnPoolSize(s uint32) Option
```

WithGRPCConnPoolSize sets the value for the client connection pool size. In general, you should not adjust the size of the connection pool, otherwise it may cause performance degradation. You should adjust the size according to the actual situation.



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



#### WithGRPCMaxHeaderListSize

```go
func WithGRPCMaxHeaderListSize(s uint32) Option
```

WithGRPCMaxHeaderListSize returns a ServerOption that sets the max (uncompressed) size of header list that the server is prepared to accept. It corresponds to the MaxHeaderListSize ServerOption of gRPC.



#### WithGRPCKeepaliveParams

```go
func WithGRPCKeepaliveParams(kp grpc.ClientKeepalive) Option
```

WithGRPCKeepaliveParams returns a DialOption that specifies keepalive parameters for the client transport. It corresponds to the WithKeepaliveParams DialOption of gRPC.



#### WithGRPCTLSConfig
```go
func WithGRPCTLSConfig(tlsConfig *tls.Config) Option
```

WithGRPCTLSConfig sets the TLS config to the connection options for Kitex gRPC client.



## Advanced Options

### WithSuite

```go
func WithSuite(suite Suite) Option
```

Set up a specific configuration, customize according to the scene, configure multiple options and middlewares combinations and encapsulations in the Suite. [More](/docs/kitex/tutorials/framework-exten/suite/)



### WithProxy

```go
func WithProxy(p proxy.ForwardProxy) Option
```

For proxy scenarios (such as Mesh Egress), do some configuration processing, return proxy address, configure proxy. After ForwardProxy, the framework does not perform service discovery, circuit breakers, and InstanceMWs.



### WithRetryContainer

```go
func WithRetryContainer(rc *retry.Container) Option
```

Manually set up RetryContainer. Used to retry the strategy in combination with circuit breakers. At present, three rapid implementation schemes are available: NewRetryContainer, NewRetryContainerWithCB and NewRetryContainerWithCBStat.

- NewRetryContainerWithCB (recommended)

If you have already configured the circuit breaker, it is recommended to reuse the circuit breaker with RetryContainer to avoid additional statistics, you can use the NewRetryContainerWithCB, such as the example in the example below, enable the circuit breaker scenario, and at the same time pass the circuit breaker to RetryContainer:

```go
   cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)
   retryC := retry.NewRetryContainerWithCB(cbs.ServiceControl(), cbs.ServicePanel())
       var opts []client.Option
   opts = append(opts, client.WithRetryContainer(retryC))
    // enable service circuit breaker
   opts = append(opts, client.WithMiddleware(cbs.ServiceCBMW()))
```

- NewRetryContainer
  - Specifies the default RetryContainer for the retry policy, which has a built-in circuit breaker.
- NewRetryContainerWithCBStat 

To customize the built-in circuit breaker ServiceCBKeyFunc settings, you can use the NewRetryContainerWithCBStat method:

```go
   cbs := circuitbreak.NewCBSuite(YourGenServiceCBKeyFunc)
   retry.NewRetryContainerWithCBStat(cbs.ServiceControl(), cbs.ServicePanel())
```



### WithWarmingUp

```go
func WithWarmingUp(wuo *warmup.ClientOption) Option 
```

Set warming up option. Kitex supports client warm-up, which allows you to pre-initialize the relevant components of service discovery and connection pooling when creating the client, avoiding large delays on the first request.

Warm up service discovery:

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

Warm up connection pool:

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    PoolOption: &warmup.PoolOption{
        ConnNum: 2,
    },
}))
```



### WithCloseCallbacks

```go
func WithCloseCallbacks(callback func() error) Option
```

Set close callback function.



### WithErrorHandler

```go
func WithErrorHandler(f func(error) error) Option
```

Set the error handler function, which is executed after the server handler is executed and before the middleware executes.



### WithGeneric

```go
func WithGeneric(g generic.Generic) Option
```

Specifie the generalization call type, which needs to be used in conjunction with the generalization Client/Server. [More](/docs/kitex/tutorials/advanced-feature/generic-call/)



### WithACLRules

```go
func WithACLRules(rules ...acl.RejectFunc) Option
```

Set ACL permission access control, which is executed before service discovery. [More](/docs/kitex/tutorials/service-governance/access_control/)



### WithConnReporterEnabled

```go
func WithConnReporterEnabled() Option
```

Enable connection pool reporter. [More](/docs/kitex/tutorials/basic-feature/connection_type/)



### WithHTTPConnection

```go
func WithHTTPConnection() Option 
```

Specifie client use RPC over http.



## Extended Options

### WithTracer

```go
func WithTracer(c stats.Tracer) Option
```

Add an additional Tracer. [More](/docs/kitex/tutorials/observability/tracing/)



### WithResolver

```go
func WithResolver(r discovery.Resolver) Option
```

Specifie a resolver to do service discovery. [More](/docs/kitex/tutorials/service-governance/service_discovery/)



### WithHTTPResolver

```go
func WithHTTPResolver(r http.Resolver) Option
```

Set HTTP resolver. [More](/docs/kitex/tutorials/basic-feature/visit_directly/)



### WithLoadBalancer

```go
func WithLoadBalancer(lb loadbalance.Loadbalancer, opts ...*lbcache.Options) Option 
```

Set load balancer. [More](/docs/kitex/tutorials/service-governance/loadbalance/)



###  WithBoundHandler

```go
func WithBoundHandler(h remote.BoundHandler) Option
```

Add a new IO Bound handler. [More](/docs/kitex/tutorials/framework-exten/trans_pipeline/)



### WithCodec

```go
func WithCodec(c remote.Codec) Option
```

Specifie a Codec for scenarios that require custom protocol. [More](/docs/kitex/tutorials/framework-exten/codec/)



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



### WithFirstMetaHandler

```go
func WithFirstMetaHandler(h remote.MetaHandler) Option
```

Add a meta handler at the first position.



### WithTransHandlerFactory

```go
func WithTransHandlerFactory(f remote.ClientTransHandlerFactory) Option 
```

Set transHandlerFactory. [More](/docs/kitex/tutorials/framework-exten/transport/)



### WithDiagnosisService

```go
func WithDiagnosisService(ds diagnosis.Service) Option
```

Set diagnosis service. [More](/docs/kitex/tutorials/framework-exten/diagnosis/)



### WithDialer

```go
func WithDialer(d remote.Dialer) Option
```

Set dialer.



### WithConnPool

```go
func WithConnPool(pool remote.ConnPool) Option
```

Set connection pool.
