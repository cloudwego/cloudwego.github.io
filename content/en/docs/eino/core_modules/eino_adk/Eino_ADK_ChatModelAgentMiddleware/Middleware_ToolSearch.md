---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ToolSearch
weight: 7
---

## Overview

The `toolsearch` middleware implements dynamic tool selection. When the tool library is large, passing all tools to the model would overwhelm the context. This middleware works by:

1. Adding a `tool_search` meta-tool that accepts keyword queries or direct selection to search for tools
2. Initially hiding all dynamic tools
3. After the model calls `tool_search`, matched tools become available in subsequent calls

Three operating modes are supported (two configuration values, but `UseModelToolSearch=true` has two distinct end-to-end behaviors):

- **Default mode** (`UseModelToolSearch=false`): The middleware manages tool visibility itself. Before each model call, it filters `state.ToolInfos` via `BeforeModelRewriteState` based on `tool_search` call results, progressively adding selected dynamic tools back to the model's visible list
- **Model native mode — pure server-side retrieval** (`UseModelToolSearch=true`, model retrieves DeferredTools on its own): The middleware moves dynamic tools into `state.DeferredToolInfos` and passes them to the model via `model.WithDeferredTools`. If the model natively supports server-side tool retrieval (e.g., Claude's tool search), the model searches and selects directly from DeferredTools **without calling the tool_search tool**
- **Model native mode — client-side proxy retrieval** (`UseModelToolSearch=true`, model discovers tools by calling `tool_search`): Same middleware configuration as above, but the model lacks autonomous DeferredTools retrieval capability and instead calls the `tool_search` tool (registered via `model.WithToolSearchTool`). The client-side `modelToolSearchTool` executes the search and returns a structured `ToolSearchResult` (containing matched tools' full ToolInfo), from which the model selects tools

> 💡
> Package path: github.com/cloudwego/eino/adk/middlewares/dynamictool/toolsearch

---

## Architecture

```
Agent initialization
                                │
                                ▼
┌───────────────────────────────────────────┐
│  BeforeAgent                              │
│    - Inject tool_search tool              │
│    - Add DynamicTools to Tools list       │
│    - In model native mode, set            │
│      runCtx.ToolSearchTool                │
└───────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────┐
│  BeforeModelRewriteState                   │
│  (executed before each Model call)         │
│                                            │
│  1. Insert <available-deferred-tools>      │
│     User message listing all searchable    │
│     tool names                             │
│                                            │
│  First call (initialization):              │
│    Default mode:                           │
│      Remove DynamicTools from ToolInfos    │
│    Model native mode:                      │
│      DynamicTools → DeferredToolInfos      │
│      Remove DynamicTools and               │
│      tool_search from ToolInfos            │
│                                            │
│  Subsequent calls (default mode -          │
│  forward selection):                       │
│    Scan message history, collect           │
│    tool_search returned matches,           │
│    add matching DynamicTools back to       │
│    ToolInfos                               │
└────────────────────────────────────────────┘
                                │
                                ▼
                          Model call
```

---

## Configuration

```go
type Config struct {
    // Tools that can be dynamically searched and loaded
    DynamicTools []tool.BaseTool

    // Whether to use the model's native tool search capability
    //
    // When true, the middleware delegates tool search to
    // the model's native capability.
    //
    // When false (default), the middleware manages tool visibility
    // by filtering the tool list before each Model call based on
    // tool_search results.
    // Note: this approach may invalidate the model's KV-cache
    // (since the tool list changes between calls).
    UseModelToolSearch bool
}
```

---

## Constructor

```go
// Standard constructor, using *schema.Message
func New(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)

// Generic constructor, supporting *schema.Message and *schema.AgenticMessage
func NewTyped[M adk.MessageType](ctx context.Context, config *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

## `New` internally calls `NewTyped[*schema.Message]`. If you use `TypedChatModelAgent` (e.g., Agentic mode), use `NewTyped` directly.

## tool_search Tool

The meta-tool injected by the middleware. **Parameters:**

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>query</pre></td><td>string</td><td>Yes</td><td>Query string for finding tools. Supports three modes: keyword search, <pre>select:<tool_name></pre> for direct selection, <pre>+keyword</pre> for required matching</td></tr>
<tr><td><pre>max_results</pre></td><td>integer</td><td>No</td><td>Maximum number of results to return (default: 5). Only applies to keyword search mode; direct selection mode is not subject to this limit</td></tr>
</table>

**Query modes:**

<table>
<tr><td>Mode</td><td>Syntax</td><td>Description</td></tr>
<tr><td>Keyword search</td><td><pre>"weather forecast"</pre></td><td>Matches keywords against tool names and descriptions, sorted by relevance score. Supports splitting on camelCase and <pre>_</pre> / <pre>__</pre> (MCP) separators</td></tr>
<tr><td>Direct selection</td><td><pre>"select:tool_a,tool_b"</pre></td><td>Selects one or more tools by exact name, comma-separated. Not subject to <pre>max_results</pre></td></tr>
<tr><td>Required match</td><td><pre>"+slack send message"</pre></td><td>Keywords with <pre>+</pre> prefix are required — tools without that keyword are filtered out. Remaining keywords are used for ranking</td></tr>
</table>

**Return value (default mode):**

```json
{"matches": ["tool_a", "tool_b"]}
```

**Return value (model native mode):** Returns a structured `schema.ToolResult` containing the full `ToolInfo` of matched tools for the model's native processing.

## Keyword Search Scoring Mechanism

Keyword search uses a multi-tier scoring system, calculating the highest score per keyword and then summing:

<table>
<tr><td>Matching Rule</td><td>Score</td></tr>
<tr><td>Tool name part (after splitting) exactly matches keyword</td><td>10</td></tr>
<tr><td>Tool name part (after splitting) contains keyword (substring)</td><td>5</td></tr>
<tr><td>Full tool name contains keyword</td><td>3</td></tr>
<tr><td>Tool description contains keyword</td><td>2</td></tr>
</table>

> 💡
> Each keyword takes the highest score (intMax) per rule and does not stack match scores from multiple parts of the same tool. Scores from multiple keywords are summed for the total. Tools with the same score are sorted lexicographically by name.

Tool names are split into parts using `_` (underscore), `__` (MCP server-tool separator), and camelCase boundaries. For example, `mcp__slack__send_message` splits into `["mcp", "slack", "send", "message"]`, and `NotebookEdit` splits into `["Notebook", "Edit"]`. Matching is case-insensitive.

## Usage Examples

### Default Mode (Middleware-managed Tool Visibility)

```go
middleware, err := toolsearch.New(ctx, &toolsearch.Config{
    DynamicTools: []tool.BaseTool{
        weatherTool,
        stockTool,
        currencyTool,
        // ... many tools
    },
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

### Model Native Mode

```go
middleware, err := toolsearch.New(ctx, &toolsearch.Config{
    DynamicTools: []tool.BaseTool{
        weatherTool,
        stockTool,
        currencyTool,
    },
    UseModelToolSearch: true,
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel, // The model must support native tool search
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

The configuration is identical, but the end-to-end behavior depends on the model adapter implementation:

- If the model natively supports server-side retrieval (e.g., Claude): the model searches and selects tools directly from `DeferredToolInfos`; the `tool_search` tool is not called
- If the model uses client-side proxy retrieval: the model calls `tool_search` → the client-side `modelToolSearchTool` performs the search → returns a structured `ToolSearchResult` (with full ToolInfo) → the model selects tools accordingly

---

## How It Works

### BeforeAgent

1. Gets ToolInfo for all DynamicTools and validates no duplicate tool names
2. Creates the appropriate type of `tool_search` tool based on `UseModelToolSearch`
3. Adds `tool_search` and all DynamicTools to `runCtx.Tools` (at this point the Agent has the full set of tools)
4. In model native mode, sets `runCtx.ToolSearchTool` which the framework passes to the model via `model.WithToolSearchTool`

### BeforeModelRewriteState (before each Model call)

**Common logic:**

- Ensures an `<available-deferred-tools>` reminder exists in the message list (inserted as a User message listing all searchable tool names)

**First call — initialization (both modes):**

<table><tbody><tr>
<td>
<strong>Default mode</strong>: Removes all DynamicTools from <pre>state.ToolInfos</pre> so the model initially sees only static tools and <pre>tool_search</pre></td><td>
<strong>Model native mode</strong>: 1. Extracts DynamicTools from <pre>state.ToolInfos</pre> into <pre>state.DeferredToolInfos</pre> 2. Removes <pre>tool_search</pre> from <pre>state.ToolInfos</pre> (handled natively by the model)</td></tr></tbody></table>

**Subsequent calls — forward selection (default mode only):**

1. Traverses message history to find all JSON `matches` fields in `tool_search` return results
2. Collects selected tool names
3. Adds matching DynamicTools back to `state.ToolInfos` (cumulative; already-added tools are not removed)

### Tool Selection Flow (Default Mode)

```
Round 1:
  Model can only see tool_search + static tools
  Model calls tool_search(query="weather forecast")
  Returns {"matches": ["weather_forecast", "weather_history"]}

Round 2:
  Model can see tool_search + static tools + weather_forecast + weather_history
  Model calls weather_forecast(...)
```

---

## Notes

- `DynamicTools` must not be empty, and tool names must not be duplicated
- Keyword search matches tool names and descriptions, case-insensitive
- In default mode, selected tools remain available (cumulative based on `tool_search` results in message history)
- `tool_search` can be called multiple times; results are cumulative
- In default mode, the tool list may change before each Model call, which can cause the model's KV-cache to be invalidated
- Model native mode requires the ChatModel to support `model.WithToolSearchTool` and/or `model.WithDeferredTools` options. Which path is taken (pure server-side retrieval vs. client-side proxy retrieval) depends on the model adapter implementation
- The `<available-deferred-tools>` reminder is inserted as a **User message** (not a System message) into the message list, positioned before the first non-System message
