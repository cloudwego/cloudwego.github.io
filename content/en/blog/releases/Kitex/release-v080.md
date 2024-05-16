---
title: "Kitex Release v0.8.0"
linkTitle: "Release v0.8.0"
projects: ["Kitex"]
date: 2023-11-30
description: >
---

## **Introduction to Key Changes**

### Features

**1. gRPC Multi-Service Support**

Implemented multi-service registration for Kitex gRPC, please refer to [Multiple Services](/docs/kitex/tutorials/advanced-feature/multi_service/).

**2. Acquire Kitex RPCInfo**

Added methods for easy retrieval of RPC information from RPCInfo, please refer to [Acquire RPC information](/docs/kitex/tutorials/basic-feature/acquire_rpcinfo/).

### Optimizations

**1. Map Generic Call**

Map generic call supports returning []byte for binary fields via SetBinaryWithByteSlice option.

**2. RPCInfo asynchronous use**

Added an option to disable reusing RPCInfo, facilitating asynchronous usage, please refer to please refer to [Acquire RPC information](/docs/kitex/tutorials/basic-feature/acquire_rpcinfo/#12-asynchronous-usage).

### Others

Upgraded frugal to [v0.1.12](https://github.com/cloudwego/frugal/releases/tag/v0.1.12), fixing some concurrency issues when compiling types, especially the issue when registering new modules which may conflict with sonic.  
 It's STRONGLY SUGGESTED updating both frugal and sonic to the latest version by

```shell
  go get github.com/cloudwego/frugal@latest
  go get github.com/bytedance/sonic@latest
```

## **Full Release Log**

### Feature:

[[#1051](https://github.com/cloudwego/kitex/pull/1051)] feat(grpc): support gRPC multi-service on a server  
[[#1189](https://github.com/cloudwego/kitex/pull/1189)] feat(rpcinfo): add kitexutil methods for the convenience to fetch rpc information from RPCInfo  
[[#1176](https://github.com/cloudwego/kitex/pull/1176)] feat(tool): add an environment variable to make it easier to debug kitex tool  
[[#1173](https://github.com/cloudwego/kitex/pull/1173)] feat(rpcinfo): allow disable rpcinfo reuse for async reference  
[[#1172](https://github.com/cloudwego/kitex/pull/1172)] feat(retry): client.WithSpecifiedResultRetry should have higher priority  
[[#1150](https://github.com/cloudwego/kitex/pull/1150)] feat(proxy): add an interface to customize proxy middleware to replace the default implementation  
[[#1159](https://github.com/cloudwego/kitex/pull/1159)] feat(generic): support returning []byte for binary fields in map generic  
[[#1153](https://github.com/cloudwego/kitex/pull/1153)] feat(retry): add Extra for retry.FailurePolicy for better extension

### Optimize:

[[#1187](https://github.com/cloudwego/kitex/pull/1187)] optimize(tool): add an option to keep resp for kitex tool  
[[#1183](https://github.com/cloudwego/kitex/pull/1183)] optimize(meshheader): retrieve rip from meshheader and write it to TransInfo  
[[#1178](https://github.com/cloudwego/kitex/pull/1178)] optimize(bizErr): recurse to obtain BizErr to avoid additional Error encapsulation in the middle, resulting in unwrap results that are not BizErr

### Fix:

[[#1126](https://github.com/cloudwego/kitex/pull/1126)] fix(generic): the issue of structs cache of generic call has dirty data under multiple services scene  
[[#1168](https://github.com/cloudwego/kitex/pull/1168)] fix(tool): remove the pointer to java.Object in generated file for [CodecDubbo](https://github.com/kitex-contrib/codec-dubbo)  
[[#1169](https://github.com/cloudwego/kitex/pull/1169)] fix(tool): empty struct generate wrong struct  
[[#1166](https://github.com/cloudwego/kitex/pull/1166)] fix(generic): issue of deep copy function generation when map key type is binary  
[[#1155](https://github.com/cloudwego/kitex/pull/1155)] fix(tool): add import package 'context' for gRPC client.go

### Tests:

[[#1177](https://github.com/cloudwego/kitex/pull/1177)] test: avoid port conflict

### Chore:

[[#1190](https://github.com/cloudwego/kitex/pull/1190)] chore: update thriftgo version to v0.3.3  
[[#1186](https://github.com/cloudwego/kitex/pull/1186)] chore: update readme with examples and new blogs  
[[#1185](https://github.com/cloudwego/kitex/pull/1185)] chore: add ci for windows  
[[#1182](https://github.com/cloudwego/kitex/pull/1182)] chore: update dynamicgo to v0.1.6  
[[#1152](https://github.com/cloudwego/kitex/pull/1152)] chore: update dynamicgo and sonic version  
[[#1164](https://github.com/cloudwego/kitex/pull/1164)] chore: update frugal to v0.1.12 and allow disable frugal by build tag  
[[#1161](https://github.com/cloudwego/kitex/pull/1161)] chore: update frugal to v0.1.10  
[[#1157](https://github.com/cloudwego/kitex/pull/1157)] chore: update frugal to v0.1.9  
[[#1151](https://github.com/cloudwego/kitex/pull/1151)] chore(test): upgrade mockey to latest to compatible with Go1.21
