---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Abstraction
weight: 3
---

# Agent Interface

All ADK functionality revolves around the `Agent` interface:

```go
// github.com/cloudwego/eino/adk

type TypedAgent[M MessageType] interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *TypedAgentInput[M], options ...AgentRunOption) *AsyncIterator[*TypedAgentEvent[M]]
}

// Default type alias (uses *schema.Message)
type Agent = TypedAgent[*schema.Message]
```

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td><pre>Name</pre></td><td>Agent name identifier</td></tr>
<tr><td><pre>Description</pre></td><td>Capability description, for other Agents or the framework to understand its capabilities</td></tr>
<tr><td><pre>Run</pre></td><td>Core execution method, asynchronously returns an event stream (Future pattern)</td></tr>
</table>

## MessageType Constraint

```go
type MessageType interface {
    *schema.Message | *schema.AgenticMessage
}
```

All ADK generic types are parameterized with `[M MessageType]`. `*schema.Message` supports full ADK features; `*schema.AgenticMessage` is used for the structured content block mode added in v0.9.

## Type Alias Quick Reference

<table>
<tr><td>Generic Type</td><td>Default Alias</td></tr>
<tr><td><pre>TypedAgent[*schema.Message]</pre></td><td><pre>Agent</pre></td></tr>
<tr><td><pre>TypedAgentInput[*schema.Message]</pre></td><td><pre>AgentInput</pre></td></tr>
<tr><td><pre>TypedAgentEvent[*schema.Message]</pre></td><td><pre>AgentEvent</pre></td></tr>
<tr><td><pre>TypedAgentOutput[*schema.Message]</pre></td><td><pre>AgentOutput</pre></td></tr>
<tr><td><pre>TypedMessageVariant[*schema.Message]</pre></td><td><pre>MessageVariant</pre></td></tr>
</table>

# AgentInput

```go
type TypedAgentInput[M MessageType] struct {
    Messages       []M
    EnableStreaming bool
}
```

- **Messages**: User instructions, conversation history, background knowledge, etc., same format as ChatModel input
- **EnableStreaming**: Suggests the Agent use streaming output. Components that support streaming (such as ChatModel) will return progressively; components that don't are unaffected

# AgentEvent

Events produced during Agent execution:

```go
type TypedAgentEvent[M MessageType] struct {
    AgentName string
    RunPath   []RunStep
    Output    *TypedAgentOutput[M]
    Action    *AgentAction
    Err       error
}
```

## AgentOutput

```go
type TypedAgentOutput[M MessageType] struct {
    MessageOutput    *TypedMessageVariant[M]
    CustomizedOutput any
}
```

`MessageVariant` provides unified handling for streaming and non-streaming messages:

```go
type TypedMessageVariant[M MessageType] struct {
    IsStreaming   bool
    Message       M
    MessageStream *schema.StreamReader[M]
    Role          schema.RoleType       // *schema.Message path
    AgenticRole   schema.AgenticRoleType // *schema.AgenticMessage path
    ToolName      string
}
```

- `IsStreaming=true` → Read frame-by-frame from `MessageStream`
- `IsStreaming=false` → Get all at once from `Message`
- `Role`/`ToolName`: Only effective for the `*schema.Message` path (Assistant or Tool)
- `AgenticRole`: Only effective for the `*schema.AgenticMessage` path

## AgentAction

Behavioral signals for controlling multi-Agent collaboration:

```go
type AgentAction struct {
    Exit            bool
    Interrupted     *InterruptInfo
    TransferToAgent *TransferToAgentAction  // NOT RECOMMENDED
    BreakLoop       *BreakLoopAction
    CustomizedAction any
}
```

- **Interrupted**: Interrupts Runner execution, carries custom data, supports subsequent Resume
- **BreakLoop**: Terminates the LoopAgent's loop
- **Exit**: Immediately exits the multi-Agent system
- **TransferToAgent**: (Not recommended) Task transfer, AgentAsTool is recommended instead

# AgentRunOption

Request-level Agent configuration. ADK built-ins:

- `WithSessionValues(map[string]any)`: Inject cross-Agent shared KV data
- `WithCallbacks(...callbacks.Handler)`: Add callback handlers
- `WithCancel()`: Enable Agent Cancel capability (see [Cancel and TurnLoop](/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门))

Custom Option:

```go
type myOptions struct {
    modelName string
}

func WithModelName(name string) adk.AgentRunOption {
    return adk.WrapImplSpecificOptFn(func(t *myOptions) {
        t.modelName = name
    })
}

// Read in Run
func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    o := adk.GetImplSpecificOptions(&myOptions{}, opts...)
    // Use o.modelName ...
}
```

`DesignateAgent` can restrict an Option to a specified Agent:

```go
opt := adk.WithSessionValues(map[string]any{"key": "val"}).DesignateAgent("agent_1")
```

# AsyncIterator

The asynchronous event iterator returned by `Run`:

```go
iter := agent.Run(ctx, input)
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // Handle event
}
```

`Next()` blocks until a new event is available or iteration ends. Agent implementations typically write to a Generator in a goroutine and return the Iterator immediately:

```go
func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    iter, gen := adk.NewAsyncIteratorPair[*adk.AgentEvent]()
    go func() {
        defer gen.Close()
        // Execute logic, produce events via gen.Send(event)
    }()
    return iter
}
```

# Language Settings

```go
adk.SetLanguage(adk.LanguageChinese) // Or adk.LanguageEnglish (default)
```

Affects ADK built-in prompts (FileSystem, Reduction, Skill, ChatModelAgent and other components). It is recommended to set this during program initialization.

> 💡
> Language settings only affect ADK built-in prompts. Custom Instructions need to handle internationalization on their own.
