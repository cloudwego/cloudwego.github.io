---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ChatModelAgent
weight: 1
---

# ChatModelAgent Overview

`import "github.com/cloudwego/eino/adk"`

## What is ChatModelAgent

`ChatModelAgent` is the core Agent implementation of Eino ADK — it uses ChatModel as the decision maker, Tools as the action space, and autonomously drives problem solving through a ReAct Loop.

For a complete introduction to ChatModelAgent concepts, ReAct Loop, and the Middleware system, see: [ChatModelAgent Introduction](/docs/eino/overview/eino_adk_quickstart)

## ReAct Loop

When Tools are configured, ChatModelAgent executes in a ReAct loop:

1. **Reason**: Call the ChatModel, which decides the next action
2. **Action**: The model returns a ToolCall request
3. **Act**: Execute the corresponding Tool
4. **Observation**: Inject the Tool result into the context and start a new loop iteration

The loop continues until the model determines no further Tool calls are needed. Without Tools configured, it degrades to a single ChatModel call.

# Configuration

## TypedChatModelAgentConfig

```go
type TypedChatModelAgentConfig[M MessageType] struct {
    Name        string
    Description string
    Instruction string

    Model       model.BaseModel[M]    // Required. Must support model.WithTools when using Tools

    ToolsConfig ToolsConfig
    GenModelInput TypedGenModelInput[M]

    Exit          tool.BaseTool         // NOT RECOMMENDED
    OutputKey     string                // NOT RECOMMENDED
    MaxIterations int                   // Default 20

    Handlers          []TypedChatModelAgentMiddleware[M]
    Middlewares        []AgentMiddleware  // Legacy compatibility

    ModelRetryConfig    *TypedModelRetryConfig[M]
    ModelFailoverConfig *ModelFailoverConfig[M]
}

// Default alias
type ChatModelAgentConfig = TypedChatModelAgentConfig[*schema.Message]
```

### Field Descriptions

<table>
<tr><td>Field</td><td>Description</td></tr>
<tr><td><pre>Name</pre></td><td>Agent name. Required when used as an AgentTool</td></tr>
<tr><td><pre>Description</pre></td><td>Agent capability description. Required when used as an AgentTool</td></tr>
<tr><td><pre>Instruction</pre></td><td>System Prompt. Supports <pre>{Key}</pre> placeholders; the default <pre>GenModelInput</pre> renders them using SessionValues</td></tr>
<tr><td><pre>Model</pre></td><td><strong>Required</strong>. Type <pre>model.BaseModel[M]</pre>; must support <pre>model.WithTools</pre> when using Tools</td></tr>
<tr><td><pre>ToolsConfig</pre></td><td>Tool configuration, see below for details</td></tr>
<tr><td><pre>GenModelInput</pre></td><td>Custom input transformation. By default, uses Instruction as System Message + f-string rendering</td></tr>
<tr><td><pre>MaxIterations</pre></td><td>Maximum ReAct loop iterations; exits with error when exceeded. Default 20</td></tr>
<tr><td><pre>Handlers</pre></td><td>Interface-based Middleware (<pre>TypedChatModelAgentMiddleware[M]</pre>), recommended</td></tr>
<tr><td><pre>Middlewares</pre></td><td>Struct-based Middleware (<pre>AgentMiddleware</pre>), legacy compatibility</td></tr>
<tr><td><pre>ModelRetryConfig</pre></td><td>Retry strategy for failed model calls</td></tr>
<tr><td><pre>ModelFailoverConfig</pre></td><td>Switch to a backup model on failure. Requires configuring <pre>GetFailoverModel</pre> and <pre>ShouldFailover</pre></td></tr>
</table>

> 💡
> The default GenModelInput uses pyfmt rendering, so `{` and `}` in Messages are treated as placeholders. To output these characters literally, escape them with `{{` and `}}`.

### ToolsConfig

```go
type ToolsConfig struct {
    compose.ToolsNodeConfig

    ReturnDirectly     map[string]bool  // Tool names that return directly after execution
    EmitInternalEvents bool             // Forward AgentTool internal events
}
```

- **ReturnDirectly**: When a matching Tool is executed, the Agent exits immediately without calling the model again. If multiple Tools match, the first one is used
- **EmitInternalEvents**: When a sub-Agent is called via AgentTool, its events are forwarded in real-time to the parent Agent's event stream

### Constructors

```go
func NewChatModelAgent(ctx context.Context, config *ChatModelAgentConfig) (*ChatModelAgent, error)
func NewTypedChatModelAgent[M MessageType](ctx context.Context, config *TypedChatModelAgentConfig[M]) (*TypedChatModelAgent[M], error)
```

# Middleware (ChatModelAgentMiddleware)

## Interface Definition

```go
type TypedChatModelAgentMiddleware[M MessageType] interface {
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)
    AfterAgent(ctx context.Context, state *TypedChatModelAgentState[M]) (context.Context, error)

    BeforeModelRewriteState(ctx context.Context, state *TypedChatModelAgentState[M], mc *TypedModelContext[M]) (context.Context, *TypedChatModelAgentState[M], error)
    AfterModelRewriteState(ctx context.Context, state *TypedChatModelAgentState[M], mc *TypedModelContext[M]) (context.Context, *TypedChatModelAgentState[M], error)

    WrapModel(ctx context.Context, m model.BaseModel[M], mc *TypedModelContext[M]) (model.BaseModel[M], error)

    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)
    WrapEnhancedInvokableToolCall(ctx context.Context, endpoint EnhancedInvokableToolCallEndpoint, tCtx *ToolContext) (EnhancedInvokableToolCallEndpoint, error)
    WrapEnhancedStreamableToolCall(ctx context.Context, endpoint EnhancedStreamableToolCallEndpoint, tCtx *ToolContext) (EnhancedStreamableToolCallEndpoint, error)
}

type ChatModelAgentMiddleware = TypedChatModelAgentMiddleware[*schema.Message]
```

Embed `*BaseChatModelAgentMiddleware` to only override the methods you need:

```go
type MyMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *MyMiddleware) BeforeModelRewriteState(
    ctx context.Context,
    state *adk.ChatModelAgentState,
    mc *adk.ModelContext,
) (context.Context, *adk.ChatModelAgentState, error) {
    // Custom logic
    return ctx, state, nil
}
```

## Hook Points

<table>
<tr><td>Hook</td><td>Timing</td><td>Modifiable Content</td></tr>
<tr><td><pre>BeforeAgent</pre></td><td>Before Agent runs (once only)</td><td>Instruction, Tools, ReturnDirectly, ToolSearchTool</td></tr>
<tr><td><pre>AfterAgent</pre></td><td>After Agent completes successfully</td><td>Read final state (no modification)</td></tr>
<tr><td><pre>BeforeModelRewriteState</pre></td><td>Before each model call</td><td>Messages, ToolInfos, DeferredToolInfos (<strong>persisted to state</strong>)</td></tr>
<tr><td><pre>AfterModelRewriteState</pre></td><td>After each model call</td><td>Messages (including model response), ToolInfos (<strong>persisted to state</strong>)</td></tr>
<tr><td><pre>WrapModel</pre></td><td>Wrap model calls</td><td>Retry, failover, event emission (<strong>do not modify Messages</strong>)</td></tr>
<tr><td><pre>WrapToolCall</pre></td><td>Wrap tool calls</td><td>Permission checks, logging, output rewriting</td></tr>
</table>

> 💡
> The state returned by `BeforeModelRewriteState` is persisted by the framework to the agent's internal state. Therefore, modifications in this hook (such as compressing Messages or filtering ToolInfos) affect all subsequent iterations.

## Core Types

### ChatModelAgentContext (BeforeAgent Parameter)

```go
type ChatModelAgentContext struct {
    Instruction    string
    Tools          []tool.BaseTool
    ReturnDirectly map[string]bool
    ToolSearchTool *schema.ToolInfo  // Model's native ToolSearch capability
}
```

### ChatModelAgentState (BeforeModel/AfterModel Parameter)

```go
type TypedChatModelAgentState[M MessageType] struct {
    Messages          []M
    ToolInfos         []*schema.ToolInfo         // Tool list passed to the model
    DeferredToolInfos []*schema.ToolInfo         // Server-side deferred tool list
}

type ChatModelAgentState = TypedChatModelAgentState[*schema.Message]
```

### ModelContext (WrapModel Parameter)

```go
type TypedModelContext[M MessageType] struct {
    Tools               []*schema.ToolInfo          // Deprecated: use state.ToolInfos
    ModelRetryConfig    *TypedModelRetryConfig[M]
    ModelFailoverConfig *ModelFailoverConfig[M]
}

type ModelContext = TypedModelContext[*schema.Message]
```

## Execution Order

**Model call chain** (outer to inner):

1. `AgentMiddleware.BeforeChatModel`
2. **BeforeModelRewriteState**
3. failover wrapper (built-in)
4. retry wrapper (built-in)
5. event sender wrapper (built-in)
6. **WrapModel** (first registered = outermost)
7. callback injection (built-in)
8. Actual model call
9. **AfterModelRewriteState**
10. `AgentMiddleware.AfterChatModel`

**Tool call chain** (outer to inner):

1. event sender (built-in)
2. `ToolsConfig.ToolCallMiddlewares`
3. `AgentMiddleware.WrapToolCall`
4. **WrapToolCall** (first registered = outermost)
5. callback injection (built-in)
6. Actual tool call

# AgentAsTool

Wrap a sub-Agent as a Tool, allowing the parent Agent to call it autonomously via ToolCall:

```go
subAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "researcher",
    Description: "Search and summarize information",
    Model:       chatModel,
    // ...
})

agentTool := adk.NewAgentTool(ctx, subAgent)

parentAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{agentTool},
        },
    },
})
```

Generic version: `adk.NewTypedAgentTool[M](ctx, agent, options...)`

Options: `WithFullChatHistoryAsInput()` (pass full chat history), `WithAgentInputSchema(schema)` (custom input schema)

# ModelRetry

When configured, ChatModel calls are automatically retried on failure. When an error occurs during streaming, the current stream is still returned via AgentEvent, and consuming the MessageStream yields a `WillRetryError`:

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    ModelRetryConfig: &adk.ModelRetryConfig{
        // Retry strategy configuration
    },
})

// Handle WillRetryError when consuming the event stream
stream := event.Output.MessageOutput.MessageStream
for {
    msg, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        var willRetry *adk.WillRetryError
        if errors.As(err, &willRetry) {
            log.Printf("Attempt %d failed, retrying...", willRetry.RetryAttempt)
            break // Wait for the next event
        }
        break
    }
    displayChunk(msg)
}
```

# ModelFailover

When configured, the agent switches to a backup model on failure:

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: primaryModel,
    ModelFailoverConfig: &adk.ModelFailoverConfig{
        GetFailoverModel: func(ctx context.Context, err error) (model.BaseModel[*schema.Message], error) {
            return backupModel, nil
        },
        ShouldFailover: func(err error) bool {
            return true // Decide whether to failover based on error type
        },
    },
})
```

# Cancel

A runtime cancellation capability introduced in v0.9. See [Agent Cancel and TurnLoop](/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_and_turnloop_quickstart) for details.

```go
cancelOpt, cancelFn := adk.WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// Cancel later (CancelMode supports bitmask combination)
handle := cancelFn(adk.CancelAfterChatModel | adk.CancelAfterToolCalls)
handle.Wait() // Wait for cancellation to complete
```
