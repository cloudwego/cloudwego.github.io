---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 5: Middleware (The Middleware Pattern)"
weight: 5
---

Goal of this chapter: understand the Middleware pattern and implement Tool error handling and a ChatModel retry mechanism.

## Why Middleware

In Chapter 4 we added Tool capability so the Agent can access the filesystem. In real applications, **Tool failures and ChatModel failures are common**, for example:

- **Tool errors**: missing files, invalid arguments, insufficient permissions, etc.
- **ChatModel errors**: rate limiting (429), network timeouts, service unavailable, etc.

### Problem 1: Tool Errors Can Break the Whole Flow

When a Tool execution fails, the error can propagate to the Agent and interrupt the conversation:

```
[tool call] read_file(file_path: "nonexistent.txt")
Error: open nonexistent.txt: no such file or directory
// conversation interrupted; the user has to restart
```

### Problem 2: Model Calls Can Fail Due to Rate Limits

When the model API returns 429 (Too Many Requests), the conversation also gets interrupted:

```
Error: rate limit exceeded (429)
// conversation interrupted
```

### Desired Behavior

Often we **don’t want these errors to terminate the Agent flow**. Instead, we want to pass the error information back to the model so it can self-correct and continue, for example:

```
[tool call] read_file(file_path: "nonexistent.txt")
[tool result] [tool error] open nonexistent.txt: no such file or directory
[assistant] Sorry, the file doesn't exist. Let me list the current directory first...
[tool call] glob(pattern: "*")
```

### What Middleware Is For

The **Middleware pattern** can extend the behavior of Tools and ChatModels, which fits this problem well:

- **Middleware is an interceptor for the Agent**: insert custom logic before/after calls
- **Middleware can handle errors**: convert errors into model-readable formats
- **Middleware can implement retries**: automatically retry failed operations
- **Middleware is composable**: multiple middlewares can be chained

**Analogy:**

- **Agent** = “business logic”
- **Middleware** = “AOP aspects” (logging, retries, error handling, and other cross-cutting concerns)

## Code Location

- Entry code: [cmd/ch05/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark). Also, set `PROJECT_ROOT` as in Chapter 4:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core repo root
```

## Run

From `examples/quickstart/chatwitheino`:

```bash
# set project root
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch05
```

Example output:

```
you> List files in the current directory
[assistant] Sure, let me list the files...
[tool call] list_files(directory: ".")

you> Read a file that does not exist
[assistant] Trying to read the file...
[tool call] read_file(file_path: "nonexistent.txt")
[tool result] [tool error] open nonexistent.txt: no such file or directory
[assistant] Sorry, the file doesn't exist...
```

## Key Concepts

### Middleware Interface

`ChatModelAgentMiddleware` is the middleware interface for agents:

```go
type ChatModelAgentMiddleware interface {
    // BeforeAgent is called before each agent run, allowing modification of
    // the agent's instruction and tools configuration.
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)

    // BeforeModelRewriteState is called before each model invocation.
    // The returned state is persisted to the agent's internal state and passed to the model.
    BeforeModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // AfterModelRewriteState is called after each model invocation.
    // The input state includes the model's response as the last message.
    AfterModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // WrapInvokableToolCall wraps a tool's synchronous execution with custom behavior.
    // This method is only called for tools that implement InvokableTool.
    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)

    // WrapStreamableToolCall wraps a tool's streaming execution with custom behavior.
    // This method is only called for tools that implement StreamableTool.
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)

    // WrapEnhancedInvokableToolCall wraps an enhanced tool's synchronous execution.
    // This method is only called for tools that implement EnhancedInvokableTool.
    WrapEnhancedInvokableToolCall(ctx context.Context, endpoint EnhancedInvokableToolCallEndpoint, tCtx *ToolContext) (EnhancedInvokableToolCallEndpoint, error)

    // WrapEnhancedStreamableToolCall wraps an enhanced tool's streaming execution.
    // This method is only called for tools that implement EnhancedStreamableTool.
    WrapEnhancedStreamableToolCall(ctx context.Context, endpoint EnhancedStreamableToolCallEndpoint, tCtx *ToolContext) (EnhancedStreamableToolCallEndpoint, error)

    // WrapModel wraps a chat model with custom behavior.
    // This method is called at request time when the model is about to be invoked.
    WrapModel(ctx context.Context, m model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error)
}
```

**Design ideas:**

- **Decorator pattern**: each middleware wraps the original call and can modify input/output/errors
- **Onion model**: requests go from outer to inner; responses bubble back from inner to outer
- **Composable**: multiple middlewares run in order

### Middleware Execution Order

`Handlers` (middlewares) wrap in **array order**, forming an onion:

```go
Handlers: []adk.ChatModelAgentMiddleware{
    &middlewareA{},  // outermost: wraps first; intercepts requests first
    &middlewareB{},  // middle
    &middlewareC{},  // innermost: wraps last
}
```

**For Tool calls:**

```
request → A.Wrap → B.Wrap → C.Wrap → actual Tool execution → C returns → B returns → A returns → response
```

Practical tip: put `safeToolMiddleware` (error capture) as the innermost layer (at the end of the array), so interrupt errors thrown by other middlewares can propagate outward correctly.

### SafeToolMiddleware

`SafeToolMiddleware` converts Tool errors into strings so the model can understand and handle them:

```go
type safeToolMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *safeToolMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    _ *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, args, opts...)
        if err != nil {
            // Convert errors to strings instead of returning an error.
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}
```

**Effect:**

```
[tool call] read_file(file_path: "nonexistent.txt")
[tool result] [tool error] open nonexistent.txt: no such file or directory
[assistant] Sorry, the file doesn't exist. Please check the path...
// conversation continues; the model can adapt based on the error message
```

### ModelRetryConfig

`ModelRetryConfig` configures automatic retries for ChatModel:

```go
type ModelRetryConfig struct {
    MaxRetries int                          // max retry count
    IsRetryAble func(ctx context.Context, err error) bool  // whether an error is retryable
}
```

**Usage (DeepAgent example):**

```go
agent, err := deep.New(ctx, &deep.Config{
    // ...
    ModelRetryConfig: &adk.ModelRetryConfig{
        MaxRetries: 5,
        IsRetryAble: func(_ context.Context, err error) bool {
            // 429 rate limit errors are retryable
            return strings.Contains(err.Error(), "429") ||
                strings.Contains(err.Error(), "Too Many Requests") ||
                strings.Contains(err.Error(), "qpm limit")
        },
    },
})
```

**Retry strategy:**

- exponential backoff: retry interval increases each time
- configurable conditions: `IsRetryAble` decides what to retry
- automatic recovery: no user intervention needed

## Implementing the Middleware

### 1. Implement SafeToolMiddleware

```go
type safeToolMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *safeToolMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    _ *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, args, opts...)
        if err != nil {
            // Interrupt errors must not be converted; they must keep propagating.
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return "", err
            }
            // Convert other errors to strings.
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}
```

### 2. Handle Streaming Tool Errors

```go
func (m *safeToolMiddleware) WrapStreamableToolCall(
    _ context.Context,
    endpoint adk.StreamableToolCallEndpoint,
    _ *adk.ToolContext,
) (adk.StreamableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (*schema.StreamReader[string], error) {
        sr, err := endpoint(ctx, args, opts...)
        if err != nil {
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return nil, err
            }
            // Return a single-chunk stream containing the error message.
            return singleChunkReader(fmt.Sprintf("[tool error] %v", err)), nil
        }
        // Wrap the stream and catch errors inside the stream.
        return safeWrapReader(sr), nil
    }, nil
}
```

### 3. Configure the Agent to Use Middleware

This chapter continues using `DeepAgent` from Chapter 4. Register middlewares in the `Handlers` field:

```go
agent, err := deep.New(ctx, &deep.Config{
    Name:           "Ch05MiddlewareAgent",
    Description:    "ChatWithDoc agent with safe tool middleware and retry.",
    ChatModel:      cm,
    Instruction:    agentInstruction,
    Backend:        backend,
    StreamingShell: backend,
    MaxIteration:   50,
    Handlers: []adk.ChatModelAgentMiddleware{
        &safeToolMiddleware{},  // convert Tool errors to strings
    },
    ModelRetryConfig: &adk.ModelRetryConfig{
        MaxRetries: 5,
        IsRetryAble: func(_ context.Context, err error) bool {
            return strings.Contains(err.Error(), "429") ||
                strings.Contains(err.Error(), "Too Many Requests")
        },
    },
})
```

Note: the `Handlers` field (config) and the “Middleware” concept discussed in this chapter refer to the same thing. `Handlers` is the config field name; `ChatModelAgentMiddleware` is the interface name.

Key snippet (note: this is a simplified excerpt and not directly runnable; see [cmd/ch05/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go)):

```go
// SafeToolMiddleware catches Tool errors and converts them to strings.
type safeToolMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *safeToolMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    _ *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, args, opts...)
        if err != nil {
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return "", err
            }
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}

// Configure DeepAgent (same as Chapter 4, plus Handlers and ModelRetryConfig).
agent, _ := deep.New(ctx, &deep.Config{
    ChatModel:      cm,
    Backend:        backend,
    StreamingShell: backend,
    MaxIteration:   50,
    Handlers: []adk.ChatModelAgentMiddleware{
        &safeToolMiddleware{},
    },
    ModelRetryConfig: &adk.ModelRetryConfig{
        MaxRetries: 5,
        IsRetryAble: func(_ context.Context, err error) bool {
            return strings.Contains(err.Error(), "429")
        },
    },
})
```

## Middleware Execution Flow

```
┌─────────────────────────────────────────┐
│  user: read a nonexistent file           │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent analyzes intent │
        │  chooses read_file     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  SafeToolMiddleware   │
        │  intercepts Tool call │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  execute read_file    │
        │  returns an error     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  SafeToolMiddleware   │
        │  converts error to str│
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool Result          │
        │  "[tool error] ..."   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent responds       │
        │  "sorry..."           │
        └──────────────────────┘
```

## Summary

- **Middleware**: interceptors for Agents, inserting custom logic around calls
- **SafeToolMiddleware**: converts Tool errors into strings so the model can handle them
- **ModelRetryConfig**: automatic ChatModel retry to handle transient errors like rate limits
- **Decorator pattern**: middleware wraps calls and can modify inputs/outputs/errors
- **Onion model**: requests go inward; responses go outward

## Further Thoughts

**Built-in Eino middlewares:**

<table>
<tr><td>Middleware</td><td>Description</td></tr>
<tr><td><strong>reduction</strong></td><td>Tool output reduction: truncates overly long tool outputs and offloads them to filesystem to prevent context overflow</td></tr>
<tr><td><strong>summarization</strong></td><td>Automatic chat-history summarization when token count exceeds a threshold</td></tr>
<tr><td><strong>skill</strong></td><td>Skill loader: dynamically loads and executes predefined skills</td></tr>
</table>

**Example middleware chain:**

```go
import (
    "github.com/cloudwego/eino/adk/middlewares/reduction"
    "github.com/cloudwego/eino/adk/middlewares/summarization"
    "github.com/cloudwego/eino/adk/middlewares/skill"
)

// Create reduction middleware: manage tool output length.
reductionMW, _ := reduction.New(ctx, &reduction.Config{
    Backend:           filesystemBackend,     // storage backend
    MaxLengthForTrunc: 50000,                  // max output length per tool call
    MaxTokensForClear: 30000,                  // token threshold for cleanup
})

// Create summarization middleware: compress chat history automatically.
summarizationMW, _ := summarization.New(ctx, &summarization.Config{
    Model: chatModel,                          // model used to generate summaries
    Trigger: &summarization.TriggerCondition{
        ContextTokens: 190000,                 // token threshold for summarization
    },
})

// Combine middlewares (conceptual example; with DeepAgent replace adk.NewChatModelAgent with deep.New).
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Handlers: []adk.ChatModelAgentMiddleware{  // config field name is Handlers; conceptually equals “middlewares”
        summarizationMW,   // outermost: chat-history summarization
        reductionMW,       // middle: tool-output reduction
    },
})
```
