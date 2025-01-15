---
Description: ""
date: "2025-01-15"
lastmod: ""
tags: []
title: 'Eino: 快速开始'
weight: 2
---

## 简要说明

Eino 提供了多种面向 AI 应用开发场景的组件抽象，同时也提供了多种实现，因此用 Eino 快速上手开发一个应用是**非常简单**的。本目录中将提供几个最常见的用 AI 搭建的应用实例，以帮助你快速地上手使用 Eino。

这几个小应用仅用于快速上手，对于其中的单项能力的更详细介绍及示例，可以参考 [组件介绍](/zh/docs/eino/core_modules/components)、[编排介绍](/zh/docs/eino/core_modules/chain_and_graph_orchestration/chain_graph_introduction) 等专题文档。

## 快速开始示例

### 示例：LLM 最简应用

AI 的应用中，最基础的场景就是 prompt + chat model 的场景，这也是互联网上各类 AI 应用平台提供的最重要的功能。你可以定义 `System Prompt` 来约束大模型的回答逻辑，比如 “你在扮演一个 XXX 角色” 等等。这个示例中，你可以用 Eino 的 `PromptTemplate` 组件 和 `ChatModel` 组件来构建一个角色扮演应用。

- [实现一个最简 LLM 应用-ChatModel](/zh/docs/eino/quick_start/simple_llm_application)

### 示例：创建一个 Agent

大模型是 AI 的大脑，其核心是理解自然语言，并做出回应，(文本)大模型本身只能接收一段文本，然后输出一段文本。而当你希望大模型能使用一些工具自行获取所需的信息、执行一些动作，就需要使用 `Tool` 来实现了，拥有了 Tool 的大模型就像是拥有了手脚，可以和当下已有的 IT 基础设施进行交互，比如 "调用 http 接口查询天气，再根据天气提醒你今天要传什么衣服"，就需要大模型调用 "search tool" 查询信息。

我们通常把能够根据大模型的输出调用相关 tool 的这套体系所构建出的整体，叫做 “智能体”，即 Agent。

在 Eino 中，你可以单独使用 ChatModel + ToolsNode 来实现 Agent，也可以使用封装好的 `react agent` 和 `multi agent`。

在这个示例中，我们将使用 react agent 来构建一个可以和现实世界交互的智能体。

- [Agent-让大模型拥有双手](/zh/docs/eino/quick_start/agent_llm_with_tools)

### 示例：用编排构建复杂自定义应用

人工智能(AI) 的一项历史使命，就是把人从一些重复性的劳动中解放出来，而几乎任何一项劳动都是由多个流程和工序组合而成的，用 AI 完成这些相互串联的工作，这就是 “工作流”。由各种 AI 组件组合、编排而成的工作流，才是真正生产场景中的应用形态。

Eino 中，提供了以组件为第一编排对象，同时提供具有极强扩展能力的 Lambda 节点作为编排对象，能够实现快速上手和定制扩展的双优势。Eino 的编排还有一些其他特点： 编排过程中最重要的话题 “数据流” 在 Eino 中被强化，callbacks 提供了观测和调试的基础能力，call option 为运行时的扩展性提供了无限可能...

这个示例中，我们将实现一个应用了编排能力的示例，结合 callbacks 和 call option 来实现观测和请求粒度的扩展能力。

- [复杂业务逻辑的利器-编排](/zh/docs/eino/quick_start/complex_business_logic_orchestration)

## 下一步探索

- 理解 Eino 的核心模块和概念： [Eino: 核心模块](/zh/docs/eino/core_modules)，这是你自如玩转使用 Eino 做应用开发的关键信息。
- 我们准备了大量的 “如何做到？”： [Eino: 如何做到?](/zh/docs/eino/usage_guide/how_to_guide)，你可以快速浏览一下用 Eino 做大模型应用开发时，有哪些「能力」可用？也可以在你遇到希望解决的场景时，参考我们对这个场景的理解和解决方案。
- 我们构建了数个“开箱即用的应用示例 !”： [Eino: 开箱即用示例大全](/zh/docs/eino/usage_guide/examples_collection)。我们的理念是: 拿来即用，充分参考，先玩起来！
- Eino 保持开放生态的姿态，提供了大量生态集成组件：[Eino: 生态集成](/zh/docs/eino/ecosystem_integration)，你可以使用这些组件快速构建自己的业务应用。
