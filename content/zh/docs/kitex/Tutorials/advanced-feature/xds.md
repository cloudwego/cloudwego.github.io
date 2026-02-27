---
title: "xDS 支持"
date: 2022-08-26
weight: 8
keywords: ["Kitex", "xDS", "Proxyless", "Istio"]
description: Kitex 支持 xDS 协议进而以 Proxyless 模式运行，被服务网格统一纳管。
---

[xDS](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol) 是一组发现服务的总称，全称为 "X Discovery Service"，其中的 "X" 代指多种发现服务，包含 LDS (Listener), RDS (RouteConfiguration), CDS (Cluster), 和 EDS (Endpoint/ClusterLoadAssignment) 等。
数据面可以利用 xDS API 与控制平面（如 Istio）通信，完成配置信息的动态发现。

Kitex 通过外部扩展 [kitex-contrib/xds](https://github.com/kitex-contrib/xds) 的形式对 xDS API 进行了支持，可通过代码配置开启 xDS 模块，让 Kitex 服务以 Proxyless 的模式运行，被服务网格统一纳管。具体的设计方案参见 [proposal](https://github.com/cloudwego/kitex/issues/461)。

## 已支持的功能

- 服务发现
- 服务路由：当前支持`method` 的精确匹配和 `header` 的精确匹配、前缀匹配、正则匹配。
  - [HTTP route configuration](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing#arch-overview-http-routing): 通过 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 进行配置
  - [ThriftProxy](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/thrift_proxy/v3/thrift_proxy.proto): 通过 [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) 进行配置。
- 超时:
  - `HTTP route configuration` 内包含的配置，同样通过 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 来配置。
- 重试
  - [RetryPolicy](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#envoy-v3-api-msg-config-route-v3-retrypolicy)，通过 [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) 配置。
- 限流
  - [LocalRateLimitFilter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter)，通过 [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) 配置。
- 熔断
  - [OutlierDetection](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto)，通过 [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) 配置。

## 开启方式

开启的步骤分为两个部分：1. xDS 模块的初始化和 2. Kitex Client/Server 的 Option 配置。

### xDS 模块

调用 `xds.Init()` 便可开启对 xDS 模块的初始化，其中包括 `xdsResourceManager` - 负责 xDS 资源的管理，`xdsClient` - 负责与控制面进行交互。

#### Bootstrap

`xdsClient` 负责与控制面（例如 Istio）交互，以获得所需的 xDS 资源。在初始化时，需要读取环境变量用于构建 node 标识。所以，需要在 K8S 的容器配置文件 `spec.containers.env` 部分加入以下几个环境变量。

- `POD_NAMESPACE`: 当前 pod 所在的 namespace。
- `POD_NAME`: pod 名。
- `INSTANCE_IP`: pod 的 ip。
- `KITEX_XDS_METAS`: 和 istiod 建立链接的元信息

在需要使用 xDS 功能的容器配置中加入以下定义即可：

```yaml
- name: POD_NAMESPACE
valueFrom:
  fieldRef:
    fieldPath: metadata.namespace
- name: POD_NAME
valueFrom:
  fieldRef:
    fieldPath: metadata.name
- name: INSTANCE_IP
valueFrom:
  fieldRef:
    fieldPath: status.podIP
- name: KITEX_XDS_METAS
  value: '{"CLUSTER_ID":"Kubernetes","DNS_AUTO_ALLOCATE":"true","DNS_CAPTURE":"true","INSTANCE_IPS":"$(INSTANCE_IP)","ISTIO_VERSION":"1.13.5","NAMESPACE":"$(POD_NAMESPACE)"}'
```

### Kitex 

目前，我们在 Kitex 客户端提供了服务发现、服务路由、超时、重试以及熔断的功能，Kitex 服务端提供了限流的功能。
想要使用支持 xds 的 Kitex 客户端，请在构造 Kitex Client 时将 `destService` 指定为目标服务的 URL，并添加一个选项 `xdssuite.NewClientOption`，该函数中包含用于服务路由的`RouteMiddleware`中间件和用于服务发现的 `Resolver` 以及各种治理策略的插件。

```go
//  "github.com/kitex-contrib/xds/xdssuite"


xdssuite.NewClientOption()
```

- 目标服务的 URL 格式应遵循 [Kubernetes](https://kubernetes.io/) 中的格式：

```
<service-name>.<namespace>.svc.cluster.local:<service-port>
<service-name>.<namespace>.svc:<service-port>
<service-name>.<namespace>:<service-port>
<service-name>:<service-port> // 访问同命名空间的服务.
```

服务端的代码添加限流插件 `xdssuite.NewLimiter()` 即可。

#### 基于 tag 匹配的路由匹配

我们可以通过 Istio 中的 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 来定义流量路由配置。

下面的例子表示 tag 满足以下条件时请求会被路由到 `kitex-server` 的 `v1` 子集群:

- `stage` 精确匹配到 `canary`
- `userid` 前缀匹配到 `2100`
- `env` 正则匹配到 `[dev|sit]`

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: kitex-server
spec:
  hosts:
    - kitex-server
  http:
  - name: "route-based-on-tags"
    match:
      - headers:
          stage:
            exact: "canary"
      - headers:
          userid:
            prefix: "2100"
      - headers:
          env:
            regex: "[dev|sit]"
    route:
    - destination:
        host: kitex-server
        subset: v1
      weight: 100
    timeout: 0.5s
```

为了匹配 VirtualService 中定义的规则，我们可以使用`client.WithTag(key, val string)`或者`callopt.WithTag(key, val string)`来指定标签，这些标签将用于匹配规则。

- 比如：将 key 和 value 设置为“stage”和“canary”，以匹配 VirtualService 中定义的上述规则。

```go
client.WithTag("stage", "canary")
callopt.WithTag("stage", "canary")
```

#### 基于 method 的路由匹配

同上，利用 Istio 中的 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 来定义流量路由配置。

下面的例子表示，对于 method 等于 SayHello 的请求，路由到 `kitex-server` 的 `v1` 子集群。 需要注意的是，在定义规则时需要包含 package name 和 service name，对应 thrift idl 内的 `namespace` 和 `service`。

- uri: `/${PackageName}.${ServiceName}/${MethodName}`

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: kitex-server
spec:
  hosts:
    - kitex-server
  http:
  - name: "route-based-on-path"
    match:
      - uri:
          # /${PackageName}.${ServiceName}/${MethodName}
          exact: /proxyless.GreetService/SayHello
    route:
    - destination:
        host: kitex-server
        subset: v2
      weight: 100
    timeout: 0.5s
```

#### 熔断
  Kitex 支持服务级别和实例级别的熔断，xDS 模块默认使用实例级别熔断，如果要切换到服务级别使用 `xdssuite.WithServiceCircuitBreak(true)`方法进行切换。

下面的例子表示对 default 命名空间下, 带有 `app.kubernetes.io/name: kitex-client` 标签的 pod 中访问 hello 的 client 生效的熔断配置，现在只支持针对服务、客户端的配置，不支持以方法的维度进行熔断，参数介绍：
- `spec.configPatches[0].match.cluster.service`：表示访问的服务，需要遵循 Kubernetes 的 FQDN 格式。
- `failure_percentage_threshold`：触发熔断阈值，当错误率达到该值时进行熔断。
- `failure_percentage_request_volume`：触发熔断的最小请求量，当总请求量小于该值时不会触发熔断。
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: circuitbreak-client
  namespace: default
spec:
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: hello.default.svc.cluster.local
    patch:
      operation: MERGE
      value:
        outlier_detection:
          failure_percentage_threshold: 10
          failure_percentage_request_volume: 100
  workloadSelector:
    labels:
      # the label of the client pod.
      app.kubernetes.io/name: kitex-client
```

#### 重试
Kitex 重试的规则比较复杂，参考：https://www.cloudwego.io/zh/docs/kitex/tutorials/service-governance/retry/。这里先简单介绍下具体的配置参数：
- max_retry_times: 重试次数
- max_duration_ms: 最大超时时间，如果请求耗时超过这个时间不会进行重试，以免整体耗时过大
- error_rate：错误率，如果错误率超过该值，不再进行重试，在错误率过大的情况下进行重试没有实际意义，而且还会扩大 QPS，对服务器造成更大的压力。取值范围为(0, 0.3]，如果不在该有效范围内使用默认值 0.1。
- backoff_policy: 重试间隔策略，支持类型为 fixed、random、none，cfg_items 根据实际类型配置 fix_ms、min_ms、max_ms等内容。
```yaml
{
    "enable": true,
    "failure_policy": {
        "retry_same_node": false,
        "stop_policy": {
            "max_retry_times": 2,
            "max_duration_ms": 300,
            "cb_policy": {
                "error_rate": 0.2
            }
        },
        "backoff_policy": {
            "backoff_type": "fixed",
            "cfg_items": {
                "fix_ms": 100
            }
        }
    }
}
```
Istio 的 VirtualService 支持配置重试规则，但是该规则配置相对比较简单，只支持重试次数以及重试超时时间，不建议生产使用，内容如下：
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: retry-client
  namespace: default
spec:
  hosts:
  - hello.prod.svc.cluster.local:21001
  http:
  - route:
    - destination:
        host: hello.prod.svc.cluster.local:21001
    retries:
      attempts: 1
      perTryTimeout: 2s
```
Envoy 自身 xDS 配置相对比较丰富，可以和 Kitex 的配置较好的搭配，参考：https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#envoy-v3-api-msg-config-route-v3-retrypolicy，可以通过 Envoyfilter 配置重试规则，这里说明下两者之间的映射关系：
- numRetries： 对应 max_retry_times。
- perTryTimeout：单个请求超时，乘以重试次数为 max_duration_ms。
- retryBackOff: 对应 backoff_policy，会根据 baseInterval 和 maxInterval 两者的大小关系自动设置 backoff_policy 的类型。
- retriableHeaders：由于两者配置存在一定的差异，这里使用 kitexRetryErrorRate  映射 Kitex 的 error_rate；kitexRetryMethods 匹配具体需要执行重试策略的方法，多个方法之间使用逗号隔开，建议只针对幂等方法配置重试策略。
- workloadSelector：针对生效的 pod 客户端，如果不填会对该命名空间下的客户端生效。
- routeConfiguration：name 对应需要生效的服务名称，需要遵循 FQDN 规则，如果不填则对所有的服务生效。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: retry-policy
  namespace: default
spec:
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_OUTBOUND
      routeConfiguration:
        name: hello.default.svc.cluster.local:21001
        vhost: 
          name: hello.default.svc.cluster.local:21001
    patch:
      operation: MERGE
      value:
        route:
          retryPolicy:
            numRetries: 3
            perTryTimeout: 100ms
            retryBackOff:
              baseInterval: 100ms
              maxInterval: 100ms
            retriableHeaders:
              - name: "kitexRetryErrorRate"
                stringMatch:
                  exact: "0.29"
              - name: "kitexRetryMethods"
                stringMatch:
                  exact: "Echo,Greet"
  workloadSelector:
    labels:
      # the label of the service pod.
      app.kubernetes.io/name: kitex-client
```

#### 限流
限流需要使用 Envoyfilter 来配置，xDS 配置参考: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter，Kitex 限流器参考 https://www.cloudwego.io/zh/docs/kitex/tutorials/service-governance/limiting。其中 tokens_per_fill 字段表示每秒最大的请求数量，超出的请求将会被拒绝。Kitex 的 QPS 限流算法采用了令牌桶算法，每隔 100ms 往令牌桶添加 tokens_per_fill/10 的数量，所以建议该值的配置为 10 的整数。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-client
  namespace: default
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              # the qps limit
              tokens_per_fill: 100
  workloadSelector:
    labels:
      # the label of the server pod.
      app.kubernetes.io/name: kitex-server
```

## 示例

完整的客户端用法如下:

```go
import (
	"github.com/cloudwego/kitex/client"
	xds2 "github.com/cloudwego/kitex/pkg/xds"
	"github.com/kitex-contrib/xds"
	"github.com/kitex-contrib/xds/xdssuite"
	"github.com/cloudwego/kitex-proxyless-test/service/codec/thrift/kitex_gen/proxyless/greetservice"
)

func main() {
	// initialize xds module
	err := xds.Init()
	if err != nil {
		return
	}

	// initialize the client
	cli, err := greetservice.NewClient(
		destService,
		xdssuite.NewClientOption(),
	)

	req := &proxyless.HelloRequest{Message: "Hello!"}
	resp, err := c.cli.SayHello1(
		ctx,
		req,
	)
}
```
完整的服务端用法如下:
```go
package main

import (
        "log"
        "net"

        "github.com/cloudwego/kitex/pkg/klog"
        "github.com/cloudwego/kitex/server"
        xdsmanager "github.com/kitex-contrib/xds"
        "github.com/kitex-contrib/xds/xdssuite"
        echo "github.com/whalecold/kitex-demo/helloworld/kitex_gen/hello/echoservice"
)

func main() {
        if err := xdsmanager.Init(); err != nil {
                klog.Fatal(err)
        }
        addr, _ := net.ResolveTCPAddr("tcp", ":6789")
        svr := echo.NewServer(new(GreetServiceImplProto),
                server.WithServiceAddr(addr),
                xdssuite.NewLimiter(),
        )

        err := svr.Run()
        if err != nil {
                log.Println(err.Error())
        }
}
```

更详细的例子可以参考该仓库：[kitex-proxyless-example](https://github.com/cloudwego/kitex-examples/tree/main/proxyless).

## 当前版本的不足

### mTLS

目前不支持 mTLS。 请通过配置 PeerAuthentication 以禁用 mTLS。

```yaml
apiVersion: "security.istio.io/v1beta1"
kind: "PeerAuthentication"
metadata:
  name: "default"
  namespace: {your_namespace}
spec:
  mtls:
    mode: DISABLE
```

### 有限的治理能力 
暂时还不支持负载均衡配置动态下发


## 依赖

- 如只需使用服务发现、流量路由、超时，Kitex >= v0.4.0, [xDS](https://github.com/kitex-contrib/xds) >= 0.2.0

- 如需使用完整能力，包括熔断、限流、重试，Kitex >= v0.10.3, [xDS](https://github.com/kitex-contrib/xds) >= 0.4.1
