---
Description: ""
date: "2025-07-23"
lastmod: ""
tags: []
title: 'Eino ADK: 概述'
weight: 0
---

### Resources
| Category      | Location                                                                                                                                          |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **Core Code** | [`cloudwego/eino@feat/adk`](https://github.com/cloudwego/eino/tree/feat/adk/adk)                                                                  |
| **Releases**  | Branch `release/v0.5.0-alpha.X`<br>(e.g. [`v0.5.0-alpha.1`](https://github.com/cloudwego/eino/releases/tag/v0.5.0-alpha.1))                       |  
| **Examples**  | [`cloudwego/eino-examples@feat/adk`](https://github.com/cloudwego/eino-examples/tree/feat/adk/adk)                                                |  
| **Documentation** | [`cloudwego/cloudwego.github.io@feat/adk`](https://github.com/cloudwego/cloudwego.github.io/tree/main/content/zh/docs/eino/core_modules/eino_adk) |  

# 什么是 Eino ADK？

Eino ADK 参考  [Google-ADK](https://google.github.io/adk-docs/agents/) 的设计，提供了 Go 语言 的 Agents 开发的灵活组合框架，即 Agent、Multi-Agent 开发框架。Eino ADK 为多 Agent 交互时，沉淀了通用的 上下文传递、事件流分发和转换、任务控制权转让、中断与恢复、通用切面等能力。 适用场景广泛、模型无关、部署无关，让 Agent、Multi-Agent 开发更加简单、便利，并提供完善的生产级应用的治理能力。

Eino ADK 旨在帮助开发者开发、管理 Agent 应用。提供灵活且鲁棒的开发环境，助力开发者搭建 对话智能体、非对话智能体、复杂任务、工作流等多种多样的 Agent 应用。

# ADK 框架结构

Eino ADK 的整体模块构成，如下图所示：

![](/img/eino/eino_adk_architecture.png)

## Agent Interface

Eino ADK 的核心成员是 Agent 抽象(Agent Interface)，ADK 的所有功能设计均围绕 Agent 抽象展开。

Agent 核心行为抽象大致可描述为：

> 从入参中 AgentInput、AgentRunOption 和 可选的 Context Session，获取任务详情及相关数据
>
> 执行任务，并将执行过程、执行结果输出到 AgenEvent Iterator
>
> 执行任务时，可通过 Context 中的 Session 暂存数据

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput) *AsyncIterator[*AgentEvent]
}
```

在 Agent Run 的实现中，一般是 Future 模式的异步执行，大体分成三步，具体可参考 adk.ChatModelAgent 中 Run 方法的实现：

1. 创建一对 Iterator、Generator
2. 启动 Agent 的异步任务，并传入 Generator，处理 AgentInput。在这个异步任务中，产生新的事件时，写入到 Generator 中，供 Agent 调用方在 Iterator 中消费
3. 启动任务后，返回 Iterator

Agent 扩展行为抽象大致可描述为：

> Agent 既可添加子 Agent，也可添加父 Agent，即作为 父 Agent 的 子 Agent
>
> Agent 在执行任务时，可根据需要将任务转让(Transfer)给其 父 Agent 或 子 Agent

```go
type OnSubAgents interface {
    OnSetSubAgents(ctx context.Context, subAgents []Agent) error
    OnSetAsSubAgent(ctx context.Context, parent Agent) error

    OnDisallowTransferToParent(ctx context.Context) error
}
```

中心化的运行状态管理：

在 ADK 组合产物的运行中，每个 Agent 均可通过 context 中的 `Session map[string]any` 存取一些数据，Session 对所有 Agent 可见。Session 的生命周期对应着 ADK 组合产物的一次运行的生命周期（Interrupt&Resume 视为同一个生命周期）。

```go
func SetSessionValue(ctx context.Context, key string, value any) {
    // omit code
}

func GetSessionValue(ctx context.Context, key string) (any, bool) {
    // omit code
}
```

## Agent Compose

围绕 Agent 抽象，提供多种简单易用、场景丰富的组合原语，可支撑开发丰富多样的 Multi-Agent 协同策略，比如 Supervisor、Plan-Execute、Group-Chat 等 Multi-Agent 场景。从而实现不同的 Agent 分工合作模式，处理更复杂的任务。

Agent 协作过程中，可能存在的协作原语：

- Agent 间协作方式

<table>
<tr>
<td>协助方式<br/></td><td>描述<br/></td><td><br/></td></tr>
<tr>
<td> Transfer<br/></td><td>直接将任务转让给另外一个 Agent，本 Agent 则执行结束后退出，不关心转让 Agent 的任务执行状态<br/></td><td><br/></td></tr>
<tr>
<td>ToolCall<br/>(AgentAsTool)<br/></td><td>将 Agent 当成 ToolCall 调用，等待 Agent 的响应，并可获取被调用Agent 的输出结果，进行下一轮处理<br/></td><td><br/></td></tr>
</table>

- AgentInput 的上下文策略

<table>
<tr>
<td>上下文策略<br/></td><td>描述<br/></td><td><br/></td></tr>
<tr>
<td>上游 Agent 全对话<br/></td><td>获取本 Agent 的上游 Agent 的完整对话记录<br/></td><td><br/></td></tr>
<tr>
<td>全新任务描述<br/></td><td>忽略掉上游 Agent 的完整对话记录，给出一个全新的任务总结，作为子 Agent 的 AgentInput 输入<br/></td><td><br/></td></tr>
</table>

- 决策自主性

<table>
<tr>
<td>决策自主性<br/></td><td>描述<br/></td><td><br/></td></tr>
<tr>
<td>自主决策<br/><br/></td><td>在 Agent 内部，基于其可选的下游 Agent， 如需协助时，自主选择下游 Agent 进行协助。 一般来说，Agent 内部是基于 LLM 进行决策，不过即使是基于预设逻辑进行选择，从 Agent 外部看依然视为自主决策<br/></td><td><br/></td></tr>
<tr>
<td>预设决策<br/></td><td>事先预设好一个Agent 执行任务后的下一个 Agent。 Agent 的执行顺序是事先确定、可预测的<br/></td><td><br/></td></tr>
</table>

接下来简要说明下，Agent Compose 下的不同的组合原语。

### SubAgents

> - Agent 间协作方式：Transfer
> - AgentInput 的上下文策略：上游 Agent 全对话
> - 决策自主性：自主决策

将用户提供的 agent 作为 父 Agent，用户提供的 subAgents 列表作为 子 Agents，组合而成可自主决策的 Agent，其中的 Name 和 Description 作为该 Agent 的名称标识和描述。

- 当前限定一个 Agent 只能有一个 父 Agent
- 可采用 SetSubAgents 函数，构建 「多叉树」 形式的 Multi-Agent
- 在这个「多叉树」中，AgentName 需要保持唯一

```go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error) {
    // omit code
}
```

![](/img/eino/sub_agents_outline.png)

### Workflow

提供了 顺序、并行和循环三种工作流模式，供用户灵活组合出不同的工作流图

在 Workflow Agent 中，每个 Agent 拿到相同的 AgentInput 输入，按照预先设定好的拓扑结构所表达的顺序依次运行

#### Sequential

> - Agent 间协作方式：Transfer
> - AgentInput 的上下文策略：上游 Agent 全对话
> - 决策自主性：预设决策

将用户提供的 SubAgents 列表，组合成按照顺序依次执行的 Sequential Agent，其中的 Name 和 Description 作为 Sequential Agent 的名称标识和描述。

Sequential Agent 执行时，将 SubAgents 列表，按照顺序依次执行，直至将所有 Agent 执行一遍后结束。

注： 由于 Agent 只能获取到上游 Agent 的全对话，后执行的 Agent 看不到先执行的 Agent 的 AgentEvent 输出。

```go
type SequentialAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent
}

func NewSequentialAgent(ctx context.Context, config *SequentialAgentConfig) (Agent, error) {
    // omit code
}
```

![](/img/eino/sequential_workflow.png)

#### Parallel

> - Agent 间协作方式：Transfer
> - AgentInput 的上下文策略：上游 Agent 全对话
> - 决策自主性：预设决策

将用户提供的 SubAgents 列表，组合成基于相同上下文，并发执行的 Parallel Agent，其中的 Name 和 Description 作为 Parallel Agent 的名称标识和描述。

Parallel Agent 执行时，将 SubAgents 列表，并发执行，待所有 Agent 执行完成后结束。

```go
type ParallelAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent
}

func NewParallelAgent(ctx context.Context, config *ParallelAgentConfig) (Agent, error) {
    // omit code
}
```

![](/img/eino/parallel_workflow_outline.png)

#### Loop

> - Agent 间协作方式：Transfer
> - AgentInput 的上下文策略：上游 Agent 全对话
> - 决策自主性：预设决策

将用户提供的 SubAgents 列表，按照数组顺序依次执行，循环往复，组合成 Loop Agent，其中的 Name 和 Description 作为 Loop Agent 的名称标识和描述。

Sequential Agent 执行时，将 SubAgents 列表，并发执行，待所有 Agent 执行完成后结束。

```go
type LoopAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent

    MaxIterations int
}

func NewLoopAgent(ctx context.Context, config *LoopAgentConfig) (Agent, error) {
    // omit code
}
```

![](/img/eino/loop_workflow_outline.png)

### AgentAsTool

> - Agent 间协作方式：ToolCall
> - AgentInput 的上下文策略：全新任务描述
> - 决策自主性：自主决策

将一个 Agent 转换成 Tool，被其他的 Agent 当成普通的 Tool 使用。

注：一个 Agent 能否将其他 Agent 当成 Tool 进行调用，取决于自身的实现。adk 中提供的 ChatModelAgent 支持 AgentAsTool 的功能

```go
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool {
    // omit code
}
```

下图展示了 Agent1 把 Agent2、Agent3 当成 Tool 进行调用的过程，类似 Function Stack Call，即在 Agent1 运行过程中，将 Agent2、Agent3 当成工具函数来进行调用。

- AgentAsTool 可作为 Supervisor Multi-Agent 的一种实现方式

![](/img/eino/agent_as_tool_outline.png)

## Single Agent

> Built-In Single Agent

Eino ADK 中将内置多种 Single Agent 实现，方便在各种业务场景中，找到合适的 Agent 实现，开箱即用

### ChatModelAgent

ChatModelAgent 实现了 ReAct 范式的 Agent，基于 Eino 中的 Graph 编排出 ReAct Agent 控制流，通过 callbacks.Handler 导出 ReAct Agent 运行过程中产生的事件，转换成 AgentEvent 返回。

想要进一步了解 ChatModelAgent，请看：[Eino ADK: ChatModelAgent](/zh/docs/eino/core_modules/eino_adk/Eino ADK: Agent 实现/Eino ADK: ChatModelAgent)

```go
type ChatModelAgentConfig struct {
    Name        string
    Description string
    Instruction string

    Model model.ToolCallingChatModel

    ToolsConfig ToolsConfig

    // optional
    GenModelInput GenModelInput

    // Exit tool. Optional, defaults to nil, which will generate an Exit Action.
    // The built-in implementation is 'ExitTool'
    Exit tool.BaseTool

    // optional
    OutputKey string
}

func NewChatModelAgent(_ context.Context, config *ChatModelAgentConfig) (*ChatModelAgent, error) {
    // omit code
}
```

### A2AAgent

> 开发中

ResponseAgent

> 待规划

# Agent 运行

AgentRunner 是 Agent 的执行器。

通过 ADK 框架，编排组合出的 Multi-Agent，推荐采用 adk.NewRunner 包装执行。 只有通过 Runner 执行 agent 时，才可以使用 ADK 的如下功能：

- Interrupt & Resume
- 切面机制
- Context 环境的预处理

```go
type RunnerConfig struct {
    EnableStreaming bool
}

func NewRunner(_ context.Context, conf RunnerConfig) *Runner {
    // omit code
}
```

## Agent 运行示例

Agent 执行时，通过 adk.NewRunner 包装执行，方便使用 adk 提供的各种扩展能力

```go
func runWithRunner() {
    ctx := context.Background()
    
    // 创建 Runner
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
        EnableStreaming: true,
    })
    
    // 执行代理
    messages := []adk.Message{
        schema.UserMessage("What's the weather like today?"),
    }
    
    events := runner.Run(ctx, agent, messages)
    for {
        event, ok := events.Next()
        if !ok {
            break
        }
        
        // 处理事件
        handleEvent(event)
    }
}
```
