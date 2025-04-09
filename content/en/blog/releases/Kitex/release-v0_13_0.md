---
title: "Kitex Release v0.13.0"
linkTitle: "Release v0.13.0"
projects: ["Kitex"]
date: 2025-04-07
description: >
---

> We recommend upgrading directly to Kitex version v0.13.1, as we have fixed a potential Goroutine leak issue in the gRPC Client in v0.13.0.

## **Introduction to Key Changes**

### **New Features**
1. New streaming interface StreamX supports gRPC, stock Kitex gRPC users can migrate
    v0.12.0 released the StreamX interface to optimise the streaming experience, and supported the custom streaming protocol TTHeader Streaming, but did not support gRPC. So stock users could not migrate.
    This version supports gRPC for StreamX, users can migrate to StreamX, and the Server side can be compatible with two streaming protocols at the same time. So there is no need to worry about protocol compatibility after interface migration.
    In particular, when adapting gRPC with StreamX, we found that there are still some inconvenient problems. In order to bring a better experience of using the interface, we have adjusted the StreamX interface for the second time, which will affect the users who have already been using StreamX. We apologise for that.
    User documentation: Kitex StreamX - 基础流编程 | Stream Basic Programming
2. Prutal - Protobuf's non-generated code serialisation library
    Prutal is officially open source (https://github.com/cloudwego/prutal), on par with Thrift's Frugal library, and the new version of Kitex integrates Prutal by default.
    Advantages:
    - Minimized Code Product Size: Generating Only Structures, No Runtime Code
    - Leveraging Reflection Optimization Similar to Frugal, Achieving Over 50% Speed Increase
    - Generating Code Compatible with Existing Protobuf and Derivative Versions
    User documentation: Kitex 集成 Prutal 说明

### **Feature/Experience Optimization**
1. **TTHeader Streaming**: Support interface-level Recv timeout control
    In addition to the existing Client level, this release of TTHeader Streaming supports interface-level Recv timeout configuration, making configuration more flexible.
    User documentation: Kitex - StreamX 超时控制
2. Default Thrift transport protocol changed from Buffered to Framed
    This change can leverage FastCodec for better performance.

### **Others**
1. Code Product Simplification
    - Kitex Tool would not generate the repeated verification code for Set data structure and the DeepEqual function for each structure by default.
     - If you only want to restore DeepEqual, add -thrift gen_deep_equal=true to the generation command.
     - If you want to restore the repeated verification of Set, add -thrift validate_set=true, -thrift gen_deep_equal=true to the generation command.
    - Kitex Tool would not generate the Apache Codec related code by default.
     - If you want to restore it, add -thrift no_default_serdes=false to the generation command.

2. Go Supported Version Change
    Support version Go 1.19~1.24, the lowest supported version becomes Go 1.19.
    if Go version is too low, there will be a prompt when compiling: note: module requires Go 1.19.

## **Full Change**
### Feature
[[#1719](https://github.com/cloudwego/kitex/pull/1719)] feat: prutal for replacing protoc
[[#1736](https://github.com/cloudwego/kitex/pull/1736)] feat(ttstream): support WithRecvTimeout stream call option
[[#1702](https://github.com/cloudwego/kitex/pull/1702)] feat(gRPC): add grpc client conn dump to help debug the conn and stream status
[[#1723](https://github.com/cloudwego/kitex/pull/1723)] feat(codec/thrift): use fastcodec/frugal if apache codec not available
[[#1724](https://github.com/cloudwego/kitex/pull/1724)] feat: add tail option to support for delayed initialization of some client options

### Optimize
[[#1728](https://github.com/cloudwego/kitex/pull/1728)] optimize(apache): remove apache codec gen and set default protocol from buffered to framed
[[#1732](https://github.com/cloudwego/kitex/pull/1732)] optimize(rpcinfo): purify the transport protocol of rpcinfo in a single rpc request
[[#1711](https://github.com/cloudwego/kitex/pull/1711)] optimize(tool): disable set validate and deep equal code gen to simplify kitex_gen
[[#1717](https://github.com/cloudwego/kitex/pull/1717)] optimize(gRPC): return more detailed error when received invalid http2 frame

### Fix
[[#1734](https://github.com/cloudwego/kitex/pull/1734)] fix(ttstream): adjust stream state transition and remove all SetFinalizer to avoid memory leak
[[#1735](https://github.com/cloudwego/kitex/pull/1735)] fix(generic): support both relative and absolute check for idl includes parse to make it compatible with generation tool
[[#1725](https://github.com/cloudwego/kitex/pull/1725)] fix: code gen import issue for streamx mode, stream call judgement bug and set ttheader streaming as default
[[#1727](https://github.com/cloudwego/kitex/pull/1727)] fix(tool): fix tool UseStdLib remains unexcepted lib issue.

### Refactor
[[#1658](https://github.com/cloudwego/kitex/pull/1658)] refactor: streamx api to adapt both grpc and ttheader streaming protocol and provide more user-friendly interface
[[#1729](https://github.com/cloudwego/kitex/pull/1729)] refactor(tool): move pb tpl code to sep pkg

### Chore
[[#1743](https://github.com/cloudwego/kitex/pull/1743)] chore: update dependencies version
[[#1740](https://github.com/cloudwego/kitex/pull/1740)] chore(generic): deprecate NewThriftContentProvider
[[#1741](https://github.com/cloudwego/kitex/pull/1741)] chore(streamx): remove redundant streamx package
[[#1738](https://github.com/cloudwego/kitex/pull/1738)] ci: fix typos & crate-ci/typos
[[#1737](https://github.com/cloudwego/kitex/pull/1737)] chore: update depedency and change go support to 1.19-1.24
[[#1720](https://github.com/cloudwego/kitex/pull/1720)] Revert "fix(ttstream): pingpong method refers to server interface defined in Kitex generation code when streamx is enabled and there are other streaming methods"
