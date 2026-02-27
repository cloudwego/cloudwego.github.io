---
title: "Kitex Release v0.7.0"
linkTitle: "Release v0.7.0"
projects: ["Kitex"]
date: 2023-08-14
description: >
---

## **Introduction to Key Changes**

### Features

**1. gRPC Compression Support**

Implemented compression support for Kitex gRPC, allowing compression methods like gzip to reduce payload size.

**2. GLS (Goroutine Local Storage)**

Utilized the [local-session](https://github.com/cloudwego/localsession) component for context propagation in fallback requests, addressing the issue of broken microservice chains caused by missing ctx.

### Optimizations

**1. Unserialized Unknown Fields**

Implemented unserialization of unknown fields, resulting in a performance improvement of approximately 6x to 7x on FastCodec. See details in [#1017](https://github.com/cloudwego/kitex/pull/1017).

**2. Integration with DynamicGo**

Integrated [dynamicgo](https://github.com/cloudwego/dynamicgo) into Kitex's generic module to enhance performance of JSON/HTTP generic invocations (+50% to 200%).

### Others

Upgraded Thriftgo library dependency to v0.3.0, adding support for Thriftgo reflection, enabling runtime access to IDL metadata.

---

## **Full Release Log**

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
