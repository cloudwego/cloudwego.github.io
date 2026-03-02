---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: PatchToolCalls'
weight: 7
---

adk/middlewares/patchtoolcalls

> 💡
> The PatchToolCalls middleware is used to fix "dangling tool calls" issues in message history.
>
> This middleware was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13).

## Overview

In multi-turn conversation scenarios, there may be cases where an Assistant message contains ToolCalls, but the conversation history lacks corresponding Tool message responses. These "dangling tool calls" can cause certain model APIs to error or produce abnormal behavior.

**Common Scenarios:**

- User sends a new message before tool execution completes, causing the tool call to be interrupted
- During session recovery, some tool call results are lost
- In human-in-the-loop scenarios, user cancels tool execution

The PatchToolCalls middleware scans the message history before each model call and automatically inserts placeholder messages for tool calls missing responses.

## Quick Start

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/patchtoolcalls"
)

// Create middleware with default configuration
mw, err := patchtoolcalls.New(ctx, nil)
if err != nil {
    // handle error
}

// Use with ChatModelAgent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{mw},
})
```

## Configuration Options

```go
type Config struct {
    // PatchedContentGenerator custom function to generate placeholder message content
    // Optional, uses default message when not set
    PatchedContentGenerator func(ctx context.Context, toolName, toolCallID string) (string, error)
}
```

<table>
<tr><td>Field</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td>PatchedContentGenerator</td><td><pre>func(ctx, toolName, toolCallID string) (string, error)</pre></td><td>No</td><td>Custom function to generate placeholder message content. Parameters include tool name and call ID, returns the content to fill</td></tr>
</table>

### Default Placeholder Message

If `PatchedContentGenerator` is not set, the middleware will use the default placeholder message:

**English (default):**

```
Tool call {toolName} with id {toolCallID} was cancelled - another message came in before it could be completed.
```

**Chinese:**

```
工具调用 {toolName}（ID 为 {toolCallID}）已被取消——在其完成之前收到了另一条消息。
```

Language can be switched via `adk.SetLanguage()`.

## Usage Examples

### Custom Placeholder Message

```go
mw, err := patchtoolcalls.New(ctx, &patchtoolcalls.Config{
    PatchedContentGenerator: func(ctx context.Context, toolName, toolCallID string) (string, error) {
        return fmt.Sprintf("[System Notice] Execution of tool %s was skipped (call ID: %s)", toolName, toolCallID), nil
    },
})
```

### Using with Other Middlewares

```go
// PatchToolCalls should typically be placed at the front of the middleware chain
// to ensure dangling tool calls are fixed before other middlewares process messages
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{
        patchToolCallsMiddleware,  // Fix messages first
        summarizationMiddleware,   // Then summarize
        reductionMiddleware,       // Finally reduce
    },
})
```

## How It Works

<a href="/img/eino/N9ZzwvvuWhya0vbIzLEcMx6DnMP.png" target="_blank"><img src="/img/eino/N9ZzwvvuWhya0vbIzLEcMx6DnMP.png" width="100%" /></a>

**Processing Logic:**

1. Executes in the `BeforeModelRewriteState` hook
2. Iterates through all messages, looking for Assistant messages containing `ToolCalls`
3. For each ToolCall, checks if a corresponding Tool message exists in subsequent messages (matched by `ToolCallID`)
4. If no corresponding Tool message is found, inserts a placeholder message
5. Returns the fixed message list

## Example Scenario

### Message History Before Fix

```
[User]     "Help me check the weather"
[Assistant] ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]     "call_1: Sunny, 25°C"
[User]     "No need to check the location, just tell me the weather in Beijing"   <- User interrupted
```

### Message History After Fix

```
[User]     "Help me check the weather"
[Assistant] ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]     "call_1: Sunny, 25°C"
[Tool]     "call_2: Tool call get_location with id call_2 was cancelled..."  <- Auto-inserted
[User]     "No need to check the location, just tell me the weather in Beijing"
```

## Multi-language Support

Placeholder messages support Chinese and English, switch via `adk.SetLanguage()`:

```go
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // Chinese
adk.SetLanguage(adk.LanguageEnglish)  // English (default)
```

## Notes

> 💡
> This middleware only modifies the history messages for the current run in the `BeforeModelRewriteState` hook and does not affect the actual stored message history. The fix is temporary and only applies to the current agent invocation.

- It is recommended to place this middleware at the **front** of the middleware chain to ensure other middlewares process complete message history
- If your scenario requires persisting the fixed messages, please implement the corresponding logic in `PatchedContentGenerator`
