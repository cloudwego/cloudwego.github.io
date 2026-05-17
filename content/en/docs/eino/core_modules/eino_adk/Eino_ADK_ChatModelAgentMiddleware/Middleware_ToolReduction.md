---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Reduction
weight: 5
---

`adk/middlewares/reduction`

> 💡
> This middleware was introduced in v0.8.0.

## Overview

The `reduction` middleware manages the token count occupied by tool outputs in Agent conversations, operating in two phases:

1. **Truncation**: Triggered immediately when a tool call returns. When a single output exceeds `MaxLengthForTrunc`, the full content is stored in the Backend and the message is replaced with a truncated summary.
2. **Clear**: Triggered before model calls (`BeforeModelRewriteState`). When the total tokens exceed `MaxTokensForClear`, it traverses the message history and offloads old tool arguments and results to the Backend.

---

## Architecture

```
Tool call returns result
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│     WrapInvokableToolCall / WrapStreamableToolCall          │
│     WrapEnhancedInvokableToolCall / WrapEnhancedStreamable  │
│                                                             │
│  Truncation (can be skipped via SkipTruncation)             │
│    Result length > MaxLengthForTrunc?                       │
│      Yes → Truncate content, store full content in Backend  │
│      No → Return as-is                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Result added to Messages
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BeforeModelRewriteState                    │
│                                                             │
│  Clear (can be skipped via SkipClear)                       │
│    Total tokens > MaxTokensForClear?                        │
│      Yes → ClearMessageRewriter preprocessing               │
│         → Store old tool results in Backend, replace with   │
│           file paths                                        │
│         → ClearAtLeastTokens minimum release check          │
│         → ClearPostProcess callback                         │
│      No → Do nothing                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                     Call Model
```

---

## Generic System

This middleware follows the ADK standard generic pattern, supporting both `*schema.Message` and `*schema.AgenticMessage`:

```go
// Generic config, M constrained to adk.MessageType
type TypedConfig[M adk.MessageType] struct { ... }

// Backward-compatible alias
type Config = TypedConfig[*schema.Message]
```

The constructor also comes in both generic and non-generic forms:

```go
func NewTyped[M adk.MessageType](ctx context.Context, config *TypedConfig[M]) (adk.TypedChatModelAgentMiddleware[M], error)
func New(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

---

## Configuration

### TypedConfig[M] Main Configuration

<table>
<tr><td>Field</td><td>Type</td><td>Description</td></tr>
<tr><td>Backend</td><td><pre>Backend</pre></td><td>Storage backend. <strong>Required</strong> when <pre>SkipTruncation</pre> is false; can be nil when only doing Clear without offload.</td></tr>
<tr><td>SkipTruncation</td><td><pre>bool</pre></td><td>Skip the truncation phase.</td></tr>
<tr><td>SkipClear</td><td><pre>bool</pre></td><td>Skip the clear phase.</td></tr>
<tr><td>ReadFileToolName</td><td><pre>string</pre></td><td>Name of the tool used to read offloaded content. Default <pre>"read_file"</pre>.</td></tr>
<tr><td>RootDir</td><td><pre>string</pre></td><td>Root directory for saving content. Default <pre>"/tmp"</pre>. Truncated content is saved to <pre>{RootDir}/trunc/{tool_call_id}</pre>, cleared content to <pre>{RootDir}/clear/{tool_call_id}</pre>.</td></tr>
<tr><td>GenTruncOffloadFilePath</td><td><pre>func(ctx, *ToolDetail) (string, error)</pre></td><td>Custom truncation file path generation. When set, RootDir does not apply to truncation. Useful when tool_call_id is not unique.</td></tr>
<tr><td>GenClearOffloadFilePath</td><td><pre>func(ctx, *ToolDetail) (string, error)</pre></td><td>Custom clear file path generation. When set, RootDir does not apply to clear.</td></tr>
<tr><td>MaxLengthForTrunc</td><td><pre>int</pre></td><td>Maximum character length to trigger truncation. Default <pre>50000</pre>.</td></tr>
<tr><td>TruncExcludeTools</td><td><pre>[]string</pre></td><td>List of tool names exempt from truncation.</td></tr>
<tr><td>TokenCounter</td><td><pre>func(ctx, []M, []*schema.ToolInfo) (int64, error)</pre></td><td>Token counting function. Default estimates using char_count/4. <strong>Recommended to replace with tiktoken-go/tokenizer</strong>.</td></tr>
<tr><td>MaxTokensForClear</td><td><pre>int64</pre></td><td>Token threshold to trigger clearing. Default <pre>160000</pre>.</td></tr>
<tr><td>ClearRetentionSuffixLimit</td><td><pre>int</pre></td><td>Retain the most recent N rounds of assistant messages without clearing. Default <pre>1</pre>.</td></tr>
<tr><td>ClearAtLeastTokens</td><td><pre>int64</pre></td><td>Minimum tokens that must be released by clearing. If not met, clearing is not performed (to avoid unnecessarily breaking prompt cache). Default <pre>0</pre>.</td></tr>
<tr><td>ClearExcludeTools</td><td><pre>[]string</pre></td><td>List of tool names exempt from clearing.</td></tr>
<tr><td>ClearMessageRewriter</td><td><pre>func(ctx, M, []M) ([]M, error)</pre></td><td>Message rewriting callback before clearing. Parameters are toolCallMsg and its corresponding toolResponseMsgs. Can be used to rewrite write_file/edit_file calls into system-reminders. Return nil to remove that message group.</td></tr>
<tr><td>ClearPostProcess</td><td><pre>func(ctx, *adk.TypedChatModelAgentState[M]) context.Context</pre></td><td>Callback after clearing is complete; can save state or send notifications. Returns a potentially updated context.</td></tr>
<tr><td>ToolConfig</td><td><pre>map[string]*ToolReductionConfig</pre></td><td>Per-tool configuration; takes priority over global settings.</td></tr>
</table>

### ToolReductionConfig Per-tool Configuration

```go
type ToolReductionConfig struct {
    Backend        Backend
    SkipTruncation bool
    TruncHandler   func(ctx context.Context, detail *ToolDetail) (*TruncResult, error)
    SkipClear      bool
    ClearHandler   func(ctx context.Context, detail *ToolDetail) (*ClearResult, error)
}
```

- When `TruncHandler` / `ClearHandler` is nil and not skipped, the global default handler is used.
- `Backend` is the independent storage backend for this tool, overriding the global Backend.

### ToolDetail Tool Details

```go
type ToolDetail struct {
    ToolContext       *adk.ToolContext
    ToolArgument      *schema.ToolArgument
    ToolResult        *schema.ToolResult                    // Non-streaming
    StreamToolResult  *schema.StreamReader[*schema.ToolResult] // Streaming
}
```

### TruncResult Truncation Result

```go
type TruncResult struct {
    NeedTrunc        bool
    ToolResult       *schema.ToolResult                    // Required when NeedTrunc && non-streaming
    StreamToolResult *schema.StreamReader[*schema.ToolResult] // Required when NeedTrunc && streaming
    NeedOffload      bool
    OffloadFilePath  string  // Required when NeedOffload
    OffloadContent   string  // Required when NeedOffload
}
```

### ClearResult Clear Result

```go
type ClearResult struct {
    NeedClear       bool
    ToolArgument    *schema.ToolArgument  // Required when NeedClear
    ToolResult      *schema.ToolResult    // Required when NeedClear
    NeedOffload     bool
    OffloadFilePath string  // Required when NeedOffload
    OffloadContent  string  // Required when NeedOffload
}
```

### Backend Interface

```go
// Defined in reduction/internal, exported via type alias
type Backend interface {
    Write(context.Context, *filesystem.WriteRequest) error
}
```

`filesystem.WriteRequest` contains two fields: `FilePath string` and `Content string`.

---

## Creating the Middleware

### Basic Usage

```go
import "github.com/cloudwego/eino/adk/middlewares/reduction"

middleware, err := reduction.New(ctx, &reduction.Config{
    Backend: myBackend,
})

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       chatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

### Generic Usage (AgenticMessage)

```go
middleware, err := reduction.NewTyped[*schema.AgenticMessage](ctx, &reduction.TypedConfig[*schema.AgenticMessage]{
    Backend: myBackend,
    TokenCounter: myAgenticTokenCounter,
})

agent, err := adk.NewTypedChatModelAgent(ctx, &adk.TypedChatModelAgentConfig[*schema.AgenticMessage]{
    Model:       chatModel,
    Middlewares: []adk.TypedChatModelAgentMiddleware[*schema.AgenticMessage]{middleware},
})
```

### Custom Configuration

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:           myBackend,
    RootDir:           "/data/agent",
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 100000,
    ClearRetentionSuffixLimit: 2,
    ClearAtLeastTokens: 10000,
    TruncExcludeTools: []string{"search_tool"},
    ClearExcludeTools: []string{"read_file"},
    ClearMessageRewriter: func(ctx context.Context, toolCallMsg *schema.Message, toolResponseMsgs []*schema.Message) ([]*schema.Message, error) {
        // Rewrite write_file calls into system-reminders
        return []*schema.Message{schema.UserMessage("<system-reminder>file written</system-reminder>")}, nil
    },
    ClearPostProcess: func(ctx context.Context, state *adk.ChatModelAgentState) context.Context {
        log.Printf("Clear completed, messages: %d", len(state.Messages))
        return ctx
    },
    ToolConfig: map[string]*reduction.ToolReductionConfig{
        "grep": {Backend: grepBackend},
        "read_file": {SkipClear: true},
    },
})
```

### Truncation Only

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:   myBackend,
    SkipClear: true,
})
```

### Clear Only

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    SkipTruncation: true,
    MaxTokensForClear: 100000,
    // When Backend is nil, clearing still replaces content with placeholders but does not perform offload
})
```

---

## How It Works

### Truncation

Handled in `WrapInvokableToolCall` / `WrapStreamableToolCall` / `WrapEnhancedInvokableToolCall` / `WrapEnhancedStreamableToolCall`:

1. Tool returns its result
2. Check `TruncExcludeTools`; skip if matched
3. Look up ToolConfig → global defaultConfig to find the TruncHandler
4. TruncHandler decision: read the full output and check if the total length of all text parts exceeds `MaxLengthForTrunc`
5. If exceeded: keep the first and last `MaxLengthForTrunc/(textParts*2)` characters as a preview, store the full content in the Backend
6. Return a truncation notice informing the agent of the file path for the full content

> 💡
> For streaming tools, the default TruncHandler waits for the complete stream to finish before deciding whether to truncate. If you need strict incremental streaming behavior, provide a custom TruncHandler for that tool.

### Clear

Handled in `BeforeModelRewriteState`:

1. Calculate total tokens using `TokenCounter`
2. Skip if below `MaxTokensForClear`
3. Determine the clear range: from the first unprocessed assistant message to `len(messages) - ClearRetentionSuffixLimit` rounds
4. If `ClearMessageRewriter` is configured, execute rewriting preprocessing on messages within the range
5. Traverse tool call messages within the range, skipping `ClearExcludeTools`
6. Call ClearHandler for each tool call, replacing arguments and results
7. If `ClearAtLeastTokens` is set: operate on a copy first, compare token difference before and after clearing; if the target is not met, abandon this clearing
8. Once the target is met, execute the actual offload writes and update state.Messages
9. Call `ClearPostProcess`

---

## Multi-language Support

Truncation and clearing prompt text supports automatic switching between Chinese and English:

```go
adk.SetLanguage(adk.LanguageChinese)  // Chinese
adk.SetLanguage(adk.LanguageEnglish)  // English (default)
```

---

## Notes

- When `SkipTruncation` is false, `Backend` **must** be set
- The default TokenCounter estimates using char_count/4; it is recommended to replace with `github.com/tiktoken-go/tokenizer`
- Already-processed messages are marked via the Extra field with `_reduction_mw_processed` and will not be processed again
- Configuration in `ToolConfig` takes priority over global settings; if only `SkipTruncation: false` is set in ToolConfig without providing a `TruncHandler`, it falls back to the default handler
- `GenTruncOffloadFilePath` / `GenClearOffloadFilePath` are useful when tool_call_id is not unique (e.g., retries) to prevent file overwrites
- `ClearMessageRewriter` runs after the clear range is determined and before per-tool clearing; it is suitable for compressing write/edit type calls into short hints
- `ClearAtLeastTokens` set to 0 means clearing is performed whenever the threshold is exceeded; values greater than 0 avoid minimal clearing that would break prompt cache
- Legacy APIs (`NewClearToolResult`, `NewToolResultMiddleware`) are deprecated; migration to `New` / `NewTyped` is recommended
