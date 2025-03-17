---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: ToolsNode guide'
weight: 0
---

## **Basic Introduction**

The ToolsNode component is a module designed to extend the capabilities of a model, allowing the model to call external tools to accomplish specific tasks. This component can be used in the following scenarios:

- Enabling the model to obtain real-time information (such as search engines, weather queries, etc.)
- Allowing the model to perform specific operations (such as database operations, API calls, etc.)
- Extending the model's range of capabilities (such as mathematical calculations, code execution, etc.)
- Integrating with external systems (such as knowledge base queries, plugin systems, etc.)

## **Component Definition**

### **Interface Definition**

The Tool component provides three levels of interfaces:

> Code Location: eino/compose/tool/interface.go

```go
// Basic tool interface, provides tool information
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// Callable tool interface, supports synchronous calls
type InvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

// Tool interface supporting streaming output
type StreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

#### **Info Method**

- Function: Retrieve the description information of the tool
- Parameters:
  - ctx: Context object
- Return Values:
  - `*schema.ToolInfo`: Description information of the tool
  - error: Errors encountered during the information retrieval process

#### **InvokableRun Method**

- Function: Execute the tool synchronously
- Parameters:
  - ctx: Context object, used to pass request-level information and also to pass the Callback Manager
  - `argumentsInJSON`: JSON formatted parameter string
  - opts: Options for tool execution
- Return Values:
  - string: Execution result
  - error: Errors encountered during the execution process

#### **StreamableRun Method**

- Function: Execute the tool in a streaming manner
- Parameters:
  - ctx: Context object, used to pass request-level information and also to pass the Callback Manager
  - `argumentsInJSON`: JSON formatted parameter string
  - opts: Options for tool execution
- Return Values:
  - `*schema.StreamReader[string]`: Result of the streaming execution
  - error: Errors encountered during the execution process

### **ToolInfo Struct**

> Code Location：eino/schema/tool.go

```go
type ToolInfo struct {
    // Unique name of the tool, used to clearly express its purpose
    Name string
    // Describes how/when/why to use this tool
    // Can include a small number of examples in the description
    Desc string
    // Definition of the parameters accepted by the tool
    // Can be described in two ways:
    // 1. Using ParameterInfo: schema.NewParamsOneOfByParams(params)
    // 2. Using OpenAPIV3: schema.NewParamsOneOfByOpenAPIV3(openAPIV3)
    *ParamsOneOf
}
```

### **Common Option**

The Tool component uses ToolOption to define optional parameters. ToolsNode does not abstract a common option. Each specific implementation can define its own specific Option, wrapped into a unified ToolOption type using the WrapToolImplSpecificOptFn function.

## **Usage**

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

// Create tools node
toolsNode := compose.NewToolsNode([]tool.Tool{
    searchTool,    // Search tool
    weatherTool,   // Weather query tool
    calculatorTool, // Calculator tool
})

// Mock LLM output as input
input := &schema.Message{
    Role: schema.Assistant,
    ToolCalls: []schema.ToolCall{
       {
          Function: schema.FunctionCall{
             Name:      "weather",
             Arguments: `{"city": "Shenzhen", "date": "tomorrow"}`,
          },
       },
    },
}

toolMessages, err := toolsNode.Invoke(ctx, input)
```

ToolsNode is typically not used alone and is generally used in orchestration, following ChatModel.

### **Using in Orchestration**

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

// Create tools node
toolsNode := compose.NewToolsNode([]tool.Tool{
    searchTool,    // Search tool
    weatherTool,   // Weather query tool
    calculatorTool, // Calculator tool
})

// Use in Chain
chain := compose.NewChain[*schema.Message, []*schema.Message]()
chain.AppendToolsNode(toolsNode)

// In graph
graph := compose.NewGraph[*schema.Message, []*schema.Message]()
chain.AddToolsNode(toolsNode)
```

## **Option Mechanism**

Custom Tools can implement specific Options according to their needs:

```go
import "github.com/cloudwego/eino/components/tool"

// Define Option struct
type MyToolOptions struct {
    Timeout time.Duration
    MaxRetries int
    RetryInterval time.Duration
}

// Define Option function
func WithTimeout(timeout time.Duration) tool.Option {
    return tool.WrapImplSpecificOptFn(func(o *MyToolOptions) {
        o.Timeout = timeout
    })
}
```

## **Using Options and Callbacks**

### **Callback Usage Example**

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/tool"
)

// Create callback handler
handler := &callbackHelper.ToolCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *tool.CallbackInput) context.Context {
       fmt.Printf("Starting tool execution, parameters: %s\n", input.ArgumentsInJSON)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *tool.CallbackOutput) context.Context {
       fmt.Printf("Tool execution completed, result: %s\n", output.Response)
       return ctx
    },
    OnEndWithStreamOutput: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[*tool.CallbackOutput]) context.Context {
       fmt.Println("Tool started streaming output")
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
             fmt.Printf("Received streaming output: %s\n", chunk.Response)
          }
       }()
       return ctx
    },
}

// Use callback handler
helper := callbackHelper.NewHandlerHelper().
    Tool(handler).
    Handler()
 
/*** Compose a chain
* chain := NewChain
* chain.appendxxx().
*       appendxxx().
*       ...
*/

// Use at runtime
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, input, compose.WithCallbacks(helper))
```

## **Existing Implementations**

1. Google Search Tool: Tool implementation based on Google search [Tool - Googlesearch](/docs/eino/ecosystem/tool/tool_googlesearch)
2. duckduckgo search tool: Tool implementation based on duckduckgo search [Tool - DuckDuckGoSearch](/docs/eino/ecosystem/tool/tool_duckduckgo_search)
