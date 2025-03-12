---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: ToolsNode 使用说明'
weight: 0
---

## **基本介绍**

ToolsNode 组件是一个用于扩展模型能力的组件，它允许模型调用外部工具来完成特定的任务。这个组件可用于以下场景中：

- 让模型能够获取实时信息（如搜索引擎、天气查询等）
- 使模型能够执行特定的操作（如数据库操作、API 调用等）
- 扩展模型的能力范围（如数学计算、代码执行等）
- 与外部系统集成（如知识库查询、插件系统等）

## **组件定义**

### **接口定义**

Tool 组件提供了三个层次的接口：

> 代码位置：eino/compose/tool/interface.go

```go
// 基础工具接口，提供工具信息
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// 可调用的工具接口，支持同步调用
type InvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

// 支持流式输出的工具接口
type StreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

#### **Info 方法**

- 功能：获取工具的描述信息
- 参数：
  - ctx：上下文对象
- 返回值：
  - `*schema.ToolInfo`：工具的描述信息
  - error：获取信息过程中的错误

#### **InvokableRun 方法**

- 功能：同步执行工具
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - `argumentsInJSON`：JSON 格式的参数字符串
  - opts：工具执行的选项
- 返回值：
  - string：执行结果
  - error：执行过程中的错误

#### **StreamableRun 方法**

- 功能：以流式方式执行工具
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - `argumentsInJSON`：JSON 格式的参数字符串
  - opts：工具执行的选项
- 返回值：
  - `*schema.StreamReader[string]`：流式执行结果
  - error：执行过程中的错误

### **ToolInfo 结构体**

> 代码位置：eino/schema/tool.go

```go
type ToolInfo struct {
    // 工具的唯一名称，用于清晰地表达其用途
    Name string
    // 用于告诉模型如何/何时/为什么使用这个工具
    // 可以在描述中包含少量示例
    Desc string
    // 工具接受的参数定义
    // 可以通过两种方式描述：
    // 1. 使用 ParameterInfo：schema.NewParamsOneOfByParams(params)
    // 2. 使用 OpenAPIV3：schema.NewParamsOneOfByOpenAPIV3(openAPIV3)
    *ParamsOneOf
}
```

### **公共 Option**

Tool 组件使用 ToolOption 来定义可选参数， ToolsNode 没有抽象公共的 option。每个具体的实现可以定义自己的特定 Option，通过 WrapToolImplSpecificOptFn 函数包装成统一的 ToolOption 类型。

## **使用方式**

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

// 创建工具节点
toolsNode := compose.NewToolsNode([]tool.Tool{
    searchTool,    // 搜索工具
    weatherTool,   // 天气查询工具
    calculatorTool, // 计算器工具
})

// Mock LLM 输出作为输入
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

ToolsNode 通常不会被单独使用，一般用于编排之中接在 ChatModel 之后。

### **在编排中使用**

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

// 创建工具节点
toolsNode := compose.NewToolsNode([]tool.Tool{
    searchTool,    // 搜索工具
    weatherTool,   // 天气查询工具
    calculatorTool, // 计算器工具
})

// 在 Chain 中使用
chain := compose.NewChain[*schema.Message, []*schema.Message]()
chain.AppendToolsNode(toolsNode)

// graph 中
graph := compose.NewGraph[*schema.Message, []*schema.Message]()
graph.AddToolsNode(toolsNode)
```

## **Option 机制**

自定义 Tool 可根据自己需要实现特定的 Option：

```go
import "github.com/cloudwego/eino/components/tool"

// 定义 Option 结构体
type MyToolOptions struct {
    Timeout time.Duration
    MaxRetries int
    RetryInterval time.Duration
}

// 定义 Option 函数
func WithTimeout(timeout time.Duration) tool.Option {
    return tool.WrapImplSpecificOptFn(func(o *MyToolOptions) {
        o.Timeout = timeout
    })
}
```

## **Option 和 Callback 使用**

### **Callback 使用示例**

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

## **已有实现**

1. Google Search Tool: 基于 Google 搜索的工具实现 [Tool - Googlesearch](/zh/docs/eino/ecosystem_integration/tool/tool_googlesearch)
2. duckduckgo search tool: 基于 duckduckgo 搜索的工具实现 [Tool - DuckDuckGoSearch](/zh/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search)
