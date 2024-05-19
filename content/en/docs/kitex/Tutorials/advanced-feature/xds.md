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

## Usage

There are two steps for enabling xDS for Kitex applications: 1. xDS module initialization and 2. Kitex Client/Server Option configuration.

### xDS module

To enable xDS mode in Kitex, we should invoke `xds.Init()` to initialize the xds module, including the `xdsResourceManager` and `xdsClient`.

#### Bootstrap

The `xdsClient` is responsible for the interaction with the xDS Server (i.e. Istio). It needs some environment variables for initialization, which need to be set inside the `spec.containers.env` of the Kubernetes Manifest file in YAML format.

- `POD_NAMESPACE`: the namespace of the current service.
- `POD_NAME`: the name of this pod.
- `INSTANCE_IP`: the ip of this pod.

Add the following part to the definition of your container that uses xDS-enabled Kitex client.

```
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
```

### Client-side

For now, we only provide the support on the client-side.
To use a xds-enabled Kitex client, you should specify `destService` using the URL of your target service and add one option `WithXDSSuite`.

- Construct a `xds.ClientSuite` that includes `RouteMiddleware` and `Resolver`, and then pass it into the `WithXDSSuite` option.

```
// import "github.com/cloudwego/kitex/pkg/xds"

client.WithXDSSuite(xds.ClientSuite{
	RouterMiddleware: xdssuite.NewXDSRouterMiddleware(),
	Resolver:         xdssuite.NewXDSResolver(),
}),
```

- The URL of the target service should be in the format, which follows the format in [Kubernetes](https://kubernetes.io/):

```
<service-name>.<namespace>.svc.cluster.local:<service-port>
<service-name>.<namespace>.svc:<service-port>
<service-name>.<namespace>:<service-port>
<service-name>:<service-port> // access the <service-name> in same namespace.
```

#### Traffic route based on Tag Match

We can define traffic route configuration via [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) in Istio.

The following example indicates that when the tag meets one of the conditions in the header, the request will be routed to the `v1` subcluster of `kitex-server`.

- `stage` exact match `canary`
- `userid` prefix match `2100`
- `env` regex match `[dev|sit]`

```
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

```
client.WithTag("stage", "canary")
callopt.WithTag("stage", "canary")
```

#### Traffic route based on Method Match

Same as above, using [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) in Istio to define traffic routing configuration.

The example below shows that requests with method equal to SayHello are routed to the `v1` subcluster of `kitex-server`. It should be noted that when defining rules, you need to include package name and service name, corresponding to `namespace` and `service` in thrift idl.

- uri: `/${PackageName}.${ServiceName}/${MethodName}`

```
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

## Example

The usage is as follows:

```
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
		client.WithXDSSuite(xds2.ClientSuite{
			RouterMiddleware: xdssuite.NewXDSRouterMiddleware(),
			Resolver:         xdssuite.NewXDSResolver(),
		}),
	)

	req := &proxyless.HelloRequest{Message: "Hello!"}
	resp, err := c.cli.SayHello1(
		ctx,
		req,
	)
}
```

Detailed examples can be found here [kitex-proxyless-example](https://github.com/cloudwego/kitex-examples/tree/main/proxyless).

## Limitation

### mTLS

mTLS is not supported for now. Please disable mTLS via configuring PeerAuthentication.

```
apiVersion: "security.istio.io/v1beta1"
kind: "PeerAuthentication"
metadata:
  name: "default"
  namespace: {your_namespace}
spec:
  mtls:
    mode: DISABLE
```

### Limited support for Service Governance

Current version only support Service Discovery, Traffic route and Timeout Configuration via xDS on the client-side.

Other features supported via xDS, including Load Balancing, Rate Limit and Retry etc., will be added in the future.

## Dependencies

Kitex >= v0.4.0
