---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: 概述
weight: 2
---

# 什么是 Eino ADK？

Eino ADK 是 Go 语言的 Agent 开发框架，提供：

- **ChatModelAgent**：以 LLM 为决策器的 ReAct Agent，支持工具调用、自主推理、运行时增强（Middleware）
- **Workflow Agents**：确定性编排原语（Sequential / Loop / Parallel）
- **Runner / TurnLoop**：Agent 执行入口，支持事件流、checkpoint/resume、多轮抢占
- **多 Agent 协作**：AgentAsTool（推荐）、Workflow 组合

适用场景广泛、模型无关、部署无关。

# ADK 架构

## Agent Interface

ADK 的所有功能围绕 `Agent` 接口展开：

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

`Run` 的语义：

1. 从 `AgentInput` 和 Context 中获取任务信息
2. 异步执行任务，产出的事件写入 `AsyncIterator`
3. 启动异步任务后立即返回 Iterator（Future 模式）

## ChatModelAgent

ADK 的核心实现。以 ChatModel 为决策器，通过 ReAct Loop 自主推进问题求解。

**ChatModelAgent = ChatModel + Tools + ReAct Loop + Middleware**

详细介绍见：[Eino ADK: ChatModelAgent 介绍](/zh/docs/eino/overview/五分钟上手_eino_adk_deep_agents)

## 多 Agent 协作

> 💡
> 推荐方式：**AgentAsTool** — 将子 Agent 转为 Tool，父 Agent 通过 ToolCall 调用并获取结果。这是最灵活、最可组合的协作模式。

<table>
<tr><td>协作方式</td><td>机制</td><td>适用场景</td></tr>
<tr><td><strong>AgentAsTool</strong>（推荐）</td><td>子 Agent 包装为 Tool，父 Agent 自主决定是否调用</td><td>委派子任务、能力组合</td></tr>
<tr><td><strong>Workflow</strong></td><td>Sequential / Loop / Parallel 确定性编排</td><td>流程固定的多步任务</td></tr>
</table>

详见：[Agent 协作](/zh/docs/eino/core_modules/eino_adk/agent_collaboration)

## Runner

Runner 是 Agent 的执行入口。只有通过 Runner 执行时才能使用：

- **事件流输出**：Query/Run → AsyncIterator[AgentEvent]
- **Checkpoint / Resume**：持久化运行状态，支持中断恢复
- **TurnLoop**：多轮运行时，Push/Preempt/Stop

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
    CheckPointStore: store, // 可选
})

iter := runner.Query(ctx, "你的问题")
```

详见：[Agent Runner 与扩展](/zh/docs/eino/core_modules/eino_adk/agent_extension) | [Agent Cancel 与 TurnLoop](/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门)
