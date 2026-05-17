---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 5: Middleware (Middleware Pattern)"
weight: 5
---

Goal of this chapter: understand the Middleware pattern and implement Tool error handling and ChatModel retry.

## Why Middleware

In Chapter 4 we added Tool capabilities to the Agent, enabling it to access the file system. However, in real-world scenarios, **Tool errors and ChatModel errors are common occurrences**, such as:

- **Tool errors**: file not found, invalid arguments, insufficient permissions, etc.
- **ChatModel errors**: API rate limiting (429), network timeouts, service unavailable, etc.

### Problem 1: Tool Errors Interrupt the Entire Flow

When a Tool execution fails, the error propagates directly to the Agent, causing the entire conversation to break:

```
[tool call] read_file(file_path: "nonexistent.txt")
Error: open nonexistent.txt: no such file or directory
// Conversation interrupted, user must start over
```

### Problem 2: Model Calls May Fail Due to Rate Limiting

When the model API returns a 429 (Too Many Requests) error, the entire conversation also breaks:

```
Error: rate limit exceeded (429)
// Conversation interrupted
```

### Desired Behavior

These error messages often **should not directly terminate the Agent flow**. Instead, we want to pass the error information to the model so it can self-correct and proceed to the next round. For example:

```
[tool call] read_file(file_path: "nonexistent.txt")
[tool result] [tool error] open nonexistent.txt: no such file or directory
[assistant] Sorry, the file doesn't exist. Let me list the files in the current directory...
[tool call] glob(pattern: "*")
```

### The Role of Middleware

The **Middleware pattern** can extend the behavior of Tools and ChatModels, making it ideal for solving this problem:

- **Middleware is an interceptor for the Agent**: inserts custom logic before and after calls
- **Middleware can handle errors**: converts errors into a format the model can understand
- **Middleware can implement retries**: automatically retries failed operations
- **Middleware is composable**: multiple Middlewares can be chained together

**Simple analogy:**

- **Agent** = "business logic"
- **Middleware** = "AOP aspect" (cross-cutting concerns like logging, retry, error handling)

## Code Location

- Entry code: [cmd/ch05/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go)

## Prerequisites

Same as Chapter 1: you need a configured ChatModel (OpenAI or Ark). Also, like Chapter 4, you need to set `PROJECT_ROOT`:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core library root directory
```

## Running

In the `examples/quickstart/chatwitheino` directory, run:

```bash
# Set project root directory
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch05
```

Output example:

```
you> List files in the current directory
[assistant] Let me list the files for you...
[tool call] list_files(directory: ".")

you> Read a non-existent file
[assistant] Attempting to read the file...
[tool call] read_file(file_path: "nonexistent.txt")
[tool result] [tool error] open nonexistent.txt: no such file or directory
[assistant] Sorry, the file doesn't exist...
```

## Key Concepts

### Middleware Interface

`ChatModelAgentMiddleware` is the middleware interface for the Agent:

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

**Design Philosophy:**

- **Decorator pattern**: each Middleware wraps the original call, and can modify input, output, or errors
- **Onion model**: requests pass through Middlewares from outside in, responses return from inside out
- **Composable**: multiple Middlewares execute in order

### Middleware Execution Order

`Handlers` (i.e., Middlewares) are wrapped in **array order**, forming an onion model:

```go
Handlers: []adk.ChatModelAgentMiddleware{
    &middlewareA{},  // Outermost: wrapped first, intercepts requests first, but WrapModel takes effect last
    &middlewareB{},  // Middle layer
    &middlewareC{},  // Innermost: wrapped last
}
```

**Execution order for Tool calls:**

```
Request → A.Wrap → B.Wrap → C.Wrap → Actual Tool execution → C returns → B returns → A returns → Response
```

**Practical advice:** Place `safeToolMiddleware` (error capture) at the innermost layer (end of the array) to ensure interrupt errors thrown by other Middlewares can propagate outward correctly.

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
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return "", err
            }
            // Convert error to string instead of returning an error
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
[assistant] Sorry, the file doesn't exist. Please check the file path...
// Conversation continues, model can adjust strategy based on the error
```

### ModelRetryConfig

`ModelRetryConfig` configures automatic retry for ChatModel:

```go
type ModelRetryConfig struct {
    MaxRetries int                          // Maximum number of retries
    IsRetryAble func(ctx context.Context, err error) bool  // Determines if an error is retryable
}
```

**Usage (using DeepAgent as an example):**

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

- Exponential backoff: retry intervals increase with each attempt
- Configurable conditions: use `IsRetryAble` to determine which errors are retryable
- Automatic recovery: no user intervention needed

## Middleware Implementation

### 1. Implementing SafeToolMiddleware

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
            // Interrupt errors are not converted; they need to propagate
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return "", err
            }
            // Other errors are converted to strings
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}
```

### 2. Implementing Streaming Tool Error Handling

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
            // Return a single-frame stream containing the error message
            return singleChunkReader(fmt.Sprintf("[tool error] %v", err)), nil
        }
        // Wrap the stream to capture errors within the stream
        return safeWrapReader(sr), nil
    }, nil
}
```

### 3. Configuring the Agent to Use Middleware

This chapter continues using the `DeepAgent` introduced in Chapter 4, registering Middleware in its `Handlers` field:

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
        &safeToolMiddleware{},  // Converts Tool errors to strings
    },
    ModelRetryConfig: &adk.ModelRetryConfig{
        MaxRetries: 5,
        IsRetryAble: func(_ context.Context, err error) bool {
            return strings.Contains(err.Error(), "429") ||
                strings.Contains(err.Error(), "Too Many Requests") ||
                strings.Contains(err.Error(), "qpm limit")
        },
    },
})
```

**Note**: The `Handlers` field (in configuration) and "Middleware" (the concept discussed in documentation) are the same thing — `Handlers` is the configuration field name, while `ChatModelAgentMiddleware` is the interface name.

```
**Key code snippet (**Note: this is a simplified snippet that cannot run directly. See** [cmd/ch05/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go) for the complete code):

```go
// SafeToolMiddleware captures Tool errors and converts them to strings
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

// Configure DeepAgent (same as Chapter 4, with added Handlers and ModelRetryConfig)
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
│  User: Read a non-existent file         │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent analyzes      │
        │  intent              │
        │  Decides to call     │
        │  read_file           │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  SafeToolMiddleware  │
        │  Intercepts Tool     │
        │  call                │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Executes read_file  │
        │  Returns error       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  SafeToolMiddleware  │
        │  Converts error to   │
        │  string              │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Returns Tool Result │
        │  "[tool error] ..."  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent generates     │
        │  reply               │
        │  "Sorry, file not    │
        │  found..."           │
        └──────────────────────┘
```

## Chapter Summary

- **Middleware**: Agent interceptors that insert custom logic before and after calls
- **SafeToolMiddleware**: converts Tool errors to strings so the model can understand and handle them
- **ModelRetryConfig**: configures automatic retry for ChatModel, handling temporary errors like rate limiting
- **Decorator pattern**: Middleware wraps the original call and can modify input, output, or errors
- **Onion model**: requests pass through Middlewares from outside in, responses return from inside out

## Further Reading

**Eino Built-in Middlewares:**

<table>
<tr><td>Middleware</td><td>Description</td></tr>
<tr><td><strong>reduction</strong></td><td>Tool output reduction — automatically truncates and offloads to the file system when tool output is too long, preventing context overflow</td></tr>
<tr><td><strong>summarization</strong></td><td>Automatic conversation history summarization — automatically generates summaries to compress history when token count exceeds a threshold</td></tr>
<tr><td><strong>skill</strong></td><td>Skill loading middleware — enables the Agent to dynamically load and execute predefined skills</td></tr>
</table>

**Middleware chain example:**

```go
import (
    "github.com/cloudwego/eino/adk/middlewares/reduction"
    "github.com/cloudwego/eino/adk/middlewares/summarization"
    "github.com/cloudwego/eino/adk/middlewares/skill"
)

// Create reduction middleware: manage tool output length
reductionMW, _ := reduction.New(ctx, &reduction.Config{
    Backend:           filesystemBackend,     // Storage backend
    MaxLengthForTrunc: 50000,                  // Max length for single tool output
    MaxTokensForClear: 30000,                  // Token threshold to trigger cleanup
})

// Create summarization middleware: automatically compress conversation history
summarizationMW, _ := summarization.New(ctx, &summarization.Config{
    Model: chatModel,                          // Model used to generate summaries
    Trigger: &summarization.TriggerCondition{
        ContextTokens: 190000,                 // Token threshold to trigger summarization
    },
})

// Combine multiple middlewares (conceptual example; when using DeepAgent, replace adk.NewChatModelAgent with deep.New)
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Handlers: []adk.ChatModelAgentMiddleware{  // Note: config field is Handlers, conceptually equivalent to Middlewares
        summarizationMW,   // Outermost: conversation history summarization
        reductionMW,       // Middle layer: tool output reduction
    },
})
```
