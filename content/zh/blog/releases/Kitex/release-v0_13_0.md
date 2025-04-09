---
title: "Kitex Release v0.13.0"
linkTitle: "Release v0.13.0"
projects: ["Kitex"]
date: 2025-04-09
description: >
---

> 建议直接升级 Kitex 版本到 v0.13.1，因为我们对 v0.13.0 里 gRPC Client 潜在的 Goroutine 泄漏问题进行了修复

## **重要变更介绍**

### **新特性**
1. 新流式接口 StreamX 支持 gRPC，存量 Kitex gRPC 用户可迁移
    v0.12.0 发布了 StreamX 接口优化流式体验，支持了自定义流式协议 TTHeader Streaming，但未支持 gRPC，存量用户无法迁移。
    v0.13.0 对 StreamX 支持 gRPC 后，用户可迁移至 StreamX 新接口，Server 端可以同时兼容两个流式协议，无需担心接口迁移后的协议兼容性问题。
    特别地，StreamX 在适配 gRPC 时，发现依然有一些不便利的问题，为带来更好的接口使用体验，因此对 StreamX 接口做了二次调整。
    已经使用 v0.12.* StreamX 用户会带来影响，在这里表示抱歉。
    详见 [StreamX 用户文档](/zh/docs/kitex/tutorials/basic-feature/streamx)
2. Prutal - Protobuf 的无生成代码序列化库
    Prutal 正式开源 (https://github.com/cloudwego/prutal)，对标 Thrift 的 Frugal 库，新版本 Kitex 默认集成 Prutal。特点：
    - 产物体积最小化，只需生成结构体
    - 使用与 Frugal 相似的反射优化，性能优于官方 Protobuf
    - 兼容官方 Protobuf 及衍生版本的生成代码
    详细信息参考 [Prutal](/zh/docs/kitex/tutorials/code-gen/prutal)

### **功能/体验优化**
1. TTHeader Streaming 支持配置接口级别 Recv 超时
    本版本 TTHeader Streaming 在原有的 Kitex Client 级别基础上，额外支持接口级别的 Recv 超时配置，配置更为灵活。
    详见 Kitex - StreamX 超时控制
2. Thrift 默认传输协议由 Buffered 改为 Framed
    可以利用 FastCodec 获得更高的编解码性能。

### **其他**
1. 产物简化
    - 默认不生成 Set 数据结构的重复校验代码与各结构体的 DeepEqual 函数
     - 若只想恢复 DeepEqual，生成命令追加 -thrift gen_deep_equal=true
     - 若想恢复 Set 的重复校验，生成命令追加 -thrift validate_set=true, -thrift gen_deep_equal=true
    - 默认不生成 Apache Codec 相关代码
     - 若想恢复，生成命令追加 -thrift no_default_serdes=false
2. Go 支持版本变化
    支持版本 Go 1.19~1.24，最低支持版本变为 Go 1.19，如果 Go 版本过低，编译时会有提示：note: module requires Go 1.19

## **详细变更**
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
[[#1737](https://github.com/cloudwego/kitex/pull/1737)] chore: update dependency and change go support to 1.19-1.24
[[#1720](https://github.com/cloudwego/kitex/pull/1720)] Revert "fix(ttstream): pingpong method refers to server interface defined in Kitex generation code when streamx is enabled and there are other streaming methods"
