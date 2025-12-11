---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: Agent — Give Your LLM Hands
weight: 2
---

## What Is an Agent?

An Agent is a system that perceives its environment and takes actions to achieve a goal. In AI applications, agents combine the language understanding of LLMs with tool execution, enabling them to autonomously complete complex tasks — a key form factor for how AI integrates into everyday work and life.

> 💡
> Example code snippets: [eino-examples/quickstart/todoagent](https://github.com/cloudwego/eino-examples/blob/master/quickstart/todoagent/main.go)

## Core Components of an Agent

In Eino, an agent typically consists of two core parts: a `ChatModel` and one or more `Tools`.

### ChatModel

`ChatModel` is the agent’s brain. It processes the user’s natural language input, understands intent, analyzes requirements, and decides whether a tool is needed. When tools are required, it selects the right tool with the right parameters and converts tool outputs back into natural-language responses.

> More about ChatModel: [Eino: ChatModel Guide](/docs/eino/core_modules/components/chat_model_guide)

### Tool

`Tool` is the agent’s executor. Each tool has a clear function definition and parameter schema, allowing the `ChatModel` to call it accurately. Tools can wrap anything from simple data ops to sophisticated external service calls.

> More about tools and ToolsNode: [Eino: ToolsNode Guide](/docs/eino/core_modules/components/tools_node_guide)

## Implementing Tools

Eino offers multiple ways to implement tools. We illustrate with a simple Todo management system.

### Approach 1: Build with `NewTool`

This is ideal for simpler tools: define tool metadata and a handler function.

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

// Handler
func AddTodoFunc(_ context.Context, params *TodoAddParams) (string, error) {
    // Mock
    return `{"msg": "add todo success"}`, nil
}

func getAddTodoTool() tool.InvokableTool {
    // Tool metadata
    info := &schema.ToolInfo{
        Name: "add_todo",
        Desc: "Add a todo item",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "content": {
                Desc:     "The content of the todo item",
                Type:     schema.String,
                Required: true,
            },
            "started_at": {
                Desc: "The started time of the todo item, in unix timestamp",
                Type: schema.Integer,
            },
            "deadline": {
                Desc: "The deadline of the todo item, in unix timestamp",
                Type: schema.Integer,
            },
        }),
    }

    // Build with NewTool
    return utils.NewTool(info, AddTodoFunc)
}
```

This approach is straightforward but has a drawback: parameter descriptions (`ParamsOneOf`) are separate from the actual parameter struct (`TodoAddParams`). Changes require updating both, risking inconsistency.

### Approach 2: Build with `InferTool`

This is more concise. Use struct tags to define parameter metadata so the description and struct share the same source.

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool/utils"
)

// Parameter struct
type TodoUpdateParams struct {
    ID        string  `json:"id" jsonschema:"description=id of the todo"`
    Content   *string `json:"content,omitempty" jsonschema:"description=content of the todo"`
    StartedAt *int64  `json:"started_at,omitempty" jsonschema:"description=start time in unix timestamp"`
    Deadline  *int64  `json:"deadline,omitempty" jsonschema:"description=deadline of the todo in unix timestamp"`
    Done      *bool   `json:"done,omitempty" jsonschema:"description=done status"`
}

// Handler
func UpdateTodoFunc(_ context.Context, params *TodoUpdateParams) (string, error) {
    // Mock
    return `{"msg": "update todo success"}`, nil
}

// Build tool with InferTool
updateTool, err := utils.InferTool(
    "update_todo", // tool name 
    "Update a todo item, eg: content,deadline...", // description
    UpdateTodoFunc)
```

### Approach 3: Implement the Tool Interface

For advanced scenarios, implement the `Tool` interface.

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/schema"
)

type ListTodoTool struct {}

func (lt *ListTodoTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "list_todo",
        Desc: "List all todo items",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "finished": {
                Desc:     "filter todo items if finished",
                Type:     schema.Boolean,
                Required: false,
            },
        }),
    }, nil
}

func (lt *ListTodoTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
    // Mock
    return `{"todos": [{"id": "1", "content": "Prepare Eino demo slides before 2024-12-10", "started_at": 1717401600, "deadline": 1717488000, "done": false}]}` , nil
}
```

### Approach 4: Use Official Tools

Beyond custom tools, Eino provides many well-tested, ready-to-use tools. For example, DuckDuckGo Search:

```go
import (
    "github.com/cloudwego/eino-ext/components/tool/duckduckgo"
)


// Create DuckDuckGo Search tool
searchTool, err := duckduckgo.NewTool(ctx, &duckduckgo.Config{})
```

Using tools from `eino-ext` avoids reinvention and ensures reliability — they’re maintained and continuously improved.

## Build an Agent with Chain

`ToolsNode` is a core component for agents, managing tool invocation. It can host multiple tools and supports both synchronous (`Invoke`) and streaming (`Stream`) execution.

To create a `ToolsNode`, provide a tool list configuration:

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
)

conf := &compose.ToolsNodeConfig{
    Tools: []tool.BaseTool{tool1, tool2},  // tools can be InvokableTool or StreamableTool
}
toolsNode, err := compose.NewToolNode(context.Background(), conf)
```

Below is a complete agent example using OpenAI’s `ChatModel` and the Todo tools above:

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func main() {
    // Initialize tools
    todoTools := []tool.BaseTool{
        getAddTodoTool(),                               // NewTool
        updateTool,                                     // InferTool
        &ListTodoTool{},                                // Implement Tool interface
        searchTool,                                     // Official tool
    }

    // Create and configure ChatModel
    chatModel, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
        Model:       "gpt-4",
        APIKey:      os.Getenv("OPENAI_API_KEY"),
    })
    if err != nil {
        log.Fatal(err)
    }
    // Bind tool infos to ChatModel
    toolInfos := make([]*schema.ToolInfo, 0, len(todoTools))
    for _, tool := range todoTools {
        info, err := tool.Info(ctx)
        if err != nil {
            log.Fatal(err)
        }
        toolInfos = append(toolInfos, info)
    }
    err = chatModel.BindTools(toolInfos)
    if err != nil {
        log.Fatal(err)
    }


    // Create tools node
    todoToolsNode, err := compose.NewToolNode(context.Background(), &compose.ToolsNodeConfig{
        Tools: todoTools,
    })
    if err != nil {
        log.Fatal(err)
    }

    // Build chain
    chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
    chain.
        AppendChatModel(chatModel, compose.WithNodeName("chat_model")).
        AppendToolsNode(todoToolsNode, compose.WithNodeName("tools"))

    // Compile and run
    agent, err := chain.Compile(ctx)
    if err != nil {
        log.Fatal(err)
    }

    // Run example
    resp, err := agent.Invoke(ctx, []*schema.Message{
        {
           Role:    schema.User,
           Content: "Add a TODO to learn Eino and search for the cloudwego/eino repo URL",
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    // Print output
    for _, msg := range resp {
        fmt.Println(msg.Content)
    }
}
```

This example assumes the `ChatModel` will decide to make tool calls when appropriate.

## Other Ways to Build Agents

Beyond Chain/Graph-based agents, Eino provides ready-made agent patterns.

### ReAct Agent

ReAct (Reasoning + Acting) combines deep reasoning with action through a think–act–observe loop. It’s well-suited for multi-step reasoning in complex tasks.

> Learn more: [Eino: ReAct Agent Manual](/docs/eino/core_modules/flow_integration_components/react_agent_manual)

### Multi Agent

Multi-agent systems coordinate multiple agents, each with distinct responsibilities and expertise. Through interaction and collaboration, they can tackle complex tasks requiring multiple areas of knowledge.

> Learn more: [Eino Tutorial: Host Multi-Agent](/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)

## Summary

This article introduced core approaches to building agents with Eino. Using chains, tool calling, or ReAct patterns, you can flexibly construct AI agents to meet practical needs.

Agents are a vital direction in AI — they understand user intent and take action by calling tools to accomplish complex tasks. As LLMs advance, agents will increasingly bridge AI and the real world. We hope Eino helps you build powerful, user-friendly agents and inspires new agent-driven applications.

## Related Reading

- Quick Start
  - [Build a Minimal LLM Application — ChatModel](/docs/eino/quick_start/simple_llm_application)
