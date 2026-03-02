---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: ToolSearch'
weight: 5
---

# ToolSearch Middleware

adk/middlewares/dynamictool/toolsearch

> 💡
> This middleware was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13).

## Overview

The `toolsearch` middleware implements dynamic tool selection. When the tool library is large, passing all tools to the model will overflow the context. This middleware's approach is:

1. Add a `tool_search` meta-tool that accepts regex to search tool names
2. Initially hide all dynamic tools
3. After the model calls `tool_search`, matched tools appear in subsequent calls

---

## Architecture

```
Agent initialization
                                │
                                ▼
┌───────────────────────────────────────────┐
│  BeforeAgent                                                          │
│    - Inject tool_search tool                                          │
│    - Add DynamicTools to Tools list                                   │
└───────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────┐
│  WrapModel                                                              │
│    Before each Model call:                                              │
│    1. Scan message history, find all tool_search return results         │
│    2. All Tools minus unselected DynamicTools                           │
│       as tool list for this Model call                                  │
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
}
```

---

## tool_search Tool

The tool injected by the middleware.

**Parameters:**

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>regex_pattern</pre></td><td>string</td><td>Yes</td><td>Regex pattern to match tool names</td></tr>
</table>

**Returns:**

```json
{
  "selectedTools": ["tool_a", "tool_b"]
}
```

---

## Usage Example

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

---

## How It Works

### BeforeAgent

1. Get all DynamicTools
2. Create `tool_search` tool using DynamicTools
3. Add `tool_search` and all DynamicTools to `runCtx.Tools`, at this point Agent's Tools is the full set

### WrapModel

Before each Model call:

1. Iterate through message history, find all `tool_search` return results
2. Collect selected tool names
3. Filter out unselected DynamicTools from the full tool set
4. Call Model with the filtered tool list

### Tool Selection Flow

```
Round 1:
  Model can only see tool_search
  Model calls tool_search(regex_pattern="weather.*")
  Returns {"selectedTools": ["weather_forecast", "weather_history"]}

Round 2:
  Model can see tool_search + weather_forecast + weather_history
  Model calls weather_forecast(...)
```

---

## Notes

- DynamicTools cannot be empty
- Regex matches tool names, not descriptions
- Selected tools remain available unless the tool_search call result is deleted or modified
- Can call tool_search multiple times, results accumulate
