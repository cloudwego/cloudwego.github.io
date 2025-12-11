---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Interface'
weight: 3
---

## Agent Definition

Implementing the following interface makes a struct an agent:

```go
// github.com/cloudwego/eino/adk/interface.go

type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, opts ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td>Name</td><td>Agent identifier (name)</td></tr>
<tr><td>Description</td><td>Capabilities description to help other agents understand its role</td></tr>
<tr><td>Run</td><td>Core execution method; returns an iterator to continuously receive Agent events</td></tr>
</table>

## AgentInput

```go
type AgentInput struct {
    Messages        []Message
    EnableStreaming bool
}

type Message = *schema.Message
```

Agents typically center around a chat model, so input uses `Messages` compatible with Eino ChatModel. Include user instructions, dialogue history, background knowledge, examples, etc.

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

`EnableStreaming` suggests output mode for components that support both streaming and non‑streaming (e.g., ChatModel). It is not a hard constraint. The actual output type is indicated by `AgentOutput.IsStreaming`.

- When `EnableStreaming=false`: for components that support both, prefer non‑streaming (return full result at once).
- When `EnableStreaming=true`: components capable of streaming should stream; components that do not support streaming continue non‑streaming.

As shown below, ChatModel may stream or not, while Tool outputs non‑stream only:

- `EnableStreaming=false`: both output non‑stream
- `EnableStreaming=true`: ChatModel streams; Tool remains non‑stream

<a href="/img/eino/eino_adk_streaming.png" target="_blank"><img src="/img/eino/eino_adk_streaming.png" width="100%" /></a>

## AgentRunOption

Options can adjust configuration or behavior per request. ADK provides common options:

- `WithSessionValues` — set cross‑agent KV state
- `WithSkipTransferMessages` — when transferring, do not append transfer event messages to history

Wrapping and reading implementation‑specific options:

```go
// github.com/cloudwego/eino/adk/call_option.go
// func WrapImplSpecificOptFn[T any](optFn func(*T)) AgentRunOption
// func GetImplSpecificOptions[T any](base *T, opts ...AgentRunOption) *T

type options struct { modelName string }

func WithModelName(name string) adk.AgentRunOption {
    return adk.WrapImplSpecificOptFn(func(t *options) { t.modelName = name })
}

func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    o := &options{}
    o = adk.GetImplSpecificOptions(o, opts...)
    // run code...
}
```

Designate option targets for specific agents in a multi‑agent system:

```go
opt := adk.WithSessionValues(map[string]any{}).DesignateAgent("agent_1", "agent_2")
```

## AsyncIterator

`Agent.Run` returns `AsyncIterator[*AgentEvent]`, an asynchronous iterator (production and consumption are decoupled) for consuming events in order:

```go
// github.com/cloudwego/eino/adk/utils.go

type AsyncIterator[T any] struct { /* ... */ }

func (ai *AsyncIterator[T]) Next() (T, bool) { /* ... */ }
```

Consume with a blocking `Next()` loop until closed:

```go
iter := myAgent.Run(xxx)
for {
    event, ok := iter.Next()
    if !ok { break }
    // handle event
}
```

Create with `NewAsyncIteratorPair` and produce via `AsyncGenerator`:

```go
func NewAsyncIteratorPair[T any]() (*AsyncIterator[T], *AsyncGenerator[T])
```

Agents usually run in a goroutine and return the iterator immediately, so the caller can start consuming events in real time:

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

Configure common behaviors before running via `AgentWithOptions`:

```go
// github.com/cloudwego/eino/adk/flow.go
func AgentWithOptions(ctx context.Context, agent Agent, opts ...AgentOption) Agent
```

Built‑in options:

- `WithDisallowTransferToParent` — disallow transferring to parent; triggers `OnDisallowTransferToParent`
- `WithHistoryRewriter` — rewrite history into input messages before execution

# AgentEvent

Core event structure produced by agents:

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentEvent struct {
    AgentName string
    RunPath   []RunStep
    Output    *AgentOutput
    Action    *AgentAction
    Err       error
}

// EventFromMessage builds a standard event
func EventFromMessage(msg Message, msgStream MessageStream, role schema.RoleType, toolName string) *AgentEvent
```

## AgentName & RunPath

Filled by the framework to provide event provenance in multi‑agent systems:

```go
type RunStep struct { agentName string }
```

- `AgentName` — which agent produced the event
- `RunPath` — chain from entry agent to current agent

## AgentOutput

Encapsulates agent output:

```go
type AgentOutput struct {
    MessageOutput   *MessageVariant
    CustomizedOutput any
}

type MessageVariant struct {
    IsStreaming   bool
    Message       Message
    MessageStream MessageStream
    Role          schema.RoleType
    ToolName      string // when Role is Tool
}
```

`MessageVariant`:

1. Unifies streaming vs non‑streaming messages via `IsStreaming`:
   - Streaming: return chunks over time that form a complete message (read from `MessageStream`).
   - Non‑streaming: return a complete message at once (read from `Message`).
2. Surfaces convenient metadata at top level:
   - `Role`: Assistant or Tool
   - `ToolName`: when `Role` is Tool, provide the tool’s name

## AgentAction

Control multi‑agent collaboration: exit, interrupt, transfer, or custom:

```go
type AgentAction struct {
    Exit bool

    Interrupted *InterruptInfo

    TransferToAgent *TransferToAgentAction
    
    BreakLoop *BreakLoopAction

    CustomizedAction any
}

type InterruptInfo struct { Data any }

type TransferToAgentAction struct { DestAgentName string }
```

Prebuilt actions:

```go
func NewExitAction() *AgentAction { return &AgentAction{Exit: true} }
func NewTransferToAgentAction(dest string) *AgentAction {
    return &AgentAction{TransferToAgent: &TransferToAgentAction{DestAgentName: dest}}
}
```

Interrupt sends custom info for checkpoint/resume flows (see Runner docs). For example, ChatModelAgent sends an interrupt event as:

```go
// e.g., when ChatModelAgent interrupts, it emits:
h.Send(&AgentEvent{AgentName: h.agentName, Action: &AgentAction{
    Interrupted: &InterruptInfo{
       Data: &ChatModelAgentInterruptInfo{Data: data, Info: info},
    },
}})
```
