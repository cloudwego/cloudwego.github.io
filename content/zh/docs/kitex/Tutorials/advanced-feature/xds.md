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
  - `HTTP route configuration` 内包含的配置，同样通过 VirtualService 来配置。

## 开启方式

开启的步骤分为两个部分：1. xDS 模块的初始化和 2. Kitex Client/Server 的 Option 配置。

### xDS 模块

调用 `xds.Init()` 便可开启对 xDS 模块的初始化，其中包括 `xdsResourceManager` - 负责 xDS 资源的管理，`xdsClient` - 负责与控制面进行交互。

#### Bootstrap

`xdsClient` 负责与控制面（例如 Istio）交互，以获得所需的 xDS 资源。在初始化时，需要读取环境变量用于构建 node 标识。所以，需要在 K8S 的容器配置文件 `spec.containers.env` 部分加入以下几个环境变量。

- `POD_NAMESPACE`: 当前 pod 所在的 namespace。
- `POD_NAME`: pod 名。
- `INSTANCE_IP`: pod 的 ip。

在需要使用 xDS 功能的容器配置中加入以下定义即可：

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

### Kitex 客户端

目前，我们仅在 Kitex 客户端提供 xDS 的支持。
想要使用支持 xds 的 Kitex 客户端，请在构造 Kitex Client 时将 `destService` 指定为目标服务的 URL，并添加一个选项 `WithXDSSuite`。

- 构造一个 `xds.ClientSuite`，需要包含用于服务路由的`RouteMiddleware`中间件和用于服务发现的 `Resolver`。将该 ClientSuite 传入`WithXDSSuite` option 中.

```
// import "github.com/cloudwego/kitex/pkg/xds"

client.WithXDSSuite(xds.ClientSuite{
	RouterMiddleware: xdssuite.NewXDSRouterMiddleware(),
	Resolver:         xdssuite.NewXDSResolver(),
}),
```

- 目标服务的 URL 格式应遵循 [Kubernetes](https://kubernetes.io/) 中的格式：

```
<service-name>.<namespace>.svc.cluster.local:<service-port>
<service-name>.<namespace>.svc:<service-port>
<service-name>.<namespace>:<service-port>
<service-name>:<service-port> // 访问同命名空间的服务.
```

#### 基于 tag 匹配的路由匹配

我们可以通过 Istio 中的 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 来定义流量路由配置。

下面的例子表示 tag 满足以下条件时请求会被路由到 `kitex-server` 的 `v1` 子集群:

- `stage` 精确匹配到 `canary`
- `userid` 前缀匹配到 `2100`
- `env` 正则匹配到 `[dev|sit]`

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

为了匹配 VirtualService 中定义的规则，我们可以使用`client.WithTag(key, val string)`或者`callopt.WithTag(key, val string)`来指定标签，这些标签将用于匹配规则。

- 比如：将 key 和 value 设置为“stage”和“canary”，以匹配 VirtualService 中定义的上述规则。

```
client.WithTag("stage", "canary")
callopt.WithTag("stage", "canary")
```

#### 基于 method 的路由匹配

同上，利用 Istio 中的 [VirtualService](https://istio.io/latest/docs/reference/config/networking/virtual-service/) 来定义流量路由配置。

下面的例子表示，对于 method 等于 SayHello 的请求，路由到 `kitex-server` 的 `v1` 子集群。 需要注意的是，在定义规则时需要包含 package name 和 service name，对应 thrift idl 内的 `namespace` 和 `service`。

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

## 示例

完整的客户端用法如下:

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

更详细的例子可以参考该仓库：[kitex-proxyless-example](https://github.com/cloudwego/kitex-examples/tree/main/proxyless).

## 当前版本的不足

### mTLS

目前不支持 mTLS。 请通过配置 PeerAuthentication 以禁用 mTLS。

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

### 有限的服务治理功能

当前版本仅支持客户端通过 xDS 进行服务发现、流量路由和超时配置。

xDS 所支持的其他服务治理功能，包括负载均衡、限流和重试等，将在未来补齐。

## 依赖

Kitex >= v0.4.0
