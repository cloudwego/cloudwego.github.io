---
Description: ""
date: "2025-12-02"
lastmod: ""
tags: []
title: 'Eino ADK: Agent 抽象'
weight: 3
---

# Agent 定义

Eino 定义了 Agent 的基础接口，实现此接口的 Struct 可被视为一个 Agent：

```go
// github.com/cloudwego/eino/adk/interface.go

type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, opts ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

<table>
<tr><td>Method</td><td> 说明</td></tr>
<tr><td>Name</td><td>Agent 的名称，作为 Agent 的标识</td></tr>
<tr><td>Description</td><td>Agent 的职能描述信息，主要用于让其他的 Agent 了解和判断该 Agent 的职责或功能</td></tr>
<tr><td>Run</td><td>Agent 的核心执行方法，返回一个迭代器，调用者可以通过这个迭代器持续接收 Agent 产生的事件</td></tr>
</table>

## AgentInput

Run 方法接收 AgentInput 作为 Agent 的输入：

```go
type AgentInput struct {
    Messages        []_Message_
_    _EnableStreaming bool
}

type Message = *schema.Message
```

Agent 通常以 ChatModel 为核心，因此规定 Agent 的输入为 `Messages`， 与调用 Eino ChatModel 的类型相同。`Messages` 中可以包括用户指令、对话历史、背景知识、样例数据等任何你希望传递给 Agent 的数据。例如：

```go
import (
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/schema"
)

input := &adk.AgentInput{
    Messages: []adk.Message{
       schema.UserMessage("What's the capital of France?"),
       schema.AssistantMessage("The capital of France is Paris.", nil),
       schema.UserMessage("How far is it from London? "),
    },
}
```

`EnableStreaming` 用于向 Agent **建议**其输出模式，但它并非一个强制性约束。它的核心思想是控制那些同时支持流式和非流式输出的组件的行为，例如 ChatModel，而仅支持一种输出方式的组件，`EnableStreaming` 不会影响他们的行为。另外在 `AgentOutput.IsStreaming` 字段会标明实际输出类型。运行表现为：

- 当 `EnableStreaming=false` 时，对于那些既能流式也能非流式输出的组件，此时会使用一次性返回完整结果的非流式模式。
- 当 `EnableStreaming=true` 时，对于 Agent 内部能够流式输出的组件（如 ChatModel 调用），应以流的形式逐步返回结果。如果某个组件天然不支持流式，它仍然可以按其原有的非流式方式工作。

如下图所示，ChatModel 既可以输出非流也可以输出流，Tool 只能输出非流，即：

- 当 `EnableStream=false` 时，二者均输出非流
- 当 `EnableStream=true` 时，ChatModel 输出流，Tool 因为不具备输出流的能力，仍然输出非流。

<a href="/img/eino/eino_adk_streaming.png" target="_blank"><img src="/img/eino/eino_adk_streaming.png" width="100%" /></a>

## AgentRunOption

`AgentRunOption` 由 Agent 实现定义，可以在请求维度修改 Agent 配置或者控制 Agent 行为。

Eino ADK 提供了一些通用定义的 Option，供用户使用：

- `WithSessionValues`：设置跨 Agent 读写数据
- `WithSkipTransferMessages`：配置后，当 Event 为 Transfer SubAgent 时，Event 中的消息不会追加到 History 中

Eino ADK 提供了 `WrapImplSpecificOptFn` 和 `GetImplSpecificOptions` 两个方法，供 Agent 包装与读取自定义的 `AgentRunOption`。

当使用 `GetImplSpecificOptions` 方法读取 `AgentRunOptions` 时，与所需类型（如例子中的 options）不符的 AgentRunOption 会被忽略。

例如可以定义 `WithModelName`，在请求维度要求 Agent 修改调用的模型：

```go
// github.com/cloudwego/eino/adk/call_option.go
// func WrapImplSpecificOptFn[T any](optFn func(*T)) AgentRunOption
// func GetImplSpecificOptions[T any](base *T, opts ...AgentRunOption) *T

import "github.com/cloudwego/eino/adk"

type options struct {
    modelName string
}

func WithModelName(name string) adk.AgentRunOption {
    return adk.WrapImplSpecificOptFn(func(t *options) {
       t.modelName = name
    })
}

func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    o := &options{}
    o = adk.GetImplSpecificOptions(o, opts...)
    // run code...
}
```

除此之外，AgentRunOption 具有一个 `DesignateAgent` 方法，调用该方法可以在调用多 Agent 系统时指定 Option 生效的 Agent：

```go
func genOpt() {
    // 指定 option 仅对 agent_1 和 agent_2 生效
    opt := adk.WithSessionValues(map[string]any{}).DesignateAgent("agent_1", "agent_2")
}
```

## AsyncIterator

`Agent.Run` 返回了一个迭代器 `AsyncIterator[*AgentEvent]`：

```go
// github.com/cloudwego/eino/adk/utils.go

type AsyncIterator[T any] struct {
    ...
}

func (ai *AsyncIterator[T]) Next() (T, bool) {
    ...
}
```

它代表一个异步迭代器（异步指生产与消费之间没有同步控制），允许调用者以一种有序、阻塞的方式消费 Agent 在运行过程中产生的一系列事件。

- `AsyncIterator` 是一个泛型结构体，可以用于迭代任何类型的数据。当前在 Agent 接口中， Run 方法返回的迭代器类型被固定为 `AsyncIterator[*AgentEvent]` 。这意味着，你从这个迭代器中获取的每一个元素，都将是一个指向 `AgentEvent` 对象的指针。`AgentEvent` 会在后续章节中详细说明。
- 迭代器的主要交互方式是通过调用其 `Next()` 方法。这个方法的行为是 阻塞式 的，每次调用 `Next()` ，程序会暂停执行，直到以下两种情况之一发生：
  - Agent 产生了一个新的 `AgentEvent` : `Next()` 方法会返回这个事件，调用者可以立即对其进行处理。
  - Agent 主动关闭了迭代器 : 当 Agent 不会再产生任何新的事件时（通常是 Agent 运行结束），它会关闭这个迭代器。此时 `Next()` 调用会结束阻塞并在第二个返回值返回 false，告知调用者迭代已经结束。

通常情况下，你需要使用 for 循环处理 `AsyncIterator`:

```go
iter := myAgent.Run(xxx) // get AsyncIterator from Agent.Run

for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // handle event
}
```

`AsyncIterator` 可以由 `NewAsyncIteratorPair` 创建，该函数返回的另一个参数 `AsyncGenerator` 用来生产数据：

```go
// github.com/cloudwego/eino/adk/utils.go

func NewAsyncIteratorPair[T any]() (*AsyncIterator[T], *AsyncGenerator[T])
```

Agent.Run 返回 AsyncIterator 旨在让调用者实时地接收到 Agent 产生的一系列 AgentEvent，因此 Agent.Run 通常会在 Goroutine 中运行 Agent 从而立刻返回 AsyncIterator 供调用者监听：

```go
import "github.com/cloudwego/eino/adk"

func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    // handle input
    iter, gen := adk.NewAsyncIteratorPair[*adk.AgentEvent]()
    go func() {
       defer func() {
          // recover code
          gen.Close()
       }()
       // agent run code
       // gen.Send(event)
    }()
    return iter
}
```

## AgentWithOptions

使用 `AgentWithOptions` 方法可以在 Eino ADK Agent 中进行一些通用配置。

与 `AgentRunOption` 不同的是，`AgentWithOptions` 在运行前生效，并且不支持自定义 option。

```go
// github.com/cloudwego/eino/adk/flow.go
func AgentWithOptions(ctx context.Context, agent Agent, opts ...AgentOption) Agent
```

Eino ADK 当前内置支持的配置有：

- `WithDisallowTransferToParent`：配置该 SubAgent 不允许 Transfer 到 ParentAgent，会触发该 SubAgent 的 `OnDisallowTransferToParent` 回调方法
- `WithHistoryRewriter`：配置后该 Agent 在执行前会通过该方法重写接收到的上下文信息

# AgentEvent

AgentEvent 是 Agent 在其运行过程中产生的核心事件数据结构。其中包含了 Agent 的元信息、输出、行为和报错：

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentEvent struct {
    AgentName string

    RunPath []RunStep

    Output *AgentOutput

    Action *AgentAction

    Err error
}

// EventFromMessage 构建普通 event
func EventFromMessage(msg Message, msgStream MessageStream, role schema.RoleType, toolName string) *AgentEvent
```

## AgentName & RunPath

`AgentName` 和 `RunPath` 字段是由框架自动进行填充，它们提供了关于事件来源的重要上下文信息，在复杂的、由多个 Agent 构成的系统中至关重要。

```go
type RunStep struct {
    agentName string
}
```

- `AgentName` 标明了是哪一个 Agent 实例产生了当前的 AgentEvent 。
- `RunPath` 记录了到达当前 Agent 的完整调用链路。`RunPath` 是一个 `RunStep` 切片，它按顺序记录了从最初的入口 Agent 到当前产生事件的 Agent 的所有 `AgentName`。

## AgentOutput

`AgentOutput` 封装了 Agent 产生的输出。

Message 输出设置在 MessageOutput 字段中，其他类型的自定义输出设置在 CustomizedOutput 字段中：

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentOutput struct {
    MessageOutput *MessageVariant

    CustomizedOutput any
}

type MessageVariant struct {
    IsStreaming bool

    Message       Message
    MessageStream MessageStream
    // message role: Assistant or Tool
    Role schema.RoleType
    // only used when Role is Tool
    ToolName string
}
```

`MessageOutput` 字段的类型 `MessageVariant` 是一个核心数据结构，主要功能为：

1. 统一处理流式与非流式消息：`IsStreaming` 是一个标志位。值为 true 表示当前 `MessageVariant` 包含的是一个流式消息（从 MessageStream 读取），为 false 则表示包含的是一个非流式消息（从 Message 读取）：

   - 流式 : 随着时间的推移，逐步返回一系列消息片段，最终构成一个完整的消息（MessageStream）。
   - 非流式 : 一次性返回一个完整的消息（Message）。
2. 提供便捷的元数据访问：Message 结构体内部包含了一些重要的元信息，如消息的 Role（Assistant 或 Tool），为了方便快速地识别消息类型和来源， MessageVariant 将这些常用的元数据提升到了顶层：

   - `Role`：消息的角色，Assistant / Tool
   - `ToolName`：如果消息角色是 Tool ，这个字段会直接提供工具的名称。

这样做的好处是，代码在需要根据消息类型进行路由或决策时， 无需深入解析 Message 对象的具体内容 ，可以直接从 MessageVariant 的顶层字段获取所需信息，从而简化了逻辑，提高了代码的可读性和效率。

## AgentAction

Agent 产生包含 AgentAction 的 Event 可以控制多 Agent 协作，比如立刻退出、中断、跳转等：

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentAction struct {
    Exit bool

    Interrupted *InterruptInfo

    TransferToAgent *TransferToAgentAction

    CustomizedAction any
}

type InterruptInfo struct {
    Data any
}

type TransferToAgentAction struct {
    DestAgentName string
}
```

Eino ADK 当前预设 Action 有三种：

1. 退出：当 Agent 产生 Exit Action 时，Multi-Agent 会立刻退出

```go
func NewExitAction() *AgentAction {
    return &AgentAction{Exit: true}
}
```

1. 跳转：当 Agent 产生 Transfer Action 时，会跳转到目标 Agent 运行

```go
func NewTransferToAgentAction(destAgentName string) *AgentAction {
    return &AgentAction{TransferToAgent: &TransferToAgentAction{DestAgentName: destAgentName}}
}
```

1. 中断：当 Agent 产生 Interrupt Action 时，会中断 Runner 的运行。由于中断可能发生在任何位置，同时中断时需要向外传递独特的信息，Action 中提供了 `Interrupted` 字段供 Agent 设置自定义数据，Runner 接收到 Interrupted 不为空的 Action 时则认为产生了中断。Interrupt & Resume 内部机制较为复杂，在 【Eino ADK: Agent Runner】-【Eino ADK: Interrupt & Resume】章节会展开详述。

```go
// 例如 ChatModelAgent 中断时，会发送如下的 AgentEvent：
h.Send(&AgentEvent{AgentName: h.agentName, Action: &AgentAction{
    Interrupted: &InterruptInfo{
       Data: &ChatModelAgentInterruptInfo{Data: data, Info: info},
    },
}})
```
