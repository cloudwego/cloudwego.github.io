---
title: "Kitex v0.0.4 版本发布"
linkTitle: "Release v0.0.4"
projects: ["Kitex"]
date: 2021-08-26
description: >
---

## 优化:

- transMetaHandler 在自定义 boundHandlers 之前执行，保证自定义 boundHandlers 可以拿到 RPCInfo 信息。
- TransError 暴露封装 error 的 typeID 用于支持自定义 Error 回传错误码。

## Bug 修复:

- 复用 RPCInfo 不对 stats level 重置， 以修复在使用 netpollmux 时 metric 丢失问题。
- 清理不存在节点的连接池。
- Streaming 中增加 Netpoll EOF 错误判断来清除冗余的 warning 日志。
- 修改熔断错误统计类型，非 Ignorable 错误类型均做熔断统计，以修复开源版本熔断无法正确生效和内部版本在开启mesh后重试熔断无法生效问题。

## 工具:

- 调整了 Protobuf unary 方法的生成代码，来同时支持 Kitex Protobuf 和 gRPC。
- 升级了 thriftgo 版本来修复 golint。
- 修复了生成代码中的错误。
- 修复了流生成的代码缺少传输选项的错误。

## 文档:

- 添加了 Golong 配置部分的文档以及 Golang 版本要求。
- 更新了一些现有文档。
- 添加了一些英文文档。

## 依赖变化:

1. Thriftgo: v0.0.2-0.20210726073420-0145861fcd04 -> v0.1.2
2. Netpoll: v0.0.2 -> v0.0.3
