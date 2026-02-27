---
title: "Kitex v0.7.0 版本发布"
linkTitle: "Release v0.7.0"
projects: ["Kitex"]
date: 2023-08-14
description: >
---

## 重要变更介绍

### 功能

**1. gRPC 压缩支持**

实现了 KiteX gRPC 的压缩功能支持，可以使用例如 gzip 等压缩方法减小 payload 体积

**2. GLS**

使用 [local-session](https://github.com/cloudwego/localsession) 组件兜底请求上下文传递，解决用户没有传递 ctx 导致的微服务断链问题

### 优化

**1. Unknown Fields 无序列化优化**

实现无序列化的 unknown field 功能，无序列化unknown fields方案在FastCodec上性能提升约6x ~ 7x，详见：[#1017](https://github.com/cloudwego/kitex/pull/1017)

**2. DynamicGo 集成**

在 KiteX 的泛化模块中集成 [dynamicgo](https://github.com/cloudwego/dynamicgo) 以提升 JSON\HTTP 泛化调用性能 （+50%～200%）

### 其他

升级 Thriftgo 库依赖至 v0.3.0 ，支持了 Thriftgo 反射功能，可以在运行时获取 IDL 元信息

---

## 详细变更

### Feature:

- [[#1053](https://github.com/cloudwego/kitex/pull/1053)] feat(retry): support to distinguish local retry request
- [[#1058](https://github.com/cloudwego/kitex/pull/1058)] feat(retry): support delete retry policy dynamically
- [[#1000](https://github.com/cloudwego/kitex/pull/1000)] feat(grpc): support grpc compress
- [[#1018](https://github.com/cloudwego/kitex/pull/1018)] feat: use local-session to backup request context in case of missing
- [[#1045](https://github.com/cloudwego/kitex/pull/1045)] feat(generic): support base64 codec for map generic
- [[#1035](https://github.com/cloudwego/kitex/pull/1035)] feat(config): provide the ability to dynamically configure the rpctimeout config on the method hierarchy
- [[#825](https://github.com/cloudwego/kitex/pull/825)] feat(generic): integrate dynamicgo into kitex generic call
- [[#1019](https://github.com/cloudwego/kitex/pull/1019)] feat(lb): interleaved weighted round-robin load balancer

### Optimize:

- [[#1064](https://github.com/cloudwego/kitex/pull/1064)] optimize: check header max size when ttheader encode
- [[#1017](https://github.com/cloudwego/kitex/pull/1017)] optimize: implement unknown field function without serialization
- [[#1036](https://github.com/cloudwego/kitex/pull/1036)] optimize(protobuf): ignore err when (un)marshal empty req/resp
- [[#1056](https://github.com/cloudwego/kitex/pull/1056)] optimize(tool): optimize struct ref
- [[#1043](https://github.com/cloudwego/kitex/pull/1043)] optimize: add method info to the error message of the server handler panic for easy troubleshooting
- [[#1025](https://github.com/cloudwego/kitex/pull/1025)] optimize: use Tags of ServerBasicInfo as default Tags of RegistryInfo
- [[#1020](https://github.com/cloudwego/kitex/pull/1020)] optimize: add nil check for MethodInfo which get from ServiceInfo in client.Call to ignore panic

### Fix:

- [[#1073](https://github.com/cloudwego/kitex/pull/1073)] fix: fix failure retryer dump panic
- [[#1067](https://github.com/cloudwego/kitex/pull/1067)] fix: slim template with deepcopy
- [[#1055](https://github.com/cloudwego/kitex/pull/1055)] fix: ignore SIGHUP when run with nohup
- [[#1048](https://github.com/cloudwego/kitex/pull/1048)] fix(retry): keep the behavior of retry policy consistent between initing and updating
- [[#1047](https://github.com/cloudwego/kitex/pull/1047)] fix(tool): cli warning for unknown suffix
- [[#1038](https://github.com/cloudwego/kitex/pull/1038)] fix(config): correct the function signature of the rpcinfo.TimeoutProvider implementation
- [[#1034](https://github.com/cloudwego/kitex/pull/1034)] fix(generic): add case int16 into buildinTypeIntoString
- [[#1023](https://github.com/cloudwego/kitex/pull/1023)] fix(generic): avoid dead-loop when marshal self-referenced struct
- [[#1028](https://github.com/cloudwego/kitex/pull/1028)] fix:modify .licenserc.yaml
- [[#1012](https://github.com/cloudwego/kitex/pull/1012)] fix: skip frugal on go 1.21
- [[#992](https://github.com/cloudwego/kitex/pull/992)] fix(grpc): use mcache to fix memory leak caused by grpc codec buffer to reuse memory incorrectly
- [[#994](https://github.com/cloudwego/kitex/pull/994)] fix(tool): fix kitex tool git repo pulling logic

### Chore:

- [[#1074](https://github.com/cloudwego/kitex/pull/1074)] chore: update thriftgo to v0.3.0
- [[#1031](https://github.com/cloudwego/kitex/pull/1031)] chore: remove wechat group in readme
- [[#1008](https://github.com/cloudwego/kitex/pull/1008)] chore: update dynamicgo to v0.1.1
- [[#1006](https://github.com/cloudwego/kitex/pull/1006)] chore: remove unnecessary replace for frugal
- [[#1007](https://github.com/cloudwego/kitex/pull/1007)] chore: upgrade netpoll to v0.4.1
