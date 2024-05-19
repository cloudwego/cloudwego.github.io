---
title: "Kitex Release v0.9.0"
linkTitle: "Release v0.9.0"
projects: ["Kitex"]
date: 2024-03-04
description: >
---

v0.9.0 provides two important features for Thrift: Thrift Streaming and Multi-Service. Multiple RC versions have been released for internal usage to collect feedback, so the final release version is delayed.

Below are some important changes:

## **Introduction to Key Changes**

### Features

**1. Thrift Streaming**

The Thrift Streaming feature based on gRPC (HTTP2) has been officially released. Users can use Thrift to define their own Streaming requests. To maintain compatibility with IDL parsing, Kitex chooses to use annotation to define stream method. See [Thrift Streaming Usage](/docs/kitex/tutorials/basic-feature/protocol/transport-streaming/thrift_streaming/). This version also improves the monitoring and reporting of Streaming requests, which also applies to gRPC-Protobuf. Note that Thrift is mainly used for data serialization and does not use the Thrift message protocol.

Due to the complexity of the HTTP2 protocol, it has a certain impact on performance. We plan to release a self-developed Streaming protocol to improve performance in the future.

**2. Full Thrift MultiService support**

In the v0.8.0 version, Kitex supports gRPC multi-service to align gRPC, while Thrift previously provided [Combine Service](/docs/kitex/tutorials/code-gen/combine_service/) as 'Multi-Service' to ensure protocol compatibility. However, the use of this feature requires that the methods of different IDL services cannot be the same, and it is not real multi-Service.

In this version, Kitex provides real multi-service functionality at the protocol level based on TTHeader, supporting the registration of multiple Thrift IDL Services in one server, while also being compatible with old CombineServices. See [Multi-Service](/docs/kitex/tutorials/advanced-feature/multi_service/).

Note: Thrift Multi-Service requires the use of the TTHeader transport protocol.

**3. Frugal's experimental support for ARM64**

Supported the use of Frugal on ARM64 machines, temporarily supported by Fallback.

**4. Server level context timeout**

Added server.WithEnableContextTimeout supports adding timeout to context at the server level. And in the new version, Kitex will default pass the client-side timeout in the TTHeader to server-side. Usage please see [Timeout](/docs/kitex/tutorials/service-governance/timeout/).

Note: TTHeader transport protocol is required.

**5. KitexProtobuf protocol supports JSON generic call**

The new version also provides the JSON generic call for KitexProtobuf (TTHeader is required). Please see [JSONPbGeneric](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage/#jsonpbgeneric).

Note: TTHeader transport protocol is required.。

**6. Adding a new LoadBalance policy**

Adding a new LoadBalance method of Alias Method to reduce the time complexity of random weight LoadBalance algorithm. Specified by `client.WithLoadBalancer(loadbalance.NewWeightedRandomWithAliasMethodBalancer())`.

### Special Change

Kitex v0.9.0 requires Go version must >= 1.17, no longer compatible with Go <= v1.16 (stability requirement must upgrade golang.org/x/library, which introduced Go version limit)

## **Expand the ecosystem of Config Center**

> Note that it is not related to v0.9.0 version, only synchronize the state of community expansion

**Main configuration centers have finish integrated**

Kitex supports controlling the policies of Timeout, Retry, Circuit Breaker, Limiter through the remote configuration center. Thanks to the contributors of the CloudWeGo community, all the [main configuration centers](/docs/kitex/tutorials/service-governance/config-center/) have finish integrated. Usage please see [Config Center](/docs/kitex/tutorials/service-governance/config-center/).

## **Full Release Log**

### Feature:

1. [[#1208](https://github.com/cloudwego/kitex/pull/1208), [#1251](https://github.com/cloudwego/kitex/pull/1251), [#1230](https://github.com/cloudwego/kitex/pull/1230), [#1226](https://github.com/cloudwego/kitex/pull/1226)] feat: support thrift streaming (replacing the protobuf payload of GRPC/HTTP2 with thrift binary)
2. [[#1217](https://github.com/cloudwego/kitex/pull/1217)] feat: support thrift and pb multi service
3. [[#1268](https://github.com/cloudwego/kitex/pull/1268)] feat(thrift): support frugal fallback for arm
4. [[#951](https://github.com/cloudwego/kitex/pull/951)] feat(bizerr): support returning biz status error for json/map generic server
5. [[#1199](https://github.com/cloudwego/kitex/pull/1199)] feat(loadbalance): add loadbalancer using Alias Method (#1184)
6. [[#1244](https://github.com/cloudwego/kitex/pull/1244)] feat(timeout): add option server.WithEnableContextTimeout to enable server timeout
7. [[#1228](https://github.com/cloudwego/kitex/pull/1228)] feat(streaming): Adding Recv/End events to streaming requests to improve trace information
8. [[#1062](https://github.com/cloudwego/kitex/pull/1062)] feat(generic): supports JSON and Map generic call for the KitexProtobuf protocol.
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
