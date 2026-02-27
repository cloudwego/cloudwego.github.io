---
title: "xDS Support"
date: 2022-08-26
weight: 8
keywords: ["Kitex", "xDS", "Proxyless", "Istio"]
description: Kitex supports the xDS protocol and runs in Proxyless mode, managed by the service mesh in unify.
---

[xDS](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol) is a set of discovery services, with the full name of "X Discovery Service", in which "X" refers to different type of discovery services, including LDS (Listener), RDS (RouteConfiguration), CDS (Cluster), and EDS (Endpoint/ClusterLoadAssignment), etc.
xDS API enables the date-plane to communicate with the control plane (i.e. Istio) and perform discovery of dynamic service configuration resource.

Kitex supports xDS API via the extension of [kitex-contrib/xds](https://github.com/kitex-contrib/xds), which enables Kitex to perform in Proxyless mode. For more details of the design, please refer to the [proposal](https://github.com/cloudwego/kitex/issues/461).

## Feature

- Service Discovery
- Traffic Route: only support `exact` match for `method` and support `exact` `prefix` `regex` match for `header`.
  - [HTTP route configuration](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing#arch-overview-http-routing): configure via [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/).
  - [ThriftProxy](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/thrift_proxy/v3/thrift_proxy.proto): configure via patching [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/).
- Timeout:
  - Configuration inside `HTTP route configuration`: configure via VirtualService.
- Retry:
  - Configuration inside [RetryPolicy](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#envoy-v3-api-msg-config-route-v3-retrypolicy), configure via [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/).
- Rate Limit:
  - Configuration inside [LocalRateLimitFilter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter), configure via [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) .
- Circuit Breaker:
  - Configuration inside [OutlierDetection](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto), configure via [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/).

## Usage

There are two steps for enabling xDS for Kitex applications: 1. xDS module initialization and 2. Kitex Client/Server Option configuration.

### xDS module

To enable xDS mode in Kitex, we should invoke `xds.Init()` to initialize the xds module, including the `xdsResourceManager` and `xdsClient`.

#### Bootstrap

The `xdsClient` is responsible for the interaction with the xDS Server (i.e. Istio). It needs some environment variables for initialization, which need to be set inside the `spec.containers.env` of the Kubernetes Manifest file in YAML format.

- `POD_NAMESPACE`: the namespace of the current service.
- `POD_NAME`: the name of this pod.
- `INSTANCE_IP`: the ip of this pod.
- `KITEX_XDS_METAS`: the metadata of this connection to Istiod, which is used to identify the pod.

Add the following part to the definition of your container that uses xDS-enabled Kitex client.

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

### Client-side

To use a xds-enabled Kitex client, you should specify `destService` using the URL of your target service and add one option `xdssuite.NewClientOption()`.

```go
// "github.com/kitex-contrib/xds/xdssuite"
xdssuite.NewClientOption()
```

- The URL of the target service should be in the format, which follows the format in [Kubernetes](https://kubernetes.io/):

```
<service-name>.<namespace>.svc.cluster.local:<service-port>
<service-name>.<namespace>.svc:<service-port>
<service-name>.<namespace>:<service-port>
<service-name>:<service-port> // access the <service-name> in same namespace.
```

### Server-side

The server-side add the option with `xdssuite.NewLimiter()` to enable limit traffic policy.

#### Traffic route based on Tag Match

We can define traffic route configuration via [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) in Istio.

The following example indicates that when the tag meets one of the conditions in the header, the request will be routed to the `v1` subcluster of `kitex-server`.

- `stage` exact match `canary`
- `userid` prefix match `2100`
- `env` regex match `[dev|sit]`

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

To match the rule defined in VirtualService, we can use `client.WithTag(key, val string)` or `callopt.WithTag(key, val string)`to specify the tags, which will be used to match the rules.

- Set key and value to be "stage" and "canary" to match the above rule defined in VirtualService.

```go
client.WithTag("stage", "canary")
callopt.WithTag("stage", "canary")
```

#### Traffic route based on Method Match

Same as above, using [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) in Istio to define traffic routing configuration.

The example below shows that requests with method equal to SayHello are routed to the `v1` subcluster of `kitex-server`. It should be noted that when defining rules, you need to include package name and service name, corresponding to `namespace` and `service` in thrift idl.

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

#### Circuit Breaker
Kitex supports the circuit breaker on service and instance dimension, default is for instance, you can use `xdssuite.WithServiceCircuitBreak(true)` to switch the circuit breaker.

The following example shows how to configure the circuit breaker on the client side. The configuration is as follows:
- `spec.configPatches[0].match.cluster.service`: the service name of the target service, should obey the specification of the FQDN.
- `failure_percentage_threshold`: the threshold of the failure rate, when the failure rate exceeds this value, the circuit breaker will be triggered.
- `failure_percentage_request_volume`: the number of requests that need to be collected to calculate the failure rate.
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

#### Retry
We can define retry policy configuration via [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/).

The following example shows how to configure the retry policy on the client side. The configuration is as follows:
- `spec.configPatches[0].match.routeConfiguration.name`: the service name of the target service, should obey the specification of the FQDN.
- `retryPolicy.numRetries`: the number of retries.
- `retryPolicy.perTryTimeout`: the timeout of each retry.
- `retryPolicy.retryBackOff.baseInterval`: the base interval of the retry.
- `retryPolicy.retryBackOff.maxInterval`: the maximum interval of the retry.
- `retryPolicy.retriableHeaders`: as the differences between xDS and Kitex configuration, use the `kitexRetryErrorRate` and `kitexRetryMethods` to specify the `errorRate` and `retryMethods` to match the specific methods that required to implement the retry strategy, use commas to separate multiple methods. It is recommended that the retry strategy is only configured for idempotent methods.
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

#### Limit
We can define rate limit configuration via [EnvoyFilter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/).

The following example shows how to configure the limit policy on the server side. The configuration is as follows:
- `tokens_per_fill`: the qps limit, as the kitex will fill tokens into the bucket every 100ms, so the uint tokens is tokens_per_fill / 10, should set the number which is multiples of 10. 
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

## Example

The usage of client is as follows:

```go
import (
	"github.com/cloudwego/kitex/client"
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
The usage of server is as follows:
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

Detailed examples can be found here [kitex-proxyless-example](https://github.com/cloudwego/kitex-examples/tree/main/proxyless).

## Limitation

### mTLS

mTLS is not supported for now. Please disable mTLS via configuring PeerAuthentication.

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

### The limited traffic policy 
The Loadbalancer dynamic configuration is not supported for now.

## Dependencies

- server discovery, route, timeout supported in Kitex >= v0.4.0 [xDS](https://github.com/kitex-contrib/xds) >= 0.2.0 
- limit, retry, circuitbreak supported in Kitex >= v0.4.0 [xDS](https://github.com/kitex-contrib/xds) >= 0.4.1 
