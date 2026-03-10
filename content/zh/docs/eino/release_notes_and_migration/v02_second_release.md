---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: v0.2.*-second release
weight: 2
---

## v0.2.6

> 发版时间：2024-11-27

### Features

- 增加流式的 Pre、Post StateHandler
- 支持 StateChain
- 新增 MessageParser 节点，将 ChatModel 输出的 Message 转换成业务定制结构体
  - Parse(ctx context.Context, m *Message) (T, error)
- 针对 Chain AppendNode 时，支持 WithNodeKey()

### BugFix

- 修复 ConcatMessage 时，由于没有深 Copy 导致的首个 Chunk 被修改的问题。
- ConcatMessage 时，FinishReason 只保留最后一个 Chunk 的有效值

## v0.2.5

> 发版时间：2024-11-21

### BugFix

- 修复 Gonja 禁用  include 等关键字导致的 panic 问题

## v0.2.4

> 发版时间：2024-11-20

### Features

- Eino Message ResponseMeta 中增加 TokenUsage 字段
- Eino Message ToolsCall 按照 index 进行排序

### BugFix

## v0.2.3

> 发版时间：2024-11-12

### Features

- Graph 调用时，支持 context 的 Timeout 和 Cancel

### BugFix

- FinishReason 可能在任意一个包中返回，不建设一定再最后一个包返回
- callbacks.HandlerBuilder 不再提供默认的 Needed() 方法， 此方法默认返回 false，在内嵌 callbacks.HandlerBuilder 场景，会导致所有的切面函数失效

## v0.2.2

> 发版时间：2024-11-12

### Features

- Message 中增加 FinishReason 字段
- 增加 GetState[T]() 方法，可在节点中获取 State 结构体
- Lazy Init Gonjia SDK

### BugFix

## v0.2.1

> 发版时间：2024-11-07

### BugFix

- Fixed the SSTI vulnerability in the Jinja chat template（langchaingo gonja 模板注入）

## v0.2.0

> 发版时间：2024-11-07

### Features

- Callback API 重构（兼容更新）

  - 面向组件实现者：隐藏并废弃 callbacks.Manager，提供更简单的注入 callback 切面的工具函数。
  - 面向 Handler 实现者：提供 callbacks.Handler 快速实现的模版方法，封装了组件类型判断、input/output 类型断言和转换等细节，用户只需要提供特定组件的特定 callback 方法的具体实现。
  - 运行机制：针对一次运行的某个具体的 callback 切面时机，根据组件类型和 Handler 具体实现的方法，额外筛选出需要执行的具体的 handler。
- 新增 Host Multi-Agent：实现 Host 模式的 Multi-Agent，即 Host 做意图识别后跳转到各个 Specialist Agent 做具体的生成。
- React Agent API 变更（不兼容）

  - 去掉 AgentCallback 定义，改为通过 BuildAgentCallback 工具函数，快速注入 ChatModel 和 Tool 的 CallbackHandlers。使用姿势：

    ```go
    func BuildAgentCallback(modelHandler *model.CallbackHandler, toolHandler *tool.CallbackHandler) callbacks.Handler {
        return template.NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
    }
    ```

    - 从而做到 AgentCallback 与组件的语义对齐，可以返回 ctx，可以使用扩展后的 tool.CallbackInput, tool.CallbackOutput。
  - 去掉 react.Option 定义。React Agent 改为使用 Agent 通用的 agent.Option 定义，方便在 multi-agent 层面组合编排。

    - 不再需要 WithAgentCallback 来注入特殊的 AgentCallback，新的使用姿势：

    ```
    agent.WithComposeOptions(compose.WithCallbacks(xxxCallbackHandler))
    ```
- 新增 Document Parser 接口定义：作为 Loader 组件的依赖，负责将 io.Reader 解析为 Document，并提供了根据文件扩展名进行解析的 ExtParser 实现。

### BugFix

- 修复 embedding.GetCommonOptions 和 indexer.GetCommonOptions 未对 apply 做判空可能导致的空指针异常。
- Graph 运行时，preProcessor 和 postProcessor 使用当前 ctx。

## v0.2.0-dev.1

> 发版时间：2024-11-05

### Features

- 初步设计并支持 Checkpoint 机制，尝鲜试用

### BugFix
