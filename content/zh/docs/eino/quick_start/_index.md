---
Description: ""
date: "2025-02-08"
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

## 下一步探索

- 理解 Eino 的核心模块和概念： [Eino: 核心模块](/zh/docs/eino/core_modules)，这是你自如玩转使用 Eino 做应用开发的关键信息。
- Eino 保持开放生态的姿态，提供了大量生态集成组件：[Eino: 生态集成](/zh/docs/eino/ecosystem_integration)，你可以使用这些组件快速构建自己的业务应用。
