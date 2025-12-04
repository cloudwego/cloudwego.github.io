---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino ADK: Agent 协作'
weight: 4
---

# Agent 协作

概述文档已经对 Agent 协作提供了基础的说明，下面将结合代码，对协作与组合原语的设计与实现进行介绍：

- 协作原语

  - Agent 间协作方式

   <table>
   <tr><td>协作方式</td><td>描述</td></tr>
   <tr><td> Transfer</td><td>直接将任务转让给另外一个 Agent，本 Agent 则执行结束后退出，不关心转让 Agent 的任务执行状态</td></tr>
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
- 组合原语

   <table>
   <tr><td>类型</td><td>描述</td><td>运行模式</td><td>协作方式</td><td>上下文策略</td><td>决策自主性</td></tr>
   <tr><td><strong>SubAgents</strong></td><td>将用户提供的 agent 作为 父Agent，用户提供的 subAgents 列表作为 子Agents，组合而成可自主决策的 Agent，其中的 Name 和 Description 作为该 Agent 的名称标识和描述。<li>当前限定一个 Agent 只能有一个 父 Agent</li><li>可采用 SetSubAgents 函数，构建 「多叉树」 形式的 Multi-Agent</li><li>在这个「多叉树」中，AgentName 需要保持唯一</li></td><td><a href="/img/eino/eino_adk_self_driving.png" target="_blank"><img src="/img/eino/eino_adk_self_driving.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>自主决策</td></tr>
   <tr><td><strong>Sequential</strong></td><td>将用户提供的 SubAgents 列表，组合成按照顺序依次执行的 Sequential Agent，其中的 Name 和 Description 作为 Sequential Agent 的名称标识和描述。Sequential Agent 执行时，将 SubAgents 列表，按照顺序依次执行，直至将所有 Agent 执行一遍后结束。</td><td><a href="/img/eino/eino_adk_sequential_controller.png" target="_blank"><img src="/img/eino/eino_adk_sequential_controller.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
   <tr><td><strong>Parallel</strong></td><td>将用户提供的 SubAgents 列表，组合成基于相同上下文，并发执行的 Parallel Agent，其中的 Name 和 Description 作为 Parallel Agent 的名称标识和描述。Parallel Agent 执行时，将 SubAgents 列表，并发执行，待所有 Agent 执行完成后结束。</td><td><a href="/img/eino/eino_adk_parallel_yet_another_2.png" target="_blank"><img src="/img/eino/eino_adk_parallel_yet_another_2.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
   <tr><td><strong>Loop</strong></td><td>将用户提供的 SubAgents 列表，按照数组顺序依次执行，循环往复，组合成 Loop Agent，其中的 Name 和 Description 作为 Loop Agent 的名称标识和描述。Loop Agent 执行时，将 SubAgents 列表，顺序执行，待所有 Agent 执行完成后结束。</td><td><a href="/img/eino/eino_adk_loop_exit.png" target="_blank"><img src="/img/eino/eino_adk_loop_exit.png" width="100%" /></a></td><td>Transfer</td><td>上游 Agent 全对话</td><td>预设决策</td></tr>
   <tr><td><strong>AgentAsTool</strong></td><td>将一个 Agent 转换成 Tool，被其他的 Agent 当成普通的 Tool 使用。一个 Agent 能否将其他 Agent 当成 Tool 进行调用，取决于自身的实现。adk 中提供的 ChatModelAgent 支持 AgentAsTool 的功能</td><td><a href="/img/eino/eino_collaboration_agent_as_tool_thumbnail.png" target="_blank"><img src="/img/eino/eino_collaboration_agent_as_tool_thumbnail.png" width="100%" /></a></td><td>ToolCall</td><td>全新任务描述</td><td>自主决策</td></tr>
   </table>

## 上下文传递

在构建多 Agent 系统时，让不同 Agent 之间高效、准确地共享信息至关重要。Eino ADK 提供了两种核心的上下文传递机制，以满足不同的协作需求： History 和 SessionValues。

### History

#### 概念

History 对应【上游 Agent 全对话上下文策略】，多 Agent 系统中每一个 Agent 产生的 AgentEvent 都会被保存到 History 中，调用一个新 Agent 时 (Workflow/ Transfer) History 中的 AgentEvent 会被转换并拼接到 AgentInput 中。

默认情况下，其他 Agent 的 Assistant 或 Tool Message，被转换为 User Message。这相当于在告诉当前的 LLM：“刚才， Agent_A 调用了 some_tool ，返回了 some_result 。现在，轮到你来决策了。”

通过这种方式，其他 Agent 的行为被当作了提供给当前 Agent 的“外部信息”或“事实陈述”，而不是它自己的行为，从而避免了 LLM 的上下文混乱。

<a href="/img/eino/eino_adk_message_event.png" target="_blank"><img src="/img/eino/eino_adk_message_event.png" width="100%" /></a>

在 Eino ADK 中，当为一个 Agent 构建 AgentInput 时，会对 History 中的 Event 进行过滤，确保 Agent 只会接收到当前 Agent 的直接或间接父 Agent 产生的 Event。换句话说，只有当 Event 的 RunPath “属于”当前 Agent 的 RunPath 时，该 Event 才会参与构建 Agent 的 Input。

> 💡
> RunPathA “属于” RunPathB 定义为 RunPathA 与 RunPathB 相同或者 RunPathA 是 RunPathB 的前缀

下面表格中给出各种编排模式下，Agent 执行时的具体 RunPath：

<table>
<tr><td>Example</td><td>RunPath</td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path_sub_agent.png" target="_blank"><img src="/img/eino/eino_adk_run_path_sub_agent.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>SubAgent: [Agent, SubAgent]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path.png" target="_blank"><img src="/img/eino/eino_adk_run_path.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>Agent（after function call）: [Agent]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_collaboration_run_path_sequential.png" target="_blank"><img src="/img/eino/eino_adk_collaboration_run_path_sequential.png" width="100%" /></a></td><td><li>Agent1: [SequentialAgent, LoopAgent, Agent1]</li><li>Agent2: [SequentialAgent, LoopAgent, Agent1, Agent2]</li><li>Agent1: [SequentialAgent, LoopAgent, Agent1, Agent2, Agent1]</li><li>Agent2: [SequentialAgent, LoopAgent, Agent1, Agent2, Agent1, Agent2]</li><li>Agent3: [SequentialAgent, LoopAgent, Agent3]</li><li>Agent4: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent4]</li><li>Agent5: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent5]</li><li>Agent6: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent6]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path_deterministic.png" target="_blank"><img src="/img/eino/eino_adk_run_path_deterministic.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>SubAgent: [Agent, SubAgent]</li><li>Agent: [Agent, SubAgent, Agent]</li></td></tr>
</table>

#### 自定义

有些情况下在 Agent 运行前需要对 History 的内容进行调整，此时通过 AgentWithOptions 可以自定义 Agent 从 History 中生成  AgentInput 的方式：

```go
// github.com/cloudwego/eino/adk/flow.go

type HistoryRewriter func(ctx context.Context, entries []*HistoryEntry) ([]Message, error)

func WithHistoryRewriter(h HistoryRewriter) AgentOption
```

### SessionValues

#### 概念

SessionValues 是在一次运行中持续存在的全局临时 KV 存储，用于支持跨 Agent 的状态管理和数据共享，一次运行中的任何 Agent 可以在任何时间读写 SessionValues。

Eino ADK 提供了多种方法供 Agent 运行时内部并发安全的读写 Session Values：

```go
// github.com/cloudwego/eino/adk/runctx.go

// 获取全部 SessionValues
func GetSessionValues(ctx context.Context) map[string]any
// 批量设置 SessionValues
func AddSessionValues(ctx context.Context, kvs map[string]any) 
// 指定 key 获取 SessionValues 中的一个值，key 不存在时第二个返回值为 false，否则为 true
func GetSessionValue(ctx context.Context, key string) (any, bool)
// 设置单个 SessionValues
func AddSessionValue(ctx context.Context, key string, value any)
```

需要注意的是，由于 SessionValues 机制基于 Context 来实现，而 Runner 运行会对 Context 重新初始化，因此在 Run 方法外通过 `AddSessionValues` 或 `AddSessionValue` 注入 SessionValues 是不生效的。

如果您需要在 Agent 运行前就注入数据到 SessionValues 中，需要使用专用的 Option 来协助实现，用法如下：

```go
// github.com/cloudwego/eino/adk/call_option.go
// WithSessionValues 在 Agent 运行前注入 SessionValues
func WithSessionValues(v map[string]any) AgentRunOption

// 用法：
runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent})
iterator := runner.Run(ctx, []adk.Message{schema.UserMessage("xxx")},
    adk.WithSessionValues(map[string]any{
       PlanSessionKey:      123,
       UserInputSessionKey: []adk.Message{schema.UserMessage("yyy")},
    }),
)
```

## Transfer SubAgents

### 概念

Transfer 对应【Transfer 协作方式】，Agent 运行时产生带有包含 TransferAction 的 AgentEvent 后，Eino ADK 会调用 Action 指定的 Agent，被调用的 Agent 被称为子 Agent（SubAgent）。

TransferAction 可以使用 `NewTransferToAgentAction` 快速创建：

```go
import "github.com/cloudwego/eino/adk"

event := adk.NewTransferToAgentAction("dest agent name")
```

为了让 Eino ADK 在接受到 TransferAction 可以找到子 Agent 实例并运行，在运行前需要先调用 `SetSubAgents` 将可能的子 Agent 注册到 Eino ADK 中：

```go
// github.com/cloudwego/eino/adk/flow.go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
```

> 💡
> Transfer 的含义是将任务**移交**给子 Agent，而不是委托或者分配，因此：
>
> 1. 区别于 ToolCall，通过 Transfer 调用子 Agent，子 Agent 运行结束后，不会再调用父 Agent 总结内容或进行下一步操作。
> 2. 调用子 Agent 时，子 Agent 的输入仍然是原始输入，父 Agent 的输出会作为上下文供子 Agent 参考。

在触发 SetSubAgents 时，父子 Agent 双方都需要进行处理来完成初始化操作，Eino ADK 定义了 `OnSubAgents` 接口用于支持此功能：

```go
// github.com/cloudwego/eino/adk/interface.go
type OnSubAgents interface {
    OnSetSubAgents(ctx context.Context, subAgents []Agent) error
    OnSetAsSubAgent(ctx context.Context, parent Agent) error
    OnDisallowTransferToParent(ctx context.Context) error
}
```

如果 Agent 实现了 `OnSubAgents` 接口，`SetSubAgents` 中会调用相应的方法向 Agent 注册，例如 `ChatModelAgent` 的实现

### 示例

接下来以一个多功能对话 Agent 演示 Transfer 能力，目标是搭建一个可以查询天气或者与用户对话的 Agent，Agent 结构如下：

<a href="/img/eino/eino_adk_collaboration_example.png" target="_blank"><img src="/img/eino/eino_adk_collaboration_example.png" width="100%" /></a>

三个 Agent 均使用 ChatModelAgent 实现：

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/compose"
)

func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
       APIKey: os.Getenv("OPENAI_API_KEY"),
       Model:  os.Getenv("OPENAI_MODEL"),
    })
    if err != nil {
       log.Fatal(err)
    }
    return cm
}

type GetWeatherInput struct {
    City string `json:"city"`
}

func NewWeatherAgent() adk.Agent {
    weatherTool, err := utils.InferTool(
       "get_weather",
       "Gets the current weather for a specific city.", // English description
       func(ctx context.Context, input *GetWeatherInput) (string, error) {
          return fmt.Sprintf(`the temperature in %s is 25°C`, input.City), nil
       },
    )
    if err != nil {
       log.Fatal(err)
    }

    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "WeatherAgent",
       Description: "This agent can get the current weather for a given city.",
       Instruction: "Your sole purpose is to get the current weather for a given city by using the 'get_weather' tool. After calling the tool, report the result directly to the user.",
       Model:       newChatModel(),
       ToolsConfig: adk.ToolsConfig{
          ToolsNodeConfig: compose.ToolsNodeConfig{
             Tools: []tool.BaseTool{weatherTool},
          },
       },
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func NewChatAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "ChatAgent",
       Description: "A general-purpose agent for handling conversational chat.", // English description
       Instruction: "You are a friendly conversational assistant. Your role is to handle general chit-chat and answer questions that are not related to any specific tool-based tasks.",
       Model:       newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func NewRouterAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "RouterAgent",
       Description: "A manual router that transfers tasks to other expert agents.",
       Instruction: `You are an intelligent task router. Your responsibility is to analyze the user's request and delegate it to the most appropriate expert agent.If no Agent can handle the task, simply inform the user it cannot be processed.`,
       Model:       newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}
```

之后使用 Eino ADK 的 Transfer 能力搭建 Multi-Agent 并运行，ChatModelAgent 实现了 OnSubAgent 接口，在 adk.SetSubAgents 方法中会使用此接口向 ChatModelAgent 注册父/子 Agent，不需要用户处理 TransferAction 生成问题：

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"
)

func main() {
    weatherAgent := NewWeatherAgent()
    chatAgent := NewChatAgent()
    routerAgent := NewRouterAgent()

    ctx := context.Background()
    a, err := adk.SetSubAgents(ctx, routerAgent, []adk.Agent{chatAgent, weatherAgent})
    if err != nil {
       log.Fatal(err)
    }

    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: a,
    })

    // query weather
    println("\n\n>>>>>>>>>query weather<<<<<<<<<")
    iter := runner.Query(ctx, "What's the weather in Beijing?")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil {
          fmt.Printf("\nAgent[%s]: transfer to %+v\n\n======\n", event.AgentName, event.Action.TransferToAgent.DestAgentName)
       } else {
          fmt.Printf("\nAgent[%s]:\n%+v\n\n======\n", event.AgentName, event.Output.MessageOutput.Message)
       }
    }

    // failed to route
    println("\n\n>>>>>>>>>failed to route<<<<<<<<<")
    iter = runner.Query(ctx, "Book me a flight from New York to London tomorrow.")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil {
          fmt.Printf("\nAgent[%s]: transfer to %+v\n\n======\n", event.AgentName, event.Action.TransferToAgent.DestAgentName)
       } else {
          fmt.Printf("\nAgent[%s]:\n%+v\n\n======\n", event.AgentName, event.Output.MessageOutput.Message)
       }
    }
}
```

运行结果：

```yaml
>>>>>>>>>query weather<<<<<<<<<
Agent[RouterAgent]:
assistant: 
tool_calls:
{Index:<nil> ID:call_SKNsPwKCTdp1oHxSlAFt8sO6 Type:function Function:{Name:transfer_to_agent Arguments:{"agent_name":"WeatherAgent"}} Extra:map[]}

finish_reason: tool_calls
usage: &{201 17 218}
======
Agent[RouterAgent]: transfer to WeatherAgent
======
Agent[WeatherAgent]:
assistant: 
tool_calls:
{Index:<nil> ID:call_QMBdUwKj84hKDAwMMX1gOiES Type:function Function:{Name:get_weather Arguments:{"city":"Beijing"}} Extra:map[]}

finish_reason: tool_calls
usage: &{255 15 270}
======
Agent[WeatherAgent]:
tool: the temperature in Beijing is 25°C
tool_call_id: call_QMBdUwKj84hKDAwMMX1gOiES
tool_call_name: get_weather
======
Agent[WeatherAgent]:
assistant: The current temperature in Beijing is 25°C.
finish_reason: stop
usage: &{286 11 297}
======

>>>>>>>>>failed to route<<<<<<<<<
Agent[RouterAgent]:
assistant: I'm unable to assist with booking flights. Please use a relevant travel service or booking platform to make your reservation.
finish_reason: stop
usage: &{206 23 229}
======
```

OnSubAgents 的另外两个方法在 Agent  作为 SetSubAgents 中的子 Agent 时被调用：

- OnSetAsSubAgent 用来注册向 Agent 注册其父 Agent 信息
- OnDisallowTransferToParent 在 Agent 设置 WithDisallowTransferToParent option 时会被调用，用来告知 Agent 不要产生向父 Agent 的 TransferAction。

```go
adk.SetSubAgents(
    ctx,
    Agent1,
    []adk.Agent{
       adk.AgentWithOptions(ctx, Agent2, adk.WithDisallowTransferToParent()),
    },
)
```

### 静态配置 Transfer

AgentWithDeterministicTransferTo 是一个 Agent Wrapper，在原 Agent 执行完后生成预设的 TransferAction，从而实现静态配置 Agent 跳转的能力：

```go
// github.com/cloudwego/eino/adk/flow.go

type DeterministicTransferConfig struct {
        Agent        Agent
        ToAgentNames []string
}

func AgentWithDeterministicTransferTo(_ context.Context, config *DeterministicTransferConfig) Agent
```

在 Supervisor 模式中，子 Agent 执行完毕后固定回到 Supervisor，由 Supervisor 生成下一步任务目标。此时可以使用 AgentWithDeterministicTransferTo：

<a href="/img/eino/eino_adk_deterministic_transfer.png" target="_blank"><img src="/img/eino/eino_adk_deterministic_transfer.png" width="100%" /></a>

```go
// github.com/cloudwego/eino/adk/prebuilt/supervisor.go

type SupervisorConfig struct {
        Supervisor adk.Agent
        SubAgents  []adk.Agent
}

func NewSupervisor(ctx context.Context, conf *SupervisorConfig) (adk.Agent, error) {
        subAgents := make([]adk.Agent, 0, len(conf.SubAgents))
        supervisorName := conf.Supervisor.Name(ctx)
        for _, subAgent := range conf.SubAgents {
                subAgents = append(subAgents, adk.AgentWithDeterministicTransferTo(ctx, &adk.DeterministicTransferConfig{
                        Agent:        subAgent,
                        ToAgentNames: []string{supervisorName},
                }))
        }

        return adk.SetSubAgents(ctx, conf.Supervisor, subAgents)
}
```

## Workflow Agents

WorkflowAgent 支持以代码中预设好的流程运行 Agents。Eino ADK 提供了三种基础 Workflow Agent：Sequential、Parallel、Loop，它们之间可以互相嵌套以完成更复杂的任务。

默认情况下，Workflow 中每个 Agent 的输入由 History 章节中介绍的方式生成，可以通过 WithHistoryRewriter 自定 AgentInput 生成方式。

当 Agent 产生 ExitAction Event 后，Workflow Agent 会立刻退出，无论之后有没有其他需要运行的 Agent。

详解与用例参考请见：[Eino ADK: Workflow Agents](/zh/docs/eino/core_modules/eino_adk/agent_implementation/workflow)

### SequentialAgent

SequentialAgent 会按照你提供的顺序，依次执行一系列 Agent：

<a href="/img/eino/eino_adk_sequential_agent.png" target="_blank"><img src="/img/eino/eino_adk_sequential_agent.png" width="100%" /></a>

```go
type SequentialAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent
}

func NewSequentialAgent(ctx context.Context, config *SequentialAgentConfig) (Agent, error)
```

### LoopAgent

LoopAgent 基于 SequentialAgent 实现，在 SequentialAgent 运行完成后，再次从头运行：

<a href="/img/eino/eino_adk_loop_definition.png" target="_blank"><img src="/img/eino/eino_adk_loop_definition.png" width="100%" /></a>

```go
type LoopAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent

    MaxIterations int // 最大循环次数
}

func NewLoopAgent(ctx context.Context, config *LoopAgentConfig) (Agent, error)
```

### ParallelAgent

ParallelAgent 会并发运行若干 Agent：

<a href="/img/eino/eino_adk_parallel_agent.png" target="_blank"><img src="/img/eino/eino_adk_parallel_agent.png" width="100%" /></a>

```go
type ParallelAgentConfig struct {
    Name        string
    Description string
    SubAgents   []Agent
}

func NewParallelAgent(ctx context.Context, config *ParallelAgentConfig) (Agent, error)
```

## AgentAsTool

当 Agent 运行仅需要明确清晰的指令，而非完整运行上下文（History）时，该 Agent 可以转换为 Tool 进行调用:

```go
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

转换为 Tool 后，Agent 可以被支持 function calling 的 ChatModel 调用，也可以被所有基于 LLM 驱动的 Agent 调用，调用方式取决于 Agent 实现。
