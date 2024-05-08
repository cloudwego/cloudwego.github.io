---
title: "Kitex Release v0.9.0"
linkTitle: "Release v0.9.0"
projects: ["Kitex"]
date: 2024-03-04
description: >
---

v0.9.0 针对 Thrift 提供了两个重要的功能：Thrift Streaming 和 Multi-Service，发布多个 RC 版本在内部试点收集反馈，所以正式版本姗姗来迟。

下面就重要变更做一些介绍：

## **重要变更介绍**

### 功能

**1. Thrift Streaming**

基于 gRPC(HTTP2) 的 Thrift Streaming 功能正式 Release，用户可以使用 Thrift IDL 定义自己的 Streaming 请求，为保持 IDL 解析的兼容性，Kitex 的 Streaming 方法的定义通过注解的方式，使用方式见 [Thrift Streaming Usage](/zh/docs/kitex/tutorials/basic-feature/protocol/transport-streaming/thrift_streaming/)。本版本也对 Streaming 请求的监控上报做了改进，同样适用于 gRPC-Protobuf。注意，Thrift 主要用于结构体序列化，并没有使用 Thrift 消息协议。

由于 HTTP2 协议的复杂性对性能有一定有影响，后续计划发布自研 Streaming 协议提升性能。

**2. 完整的 Thrift MultiService 支持**

在 v0.8.0 版本中，Kitex 对 gRPC 对齐了多 Service 的能力，而 Thrift 多 Service 之前为保证协议的兼容性提供了 [Combine Service](/zh/docs/kitex/tutorials/code-gen/combine_service/) 支持，但该功能的使用要求不同 IDL Service 的方法不能相同，并不是真正的多 Service。本次版本中 Kitex 基于 TTHeader 提供了协议层面真正的多 Service 功能，支持在一个 Server 里注册多个 Thrift IDL Service，同时兼容旧的 CombineService。使用方式见 [Multi-Service](/zh/docs/kitex/tutorials/advanced-feature/multi_service/)。

注：Thrift Multi-Service 需使用 TTHeader 传输协议。

**3. Frugal 对 ARM64 的实验性支持**

支持在 ARM64 机器上使用 Frugal，暂时是 Fallback 支持。

**4. 服务端超时**

增加 `server.WithEnableContextTimeout` option 支持在服务端给 context 增加 timeout，同时新版本里，Kitex 会默认透传 Client 超时配置给下游 Server。详见 [超时配置](/zh/docs/kitex/tutorials/service-governance/timeout/)。

注：需使用 TTHeader 传输协议。

**5. KitexProtobuf 协议支持 JSON 泛化调用**

与 Thrift 的 JSON 泛化调用使用方式一样，新版本对 KitexProtobuf 也做了同样的支持。见 [JSONPbGeneric](/zh/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage/#jsonpbgeneric)。

注：需使用 TTHeader 传输协议。

**6. 负载均衡新增策略**

新增 Alias Method 的负载均衡方法，来减少权重随机负载均衡算法的时间复杂度。通过 `client.WithLoadBalancer(loadbalance.NewWeightedRandomWithAliasMethodBalancer())` 指定。

### 特别的变更

v0.9.0 要求 Go 版本必须 >= 1.17，不再兼容 Go <= v1.16 (稳定性要求必须升级 golang.org/x/ 库引入的 Go 版本限制)

## **配置中心的扩展生态完善**

> 注意与 v0.9.0 版本无关，仅同步社区扩展的状态

**主流的配置中心对接均完成 Release**

Kitex 对超时、重试、熔断、限流的策略支持通过远程配置中心来控制，感谢社区的贡献者们，目前[主流的配置中心](/zh/docs/kitex/tutorials/service-governance/config-center/)均已完成扩展对接并 Release，详见 [配置中心](/zh/docs/kitex/tutorials/service-governance/config-center/)。

## **详细变更**

### Feature:

1. [[#1208](https://github.com/cloudwego/kitex/pull/1208), [#1251](https://github.com/cloudwego/kitex/pull/1251), [#1230](https://github.com/cloudwego/kitex/pull/1230), [#1226](https://github.com/cloudwego/kitex/pull/1226)] feat: support thrift streaming (replacing the protobuf payload of GRPC/HTTP2 with thrift binary)
2. [[#1217](https://github.com/cloudwego/kitex/pull/1217)] feat: support thrift and pb multi service
3. [[#1268](https://github.com/cloudwego/kitex/pull/1268)] feat(thrift): support frugal fallback for arm
4. [[#951](https://github.com/cloudwego/kitex/pull/951)] feat(bizerr): support returning biz status error for json/map generic server
5. [[#1199](https://github.com/cloudwego/kitex/pull/1199)] feat(loadbalance): add loadbalancer using Alias Method (#1184)
6. [[#1244](https://github.com/cloudwego/kitex/pull/1244)] feat(timeout): add option server.WithEnableContextTimeout to enable server timeout
7. [[#1228](https://github.com/cloudwego/kitex/pull/1228)] feat(streaming): Adding Recv/End events to streaming requests to improve trace information
8. [[#1062](https://github.com/cloudwego/kitex/pull/1062)] feat(generic): supports JSON and Map generic call for the KitexProtobuf protocol, [doc](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage/#jsonpbgeneric)
9. [[#1225](https://github.com/cloudwego/kitex/pull/1225)] feat(timeout): support timeout transparent transmission by default when using TTHeader transport protocol
10. [[#1211](https://github.com/cloudwego/kitex/pull/1211)] feat(hessian2): support nested struct for hessian2 customized Exception

### Optimize:

1. [[#1222](https://github.com/cloudwego/kitex/pull/1222)] optimize(frugal): enable frugal by default when the generated code is using slim template
2. [[#1209](https://github.com/cloudwego/kitex/pull/1209)] optimize: split encoder interface to customize meta and payload encoding implementation
3. [[#1206](https://github.com/cloudwego/kitex/pull/1206)] optimize(tool): add IsDir judge in readTemplate and add template register func
4. [[#1198](https://github.com/cloudwego/kitex/pull/1198)] optimize(kitexutil): add util api for getting real request and response
5. [[#1197](https://github.com/cloudwego/kitex/pull/1197)] optimize(kitexutil): add GetCallerIP util method in kitexutil to fetch Caller IP
6. [[#1195](https://github.com/cloudwego/kitex/pull/1195)] optimize(error): more specific instruction when panic in server handler
7. [[#1235](https://github.com/cloudwego/kitex/pull/1235)] optimize(tool): add IDLName field in PackageInfo for cwgo tool rendering
8. [[#1238](https://github.com/cloudwego/kitex/pull/1238)] optimize(bizerr): support biz status error for streaming mode

### Fix:

1. [[#1236](https://github.com/cloudwego/kitex/pull/1236)] fix(hessian2): correct code-ref behavior when thrift file is not in project dir
2. [[#1234](https://github.com/cloudwego/kitex/pull/1234)] fix(hessian2): still perform replacement on handler.go when -service is not specified for hessian2
3. [[#1232](https://github.com/cloudwego/kitex/pull/1232)] fix(gRPC): append "h2" to next proto in gRPC tlsConfig to enable protocol negotiation in TLS
4. [[#1215](https://github.com/cloudwego/kitex/pull/1215)] fix: bugfix for hessian2 tpl codegen
5. [[#1203](https://github.com/cloudwego/kitex/pull/1203), [#1205](https://github.com/cloudwego/kitex/pull/1205)] fix: fix the issue where disabling rpcinfo reuse on the server side does not take effect
6. [[#1227](https://github.com/cloudwego/kitex/pull/1227)] fix: idl-ref overwritten when using hessian2
7. [[#1194](https://github.com/cloudwego/kitex/pull/1194)] fix(retry): always set RespOp && preventive panic to avoid dead loop

### Chore & Tests

1. [[#1273](https://github.com/cloudwego/kitex/pull/1273)] chore: upgrade netpoll to v0.6.0
2. [[#1263](https://github.com/cloudwego/kitex/pull/1263)] chore: update sonic to v1.11.1
3. [[#1255](https://github.com/cloudwego/kitex/pull/1255)] chore: upgrade netpoll to v0.6.0 pre-release version
4. [[#1252](https://github.com/cloudwego/kitex/pull/1252)] chore: upgrade golang.org/x/net
5. [[#1254](https://github.com/cloudwego/kitex/pull/1254)] chore: upgrade sonic to v1.11.0 to support go1.22
6. [[#1231](https://github.com/cloudwego/kitex/pull/1231)] chore: frugal support go1.22
7. [[#1220](https://github.com/cloudwego/kitex/pull/1220)] test: correct the cachekey in the benchmark test of balancer
8. [[#1196](https://github.com/cloudwego/kitex/pull/1196)] test: add just biz handler message error

---

**Thanks a lot to those community contributors who submit some pull requests or share your ideas for this version:**
@DMwangnima @jizhuozhi @NX-Official @jieqiboh @Lvnszn @Skyenought
