---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: 核心模块'
weight: 3
---

Eino 中的核心模块有如下几个部分：

- **Components 组件**：[Eino: Components 组件](/zh/docs/eino/core_modules/components)
  Eino 抽象出来的大模型应用中常用的组件，例如 `ChatModel`、`Embedding`、`Retriever` 等，这是实现一个大模型应用搭建的积木，是应用能力的基础，也是复杂逻辑编排时的原子对象。
- **Chain/Graph 编排**：[Eino: Chain/Graph 编排功能](/zh/docs/eino/core_modules/chain_and_graph_orchestration/chain_graph_introduction)
  多个组件混合使用来实现业务逻辑的串联，Eino 提供 Chain/Graph 的编排方式，把业务逻辑串联的复杂度封装在了 Eino 内部，提供易于理解的业务逻辑编排接口，提供统一的横切面治理能力。
- **Flow 集成工具 (agents)**: [Eino: Flow 集成组件](/zh/docs/eino/core_modules/flow_integration_components)
  Eino 把最常用的大模型应用模式封装成简单、易用的工具，让通用场景的大模型应用开发极致简化，目前提供了 `React Agent` 和 `Host Multi Agent`。
- **EinoDev 开发辅助工具**：[EinoDev: 应用开发工具链](/zh/docs/eino/core_modules/application_development_toolchain)
  Eino 致力于让全码开发大模型应用变得非常简单，EinoDev 则为 Eino 编排提供了 `可视化`、`交互式` 的开发调试方案，所见即所得，让开发者的精力从 `调试地狱` 中释放出来，专注于场景逻辑。
