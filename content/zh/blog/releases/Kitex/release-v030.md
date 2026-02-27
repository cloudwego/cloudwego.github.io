---
title: "Kitex v0.3.0 版本发布"
linkTitle: "Release v0.3.0"
projects: ["Kitex"]
date: 2022-04-29
description: >
---

## Feature

- [[#366](https://github.com/cloudwego/kitex/pull/366), [#426](https://github.com/cloudwego/kitex/pull/426) ] 功能(client): 客户端支持预热操作
- [[#395](https://github.com/cloudwego/kitex/pull/395) ] 功能(mux): 连接多路复用支持优雅关闭
- [[#399](https://github.com/cloudwego/kitex/pull/399) ] 功能(protobuf): 定义 fastpb protocol API 并在编解码模块对应支持

## Optimise

- [[#402](https://github.com/cloudwego/kitex/pull/402) ] 优化(connpool): 导出 pkg/remote/connpool 里的 getCommonReporter
- [[#389](https://github.com/cloudwego/kitex/pull/389) ] 优化(rpcinfo)：填充由 defaultCodec 解码得到的 rpcinfo 中缺失的 Invocation().PackageName, Invocation().ServiceName and Config().TransportProtocol 字段

## Bugfix

- [[#413](https://github.com/cloudwego/kitex/pull/413) ] 修复(mux): 在 NetpollMux transHandler 中设置 sendMsg的PayloadCodec，以修复泛化请求编码报错问题[issue #411](https://github.com/cloudwego/kitex/issues/411)
- [[#406](https://github.com/cloudwego/kitex/pull/406) ] 修复(grpc): 修复 http2 framer 的读写逻辑，例如避免对端无法及时收到 framer
- [[#398](https://github.com/cloudwego/kitex/pull/398) ] 修复(utils)：修复了 Dump() 接口无法 dump 出 ring 里所有数据的 bug
- [[#428](https://github.com/cloudwego/kitex/pull/428) ] 修复(trans)：当写入失败时，关闭连接以避免内存泄漏

## Tool

- [[#340](https://github.com/cloudwego/kitex/pull/340) ] tool(protobuf): 重新设计并实现 Protobuf 生成代码，不使用反射完成编解码，当前仅支持 proto3

## Chore

- [[#396](https://github.com/cloudwego/kitex/pull/396) ] chore: 用 bytedance/gopkg 里的 xxhash3 替换掉 cespare/xxhash
- [[#400](https://github.com/cloudwego/kitex/pull/400) ] chore: 升级 workflow 的 go 版本到 1.18
- [[#407](https://github.com/cloudwego/kitex/pull/407) ] chore: 单独增加文件对 grpc 源码使用做声明

## Test

- [[#401](https://github.com/cloudwego/kitex/pull/401) ] test: 补充 kitex/server 的单测
- [[#393](https://github.com/cloudwego/kitex/pull/393) ] test: 补充 pkg/remote/bound package 单测
- [[#403](https://github.com/cloudwego/kitex/pull/403) ] test: 补充 netpollmux package 单测
- [[#401](https://github.com/cloudwego/kitex/pull/401) ] test: 补充 klog package 单测
- [[#392](https://github.com/cloudwego/kitex/pull/392) ] test: 补充 utils package 单测
- [[#373](https://github.com/cloudwego/kitex/pull/373), [#432](https://github.com/cloudwego/kitex/pull/432), [#434](https://github.com/cloudwego/kitex/pull/434) ] test: 补充 gRPC transport 部分的单测，单测覆盖率提升到 76%
- [[#424](https://github.com/cloudwego/kitex/pull/424) ] test: 补充 transmeta 实现 handler 的单元测试

## Dependency Change

- github.com/cloudwego/netpoll: v0.2.0 -> v0.2.2
- github.com/bytedance/gopkg: 20210910103821-e4efae9c17c3 -> 20220413063733-65bf48ffb3a7
