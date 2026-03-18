---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Abstraction'
weight: 3
---

# Agent Definition

Eino defines a basic interface for Agents. Any struct implementing this interface can be considered an Agent:

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
<tr><td>Name</td><td>The name of the Agent, serving as the Agent's identifier</td></tr>
<tr><td>Description</td><td>Description of the Agent's capabilities, mainly used for other Agents to understand and determine this Agent's responsibilities or functions</td></tr>
<tr><td>Run</td><td>The core execution method of the Agent, returns an iterator through which callers can continuously receive events produced by the Agent</td></tr>
</table>

## AgentInput

The Run method receives AgentInput as the Agent's input:

```go
type AgentInput struct {
    Messages        []Message
    EnableStreaming bool
}

type Message = *schema.Message
```

Agents typically have ChatModel as their core, so the Agent's input is defined as `Messages`, which is the same type as when calling Eino ChatModel. `Messages` can include user instructions, conversation history, background knowledge, sample data, or any other data you want to pass to the Agent. For example:

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

`EnableStreaming` is used to **suggest** the output mode to the Agent, but it is not a mandatory constraint. Its core idea is to control the behavior of components that support both streaming and non-streaming output, such as ChatModel, while `EnableStreaming` does not affect components that only support one output method. Additionally, the `AgentOutput.IsStreaming` field indicates the actual output type. The runtime behavior is:

- When `EnableStreaming=false`, components that can output both streaming and non-streaming will use the non-streaming mode that returns complete results at once.
- When `EnableStreaming=true`, components within the Agent that can output streaming (such as ChatModel calls) should return results progressively as a stream. If a component naturally doesn't support streaming, it can still work in its original non-streaming way.

As shown in the diagram below, ChatModel can output both streaming and non-streaming, while Tool can only output non-streaming:

- When `EnableStream=false`, both output non-streaming
- When `EnableStream=true`, ChatModel outputs streaming, Tool still outputs non-streaming because it doesn't have streaming capability.

<a href="/img/eino/eino_adk_streaming.png" target="_blank"><img src="/img/eino/eino_adk_streaming.png" width="100%" /></a>

## AgentRunOption

`AgentRunOption` is defined by the Agent implementation and can modify Agent configuration or control Agent behavior at the request level.

Eino ADK provides some commonly defined Options for users:

- `WithSessionValues`: Set cross-Agent read/write data
- `WithSkipTransferMessages`: When configured, if the Event is a Transfer to SubAgent, the messages in the Event will not be appended to History

Eino ADK provides `WrapImplSpecificOptFn` and `GetImplSpecificOptions` methods for Agents to wrap and read custom `AgentRunOptions`.

When using the `GetImplSpecificOptions` method to read `AgentRunOptions`, AgentRunOptions that don't match the required type (like options in the example) will be ignored.

For example, you can define `WithModelName` to require the Agent to change the model being called at the request level:

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

Additionally, AgentRunOption has a `DesignateAgent` method. Calling this method allows you to specify which Agent the Option takes effect on when calling a multi-Agent system:

```go
func genOpt() {
    // Specify that the option only takes effect for agent_1 and agent_2
    opt := adk.WithSessionValues(map[string]any{}).DesignateAgent("agent_1", "agent_2")
}
```

## AsyncIterator

`Agent.Run` returns an iterator `AsyncIterator[*AgentEvent]`:

```go
// github.com/cloudwego/eino/adk/utils.go

type AsyncIterator[T any] struct {
    ...
}

func (ai *AsyncIterator[T]) Next() (T, bool) {
    ...
}
```

It represents an asynchronous iterator (asynchronous means there is no synchronization control between production and consumption), allowing callers to consume a series of events produced by the Agent in an ordered, blocking manner.

- `AsyncIterator` is a generic struct that can be used to iterate over any type of data. Currently in the Agent interface, the iterator type returned by the Run method is fixed as `AsyncIterator[*AgentEvent]`. This means that every element you get from this iterator will be a pointer to an `AgentEvent` object. `AgentEvent` will be explained in detail in the following sections.
- The main way to interact with the iterator is by calling its `Next()` method. This method is **blocking** - each call to `Next()` will pause execution until one of the following two situations occurs:
  - Agent produces a new `AgentEvent`: The `Next()` method returns this event, and the caller can immediately process it.
  - Agent actively closes the iterator: When the Agent will no longer produce any new events (usually when the Agent finishes running), it closes the iterator. At this point, the `Next()` call will end blocking and return false in the second return value, telling the caller that iteration has ended.

Typically, you need to use a for loop to process `AsyncIterator`:

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

`AsyncIterator` can be created by `NewAsyncIteratorPair`, which returns another parameter `AsyncGenerator` for producing data:

```go
// github.com/cloudwego/eino/adk/utils.go

func NewAsyncIteratorPair[T any]() (*AsyncIterator[T], *AsyncGenerator[T])
```

Agent.Run returns AsyncIterator to let callers receive a series of AgentEvents produced by the Agent in real-time. Therefore, Agent.Run typically runs the Agent in a Goroutine to immediately return the AsyncIterator for the caller to listen to:

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

Using the `AgentWithOptions` method allows you to make some general configurations in Eino ADK Agents.

Unlike `AgentRunOption`, `AgentWithOptions` takes effect before running and does not support custom options.

```go
// github.com/cloudwego/eino/adk/flow.go
func AgentWithOptions(ctx context.Context, agent Agent, opts ...AgentOption) Agent
```

Currently built-in supported configurations in Eino ADK include:

- `WithDisallowTransferToParent`: Configures that this SubAgent is not allowed to Transfer to ParentAgent, which will trigger the SubAgent's `OnDisallowTransferToParent` callback method
- `WithHistoryRewriter`: When configured, the Agent will rewrite the received context information through this method before execution

# AgentEvent

AgentEvent is the core event data structure produced by the Agent during its run. It contains the Agent's metadata, output, actions, and errors:

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentEvent struct {
    AgentName string

    RunPath []RunStep

    Output *AgentOutput

    Action *AgentAction

    Err error
}

// EventFromMessage constructs a regular event
func EventFromMessage(msg Message, msgStream MessageStream, role schema.RoleType, toolName string) *AgentEvent
```

## AgentName & RunPath

The `AgentName` and `RunPath` fields are automatically filled by the framework. They provide important context information about the event source, which is crucial in complex systems composed of multiple Agents.

```go
type RunStep struct {
    agentName string
}
```

- `AgentName` indicates which Agent instance produced the current AgentEvent.
- `RunPath` records the complete call chain to reach the current Agent. `RunPath` is a slice of `RunStep` that sequentially records all `AgentNames` from the initial entry Agent to the current Agent producing the event.

## AgentOutput

`AgentOutput` encapsulates the output produced by the Agent.

Message output is set in the MessageOutput field, while other types of custom output are set in the CustomizedOutput field:

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

The `MessageVariant` type of the `MessageOutput` field is a core data structure with main functions:

1. Unified handling of streaming and non-streaming messages: `IsStreaming` is a flag. When true, it indicates the current `MessageVariant` contains a streaming message (read from MessageStream). When false, it indicates a non-streaming message (read from Message):

   - Streaming: Returns a series of message fragments progressively over time, eventually forming a complete message (MessageStream).
   - Non-streaming: Returns a complete message at once (Message).
2. Convenient metadata access: The Message struct contains some important metadata, such as the message's Role (Assistant or Tool). To quickly identify message type and source, MessageVariant elevates these commonly used metadata to the top level:

   - `Role`: The role of the message, Assistant / Tool
   - `ToolName`: If the message role is Tool, this field directly provides the tool's name.

The benefit of this is that when code needs to route or make decisions based on message type, it doesn't need to deeply parse the specific content of the Message object - it can directly get the needed information from MessageVariant's top-level fields, simplifying logic and improving code readability and efficiency.

## AgentAction

When an Agent produces an Event containing AgentAction, it can control multi-Agent collaboration, such as immediate exit, interrupt, jump, etc.:

```go
// github.com/cloudwego/eino/adk/interface.go

type AgentAction struct {
    Exit bool

    Interrupted *InterruptInfo

    TransferToAgent *TransferToAgentAction
    
    BreakLoop *BreakLoopAction

    CustomizedAction any
}

type InterruptInfo struct {
    Data any
}

type TransferToAgentAction struct {
    DestAgentName string
}
```

Eino ADK currently has four preset Actions:

1. Exit: When an Agent produces an Exit Action, the Multi-Agent will exit immediately

```go
func NewExitAction() *AgentAction {
    return &AgentAction{Exit: true}
}
```

2. Transfer: When an Agent produces a Transfer Action, it will jump to the target Agent to run

```go
func NewTransferToAgentAction(destAgentName string) *AgentAction {
    return &AgentAction{TransferToAgent: &TransferToAgentAction{DestAgentName: destAgentName}}
}
```

3. Interrupt: When an Agent produces an Interrupt Action, it will interrupt the Runner's execution. Since interrupts can occur at any position and need to pass unique information when interrupting, the Action provides an `Interrupted` field for Agents to set custom data. When the Runner receives an Action with non-empty Interrupted, it considers an interrupt has occurred. The internal mechanism of Interrupt & Resume is relatively complex and will be elaborated in the [Eino ADK: Agent Runner] - [Eino ADK: Interrupt & Resume] section.

```go
// For example, when ChatModelAgent interrupts, it sends the following AgentEvent:
h.Send(&AgentEvent{AgentName: h.agentName, Action: &AgentAction{
    Interrupted: &InterruptInfo{
       Data: &ChatModelAgentInterruptInfo{Data: data, Info: info},
    },
}})
```

4. Break Loop: When a child Agent of LoopAgent emits a BreakLoopAction, the corresponding LoopAgent will stop looping and exit normally.

# Language Settings

ADK provides a `SetLanguage` function to set the language for built-in prompts. This affects the language of prompts generated by all ADK built-in components and middleware. This capability was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13) version.

## API

```go
// Language represents the language setting for ADK built-in prompts
type Language uint8

const (
    // LanguageEnglish represents English (default)
    LanguageEnglish Language = iota
    // LanguageChinese represents Chinese
    LanguageChinese
)

// SetLanguage sets the language for ADK built-in prompts
// The default language is English (if not explicitly set)
func SetLanguage(lang Language) error
```

## Usage Example

```go
import "github.com/cloudwego/eino/adk"

// Set to Chinese
err := adk.SetLanguage(adk.LanguageChinese)
if err != nil {
    // Handle error
}

// Set to English (default)
err = adk.SetLanguage(adk.LanguageEnglish)
```

## Scope of Effect

Language settings affect the built-in prompts of the following components:

<table>
<tr><td>Component/Middleware</td><td>Affected Prompts</td></tr>
<tr><td>FileSystem Middleware</td><td>File system tool descriptions, system prompts, execution tool prompts</td></tr>
<tr><td>Reduction Middleware</td><td>Tool result truncation/cleanup prompt text</td></tr>
<tr><td>Skill Middleware</td><td>Skill system prompts, skill tool descriptions</td></tr>
<tr><td>ChatModelAgent</td><td>Built-in system prompts</td></tr>
</table>

> 💡
> It is recommended to set the language during program initialization because the language setting takes effect globally. Changing the language at runtime may result in mixed-language prompts within the same session.

> 💡
> The language setting only affects ADK built-in prompts. Your custom prompts (such as Agent's Instruction) need to handle internationalization on your own.
