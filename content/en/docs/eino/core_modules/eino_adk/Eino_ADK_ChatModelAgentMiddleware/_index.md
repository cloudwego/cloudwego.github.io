---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino ADK: ChatModelAgentMiddleware'
weight: 8
---

## Overview

## ChatModelAgentMiddleware Interface

`ChatModelAgentMiddleware` defines the interface for customizing `ChatModelAgent` behavior.

**Important Note:** This interface is designed specifically for `ChatModelAgent` and Agents built on top of it (such as `DeepAgent`).

> 💡
> The ChatModelAgentMiddleware interface was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13)

### Why Use ChatModelAgentMiddleware Instead of AgentMiddleware?

<table>
<tr><td>Feature</td><td>AgentMiddleware (struct)</td><td>ChatModelAgentMiddleware (interface)</td></tr>
<tr><td>Extensibility</td><td>Closed, users cannot add new methods</td><td>Open, users can implement custom handlers</td></tr>
<tr><td>Context Propagation</td><td>Callbacks only return error</td><td>All methods return <pre>(context.Context, ..., error)</pre></td></tr>
<tr><td>Configuration Management</td><td>Scattered across closures</td><td>Centralized in struct fields</td></tr>
</table>

### Interface Definition

```go
type ChatModelAgentMiddleware interface {
    // BeforeAgent is called before each agent run, allowing modification of instruction and tools configuration
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)

    // BeforeModelRewriteState is called before each model invocation
    // The returned state will be persisted to agent internal state and passed to the model
    // The returned context will propagate to model invocation and subsequent handlers
    BeforeModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // AfterModelRewriteState is called after each model invocation
    // The input state contains the model response as the last message
    AfterModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // WrapInvokableToolCall wraps synchronous execution of a tool with custom behavior
    // Return the original endpoint and nil error if no wrapping is needed
    // This method is only called for tools that implement InvokableTool
    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)

    // WrapStreamableToolCall wraps streaming execution of a tool with custom behavior
    // Return the original endpoint and nil error if no wrapping is needed
    // This method is only called for tools that implement StreamableTool
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)

    // WrapEnhancedInvokableToolCall wraps synchronous execution of an enhanced tool with custom behavior
    WrapEnhancedInvokableToolCall(ctx context.Context, endpoint EnhancedInvokableToolCallEndpoint, tCtx *ToolContext) (EnhancedInvokableToolCallEndpoint, error)

    // WrapEnhancedStreamableToolCall wraps streaming execution of an enhanced tool with custom behavior
    WrapEnhancedStreamableToolCall(ctx context.Context, endpoint EnhancedStreamableToolCallEndpoint, tCtx *ToolContext) (EnhancedStreamableToolCallEndpoint, error)

    // WrapModel wraps the chat model with custom behavior
    // Return the original model and nil error if no wrapping is needed
    // Called at request time, executed before each model invocation
    WrapModel(ctx context.Context, m model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error)
}
```

### Using BaseChatModelAgentMiddleware

Embed `*BaseChatModelAgentMiddleware` to get default no-op implementations:

```go
type MyHandler struct {
    *adk.BaseChatModelAgentMiddleware
}

func (h *MyHandler) BeforeModelRewriteState(ctx context.Context, state *adk.ChatModelAgentState, mc *adk.ModelContext) (context.Context, *adk.ChatModelAgentState, error) {
    return ctx, state, nil
}
```

---

## Tool Call Endpoint Types

Tool wrapping uses function types instead of interfaces, more clearly expressing the intent of wrapping:

```go
// InvokableToolCallEndpoint is the function signature for synchronous tool calls
type InvokableToolCallEndpoint func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error)

// StreamableToolCallEndpoint is the function signature for streaming tool calls
type StreamableToolCallEndpoint func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (*schema.StreamReader[string], error)

// EnhancedInvokableToolCallEndpoint is the function signature for enhanced synchronous tool calls
type EnhancedInvokableToolCallEndpoint func(ctx context.Context, toolArgument *schema.ToolArgument, opts ...tool.Option) (*schema.ToolResult, error)

// EnhancedStreamableToolCallEndpoint is the function signature for enhanced streaming tool calls
type EnhancedStreamableToolCallEndpoint func(ctx context.Context, toolArgument *schema.ToolArgument, opts ...tool.Option) (*schema.StreamReader[*schema.ToolResult], error)
```

### Why Use Separate Endpoint Types?

The previous `ToolCall` interface contained both `InvokableRun` and `StreamableRun`, but most tools only implement one of them.
Separate endpoint types make it:

- Only call the corresponding wrap method when the tool implements the corresponding interface
- Clearer contract for wrapper authors
- No ambiguity about which method to implement

---

## ChatModelAgentContext

`ChatModelAgentContext` contains runtime information passed to handlers before each `ChatModelAgent` run.

```go
type ChatModelAgentContext struct {
    // Instruction is the instruction for the current Agent execution
    // Includes instructions configured for the agent, additional instructions appended by the framework and AgentMiddleware,
    // and modifications applied by previous BeforeAgent handlers
    Instruction string

    // Tools are the original tools configured for the current Agent execution (without any wrappers or tool middleware)
    // Includes tools passed in AgentConfig, tools implicitly added by the framework (such as transfer/exit tools),
    // and other tools added by middleware
    Tools []tool.BaseTool

    // ReturnDirectly is the set of tool names currently configured to make the Agent return directly
    ReturnDirectly map[string]bool
}
```

---

## ChatModelAgentState

`ChatModelAgentState` represents the state of a chat model agent during conversation. This is the primary state type for `ChatModelAgentMiddleware` and `AgentMiddleware` callbacks.

```go
type ChatModelAgentState struct {
    // Messages contains all messages in the current conversation session
    Messages []Message
}
```

---

## ToolContext

`ToolContext` provides metadata for the tool being wrapped. Created at request time, containing information about the current tool call.

```go
type ToolContext struct {
    // Name is the tool name
    Name string

    // CallID is the unique identifier for this specific tool call
    CallID string
}
```

### Usage Example: Tool Call Wrapping

```go
func (h *MyHandler) WrapInvokableToolCall(ctx context.Context, endpoint adk.InvokableToolCallEndpoint, tCtx *adk.ToolContext) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
        log.Printf("Tool %s (call %s) starting with args: %s", tCtx.Name, tCtx.CallID, argumentsInJSON)
        
        result, err := endpoint(ctx, argumentsInJSON, opts...)
        
        if err != nil {
            log.Printf("Tool %s failed: %v", tCtx.Name, err)
            return "", err
        }
        
        log.Printf("Tool %s completed with result: %s", tCtx.Name, result)
        return result, nil
    }, nil
}
```

---

## ModelContext

`ModelContext` contains contextual information passed to `WrapModel`. Created at request time, containing tool configuration for the current model call.

```go
type ModelContext struct {
    // Tools is the list of tools currently configured for the agent
    // Populated at request time, contains tools that will be sent to the model
    Tools []*schema.ToolInfo

    // ModelRetryConfig contains the retry configuration for the model
    // Populated at request time from the agent's ModelRetryConfig
    // Used by EventSenderModelWrapper to appropriately wrap stream errors
    ModelRetryConfig *ModelRetryConfig
}
```

### Usage Example: Model Wrapping

```go
func (h *MyHandler) WrapModel(ctx context.Context, m model.BaseChatModel, mc *adk.ModelContext) (model.BaseChatModel, error) {
    return &myModelWrapper{
        inner: m,
        tools: mc.Tools,
    }, nil
}

type myModelWrapper struct {
    inner model.BaseChatModel
    tools []*schema.ToolInfo
}

func (w *myModelWrapper) Generate(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    log.Printf("Model called with %d tools", len(w.tools))
    return w.inner.Generate(ctx, msgs, opts...)
}

func (w *myModelWrapper) Stream(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    return w.inner.Stream(ctx, msgs, opts...)
}
```

---

## Run-Local Storage API

`SetRunLocalValue`, `GetRunLocalValue`, and `DeleteRunLocalValue` provide the ability to store, retrieve, and delete values during the current agent Run() call.

```go
// SetRunLocalValue sets a key-value pair that persists during the current agent Run() call
// Values are scoped to this specific execution and are not shared across different Run() calls or agent instances
//
// Values stored here are compatible with interrupt/resume cycles - they will be serialized and restored when the agent resumes
// For custom types, you must register them in an init() function using schema.RegisterName[T]() to ensure proper serialization
//
// This function can only be called from within ChatModelAgentMiddleware during agent execution
// Returns an error if called outside of agent execution context
func SetRunLocalValue(ctx context.Context, key string, value any) error

// GetRunLocalValue retrieves a value set during the current agent Run() call
// Values are scoped to this specific execution and are not shared across different Run() calls or agent instances
//
// Values stored via SetRunLocalValue are compatible with interrupt/resume cycles - they will be serialized and restored when the agent resumes
// For custom types, you must register them in an init() function using schema.RegisterName[T]() to ensure proper serialization
//
// This function can only be called from within ChatModelAgentMiddleware during agent execution
// Returns (value, true, nil) if found, (nil, false, nil) if not found,
// Returns an error if called outside of agent execution context
func GetRunLocalValue(ctx context.Context, key string) (any, bool, error)

// DeleteRunLocalValue deletes a value set during the current agent Run() call
//
// This function can only be called from within ChatModelAgentMiddleware during agent execution
// Returns an error if called outside of agent execution context
func DeleteRunLocalValue(ctx context.Context, key string) error
```

### Usage Example: Sharing Data Across Handler Points

```go
func init() {
    schema.RegisterName[*MyCustomData]("my_package.MyCustomData")
}

type MyCustomData struct {
    Count int
    Name  string
}

type MyHandler struct {
    *adk.BaseChatModelAgentMiddleware
}

func (h *MyHandler) WrapInvokableToolCall(ctx context.Context, endpoint adk.InvokableToolCallEndpoint, tCtx *adk.ToolContext) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, argumentsInJSON, opts...)
        
        data := &MyCustomData{Count: 1, Name: tCtx.Name}
        if err := adk.SetRunLocalValue(ctx, "my_handler.last_tool", data); err != nil {
            log.Printf("Failed to set run local value: %v", err)
        }
        
        return result, err
    }, nil
}

func (h *MyHandler) AfterModelRewriteState(ctx context.Context, state *adk.ChatModelAgentState, mc *adk.ModelContext) (context.Context, *adk.ChatModelAgentState, error) {
    if val, found, err := adk.GetRunLocalValue(ctx, "my_handler.last_tool"); err == nil && found {
        if data, ok := val.(*MyCustomData); ok {
            log.Printf("Last tool was: %s (count: %d)", data.Name, data.Count)
        }
    }
    return ctx, state, nil
}
```

---

## SendEvent API

`SendEvent` allows sending custom `AgentEvent` to the event stream during agent execution.

```go
// SendEvent sends a custom AgentEvent to the event stream during agent execution
// Allows ChatModelAgentMiddleware implementations to emit custom events,
// which will be received by callers iterating over the agent event stream
//
// This function can only be called from within ChatModelAgentMiddleware during agent execution
// Returns an error if called outside of agent execution context
func SendEvent(ctx context.Context, event *AgentEvent) error
```

---

## State Type (To Be Deprecated)

`State` holds the agent runtime state, including messages and user-extensible storage.

**⚠️ Deprecation Warning:** This type will be made unexported in v1.0.0. Please use `ChatModelAgentState` in `ChatModelAgentMiddleware` and `AgentMiddleware` callbacks. Direct use of `compose.ProcessState[*State]` is not recommended and will stop working in v1.0.0; please use the handler API.

```go
type State struct {
    Messages []Message
    extra    map[string]any  // unexported, accessed via SetRunLocalValue/GetRunLocalValue

    // The following are internal fields - do not access directly
    // Kept exported for backward compatibility with existing checkpoints
    ReturnDirectlyToolCallID string
    ToolGenActions           map[string]*AgentAction
    AgentName                string
    RemainingIterations      int

    internals map[string]any
}
```

---

## Architecture Diagram

The following diagram illustrates how `ChatModelAgentMiddleware` works during `ChatModelAgent` execution:

```
Agent.Run(input)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BeforeAgent(ctx, *ChatModelAgentContext)                               │
│    Input: Current Instruction, Tools, and other Agent runtime context   │
│    Output: Modified Agent runtime context                               │
│    Purpose: Called once at Run start, modifies config for entire Run    │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ReAct Loop                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  BeforeModelRewriteState(ctx, *ChatModelAgentState, *MC)    │  │  │
│  │  │    Input: Persistent state like message history,            │  │  │
│  │  │           and Model runtime context                         │  │  │
│  │  │    Output: Modified persistent state, returns new ctx       │  │  │
│  │  │    Purpose: Modify cross-iteration persistent state         │  │  │
│  │  │             (mainly message list)                           │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                            │                                      │  │
│  │                            ▼                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  WrapModel(ctx, BaseChatModel, *ModelContext)               │  │  │
│  │  │    Input: ChatModel to wrap, and Model runtime context      │  │  │
│  │  │    Output: Wrapped Model (onion model)                      │  │  │
│  │  │    Purpose: Modify input, output, and config for single     │  │  │
│  │  │             Model request                                   │  │  │
│  │  │                         │                                   │  │  │
│  │  │                         ▼                                   │  │  │
│  │  │                 ┌───────────────┐                           │  │  │
│  │  │                 │    Model      │                           │  │  │
│  │  │                 │ Generate/Stream│                          │  │  │
│  │  │                 └───────────────┘                           │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                            │                                      │  │
│  │                            ▼                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  AfterModelRewriteState(ctx, *ChatModelAgentState, *MC)     │  │  │
│  │  │    Input: Persistent state like message history             │  │  │
│  │  │           (containing Model response),                      │  │  │
│  │  │           and Model runtime context                         │  │  │
│  │  │    Output: Modified persistent state                        │  │  │
│  │  │    Purpose: Modify cross-iteration persistent state         │  │  │
│  │  │             (mainly message list)                           │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                            │                                      │  │
│  │                            ▼                                      │  │
│  │                  ┌──────────────────┐                             │  │
│  │                  │ Model response?   │                            │  │
│  │                  └──────────────────┘                             │  │
│  │                     │            │                                │  │
│  │       Final response │            │ ToolCalls                     │  │
│  │                     │            ▼                                │  │
│  │                     │  ┌─────────────────────────────────────┐    │  │
│  │                     │  │  WrapInvokableToolCall / WrapStream │    │  │
│  │                     │  │  ableToolCall(ctx, endpoint, *TC)   │    │  │
│  │                     │  │    Input: Tool to wrap and          │    │  │
│  │                     │  │          Tool runtime context       │    │  │
│  │                     │  │    Output: Wrapped endpoint         │    │  │
│  │                     │  │            (onion model)            │    │  │
│  │                     │  │    Purpose: Modify input, output,   │    │  │
│  │                     │  │             and config for single   │    │  │
│  │                     │  │             Tool request            │    │  │
│  │                     │  │                  │                  │    │  │
│  │                     │  │                  ▼                  │    │  │
│  │                     │  │          ┌─────────────┐            │    │  │
│  │                     │  │          │ Tool.Run()  │            │    │  │
│  │                     │  │          └─────────────┘            │    │  │
│  │                     │  └─────────────────────────────────────┘    │  │
│  │                     │            │                                │  │
│  │                     │            │ (result added to Messages)     │  │
│  │                     │            │                                │  │
│  │                     │  ┌─────────┘                                │  │
│  │                     │  │                                          │  │
│  │                     │  └──────────► Continue loop                 │  │
│  │                     │                                             │  │
│  └─────────────────────┼─────────────────────────────────────────────┘  │
│                        │                                                │
│                        ▼                                                │
│               Loop until complete or maxIterations reached              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                          Agent.Run() ends
```

### Handler Method Description

<table>
<tr><td>Method</td><td>Input</td><td>Output</td><td>Scope</td></tr>
<tr><td><pre>BeforeAgent</pre></td><td>Agent runtime context (<pre>*ChatModelAgentContext</pre>)</td><td>Modified Agent runtime context</td><td>Entire Run lifecycle, called only once</td></tr>
<tr><td><pre>BeforeModelRewriteState</pre></td><td>Persistent state + Model runtime context</td><td>Modified persistent state</td><td>Cross-iteration persistent state (message list)</td></tr>
<tr><td><pre>WrapModel</pre></td><td>ChatModel to wrap + Model runtime context</td><td>Wrapped Model</td><td>Input, output, and config for single Model request</td></tr>
<tr><td><pre>AfterModelRewriteState</pre></td><td>Persistent state (with response) + Model runtime context</td><td>Modified persistent state</td><td>Cross-iteration persistent state (message list)</td></tr>
<tr><td><pre>WrapInvokableToolCall</pre></td><td>Tool to wrap + Tool runtime context</td><td>Wrapped endpoint</td><td>Input, output, and config for single Tool request</td></tr>
<tr><td><pre>WrapStreamableToolCall</pre></td><td>Tool to wrap + Tool runtime context</td><td>Wrapped endpoint</td><td>Input, output, and config for single Tool request</td></tr>
</table>

---

## Execution Order

### Model Call Lifecycle (outer to inner wrapper chain)

1. `AgentMiddleware.BeforeChatModel` (hook, runs before model call)
2. `ChatModelAgentMiddleware.BeforeModelRewriteState` (hook, can modify state before model call)
3. `retryModelWrapper` (internal - retries on failure if configured)
4. `eventSenderModelWrapper` pre-processing (internal - prepares event sending)
5. `ChatModelAgentMiddleware.WrapModel` pre-processing (wrapper, wrapped at request time, first registered runs first)
6. `callbackInjectionModelWrapper` (internal - injects callbacks if not enabled)
7. `Model.Generate/Stream`
8. `callbackInjectionModelWrapper` post-processing
9. `ChatModelAgentMiddleware.WrapModel` post-processing (wrapper, first registered runs last)
10. `eventSenderModelWrapper` post-processing (internal - sends model response events)
11. `retryModelWrapper` post-processing (internal - handles retry logic)
12. `ChatModelAgentMiddleware.AfterModelRewriteState` (hook, can modify state after model call)
13. `AgentMiddleware.AfterChatModel` (hook, runs after model call)

### Tool Call Lifecycle (outer to inner)

1. `eventSenderToolHandler` (internal ToolMiddleware - sends tool result events after all processing)
2. `ToolsConfig.ToolCallMiddlewares` (ToolMiddleware)
3. `AgentMiddleware.WrapToolCall` (ToolMiddleware)
4. `ChatModelAgentMiddleware.WrapInvokableToolCall/WrapStreamableToolCall` (wrapped at request time, first registered is outermost)
5. `Tool.InvokableRun/StreamableRun`

---

## Migration Guide

### Migrating from AgentMiddleware to ChatModelAgentMiddleware

**Before (AgentMiddleware):**

```go
middleware := adk.AgentMiddleware{
    BeforeChatModel: func(ctx context.Context, state *adk.ChatModelAgentState) error {
        return nil
    },
}
```

**After (ChatModelAgentMiddleware):**

```go
type MyHandler struct {
    *adk.BaseChatModelAgentMiddleware
}

func (h *MyHandler) BeforeModelRewriteState(ctx context.Context, state *adk.ChatModelAgentState, mc *adk.ModelContext) (context.Context, *adk.ChatModelAgentState, error) {
    newCtx := context.WithValue(ctx, myKey, myValue)
    return newCtx, state, nil
}
```

### Migrating from compose.ProcessState[*State]

**Before:**

```go
compose.ProcessState(ctx, func(_ context.Context, st *adk.State) error {
    st.Extra["myKey"] = myValue
    return nil
})
```

**After (using SetRunLocalValue/GetRunLocalValue):**

```go
if err := adk.SetRunLocalValue(ctx, "myKey", myValue); err != nil {
    return ctx, state, err
}

if val, found, err := adk.GetRunLocalValue(ctx, "myKey"); err == nil && found {
}
```
