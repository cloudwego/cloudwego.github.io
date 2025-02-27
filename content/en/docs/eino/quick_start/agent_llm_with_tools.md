---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: Agent-Enable LLM to have hands
weight: 2
---

## **What is an Agent**

An Agent (intelligent agent) is a system that can perceive the environment and take actions to achieve specific goals. In AI applications, an Agent can autonomously complete complex tasks by combining the understanding capabilities of large language models (LLMs) with the execution capabilities of predefined tools. This will be the main form in which AI is applied to daily life and production in the future.

> 💡
> For code snippets exemplified in this article, see: [eino-examples/quickstart/todoagent](https://github.com/cloudwego/eino-examples/blob/master/quickstart/todoagent/main.go)

## **Core Components of an Agent**

In Eino, to implement an Agent, you mainly need two core components: ChatModel and Tool.

### **ChatModel**

ChatModel is the brain of the Agent, processing the user's natural language input through powerful language understanding capabilities. When a user makes a request, ChatModel deeply understands the user's intent, analyzes the task requirements, and decides whether specific tools need to be called to complete the task. When tools need to be used, it can accurately choose the appropriate tools and generate the correct parameters. Moreover, ChatModel can convert the results of tool execution into natural language responses that are easy for users to understand, achieving smooth human-computer interaction.

> For more detailed information on ChatModel, refer to: [Eino: ChatModel guide](/en/docs/eino/core_modules/components/chat_model_guide)

### **Tool**

Tool is the executor of the Agent, providing specific functionality implementations. Each Tool has clear functional definitions and parameter specifications, enabling ChatModel to call them accurately. Tools can achieve various functions, encapsulating everything from simple data operations to complex external service calls.

> For more detailed information on Tool and ToolsNode, refer to: [Eino: ToolsNode guide](/en/docs/eino/core_modules/components/tools_node_guide)

## **Implementation of Tools**

In Eino, we provide multiple ways to implement a tool. Below, we'll illustrate this with an example of a Todo management system.

### Way 1: Using NewTool to Construct

This method is suitable for simple tool implementations, where a tool is created by defining the tool information and handling function:

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

// Handling function
func AddTodoFunc(_ context.Context, params *TodoAddParams) (string, error) {
    // Mock processing logic
    return `{"msg": "add todo success"}`, nil
}

func getAddTodoTool() tool.InvokableTool {
    // Tool information
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

    // Use NewTool to create the tool
    return utils.NewTool(info, AddTodoFunc)
}
```

While this method is straightforward, it has a notable disadvantage: the parameter information (ParamsOneOf) is manually defined in the ToolInfo and is separate from the actual parameter structure (TodoAddParams). This not only causes code redundancy but also requires simultaneous modifications in two places when parameters change, which can easily lead to inconsistencies and make maintenance more cumbersome.

### Way 2: Build Using InferTool

This method is more concise, defining parameter information through the struct's tag, allowing the parameter struct and description information to be in sync without maintaining two sets of information:

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

// Handler function
func UpdateTodoFunc(_ context.Context, params *TodoUpdateParams) (string, error) {
    // Mock processing logic
    return `{"msg": "update todo success"}`, nil
}

// Create tool using InferTool
updateTool, err := utils.InferTool(
    "update_todo", // tool name 
    "Update a todo item, eg: content, deadline...", // tool description
    UpdateTodoFunc)
```

### Way 3: Implementing the Tool Interface

For scenarios requiring more custom logic, you can create by implementing the Tool interface:

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
    // Mock invocation logic
    return `{"todos": [{"id": "1", "content": "Prepare the Eino project presentation by December 10, 2024", "started_at": 1717401600, "deadline": 1717488000, "done": false}]}`, nil
}
```

### Way 4: Using Officially Packaged Tools

In addition to implementing tools yourself, we also provide many ready-to-use tools. These tools have been fully tested and optimized and can be directly integrated into your Agent. For example, take the duckduckgo Search tool:

```go
import (
    "github.com/cloudwego/eino-ext/components/tool/duckduckgo"
)

// Create the duckduckgo Search tool
searchTool, err := duckduckgo.NewTool(ctx, &duckduckgo.Config{})
```

Using the tools provided by eino-ext not only avoids the workload of redundant development but also ensures the stability and reliability of the tools. These tools have been thoroughly tested and are continually maintained, allowing them to be directly integrated into the project for use.

## **Using Chain to Construct an Agent**

When constructing an Agent, the ToolsNode is a core component responsible for managing and executing tool invocations. ToolsNode can integrate multiple tools and provides a unified invocation interface. It supports both synchronous invocation (Invoke) and streaming invocation (Stream), allowing flexible handling of different types of tool execution requirements.

To create a ToolsNode, you need to provide a configuration for a list of tools:

```go
import (
    "context"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
)

conf := &compose.ToolsNodeConfig{
    Tools: []tool.BaseTool{tool1, tool2},  // Tools can be InvokableTool or StreamableTool
}
toolsNode, err := compose.NewToolNode(context.Background(), conf)
```

Below is a complete example of an Agent that uses OpenAI's ChatModel in conjunction with the aforementioned Todo tools:

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
        getAddTodoTool(),                               // NewTool construction
        updateTool,                                     // InferTool construction
        &ListTodoTool{},                                // Implements Tool interface
        searchTool,                                     // Officially packaged tool
    }

    // Create and configure ChatModel
    chatModel, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
        Model:       "gpt-4",
        APIKey:      os.Getenv("OPENAI_API_KEY"),
    })
    if err != nil {
        log.Fatal(err)
    }
    // Get tool information and bind to ChatModel
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

    // Build the complete processing chain
    chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
    chain.
        AppendChatModel(chatModel, compose.WithNodeName("chat_model")).
        AppendToolsNode(todoToolsNode, compose.WithNodeName("tools"))

    // Compile and run the chain
    agent, err := chain.Compile(ctx)
    if err != nil {
        log.Fatal(err)
    }

    // Run example
    resp, err := agent.Invoke(ctx, []*schema.Message{
        {
           Role:    schema.User,
           Content: "Add a TODO for learning Eino and search for the repository address of cloudwego/eino",
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    // Output the result
    for _, msg := range resp {
        fmt.Println(msg.Content)
    }
}
```

This example assumes that the ChatModel will always make a tool invocation decision.

## **Creating Agents Using Other Methods**

In addition to the aforementioned Chain/Graph-based agents, Eino also provides encapsulation of common Agent models.

### **ReAct Agent**

ReAct (Reasoning + Acting) Agent combines reasoning and action capabilities through a think-act-observe loop to solve complex problems. It can conduct deep reasoning while performing tasks and adjust strategies based on observations, making it particularly suitable for complex scenarios requiring multi-step reasoning.

> For more details on react agent, see: [Eino: React Agent Manual](/en/docs/eino/core_modules/flow_integration_components/react_agent_manual)

### **Multi Agent**

A Multi Agent system consists of multiple agents working in cooperation, each with its own specific responsibilities and expertise. Through interaction and collaboration among agents, it can handle more complex tasks and achieve division of labor and cooperation. This approach is particularly suitable for scenarios that require the integration of knowledge from multiple specialized fields.

> For more details on multi agent, see: [Eino Tutorial: Host Multi-Agent ](/en/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)

## **Conclusion**

This document introduces the basic methods of constructing agents using the Eino framework. By using different methods such as Chain, Tool Calling, and ReAct, we can flexibly build AI Agents according to actual needs.

Agents are an important direction in the development of AI technology. They can not only understand user intentions but also take proactive actions to complete complex tasks by calling various tools. As the capabilities of LLMs continue to improve, agents will play an increasingly important role in the future, becoming a crucial bridge connecting AI and the real world. We hope that Eino can provide users with stronger and more user-friendly Agent construction solutions, promoting more innovation in applications based on Agents.

## **Related Reading**

- Quick Start
  - [Implement an easy LLM application](/en/docs/eino/quick_start/simple_llm_application)
