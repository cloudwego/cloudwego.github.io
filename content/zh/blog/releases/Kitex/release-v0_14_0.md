---
title: "Kitex Release v0.14.0"
linkTitle: "Release v0.14.0"
projects: ["Kitex"]
date: 2025-06-26
description: >
---

## **重要变更介绍**

### **新特性**
1. **泛化调用：泛化 Client 支持流式调用，一个 Client 搞定流式/非流式调用场景**

   泛化 Client 支持流式泛化调用，适配 gRPC/TTHeader Streaming 并支持 map / json 和 protobuf 二进制泛化调用。

   简要代码示例如下：
   ```go
   cli, err := genericclient.NewClient("actualServiceName", g)
   // Ping-Pong 泛化
   resp, err := cli.GenericCall(ctx, "PingPongTest", req)
   // ClientStreaming 泛化
   cliStream, err := cli.ClientStreaming(ctx, "ClientStreamingTest")
   // ServerStreaming 泛化
   srvStream, err := cli.ServerStreaming(ctx, "ServerStreamingTest", req)
   // BidiStreaming 泛化
   bidiStream, err := cli.BidiStreaming(ctx, "BidiStreamingTest")
   ```
   
   各场景使用细节请参考[泛化调用](/zh/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage)。

### **功能/体验优化**
1. **Streaming： 观测/排错体验优化**

   **TTHeader Streaming**
   - 若配置了 Tracer，创建 Stream 失败将打点上报
   - 当 Server 侧发生 panic 时，将打印完整堆栈，方便排查问题

   **gRPC Streaming**
   - 若配置了 Tracer，创建 Stream 失败将打点上报

### **其他**
1. 产物简化

   Kitex Tool 不再生成 fastpb，只影响 protobuf 的用户。若有高性能 protobuf 编解码需求，可配置环境变量 `KITEX_TOOL_USE_PRUTAL_MARSHAL=1`启用 prutal。

## **详细变更**
### Feature
[[#1759](https://github.com/cloudwego/kitex/pull/1759)] feat(tool): add env for using prutal to marshal

[[#1782](https://github.com/cloudwego/kitex/pull/1782)] feat(ttstream): process MetaFrame and reflect to rpcinfo

[[#1777](https://github.com/cloudwego/kitex/pull/1777)] feat(client): report err when create Stream failed

[[#1763](https://github.com/cloudwego/kitex/pull/1763)] feat: support ttheader streaming generic call

[[#1771](https://github.com/cloudwego/kitex/pull/1771)] feat(tool): add thriftgo patcher extension

[[#1755](https://github.com/cloudwego/kitex/pull/1755)] feat: add generic binary pb for streamx

[[#1752](https://github.com/cloudwego/kitex/pull/1752)] feat(generic): support generic pb binary for streaming

### Optimize
[[#1788](https://github.com/cloudwego/kitex/pull/1788)] optimize: go net implementation

[[#1786](https://github.com/cloudwego/kitex/pull/1786)] optimize(tool): remove tool fastpb generation

[[#1783](https://github.com/cloudwego/kitex/pull/1783)] optimize(gRPC): parse PayloadCodec in server side

[[#1780](https://github.com/cloudwego/kitex/pull/1780)] optimize(ttstream): log the error thrown by invoking handler

[[#1769](https://github.com/cloudwego/kitex/pull/1769)] optimize: injection of options in ttstream

### Fix
[[#1792](https://github.com/cloudwego/kitex/pull/1792)] fix(gRPC): inject current method name to rpcinfo in server-side to fix FROM_METHOD missing

[[#1787](https://github.com/cloudwego/kitex/pull/1787)] fix(ttstream): metrics missing caused by server-side rpcinfo not set correctly

[[#1778](https://github.com/cloudwego/kitex/pull/1778)] fix: enabling json mode of map generic not work

[[#1774](https://github.com/cloudwego/kitex/pull/1774)] fix(server): trans server conn count race issue

[[#1742](https://github.com/cloudwego/kitex/pull/1742)] fix(generic): align dynamicgo's write base behavior with old generic (only for internal logic)

### Refactor
[[#1770](https://github.com/cloudwego/kitex/pull/1770)] refactor: refactor generic streaming

### Test
[[#1793](https://github.com/cloudwego/kitex/pull/1793)] test: add go1.18 to scenario-test

[[#1765](https://github.com/cloudwego/kitex/pull/1765)] refactor: refactor generic streaming

### Docs
[[#1794](https://github.com/cloudwego/kitex/pull/1794)] docs: update CONTRIBUTING.md to change PR base branch to main

### Chore
[[#1795](https://github.com/cloudwego/kitex/pull/1795)] chore: update dependency

[[#1776](https://github.com/cloudwego/kitex/pull/1776)] chore: remove testify dependency

[[#1757](https://github.com/cloudwego/kitex/pull/1757)] chore: update prutal to v0.1.1

[[#1753](https://github.com/cloudwego/kitex/pull/1753)] ci: disable codecov annotations
