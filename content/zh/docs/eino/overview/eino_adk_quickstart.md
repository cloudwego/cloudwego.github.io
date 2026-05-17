---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: 五分钟上手 Eino ADK
weight: 9
---

本文面向已了解 Eino 的开发者，聚焦 ADK 中最重要的自主决策原语：**ChatModelAgent** 及其运行时增强机制 **ChatModelAgentMiddleware**。

## 先认识 ChatModelAgent

当我们谈论 "Agent" 时，绝大多数时候指的是：以大模型为核心，配备工具，能够自主决策并解决复杂现实问题的实体。`ChatModelAgent` 就是 Eino ADK 对这一概念的直接实现。

**ChatModelAgent = 以 ChatModel 作为决策器、以 Tools 作为行动空间、以工具反馈和历史记录作为下一轮决策上下文的 ReAct Agent。**

四个关键部分：

1. **ChatModel**：大模型，负责推理与决策。
2. **Tools**：工具集合，定义 Agent 可执行的行动范围。
3. **反馈**：工具执行结果回到模型上下文，成为下一轮决策的依据。
4. **历史记录**：完整保留问题求解过程中的推理轨迹、工具调用和工具结果。

因此，`ChatModelAgent` 不是一次模型调用，而是一次可持续推进的问题求解过程。

## ChatModelAgent 的执行结构：ReAct Loop

`ChatModelAgent` 的核心能力是**自主决策**——在一次 `Run` 中，模型可以反复推理、行动、获取反馈，直到问题被解决。支撑这种能力的执行结构就是 ReAct Loop。

自主决策需要四个要素同时存在：

1. **决策器（ChatModel）**：每一轮根据当前上下文，判断下一步该做什么。
2. **行动空间（Tools）**：定义 Agent 能采取的具体行动。
3. **反馈信号（Tool Feedback）**：行动的结果被注入上下文，成为后续决策的依据——这使 Agent 能根据真实执行结果修正方向，而不是一次猜测到底。
4. **累积上下文（History）**：完整保留推理轨迹、工具调用与工具结果。每一轮模型看到的不是独立的单次提问，而是从问题开始到当前为止的完整求解过程。

这四者缺一不可：没有决策器就无法推理，没有行动空间就无法执行，没有反馈就无法修正，没有累积上下文就无法基于历史做出更好的判断。

<a href="/img/eino/HAz4wb8f6h4XSOb7yUVc2CkUnAg.png" target="_blank"><img src="/img/eino/HAz4wb8f6h4XSOb7yUVc2CkUnAg.png" width="100%" /></a>

关键特征：**累积上下文驱动的渐进式决策**。每一轮循环不是从零开始，而是在此前所有推理与行动的完整轨迹之上继续推进。模型的每一次决策都基于不断增长的问题求解上下文做出，这让 Agent 能处理需要多步推理、试错、修正的复杂任务。

## 什么让你的 ChatModelAgent 不同

ReAct Loop 的结构是固定的。那什么让**你的** ChatModelAgent 有别于其他人的，能针对你的具体问题？

四个维度：

1. **ChatModel** — 选择哪个模型做决策。
2. **Instruction** — 系统指令：角色定义、行为约束、少样本示例。
3. **Tools** — 工具集合：决定 Agent 可以做什么。
4. **Middleware（ChatModelAgentMiddleware）** — 在 ReAct Loop 的特定生命周期点位上注入行为：拦截、修改、增强循环中的输入和输出。

前三者定义了 Agent "是什么"——决策能力、角色约束、行动范围。

Middleware 定义了 Agent "怎么跑"——它不改变 Loop 的结构（推理 → 行动 → 反馈始终不变），而是控制循环运行时的具体行为。例如：模型调用前压缩上下文、运行前动态注入工具、工具调用时做权限检查、模型失败时重试或切换备用模型。这些都是在 Loop 的特定点位上做的运行时增强。

## Middleware：在 ReAct Loop 中注入行为

构建 ChatModelAgent 时，你会遇到这些典型问题：

- **Agent 需要读写文件、执行命令？** → 需要在运行前注入一组通用工具。
- **Agent 需要复用一组预定义的指令和知识？** → 需要把可复用能力打包成 Skill，按需加载。
- **上下文越来越长，超出模型窗口怎么办？** → 需要在每次模型调用前自动压缩历史。
- **工具太多，全部塞进 prompt 会稀释注意力？** → 需要按需搜索和加载工具。
- **模型偶尔调用失败或返回垃圾？** → 需要自动重试或切换备用模型。

这些需求的共同点：它们不需要改变 ReAct Loop 的结构，只需要在循环的特定点位上拦截和增强。这就是 Middleware 做的事。

对应的内置 Middleware：

<table>
<tr><td>场景</td><td>Middleware</td><td>做了什么</td></tr>
<tr><td>需要文件系统能力</td><td><strong>FileSystem</strong></td><td>运行前注入 ls/read/write/edit/grep/execute 等工具</td></tr>
<tr><td>复用预定义能力</td><td><strong>Skill</strong></td><td>将指令、知识、工具打包为可按需加载的技能单元</td></tr>
<tr><td>上下文超窗口</td><td><strong>Reduction / Summarization</strong></td><td>模型调用前压缩消息和工具结果</td></tr>
<tr><td>工具过多</td><td><strong>ToolSearch</strong></td><td>按需搜索并加载 Tools，而非一次性暴露全部</td></tr>
<tr><td>模型调用不稳定</td><td><strong>ModelRetry / ModelFailover</strong></td><td>单次模型调用维度做重试 / 故障切换</td></tr>
</table>

每个 Middleware 的实现，都是在 ReAct Loop 的某个钩子点位上做注入。下图展示了 `ChatModelAgentMiddleware` 的各个钩子在循环中的位置：

<a href="/img/eino/RlIuwflSQh1gzlb7eMkcarFenbe.png" target="_blank"><img src="/img/eino/RlIuwflSQh1gzlb7eMkcarFenbe.png" width="100%" /></a>

对应的钩子点位总结：

<table>
<tr><td>钩子点位</td><td>时机</td><td>典型用途</td></tr>
<tr><td><pre>BeforeAgent</pre></td><td>Agent 运行前（仅一次）</td><td>增强 Instruction，注入 Tools</td></tr>
<tr><td><pre>BeforeModelRewriteState</pre></td><td>每次模型调用前</td><td>修改 Messages / ToolInfos</td></tr>
<tr><td><pre>AfterModelRewriteState</pre></td><td>每次模型调用后</td><td>修改模型响应或修补状态</td></tr>
<tr><td><pre>WrapModel</pre></td><td>单次模型调用维度</td><td>重试、故障切换、改写模型返回</td></tr>
<tr><td><pre>WrapToolCall</pre></td><td>单次工具调用维度</td><td>权限、安全、输出改写</td></tr>
<tr><td><pre>AfterAgent</pre></td><td>Agent 成功结束后</td><td>后处理、状态清理</td></tr>
</table>

完整 Middleware 速查见文末附录。

## 快速上手：创建并运行 ChatModelAgent

`Runner` 是执行 Agent 的入口。它把一次用户请求转化为一次 Agent 运行，负责单次运行配置、事件流输出、流式开关，以及 checkpoint / resume 等运行期能力。最小用法是：把 `ChatModelAgent` 放进 `RunnerConfig`，然后调用 `Query` 或 `Run`。

以下示例展示了如何创建一个最简 ChatModelAgent，并通过 Runner 执行：

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/tool"
)

func main() {
    ctx := context.Background()

    // 1. 创建 ChatModel
    chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        Model:  "doubao-seed-1-8-251228",
        APIKey: "your_api_key", // 替换为你的 API Key
    })
    if err != nil {
        log.Fatal(err)
    }

    // 2. 创建 ChatModelAgent
    agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        Name:        "my-assistant",
        Description: "一个可以使用工具回答问题的助手。",
        Instruction: "你是一个有帮助的助手。请根据可用工具回答用户问题。",
        Model:       chatModel,
        ToolsConfig: adk.ToolsConfig{
            ToolsNodeConfig: compose.ToolsNodeConfig{
                Tools: []tool.BaseTool{
                    // 注册你的工具，例如 webSearchTool
                },
            },
        },
        // Handlers: []adk.ChatModelAgentMiddleware{...}, // 注册 Middleware
    })
    if err != nil {
        log.Fatal(err)
    }

    // 3. 通过 Runner 执行 Agent
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
        Agent:           agent,
        EnableStreaming: true,
    })

    // 4. 发送用户请求并消费事件流
    iter := runner.Query(ctx, "帮我搜索一下今天的新闻")
    for {
        event, ok := iter.Next()
        if !ok {
            break
        }
        fmt.Println(event)
    }
}
```

核心流程：`NewChatModelAgent` → `NewRunner` → `Runner.Query/Run` → 消费 `AsyncIterator` 事件流。

更多基础示例可参考：[Eino: 快速开始](/zh/docs/eino/quick_start)。

## 延伸阅读：DeepAgents

DeepAgents 是一个预构建的 ChatModelAgent，核心价值在于两个预置 Middleware：

- **WriteTodos（PlanTask）**：让主 Agent 在执行前显式规划任务列表，并在执行过程中持续追踪进度。复杂问题不再靠模型"一口气想完"，而是先拆解、再逐步推进。
- **TaskTool**：让主 Agent 把子任务委派给子 Agent 执行，子 Agent 独立完成后将结果汇总回主循环。这使得单个 Agent 的能力边界可以通过组合来扩展。

此外，DeepAgents 还预置了系统提示词和可选的 FileSystem Middleware，开箱即可处理需要任务规划和多 Agent 协作的场景。

```
DeepAgents = ChatModelAgent
           + WriteTodos（任务规划与追踪）
           + TaskTool（子任务委派）
           + 可选 FileSystem
           + 预置系统提示词
```

进一步阅读：

- Eino ADK Deep Agents 完整指南：[Eino ADK: DeepAgents](/zh/docs/eino/core_modules/eino_adk/agent_implementation/deepagents)
- DeepAgents 示例：[eino-examples/adk/multiagent/deep at main · cloudwego/eino-examples](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep)

## 延伸阅读：为什么不继续使用 flow/react？

回到第一性原理：Graph 和 Agent 是两种本质不同的 AI 应用形态。

- **Graph** 的核心是**确定性**：开发者预定义拓扑结构，节点间的流转关系在编译期就已确定。输入是结构化的，输出是可预测的。
- **Agent** 的核心是**自主性**：LLM 在运行时动态决定下一步行动，执行路径不可预知，输出是全过程事件流。

`flow/react` 本质上是用 Graph 的方式来"模拟" Agent——把 ReAct 的推理循环展开为静态的节点和边。这可行，但本质上是一种错位：用确定性编排来承载动态决策。当 Agent 的复杂度增长时，这个错位会产生系统性问题：

1. **交付物不匹配**：Graph 面向"最终结果"，而 Agent 的交付物是全过程（推理轨迹、中间工具调用、状态变化）。用 Graph 做 Agent 时，中间过程只能通过 Callback 等旁路抽取——可行，但属于补丁。
2. **运行模式不匹配**：Graph 是同步执行模型，而 Agent 天然是异步的长时运行。事件流输出、checkpoint / resume、中断恢复等运行期能力，需要框架在 Agent 维度统一管理，而非散落在 Graph 节点的回调中。
3. **扩展点不匹配**：Agent 的运行时增强（上下文压缩、工具动态加载、模型重试、安全控制）本质上是对决策循环的拦截和注入。在 Graph 中，这些能力没有统一的挂载点，只能散落在各个节点或边上；在 ChatModelAgent 中，它们有明确的生命周期钩子（Middleware）。

因此，flow/react 不是被废弃，而是回到它最匹配的位置：**确定性流程编排**。当核心问题是"自主决策 + 运行时增强"时，正确的抽象是 `ChatModelAgent + ChatModelAgentMiddleware`。

进一步阅读：

- Agent 还是 Graph？AI 应用路线辨析：[Agent 还是 Graph？AI 应用路线辨析](/zh/docs/eino/overview/graph_or_agent)

<a href="/img/eino/Xs38beDNAobevkx0epfcjkCnnFb.png" target="_blank"><img src="/img/eino/Xs38beDNAobevkx0epfcjkCnnFb.png" width="100%" /></a>

## 附录：Middleware 速查

### 实例一览

<table>
<tr><td>Middleware</td><td>描述</td></tr>
<tr><td><strong>Reduction</strong></td><td>超长工具输出截断 / 写入文件系统，防止 token 超限</td></tr>
<tr><td><strong>Summarization</strong></td><td>历史消息摘要压缩</td></tr>
<tr><td><strong>Skill</strong></td><td>可复用指令/知识以 Tool 形式暴露，Agent 按需加载</td></tr>
<tr><td><strong>FileSystem</strong></td><td>ls/read/write/edit/glob/grep/execute 文件操作工具集</td></tr>
<tr><td><strong>ToolSearch</strong></td><td><pre>tool_search</pre> 元工具，按需搜索加载工具（减少常驻工具列表占用）</td></tr>
<tr><td><strong>PatchToolCall</strong></td><td>修补消息历史中的悬空工具调用（缺失工具结果）</td></tr>
<tr><td><strong>SafeTool</strong></td><td>WrapToolCall 维度拦截工具执行错误，转为可读文本返回模型，使 Agent 可自行修正而非中断</td></tr>
<tr><td><strong>ModelRetry</strong></td><td>模型调用失败时按策略重试 [内置配置]</td></tr>
<tr><td><strong>ModelFailover</strong></td><td>模型调用失败时切换备用模型 [内置配置]</td></tr>
<tr><td><strong>AgentsMD</strong></td><td>将 Agents.md 知识文件注入模型上下文，提升上下文质量</td></tr>
<tr><td><strong>PlanTask</strong></td><td>持久化的任务管理工具集（create/get/update/list），支持依赖关系追踪</td></tr>
<tr><td><strong>WriteTodos</strong></td><td>轻量级 TODO 列表工具，Agent 可创建和追踪结构化待办事项 [DeepAgent 内置]</td></tr>
<tr><td><strong>TaskTool</strong></td><td>子 Agent 委派工具，主 Agent 通过它把子任务交给子 Agent 独立执行 [DeepAgent 内置]</td></tr>
<tr><td><strong>Permission</strong></td><td>工具调用权限控制 [WIP]</td></tr>
</table>

> 注：ModelRetry / ModelFailover 在代码中是 `ChatModelAgentConfig` 的内置字段（`ModelRetryConfig` / `ModelFailoverConfig`），概念上对应 `WrapModel` 钩子。SafeTool 为示例模式（见 ChatWithEino ch05），实现为用户自定义 Middleware。WriteTodos / TaskTool 为 DeepAgent 内置，不单独导出。Permission 为规划中能力。

### 分类

<table>
<tr><td>类别</td><td>解决什么问题</td><td>包含</td></tr>
<tr><td><strong>扩展通用 Tool</strong></td><td>给 Agent 更多能力</td><td>FileSystem, Skill, ToolSearch, PlanTask, WriteTodos, TaskTool</td></tr>
<tr><td><strong>处理 ReAct 过程中的错误</strong></td><td>提高可靠性</td><td>ModelRetry, ModelFailover, SafeTool, PatchToolCall</td></tr>
<tr><td><strong>保证上下文窗口在上限内</strong></td><td>防 token 超限</td><td>Reduction, Summarization, ToolSearch</td></tr>
<tr><td><strong>安全与权限</strong></td><td>约束 Agent 行为</td><td>Permission</td></tr>
<tr><td><strong>提高上下文内容质量</strong></td><td>让模型看到更好的上下文</td><td>Skill, AgentsMD</td></tr>
</table>

ToolSearch 跨两个类别：既是"扩展 Tool"（提供按需工具发现能力），也是"保证上下文窗口"（避免一次性加载过多工具描述）。

进一步阅读：

- ChatModelAgent Middleware 详解：[Eino ADK: ChatModelAgentMiddleware](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware)
