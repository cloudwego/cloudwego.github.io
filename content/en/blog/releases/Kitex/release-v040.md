---
title: "Kitex Release v0.4.0"
linkTitle: "Release v0.4.0"
projects: ["Kitex"]
date: 2022-08-26
description: >
---

## **Introduction to Key Changes**

### **Feature**

1. **Retry enhancement**: Support user-defined result retry; Support request-level configuration (priority is higher than Neptune). See [retry guide](/docs/kitex/tutorials/service-governance/retry/) for details
2. **Frugal (Thrift)**: Support default value of IDL; No codec code is supported by using frugal. See [frugal](/docs/kitex/tutorials/advanced-feature/codec_frugal/) for details
3. **Tool-Protobuf**: Support depend on external libraries with go_package, see [Notes for Using Protobuf IDLs](/docs/kitex/tutorials/code-gen/code_generation/#notes-for-using-protobuf-idls); Support Guess IDL type from the file extension, it is unnecessary to specify the type param when generating the protobuf code
4. **Fastpb(protobuf)**: Support fastpb to optimize performance of protobuf, and it is integrated into Kite by default. See [fastpb](/docs/kitex/tutorials/code-gen/fastpb/) for details
5. **Generic Call**: Support HTTP+Protobuf generic call
6. **Kitex lib supports Windows**: You can use kitex running on Windows (Kitex tool still doesn't support)

### **Optimization & Bugfix**

1. **Performance Optimization**: gRPC unary throughput increased by 46-70%, and 51% - 70% higher than the official gRPC framework throughput. See [benchmark](https://github.com/cloudwego/kitex-benchmark) for details
2. **Generic Call**: Support default value defined in thrift IDL for HTTP / Map / JSON Generic

---

## **Full Release Log**

### Feature

- [[#571](https://github.com/cloudwego/kitex/pull/571)] feat(protobuf): integrate [fastpb](https://github.com/cloudwego/fastpb) into kitex, refer to [doc](/docs/kitex/tutorials/code-gen/fastpb/).
- [[#592](https://github.com/cloudwego/kitex/pull/592)] feat(generic): add default value defined in thrift idl for HTTP/Map/JSON generic call.
- [[#600](https://github.com/cloudwego/kitex/pull/600)] feat(thrift): support no codec gen-code when using frugal.
- [[#607](https://github.com/cloudwego/kitex/pull/607), [#610](https://github.com/cloudwego/kitex/pull/610)] feat(proxyless): add option for xDS extension. Support traffic route, timeout config and service discovery based on xDS.
- [[#541](https://github.com/cloudwego/kitex/pull/541)] feat(trans): Add the go net extension to the transport layer, and choose it as the transmission mode by default in Windows OS.
- [[#540](https://github.com/cloudwego/kitex/pull/540)] feat(retry): support retry with specified error or response and add retry option for setup method retry policy.
- [[#533](https://github.com/cloudwego/kitex/pull/533)] feat(generic): js_conv annotation of generic call supports map type conversion.

### Optimize

- [[#522](https://github.com/cloudwego/kitex/pull/522), [#538](https://github.com/cloudwego/kitex/pull/538), [#605](https://github.com/cloudwego/kitex/pull/605)] perf(grpc): optimize performance for gRPC protocol.
- [[#590](https://github.com/cloudwego/kitex/pull/590)] optimize(tool): guess IDL type from file extension.
- [[#559](https://github.com/cloudwego/kitex/pull/559)] optimize(timeout): use wrap func to check timeout err in timeout middleware which can ignore logs customized timeout err.
- [[#581](https://github.com/cloudwego/kitex/pull/581)] optimize(tool): kitex tool usage add cmd example.

### Bugfix

- [[#564](https://github.com/cloudwego/kitex/pull/564)] fix(oneway): discard oneway conn after sending complete, or subsequent requests that send to the same connection may get blocked until the oneway request gets processed by the server.
- [[#577](https://github.com/cloudwego/kitex/pull/577), [#584](https://github.com/cloudwego/kitex/pull/584), [#602](https://github.com/cloudwego/kitex/pull/602)] fix(rpcinfo): fix rpcinfo reuse problem in longconn scene.
- [[#578](https://github.com/cloudwego/kitex/pull/578)] fix: fix long pool dump panic.
- [[#583](https://github.com/cloudwego/kitex/pull/583)] fix(tool): fix misusing of package name in protobuf generated code.
- [[#587](https://github.com/cloudwego/kitex/pull/587)] fix(tool): skip proto files with external import paths when generates code.
- [[#594](https://github.com/cloudwego/kitex/pull/594)] fix(generic): support the tag format of the escape double quotes in single quotes to be compatible with the logic of the old version.
- [[#595](https://github.com/cloudwego/kitex/pull/595)] fix: fix nil union panic in BLength.
- [[#589](https://github.com/cloudwego/kitex/pull/589), [#596](https://github.com/cloudwego/kitex/pull/596)] fix(frugal): fix frugal build tag.

### Refactor

- [[#566](https://github.com/cloudwego/kitex/pull/566)] refactor(metainfo): remove noused metakeys of HTTP2 Header.
- [[#593](https://github.com/cloudwego/kitex/pull/593)] refactor(trans): support specify Listener for server by option WithListener, the priority is higher than WithServiceAddr.
- [[#582](https://github.com/cloudwego/kitex/pull/582)] refactor(tool): use templates by embedding and export APIs for external usage for kitex tool.

### Test

- [[#579](https://github.com/cloudwego/kitex/pull/579)] test: add ut for long pool dump function.
- [[#608](https://github.com/cloudwego/kitex/pull/608)] test: fix data race in TestClientConnDecoupledFromApplicationRead.
- [[#609](https://github.com/cloudwego/kitex/pull/609)] test: fix gonet ut avoid testing port conflicts.
- [[#480](https://github.com/cloudwego/kitex/pull/480)] test: add unit test for client package.

### Chore

- [[#558](https://github.com/cloudwego/kitex/pull/558)] ci: fix setup-python github action.
- [[#487](https://github.com/cloudwego/kitex/pull/487)] ci: workflow add golangci-lint.
- [[#580](https://github.com/cloudwego/kitex/pull/580)] chore: fix the typos in remote module about go net.
- [[#601](https://github.com/cloudwego/kitex/pull/601)] chore: fixed some typos and replaced some defunct functions.
- [[#604](https://github.com/cloudwego/kitex/pull/604)] chore: upgrade fastpb to v0.0.2.
- [[#603](https://github.com/cloudwego/kitex/pull/603)] chore: upgrade frugal to v0.1.2.

### Dependency Change

github.com/cloudwego/frugal v0.1.1 -> v0.1.3

github.com/cloudwego/netpoll v0.2.5 -> v0.2.6

github.com/cloudwego/thriftgo v0.1.2 -> v0.2.0

google.golang.org/protobuf v1.26.0 -> v1.28.0

github.com/choleraehyq/pid v0.0.13 -> v0.0.15

new imported:

github.com/cloudwego/fastpb v0.0.2

github.com/jhump/protoreflect v1.8.2
