---
Description: ""
date: "2025-12-02"
lastmod: ""
tags: []
title: 'Eino ADK: 概述'
weight: 2
---

# 什么是 Eino ADK？

Eino ADK 参考  [Google-ADK](https://google.github.io/adk-docs/agents/) 的设计，提供了 Go 语言 的 Agents 开发的灵活组合框架，即 Agent、Multi-Agent 开发框架。Eino ADK 为多 Agent 交互时，沉淀了通用的 上下文传递、事件流分发和转换、任务控制权转让、中断与恢复、通用切面等能力。 适用场景广泛、模型无关、部署无关，让 Agent、Multi-Agent 开发更加简单、便利，并提供完善的生产级应用的治理能力。

Eino ADK 旨在帮助开发者开发、管理 Agent 应用。提供灵活且鲁棒的开发环境，助力开发者搭建 对话智能体、非对话智能体、复杂任务、工作流等多种多样的 Agent 应用。

# ADK 框架

Eino ADK 的整体模块构成，如下图所示：

<a href="/img/eino/eino_adk_module_architecture.png" target="_blank"><img src="/img/eino/eino_adk_module_architecture.png" width="100%" /></a>

## Agent Interface

Eino ADK 的核心是 Agent 抽象(Agent Interface)，ADK 的所有功能设计均围绕 Agent 抽象展开。详解请见 [Eino ADK: Agent 抽象 [New]](/zh/docs/eino/core_modules/eino_adk/agent_interface)

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string

    // Run runs the agent.
    // The returned AgentEvent within the AsyncIterator must be safe to modify.
    // If the returned AgentEvent within the AsyncIterator contains MessageStream,
    // the MessageStream MUST be exclusive and safe to be received directly.
    // NOTE: it's recommended to use SetAutomaticClose() on the MessageStream of AgentEvents emitted by AsyncIterator,
    // so that even the events are not processed, the MessageStream can still be closed.
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

`Agent.Run` 的定义为：

1. 从入参 AgentInput、AgentRunOption 和可选的 Context Session 中获取任务详情及相关数据
2. 执行任务，并将执行过程、执行结果写入到 AgentEvent Iterator

`Agent.Run` 要求 Agent 的实现以 Future 模式异步执行，核心分成三步，具体可参考 ChatModelAgent 中 Run 方法的实现：

1. 创建一对 Iterator、Generator
2. 启动 Agent 的异步任务，并传入 Generator，处理 AgentInput。Agent 在这个异步任务执行核心逻辑（例如 ChatModelAgent 调用 LLM），并在产生新的事件时写入到 Generator 中，供 Agent 调用方在 Iterator 中消费
3. 启动 2 中的任务后立即返回 Iterator

## 多 Agent 协作

围绕 Agent 抽象，Eino ADK 提供多种简单易用、场景丰富的组合原语，可支撑开发丰富多样的 Multi-Agent 协同策略，比如 Supervisor、Plan-Execute、Group-Chat 等 Multi-Agent 场景。从而实现不同的 Agent 分工合作模式，处理更复杂的任务。详解请见 [Eino ADK: Agent 组合](/zh/docs/eino/core_modules/eino_adk/agent_collaboration)

Eino ADK 定义的 Agent 协作过程中的协作原语如下：

- Agent 间协作方式

<table>
<tr><td>协助方式</td><td>描述</td></tr>
<tr><td>Transfer</td><td>直接将任务转让给另外一个 Agent，本 Agent 则执行结束后退出，不关心转让 Agent 的任务执行状态</td></tr>
<tr><td>ToolCall(AgentAsTool)</td><td>将 Agent 当成 ToolCall 调用，等待 Agent 的响应，并可获取被调用Agent 的输出结果，进行下一轮处理</td></tr>
</table>

- AgentInput 的上下文策略

<table>
<tr><td>上下文策略</td><td>描述</td></tr>
<tr><td>上游 Agent 全对话</td><td>获取本 Agent 的上游 Agent 的完整对话记录</td></tr>
<tr><td>全新任务描述</td><td>忽略掉上游 Agent 的完整对话记录，给出一个全新的任务总结，作为子 Agent 的 AgentInput 输入</td></tr>
</table>

- 决策自主性

<table>
<tr><td>决策自主性</td><td>描述</td></tr>
<tr><td>自主决策</td><td>在 Agent 内部，基于其可选的下游 Agent， 如需协助时，自主选择下游 Agent 进行协助。 一般来说，Agent 内部是基于 LLM 进行决策，不过即使是基于预设逻辑进行选择，从 Agent 外部看依然视为自主决策</td></tr>
<tr><td>预设决策</td><td>事先预设好一个Agent 执行任务后的下一个 Agent。 Agent 的执行顺序是事先确定、可预测的</td></tr>
</table>

围绕协作原语，Eino ADK 提供了如下的几种 Agent 组合原语：

<table>
<tr><td>类型</td><td>描述</td><td>运行模式</td><td>协作方式</td><td>上下文策略</td><td>决策自主性</td></tr>
<tr><td><strong>SubAgents</strong></td><td>将用户提供的 agent 作为 父Agent，用户提供的 subAgents 列表作为 子Agents，组合而成可自主决策的 Agent，其中的 Name 和 Description 作为该 Agent 的名称标识和描述。<li>当前限定一个 Agent 只能有一个 父 Agent</li><li>可采用 SetSubAgents 函数，构建 「多叉树」 形式的 Multi-Agent</li><li>在这个「多叉树」中，AgentName 需要保持唯一</li></td><td><a href="/img/eino/eino_adk_preview_tree.png" target="_blank"><img src="/img/eino/eino_adk_preview_tree.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>自主决策</td></tr>
<tr><td><strong>Sequential</strong></td><td>将用户提供的 SubAgents 列表，组合成按照顺序依次执行的 Sequential Agent，其中的 Name 和 Description 作为 Sequential Agent 的名称标识和描述。Sequential Agent 执行时，将 SubAgents 列表，按照顺序依次执行，直至将所有 Agent 执行一遍后结束。</td><td><a href="/img/eino/eino_adk_overview_sequential.png" target="_blank"><img src="/img/eino/eino_adk_overview_sequential.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
<tr><td><strong>Parallel</strong></td><td>将用户提供的 SubAgents 列表，组合成基于相同上下文，并发执行的 Parallel Agent，其中的 Name 和 Description 作为 Parallel Agent 的名称标识和描述。Parallel Agent 执行时，将 SubAgents 列表，并发执行，待所有 Agent 执行完成后结束。</td><td><a href="/img/eino/eino_adk_parallel_controller_overview.png" target="_blank"><img src="/img/eino/eino_adk_parallel_controller_overview.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
<tr><td><strong>Loop</strong></td><td>将用户提供的 SubAgents 列表，按照数组顺序依次执行，循环往复，组合成 Loop Agent，其中的 Name 和 Description 作为 Loop Agent 的名称标识和描述。Loop Agent 执行时，将 SubAgents 列表，顺序执行，待所有 Agent 执行完成后结束。</td><td><a href="/img/eino/eino_adk_yet_another_loop.png" target="_blank"><img src="/img/eino/eino_adk_yet_another_loop.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
<tr><td><strong>AgentAsTool</strong></td><td>将一个 Agent 转换成 Tool，被其他的 Agent 当成普通的 Tool 使用。一个 Agent 能否将其他 Agent 当成 Tool 进行调用，取决于自身的实现。Eino ADK 中提供的 ChatModelAgent 支持 AgentAsTool 的功能</td><td><a href="/img/eino/eino_adk_agent_as_tool_sequence_diagram_1.png" target="_blank"><img src="/img/eino/eino_adk_agent_as_tool_sequence_diagram_1.png" width="100%" /></a></td><td>ToolCall</td><td>全新任务描述</td><td>自主决策</td></tr>
</table>

## ChatModelAgent

`ChatModelAgent` 是 Eino ADK 对 Agent 的关键实现，它封装了与大语言模型的交互逻辑，实现了 ReAct 范式的 Agent，基于 Eino 中的 Graph 编排出 ReAct Agent 控制流，通过 callbacks.Handler 导出 ReAct Agent 运行过程中产生的事件，转换成 AgentEvent 返回。

想要进一步了解 ChatModelAgent，请见：[Eino ADK: ChatModelAgent [New]](/zh/docs/eino/core_modules/eino_adk/agent_implementation/chat_model)

```go
type ChatModelAgentConfig struct {
    // Name of the agent. Better be unique across all agents.
    Name string
    // Description of the agent's capabilities.
    // Helps other agents determine whether to transfer tasks to this agent.
    Description string
    // Instruction used as the system prompt for this agent.
    // Optional. If empty, no system prompt will be used.
    // Supports f-string placeholders for session values in default GenModelInput, for example:
    // "You are a helpful assistant. The current time is {Time}. The current user is {User}."
    // These placeholders will be replaced with session values for "Time" and "User".
    Instruction string

    Model model.ToolCallingChatModel

    ToolsConfig ToolsConfig

    // GenModelInput transforms instructions and input messages into the model's input format.
    // Optional. Defaults to defaultGenModelInput which combines instruction and messages.
    GenModelInput GenModelInput

    // Exit defines the tool used to terminate the agent process.
    // Optional. If nil, no Exit Action will be generated.
    // You can use the provided 'ExitTool' implementation directly.
    Exit tool.BaseTool

    // OutputKey stores the agent's response in the session.
    // Optional. When set, stores output via AddSessionValue(ctx, outputKey, msg.Content).
    OutputKey string

    // MaxIterations defines the upper limit of ChatModel generation cycles.
    // The agent will terminate with an error if this limit is exceeded.
    // Optional. Defaults to 20.
    MaxIterations int
}

func NewChatModelAgent(_ context.Context, config *ChatModelAgentConfig) (*ChatModelAgent, error) {
    // omit code
}
```

# AgentRunner

AgentRunner 是 Agent 的执行器，为 Agent 运行所需要的拓展功能加以支持，详解请见：[Eino ADK: Agent 扩展](/zh/docs/eino/core_modules/eino_adk/agent_extension)

只有通过 Runner 执行 agent 时，才可以使用 ADK 的如下功能：

- Interrupt & Resume
- 切面机制（当前版本尚未支持）
- Context 环境的预处理

```go
type RunnerConfig struct {
    Agent           Agent
    EnableStreaming bool

    CheckPointStore compose.CheckPointStore
}

func NewRunner(_ context.Context, conf RunnerConfig) *Runner {
    // omit code
}
```
