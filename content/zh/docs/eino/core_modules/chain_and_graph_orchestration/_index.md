---
Description: ""
date: "2025-02-10"
lastmod: ""
tags: []
title: 'Eino: Chain & Graph 编排功能'
weight: 2
---

在大模型应用中，`Components` 组件是提供 『原子能力』的最小单元，比如：

- `ChatModel` 提供了大模型的对话能力
- `Embedding` 提供了基于语义的文本向量化能力
- `Retriever` 提供了关联内容召回的能力
- `ToolsNode` 提供了执行外部工具的能力

> 详细的组件介绍可以参考: [Eino: Components 组件](/zh/docs/eino/core_modules/components)

一个大模型应用，除了需要这些原子能力之外，还需要根据场景化的业务逻辑，**对这些原子能力进行组合、串联**，这就是 **『编排』**。

大模型应用的开发有其自身典型的特征： 自定义的业务逻辑本身不会很复杂，几乎主要都是对『原子能力』的组合串联。

传统代码开发过程中，业务逻辑用 “代码的执行逻辑” 来表达，迁移到大模型应用开发中时，最直接想到的方法就是 “自行调用组件，自行把结果作为下一组件的输入进行调用”。这样的结果，就是 `代码杂乱`、`很难复用`、`没有切面能力`……

当开发者们追求代码『**优雅**』和『**整洁之道**』时，就发现把传统代码组织方式用到大模型应用中时有着巨大的鸿沟。

Eino 的初衷是让大模型应用开发变得非常简单，就一定要让应用的代码逻辑 “简单” “直观” “优雅” “健壮”。

Eino 对「编排」有着这样的洞察：

- 编排要成为在业务逻辑之上的清晰的一层，**不能让业务逻辑融入到编排中**。
- 大模型应用的核心是 “对提供原子能力的组件” 进行组合串联，**组件是编排的 “第一公民”**。
- 抽象视角看编排：编排是在构建一张网络，数据则在这个网络中流动，网络的每个节点都对流动的数据有格式/内容的要求，一个能顺畅流动的数据网络，关键就是 “**上下游节点间的数据格式是否对齐**？”。
- 业务场景的复杂度会反映在编排产物的复杂性上，只有**横向的治理能力**才能让复杂场景不失控。
- 大模型是会持续保持高速发展的，大模型应用也是，只有**具备扩展能力的应用才拥有生命力**。

于是，Eino 提供了 “基于 Graph 模型 (node + edge) 的，以**组件**为原子节点的，以**上下游类型对齐**为基础的编排” 的解决方案。

具体来说，实现了如下特性：

- 一切以 “组件” 为核心，规范了业务功能的封装方式，让**职责划分变得清晰**，让**复用**变成自然而然
  - 详细信息参考：[Eino: Components 组件](/zh/docs/eino/core_modules/components)
- 业务逻辑复杂度封装到组件内部，编排层拥有更全局的视角，让**逻辑层次变得非常清晰**
- 提供了切面能力，callback 机制支持了基于节点的**统一治理能力**
  - 详细信息参考：[Eino: Callback 用户手册](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)
- 提供了 call option 的机制，**扩展性**是快速迭代中的系统最基本的诉求
  - 详细信息参考：[Eino: CallOption 能力与规范](/zh/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities)
- 提供了 “类型对齐” 的开发方式的强化，降低开发者心智负担，把 golang 的**类型安全**特性发挥出来
  - 详细信息参考：[Eino: 编排的设计理念](/zh/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)
- 提供了 “**流的自动转换**” 能力，让 “流” 在「编排系统的复杂性来源榜」中除名
  - 详细信息参考：[Eino 流式编程要点](/zh/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

Graph 本身是强大且语义完备的，可以用这项底层几乎绘制出所有的 “数据流动网络”，比如 “分支”、“并行”、“循环”。

但 Graph 并不是没有缺点的，基于 “点” “边” 模型的 Graph 在使用时，要求开发者要使用 `graph.AddXXXNode()` 和 `graph.AddEdge()` 两个接口来创建一个数据通道，强大但是略显复杂。

而在现实的大多数业务场景中，往往仅需要 “按顺序串联” 即可，因此，Eino 封装了接口更易于使用的 `Chain`。Chain 是对 Graph 的封装，除了 “环” 之外，Chain 暴露了几乎所有 Graph 的能力。
