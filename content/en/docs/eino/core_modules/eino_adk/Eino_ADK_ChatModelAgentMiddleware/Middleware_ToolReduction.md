---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: ToolReduction'
weight: 6
---

# ToolReduction Middleware

adk/middlewares/reduction

> 💡
> This middleware was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13).

## Overview

The `reduction` middleware is used to control the token count occupied by tool results, providing two strategies:

1. **Truncation**: Immediately truncate overly long output when a tool returns, saving complete content to Backend
2. **Clear**: When total tokens exceed threshold, store old tool results to file system

---

## Architecture

```
Tool call returns result
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              WrapInvokableToolCall / WrapStreamableToolCall │
│                                                             │
│  Truncation strategy (can skip)                             │
│    Result length > MaxLengthForTrunc?                       │
│      Yes → Truncate content, save complete to Backend       │
│      No → Return as is                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Result added to Messages
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BeforeModelRewriteState                    │
│                                                             │
│  Clear strategy (can skip)                                  │
│    Total tokens > MaxTokensForClear?                        │
│      Yes → Save old tool results to Backend,                │
│            replace with file path                           │
│      No → No processing                                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                     Call Model
```

---

## Configuration

### Config Main Configuration

```go
type Config struct {
    // Backend storage backend for saving truncated/cleared content
    // Required when SkipTruncation is false
    Backend Backend

    // SkipTruncation skip the truncation phase
    SkipTruncation bool

    // SkipClear skip the clear phase
    SkipClear bool

    // ReadFileToolName tool name for reading files
    // Agent needs to use this tool to read content after offloading to file
    // Default "read_file"
    ReadFileToolName string

    // RootDir root directory for saving content
    // Default "/tmp"
    // Truncated content saved to {RootDir}/trunc/{tool_call_id}
    // Cleared content saved to {RootDir}/clear/{tool_call_id}
    RootDir string

    // MaxLengthForTrunc maximum length to trigger truncation
    // Default 50000
    MaxLengthForTrunc int

    // TokenCounter token counter
    // Used to determine whether to trigger clear
    // Default uses character_count/4 estimation
    TokenCounter func(ctx context.Context, msg []adk.Message, tools []*schema.ToolInfo) (int64, error)

    // MaxTokensForClear token threshold to trigger clear
    // Default 30000
    MaxTokensForClear int64

    // ClearRetentionSuffixLimit retain how many recent conversation rounds without clearing
    // Default 1
    ClearRetentionSuffixLimit int

    // ClearPostProcess callback after clear completes
    // Can be used to save or notify current state
    ClearPostProcess func(ctx context.Context, state *adk.ChatModelAgentState) context.Context

    // ToolConfig configuration for specific tools
    // Higher priority than global configuration
    ToolConfig map[string]*ToolReductionConfig
}
```

### ToolReductionConfig Tool-level Configuration

```go
type ToolReductionConfig struct {
    // Backend storage backend for this tool
    Backend Backend

    // SkipTruncation skip truncation for this tool
    SkipTruncation bool

    // TruncHandler custom truncation handler
    // Uses default handler when not set
    TruncHandler func(ctx context.Context, detail *ToolDetail) (*TruncResult, error)

    // SkipClear skip clear for this tool
    SkipClear bool

    // ClearHandler custom clear handler
    // Uses default handler when not set
    ClearHandler func(ctx context.Context, detail *ToolDetail) (*ClearResult, error)
}
```

### ToolDetail Tool Details

```go
type ToolDetail struct {
    // ToolContext tool metadata (tool name, call ID)
    ToolContext *adk.ToolContext

    // ToolArgument input arguments
    ToolArgument *schema.ToolArgument

    // ToolResult output result
    ToolResult *schema.ToolResult
}
```

### TruncResult Truncation Result

```go
type TruncResult struct {
    // NeedTrunc whether truncation is needed
    NeedTrunc bool

    // ToolResult truncated tool result
    // Required when NeedTrunc is true
    ToolResult *schema.ToolResult

    // NeedOffload whether offloading to storage is needed
    NeedOffload bool

    // OffloadFilePath offload file path
    // Required when NeedOffload is true
    OffloadFilePath string

    // OffloadContent content to offload
    // Required when NeedOffload is true
    OffloadContent string
}
```

### ClearResult Clear Result

```go
type ClearResult struct {
    // NeedClear whether clear is needed
    NeedClear bool

    // ToolArgument cleared tool argument
    // Required when NeedClear is true
    ToolArgument *schema.ToolArgument

    // ToolResult cleared tool result
    // Required when NeedClear is true
    ToolResult *schema.ToolResult

    // NeedOffload whether offloading to storage is needed
    NeedOffload bool

    // OffloadFilePath offload file path
    // Required when NeedOffload is true
    OffloadFilePath string

    // OffloadContent content to offload
    // Required when NeedOffload is true
    OffloadContent string
}
```

---

## Creating the Middleware

### Basic Usage

```go
import (
    "context"
    "github.com/cloudwego/eino/adk/middlewares/reduction"
)

// Use default configuration
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend: myBackend,  // Required: storage backend
})

// Use with ChatModelAgent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

### Custom Configuration

```go
config := &reduction.Config{
    Backend:           myBackend,
    RootDir:           "/data/agent",
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 100000,
    ClearRetentionSuffixLimit: 2,
    TokenCounter: myTokenCounter,
    ClearPostProcess: func(ctx context.Context, state *adk.ChatModelAgentState) context.Context {
        log.Printf("Clear completed, messages: %d", len(state.Messages))
        return ctx
    },
    ToolConfig: map[string]*reduction.ToolReductionConfig{
        "grep": {
            Backend:        grepBackend,
            SkipTruncation: false,
        },
        "read_file": {
            Backend:   readFileBackend,
            SkipClear: true,  // read_file tool doesn't need clear
        },
    },
}

middleware, err := reduction.New(ctx, config)
```

### Using Only Truncation Strategy

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:   myBackend,
    SkipClear: true,  // Skip clear phase
})
```

### Using Only Clear Strategy

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:        myBackend,
    SkipTruncation: true,  // Skip truncation phase
})
```

---

## How It Works

### Truncation

Handled in `WrapInvokableToolCall` / `WrapStreamableToolCall`:

1. Tool returns result
2. Call TruncHandler to determine if truncation is needed
3. If truncation needed, save complete content to Backend
4. Return truncated content with hint text telling agent where the complete content is

### Clear

Handled in `BeforeModelRewriteState`:

1. Use TokenCounter to calculate total tokens
2. Only process if exceeds MaxTokensForClear
3. Iterate from old messages, skip already processed and the most recent ClearRetentionSuffixLimit rounds
4. For each tool call in range, call ClearHandler
5. For those needing clear, write to Backend and replace result in message with file path
6. Call ClearPostProcess callback

---

## Multi-language Support

Truncation and clear hint text supports Chinese and English, switch via `adk.SetLanguage()`:

```go
adk.SetLanguage(adk.LanguageChinese)  // Chinese
adk.SetLanguage(adk.LanguageEnglish)  // English (default)
```

---

## Notes

- When `SkipTruncation` is false, `Backend` must be set
- Default TokenCounter uses `character_count / 4` estimation, which is inaccurate for Chinese. It's recommended to use `github.com/tiktoken-go/tokenizer` instead
- Already processed messages are marked and won't be processed again
- Configuration in `ToolConfig` has higher priority than global configuration
