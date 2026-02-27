---
title: "Kitex Release v0.14.0"
linkTitle: "Release v0.14.0"
projects: ["Kitex"]
date: 2025-06-26
description: >
---

## **Introduction to Key Changes**

### **New Features**
1. **Generic Call: The generic Client supports streaming calls, allowing a single Client to handle both streaming and non-streaming scenarios**

   It supports streaming generic calls, adapting to gRPC/TTHeader Streaming and supporting map/JSON and Protobuf binary generic calls.

   A brief code example is as follows:
   ```go
   cli, err := genericclient.NewClient("actualServiceName", g)
   // Ping-Pong generic
   resp, err := cli.GenericCall(ctx, "PingPongTest", req)
   // ClientStreaming generic
   cliStream, err := cli.ClientStreaming(ctx, "ClientStreamingTest")
   // ServerStreaming generic
   srvStream, err := cli.ServerStreaming(ctx, "ServerStreamingTest", req)
   // BidiStreaming generic
   bidiStream, err := cli.BidiStreaming(ctx, "BidiStreamingTest")
   ```

   Refer to this document for details: [Generic Call](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage).

### **Feature/Experience Optimization**
1. **Streaming: Improved observability and debugging experience**

   **TTHeader Streaming**
    - If Tracer configured, failure to create a stream will now be reported with metrics.
    - When a panic occurs on the Server side, the full stack trace will now be printed for easier troubleshooting.

   **gRPC Streaming**
    - If Tracer configured, failure to create a stream will now be reported with metrics.

### **Others**
1. **Code Product Simplification**

   Kitex tool no longer generates fastpb, only affecting Protobuf users.

   If high-performance Protobuf encoding/decoding is required, you can enable prutal by configuring environment variable `KITEX_TOOL_USE_PRUTAL_MARSHAL=1`.

## **Full Change**
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
