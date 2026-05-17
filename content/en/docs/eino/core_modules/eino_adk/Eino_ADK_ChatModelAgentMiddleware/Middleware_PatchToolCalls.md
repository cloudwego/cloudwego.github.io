---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: PatchToolCalls
weight: 8
---

adk/middlewares/patchtoolcalls

> 💡
> The PatchToolCalls middleware is used to fix "dangling tool calls" issues in the message history. Introduced in v0.8.0. It supports both `*schema.Message` and `*schema.AgenticMessage` message types.

## Overview

In multi-turn conversation scenarios, there may be cases where an Assistant message contains tool calls (ToolCalls) but the corresponding Tool response is missing from the conversation history. Such "dangling tool calls" can cause some model APIs to throw errors or produce abnormal behavior. **Common scenarios:**

- The user sent a new message before tool execution completed, causing the tool call to be interrupted
- Some tool call results were lost during session recovery
- The user canceled tool execution in a Human-in-the-loop scenario

The PatchToolCalls middleware scans the message history before each model call (in the `BeforeModelRewriteState` hook) and automatically inserts placeholder messages for tool calls that lack responses.

## Quick Start

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/patchtoolcalls"
)

// Use default configuration (cfg can be nil)
mw, err := patchtoolcalls.New(ctx, nil)
if err != nil {
    // handle error
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{mw},
})
```

## API Reference

### Config

```go
type Config struct {
    PatchedContentGenerator func(ctx context.Context, toolName, toolCallID string) (string, error)
}
```

<table>
<tr><td>Field</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td>PatchedContentGenerator</td><td><pre>func(ctx context.Context, toolName, toolCallID string) (string, error)</pre></td><td>No</td><td>Custom function to generate placeholder message content. When not set, the built-in default message template is used</td></tr>
</table>

### New

```go
func New(ctx context.Context, cfg *Config) (adk.ChatModelAgentMiddleware, error)
```

Creates the PatchToolCalls middleware. `cfg` can be `nil`, in which case the default configuration is used. Internally calls `NewTyped[*schema.Message]`.

### NewTyped

```go
func NewTyped[M adk.MessageType](_ context.Context, cfg *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

Generic version constructor, supporting `*schema.Message` and `*schema.AgenticMessage`. `cfg` can be `nil`.

- When `M = *schema.Message`, matching is done via the `ToolCallID` field of Tool messages
- When `M = *schema.AgenticMessage`, matching is done via `ContentBlock.FunctionToolResult.CallID`

### Default Placeholder Message

If `PatchedContentGenerator` is not set, the middleware uses a built-in template (formatted via `fmt.Sprintf`, where `%s` corresponds to toolName and toolCallID respectively): **English (default):**

```
Tool call %s with id %s was canceled - another message came in before it could be completed.
```

**Chinese:**

```
工具调用 %s（ID 为 %s）已被取消——在其完成之前收到了另一条消息。
```

You can switch languages via `adk.SetLanguage()`.

## Usage Examples

### Custom Placeholder Message

```go
mw, err := patchtoolcalls.New(ctx, &patchtoolcalls.Config{
    PatchedContentGenerator: func(ctx context.Context, toolName, toolCallID string) (string, error) {
        return fmt.Sprintf("[System Notice] Tool %s execution was skipped (Call ID: %s)", toolName, toolCallID), nil
    },
})
```

### Generic Usage (AgenticMessage)

```go
mw, err := patchtoolcalls.NewTyped[*schema.AgenticMessage](ctx, nil)
if err != nil {
    // handle error
}

agent, err := adk.NewTypedChatModelAgent[*schema.AgenticMessage](ctx, &adk.TypedChatModelAgentConfig[*schema.AgenticMessage]{
    Model:       yourChatModel,
    Middlewares: []adk.TypedChatModelAgentMiddleware[*schema.AgenticMessage]{mw},
})
```

### Combining with Other Middlewares

```go
// PatchToolCalls is typically placed at the front of the middleware chain
// to ensure dangling tool calls are fixed before other middlewares process messages
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{
        patchToolCallsMiddleware,  // fix messages first
        summarizationMiddleware,   // then summarize
        reductionMiddleware,       // finally reduce
    },
})
```

## How It Works

> 💡
> For `*schema.Message`, matching is done via `msg.Role == schema.Tool && msg.ToolCallID`; for `*schema.AgenticMessage`, matching is done via `ContentBlock.FunctionToolResult.CallID`.

### Example Scenario

**Before repair:**

```
[User]      "Help me check the weather"
[Assistant]  ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]      "call_1: Sunny, 25°C"
[User]      "No need to check the location, just tell me Beijing's weather"   <- User interrupts
```

**After repair:**

```
[User]      "Help me check the weather"
[Assistant]  ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]      "call_1: Sunny, 25°C"
[Tool]      "call_2: Tool call get_location (ID: call_2) was canceled..."  <- Automatically inserted
[User]      "No need to check the location, just tell me Beijing's weather"
```

## Multi-language Support

Placeholder messages support Chinese and English, switchable via `adk.SetLanguage()`:

```go
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // Chinese
adk.SetLanguage(adk.LanguageEnglish)  // English (default)
```

## Notes

> 💡
> The state returned by `BeforeModelRewriteState` is persisted to the agent's internal state by the framework (see the `ProcessState` call in `wrappers.go`). Therefore, placeholder messages inserted by PatchToolCalls **will be retained in subsequent iterations** and do not need to be re-patched every round.

- It is recommended to place this middleware at the **front** of the middleware chain to ensure other middlewares process a complete message history
- The `cfg` parameter can be `nil`, equivalent to `&Config{}`
- If the message list is empty (`len(state.Messages) == 0`), the middleware returns immediately without any processing
