---
title: "Kitex Release v0.6.0"
linkTitle: "Release v0.6.0"
projects: ["Kitex"]
date: 2023-06-14
description: >
---

## **Introduction to Key Changes**

### **Feature**

**1. GRPC Metainfo Pass Through**

The gRPC client sets the header to ctx by default, and external methods can use `GetHeaderMetadataFromCtx` to obtain meta information. It can be used to obtain meta information within transmeta and set it to rpcinfo, or to obtain header information within middlewares.

**2. Kitex configuration module refactoring**

Added config items for retry, circuit breaker, timeout, and flow limiting to support [configmanager] (https://github.com/cloudwego/configmanager) Middleware defined interfaces to support extended integration with external configuration centers.

**3. Kitex - Tools**

- Support for inserting deep copy function of an object in thrift generation code for deep copying source objects to destination objects. The use method is to add `-deep-copy-api` parameter to the kitex command;
- Support for inserting IDL descriptor registration code into thrift generation code, which is used to register IDL descriptor information into the `github.com/cloudwego/kitex/pkg/reflection/thrift` package after loading the corresponding generated code at runtime, and obtain descriptor information through the exposed functions. The use method is to add `generate-reflection-info=true` to the `thrift` parameter of kitex command, such as `kitex -thrift generate-reflection-info=true`... Kitex only supports IDL descriptor information registration in v1.12.0, richer query interfaces will be released in subsequent versions, and IDL descriptor registration function generation will also be modified to default generation.

### **Optimization**

**1. Refactor the detection server to support detection of multiple protocols**

The old version of the detection server only supports http2 as the detection protocol. The v1.12.0 version supports users to pass-in the `remote.ServerTransHandlerFactory` corresponding to the `remote.ServerTransHandler` which implement `detection.DetectableServerTransHandler` interface as indefinite parameters, and cooperate with the default `remote.ServerTransHandler` to handle unmatched protocols to achieve a Kitex Server compatible with multiple protocols.

**2. Consistency hash**

Function `buildVirtualNodes` in Kitex consistency hash load balancer uses `virtualFactorLen` to initialize a bytes array, and there may be insufficient space to accommodate the VirtualNodeLen number, resulting in the address part being overwritten.

**3. Long Connection Pool Metrics**

Fix the issue that the records that long connection pool reuses connections successfully didn't report.

### **Other**

Upgrade netpoll library dependency to v0.4.0 and support for [configmanager] ( https://github.com/cloudwego/configmanager ) v0.2.0.

---

## **Full Release Log**

## Feature:

- [[#923](https://github.com/cloudwego/kitex/pull/923)] feat(grpc): grpc client set header and trailer to context by default and provide api to get header from ctx
- [[#891](https://github.com/cloudwego/kitex/pull/891)] feat: support to service-inline rpc client and server, which can transfer the rpc call as func call. The feature needs to be used with the generation tool
- [[#946](https://github.com/cloudwego/kitex/pull/946)] feat: default server handler support executing Read function by trans pipeline
- [[#936](https://github.com/cloudwego/kitex/pull/936)] feat(config): add config items for retry/cb/rcptimeout/limiter
- [[#924](https://github.com/cloudwego/kitex/pull/924)] [[#939](https://github.com/cloudwego/kitex/pull/939)] feat(code_gen): support generating deepcopy apis
- [[#926](https://github.com/cloudwego/kitex/pull/926)] feat: support thrift reflection info registry
- [[#897](https://github.com/cloudwego/kitex/pull/897)] feat: support loop_service in custom template

## Optimize:

- [[#961](https://github.com/cloudwego/kitex/pull/961)] optimize(tool): optimize kitex tool tpl with -use param
- [[#966](https://github.com/cloudwego/kitex/pull/966)] optimize(ttheader): add type check for headerFlags of TTheader
- [[#919](https://github.com/cloudwego/kitex/pull/919)] optimize: replace go func with GoFunc to avoid panic
- [[#960](https://github.com/cloudwego/kitex/pull/960)] optimize: make stats package public to reuse it in expanded repo
- [[#955](https://github.com/cloudwego/kitex/pull/955)] optimize: remove redundant onRead error log in gonet transerver
- [[#954](https://github.com/cloudwego/kitex/pull/954)] optimize: dont return error when transHandler not implement graceful shutdown
- [[#941](https://github.com/cloudwego/kitex/pull/941)] optimize(callopt): optimize the debug info of callopt to reduce the possibility of slice grow

## Fix:

- [[#963](https://github.com/cloudwego/kitex/pull/963)] fix(generic): generic-map writeInt8 fails on byte
- [[#901](https://github.com/cloudwego/kitex/pull/901)] fix(mux): mux connection asynccallback dont create new goroutine and server wait all crrst packets received by client
- [[#921](https://github.com/cloudwego/kitex/pull/921)] fix(loadbalance): fix consisthash byte[] length
- [[#922](https://github.com/cloudwego/kitex/pull/922)] fix(mux): fix the problem that output unreasonable error when exit if enable mux and use Kitex Protobuf
- [[#927](https://github.com/cloudwego/kitex/pull/927)] fix(connpool): long connection pool reports reuse success using reporter

## Refactor:

- [[#958](https://github.com/cloudwego/kitex/pull/958)] refactor(errorHandler): refactor the definition of error handler to get more information to handle error
- [[#943](https://github.com/cloudwego/kitex/pull/943)] refactor(client): refactor client.Call to improve readability
- [[#560](https://github.com/cloudwego/kitex/pull/560)] refactor: refactor server detection trans handler to support custom registration

## Tests:

- [[#900](https://github.com/cloudwego/kitex/pull/900)] test(generic): add thrift reflection (using dynamicgo) generic call example

## Chore:

- [[#976](https://github.com/cloudwego/kitex/pull/976)] chore: upgrade netpoll to v0.4.0 and thriftgo to v0.2.11
- [[#956](https://github.com/cloudwego/kitex/pull/956)] chore: update configmanager version to v0.2.0
- [[#948](https://github.com/cloudwego/kitex/pull/948)] chore: format with goimports -local github.com/cloudwego/kitex
