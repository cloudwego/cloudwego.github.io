---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: v0.1.*-first release'
weight: 1
---

## v0.1.6

> 发版时间：2024-11-04

### Features

- NewTool、InferTool 的泛型形参支持 struct
- 废弃 WithGraphRunOption()，新增 WithRuntimeMaxSteps 方法
- 调整 ToolsNode 的 NodeName，新增 TooCallbackInput/Output 结构体
- Flow 中新增 MultiQuery、Router 两种 Retriever
- 新增 document.Loader、document.Transformer 两种组件抽象
- Message MultiPart 中新增 file_url, audio_url, video_url 三种类型

### BugFix

- 存在 InputKey 的节点中，如果输入的 map 中，不存在 InputKey 时，报错处理
- Message Stream 合并时(ConcatMessage)，调整 Name、Type、ID 的组合方式

## v0.1.5

> 发版时间：2024-10-25

### Features

- ConcatMessages 时，校验 Message 流中，是否存在 nil chunk，如果存在则报错，从而让流的生产方，不能塞入 nil message
- Message.ToolCall 中增加  Type 字段，表达 ToolType，并在 ConcatMessages 增加 ToolType 的增量合并

## v0.1.4

> 发版时间：2024-10-23

### Features

- 调整 Chain 的实现，基于 Graph[I, O] 封装 Chain
- 当上游输出节点是接口，且下游输入节点是这个接口的实现时，支持尝试把 上游输出接口断言成下游输入的实例。
  - 例如新增支持如下场景：  Node1[string, any] -> Node2[string, int]， 这种场景下，之前直接在 Compile 时报错，当前会尝试把 any 断言成 string，如果可断言成功，则继续执行。
- schema.Message 增加 Type 字段

### BugFix

- 修正 Tool 工具执行时的 Eino Callback 的 RunInfo 信息
  - 修正 RunInfo 的 Component 和 Type 字段
  - ToolName 作为 RunInfo.Name
- Passthrough 节点允许设置  OutputKey

## v0.1.3

> 发版时间：2024-10-17

### BugFix

- 修复 ToolsNode 返回 Message 时额外塞入了 ToolCalls 导致模型报错
  - 引入此问题是 v0.1.1 的 react agent 支持 tool return directly 时，扩展了 ToolsNode 返回的信息。本次更换了另一种方式实现 tool return directly，不会再导致此问题。

## v0.1.2

> 发版时间：2024-10-14

### Features

- StreamReader.Copy() 方法重新调整优化成 Goroutine Free 的 Copy 方式。避免业务忘记 StreamReader.Close() 导致的 Goroutine 泄漏的问题
- 校验检查：Passthrough 节点，不允许添加 InputKey/OutputKey
- Compile Callback Option 中，支持 InputKey、OutputKey 的回传

## v0.1.1

> 发版时间：2024-10-14

### Features

- React Agent 支持 Tool ReturnDirectly 的静态配置

### BugFix

- Revert Stream Copy 的新逻辑。
  - 因实现 Goroutine Free 的 Stream Copy，引入了 Recv 可能出现夯死的情况。预计下个 Patch 修复此问题

## v0.1.0

> 发版时间：2024-10-12

### Features

- 支持 ChatTemplate/ChatModel/Tool/LoaderAndSplitter/Indexer/Retriever/Embedding 多种组件的抽象和实现
- 支持 Graph/Chain/StateGraph 等多种编排工具
- 根据输入、输出是否为流式，支持 4 种交互模式，并内置了 Stream 工具
- 灵活易扩展的切面设计
