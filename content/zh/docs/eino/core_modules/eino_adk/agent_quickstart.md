---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Quickstart
weight: 1
---

# Installation

Eino ADK 自 v0.5.0 起可用，v0.9.0 为当前推荐版本：

```go
go get github.com/cloudwego/eino@latest
```

# 核心概念

**Eino ADK** 是 Go 语言的 Agent 开发框架。核心原语是 **ChatModelAgent**——以 ChatModel 为决策器、以 Tools 为行动空间、通过 ReAct Loop 自主推进问题求解的智能体。

> 💡
> 如果你只读一篇文档，请读：[Eino ADK: ChatModelAgent 介绍](/zh/docs/eino/overview/五分钟上手_eino_adk_deep_agents)

## 组件地图

<table>
<tr><td>组件</td><td>职责</td><td>文档</td></tr>
<tr><td><strong>ChatModelAgent</strong></td><td>ReAct Loop：推理 → 行动 → 反馈，自主决策</td><td><a href="/zh/docs/eino/overview/五分钟上手_eino_adk_deep_agents">ChatModelAgent 介绍</a></td></tr>
<tr><td><strong>Middleware</strong></td><td>在 ReAct Loop 的生命周期点位注入行为（压缩、搜索、重试等）</td><td><a href="/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware">ChatModelAgentMiddleware</a></td></tr>
<tr><td><strong>Runner</strong></td><td>单次 Agent 运行入口：Query / Run → 事件流</td><td><a href="/zh/docs/eino/core_modules/eino_adk/agent_extension">Agent Runner 与扩展</a></td></tr>
<tr><td><strong>TurnLoop</strong></td><td>多轮运行时：Push / Preempt / Stop + 声明式 checkpoint/resume</td><td><a href="/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门">Agent Cancel 与 TurnLoop</a></td></tr>
<tr><td><strong>DeepAgents</strong></td><td>预构建 Agent：任务规划（PlanTask）+ 子任务委派（TaskTool）</td><td><a href="/zh/docs/eino/core_modules/eino_adk/agent_implementation/deepagents">DeepAgents</a></td></tr>
</table>

## 其他 Agent 类型

除 ChatModelAgent 外，ADK 还提供确定性编排原语：

- **Workflow Agents**：Sequential / Loop / Parallel Agent，用于预定义流程的结构化编排。
- **Custom Agent**：实现 `Agent` 接口即可接入框架。

> 💡
> Graph（确定性编排）与 Agent（自主决策）是两种不同的 AI 应用形态。当核心问题是"自主决策 + 运行时增强"时，推荐使用 ChatModelAgent。详见 ChatModelAgent 介绍中的"为什么不继续使用 flow/react"。

# 示例

[eino-examples/adk](https://github.com/cloudwego/eino-examples/tree/main/adk) 提供了完整的 ADK 示例代码：

- **ChatModelAgent 入门**：[chatmodel](https://github.com/cloudwego/eino-examples/tree/main/adk/intro/chatmodel) — 书籍推荐 Agent，含中断与恢复
- **DeepAgents**：[deep](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep) — 任务规划 + 子任务委派
- **Workflow**：[sequential](https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/sequential) / [loop](https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/loop) / [parallel](https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/parallel)
- **Multi-Agent**：[supervisor](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/supervisor) / [plan-execute](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/plan-execute-replan)

# What's Next
