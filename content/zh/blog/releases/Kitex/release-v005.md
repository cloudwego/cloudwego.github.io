---
title: "Kitex v0.0.5 版本发布"
linkTitle: "Release v0.0.5"
projects: ["Kitex"]
date: 2021-09-26
description: >
---

## 功能:

- 增加默认的 ErrorHandler 封装 Error（用户指定会被覆盖）。
- metainfo 支持反向传递。
- 支持了 JSON 泛化调用，使用指南可参考：[Kitex 泛化调用使用指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)。

## 优化:

- 多路复用场景下使用了新的 netpoll API 来改善吞吐和延迟。
- 多路复用场景下支持 metainfo 的正向和反向传递。
- Client 会在需要的时候默认使用 RPCTimeout 中间件。
- 连接池配置增加全局空闲连接和单实例空闲连接合法性校验。
- 当更新 QPS 最大限制时会重置计数器。
- 减小 QPS 限流的误差。

## Bug 修复:

- 修复 WithExitWaitTime 没有正确设置退出等待时间的问题。
- 修复更新 QPS 限制器更新间隔时，协程泄漏的问题。
- 服务注册使用真实监听的地址。

## 工具:

- 修复了当 protobuf 文件只有 unary 方法时，生成出错的问题。

## 文档:

- 提供了英文版的README和其他文档。
- 补充了泛化调用手册： [English](/docs/kitex/tutorials/advanced-feature/generic-call/) | [中文](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)。
- README 中增加了 landsapce 和 roadmap。

## 依赖变化:

- github.com/cloudwego/netpoll: v0.0.3 -> v0.0.4
- github.com/bytedance/gopkg: v0.0.0-20210709064845-3c00f9323f09 -> v0.0.0-20210910103821-e4efae9c17c3
