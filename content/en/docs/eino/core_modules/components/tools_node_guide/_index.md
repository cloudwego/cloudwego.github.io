---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: ToolsNode & Tool Guide'
weight: 3
---

## Introduction

`ToolsNode` extends model capabilities by enabling tool calls to accomplish tasks:

- Fetch real-time information (search, weather)
- Execute operations (DB ops, API calls)
- Extend capabilities (math, code execution)
- Integrate with external systems (KB queries, plugins)

## Interfaces

Tool interfaces have three levels:

> Code: `eino/compose/tool/interface.go`

```go
// Basic tool interface, provides tool information
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// Invokable tool, supports synchronous calls
type InvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

// Streamable tool, supports streaming output
type StreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

### Info

- Purpose: return tool description for the model
- Params:
  - `ctx`: context
- Returns:
  - `*schema.ToolInfo`: tool metadata (name/desc/params)
  - `error`

### InvokableRun

- Purpose: synchronous tool execution
- Params:
  - `ctx`: context (request-scoped; carries callback manager)
  - `argumentsInJSON`: JSON string of arguments
  - `opts`: tool options
- Returns:
  - `string`: execution result
  - `error`

### StreamableRun

- Purpose: streaming tool execution
- Params:
  - `ctx`: context (request-scoped; carries callback manager)
  - `argumentsInJSON`: JSON string of arguments
  - `opts`: tool options
- Returns:
  - `*schema.StreamReader[string]`: streaming result
  - `error`

## ToolInfo

> Code: `eino/schema/tool.go`

```go
type ToolInfo struct {
    // Unique tool name, clearly expressing its purpose
    Name string
    // Guidance for the model on how/when/why to use the tool
    // You can include brief examples in the description
    Desc string
    // Definition of accepted parameters
    // Two ways to describe:
    // 1. ParameterInfo: schema.NewParamsOneOfByParams(params)
    // 2. OpenAPI v3:   schema.NewParamsOneOfByOpenAPIV3(openAPIV3)
    *ParamsOneOf
}
```

- Name: unique tool name
- Desc: guidance for when/how/why to use the tool (can include brief examples)
- ParamsOneOf: define accepted parameters in one of two ways:
  - ParameterInfo: `schema.NewParamsOneOfByParams(params)`
  - OpenAPI v3: `schema.NewParamsOneOfByOpenAPIV3(openAPIV3)`

## Options

`ToolOption` configures tool behavior. ToolsNode has no global options; implementations define specific options via `WrapToolImplSpecificOptFn`.

## Usage

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

toolsNode := compose.NewToolsNode([]tool.Tool{
    searchTool,    // Search tool
    weatherTool,   // Weather query tool
    calculatorTool, // Calculator tool
})

input := &schema.Message{
    Role: schema.Assistant,
    ToolCalls: []schema.ToolCall{
       {
          Function: schema.FunctionCall{
             Name:      "weather",
             Arguments: `{"city": "深圳", "date": "tomorrow"}`,
          },
       },
    },
}

toolMessages, err := toolsNode.Invoke(ctx, input)
```

ToolsNode is typically used after a `ChatModel` inside orchestration.

### In Orchestration

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

// Chain
chain := compose.NewChain[*schema.Message, []*schema.Message]()
chain.AppendToolsNode(toolsNode)

// Graph
graph := compose.NewGraph[*schema.Message, []*schema.Message]()
graph.AddToolsNode(toolsNode)
```

## Option Mechanism

```go
import "github.com/cloudwego/eino/components/tool"

type MyToolOptions struct {
    Timeout time.Duration
    MaxRetries int
    RetryInterval time.Duration
}

func WithTimeout(timeout time.Duration) tool.Option {
    return tool.WrapImplSpecificOptFn(func(o *MyToolOptions) {
        o.Timeout = timeout
    })
}
```

## Callbacks

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/tool"
)

// 创建 callback handler
handler := &callbackHelper.ToolCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *tool.CallbackInput) context.Context {
       fmt.Printf("开始执行工具，参数: %s\n", input.ArgumentsInJSON)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *tool.CallbackOutput) context.Context {
       fmt.Printf("工具执行完成，结果: %s\n", output.Response)
       return ctx
    },
    OnEndWithStreamOutput: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[*tool.CallbackOutput]) context.Context {
       fmt.Println("工具开始流式输出")
       go func() {
          defer output.Close()

          for {
             chunk, err := output.Recv()
             if errors.Is(err, io.EOF) {
                return
             }
             if err != nil {
                return
             }
             fmt.Printf("收到流式输出: %s\n", chunk.Response)
          }
       }()
       return ctx
    },
}

// 使用 callback handler
helper := callbackHelper.NewHandlerHelper().
    Tool(handler).
    Handler()
 
/*** compose a chain
* chain := NewChain
* chain.appendxxx().
*       appendxxx().
*       ...
*/

// 在运行时使用
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, input, compose.WithCallbacks(helper))
```

## Implementations

1. Google Search: [Tool — GoogleSearch](/en/docs/eino/ecosystem_integration/tool/tool_googlesearch)
2. DuckDuckGo: [Tool — DuckDuckGoSearch](/en/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search)
3. MCP server as tool: [Tool — MCP](/en/docs/eino/ecosystem_integration/tool/tool_mcp)
