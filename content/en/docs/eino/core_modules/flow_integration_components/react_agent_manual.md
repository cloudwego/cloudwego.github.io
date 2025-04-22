---
Description: ""
date: "2025-03-20"
lastmod: ""
tags: []
title: 'Eino: React Agent Manual'
weight: 0
---

# **Introduction**

Eino React Agent is an Agent framework that implements [React logic](https://react-lm.github.io/), which users can use to quickly and flexibly build and invoke React Agents.

> 💡
> For the code implementation, see: [Implementation Code Directory](https://github.com/cloudwego/eino/tree/main/flow/agent/react)
>
> Example code path: [https://github.com/cloudwego/eino-examples/blob/main/flow/agent/react/react.go](https://github.com/cloudwego/eino-examples/blob/main/flow/agent/react/react.go)

## **Node Topology & Data Flow Diagram**

The React Agent uses `compose.Graph` as the orchestration scheme at its core. Typically, there are 2 nodes: ChatModel and Tools. All historical messages during the intermediate running process are stored in the state. Before passing all historical messages to the ChatModel, the messages are copied and processed by the MessageModifier, and the processed results are then passed to the ChatModel. This process continues until there are no more tool calls in the messages returned by the ChatModel, and then it returns the final message.

<a href="/img/eino/react_agent_graph.png" target="_blank"><img src="/img/eino/react_agent_graph.png" width="100%" /></a>

When at least one Tool in the Tools list is configured with ReturnDirectly, the ReAct Agent structure becomes more complex: a Branch is added after the ToolsNode to determine whether a Tool configured with ReturnDirectly is called. If so, it directly ends (END), otherwise, it proceeds as usual to the ChatModel.

## **Initialization**

A ReactAgent initialization function is provided, with mandatory parameters being Model and ToolsConfig, and optional parameters being MessageModifier, MaxStep, ToolReturnDirectly, and StreamToolCallChecker.

```bash
go get github.com/cloudwego/eino-ext/components/model/openai@latest
go get github.com/cloudwego/eino@latest
```

```go
import (
    "github.com/cloudwego/eino-ext/components/model/openai"
    
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/flow/agent/react"
    "github.com/cloudwego/eino/schema"
)

func main() {
    // Initialize the required chatModel first
    toolableChatModel, err := openai.NewChatModel(...)
    
    // Initialize the required tools
    tools := compose.ToolsNodeConfig{
        InvokableTools:  []tool.InvokableTool{mytool},
        StreamableTools: []tool.StreamableTool{myStreamTool},
    }
    
    // Create an agent
    agent, err := react.NewAgent(ctx, react.AgentConfig{
        Model: toolableChatModel,
        ToolsConfig: tools,
        ...
    })
}
```

### Model

The model receives a ChatModel, and within the agent, it will call the BindTools interface, defined as:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
        *schema.StreamReader[*schema.Message], error)
        
    BindTools(tools []*schema.ToolInfo) error
}
```

Currently, eino provides implementations such as openai and ark. As long as the underlying model supports tool call, it is sufficient.

```bash
go get github.com/cloudwego/eino-ext/components/model/openai@latest
go get github.com/cloudwego/eino-ext/components/model/ark@latest
```

```go
import (
    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino-ext/components/model/ark"
)

func openaiExample() {
    chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        BaseURL: os.Getenv("OPENAI_BASE_URL"),
        Key:     os.Getenv("OPENAI_ACCESS_KEY"),
        ByAzure: true,
        Model:   "{{model name which support tool call}}",
    })

    agent, err := react.NewAgent(ctx, react.AgentConfig{
        Model: chatModel,
        ToolsConfig: ...,
    })
}

func arkExample() {
    arkModel, err := ark.NewChatModel(context.Background(), ark.ChatModelConfig{
        APIKey: os.Getenv("ARK_API_KEY"),
        Model:  os.Getenv("ARK_MODEL"),
        BaseURL: os.Getenv("ARK_BASE_URL"),
    })

    agent, err := react.NewAgent(ctx, react.AgentConfig{
        Model: arkModel,
        ToolsConfig: ...,
    })
}
```

### ToolsConfig

The toolsConfig type is `compose.ToolsNodeConfig`. In eino, to build a Tool node, you need to provide information about the Tool and call the Tool's function. The interface definition for the tool is as follows:

```go
type InvokableRun func(ctx context.Context, arguments string, opts ...Option) (content string, err error)
type StreamableRun func(ctx context.Context, arguments string, opts ...Option) (content *schema.StreamReader[string], err error)

type BaseTool interface {
    Info() *schema.ToolInfo
}

// InvokableTool the tool for ChatModel intent recognition and ToolsNode execution.
type InvokableTool interface {
    BaseTool
    Run() InvokableRun
}

// StreamableTool the stream tool for ChatModel intent recognition and ToolsNode execution.
type StreamableTool interface {
    BaseTool
    Run() StreamableRun
}
```

Users can implement the required tool according to the tool's interface definition. The framework also provides a more straightforward method for constructing tools:

```go
userInfoTool := utils.NewTool(
    &schema.ToolInfo{
       Name: "user_info",
       Desc: "Query user's company, position, and salary information based on the user's name and email",
       ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
          "name": {
             Type: "string",
             Desc: "User's name",
          },
          "email": {
             Type: "string",
             Desc: "User's email",
          },
       }),
    },
    func(ctx context.Context, input *userInfoRequest) (output *userInfoResponse, err error) {
       return &userInfoResponse{
          Name:     input.Name,
          Email:    input.Email,
          Company:  "Cool Company LLC.",
          Position: "CEO",
          Salary:   "9999",
       }, nil
    })
    
toolConfig := &compose.ToolsNodeConfig{
    InvokableTools:  []tool.InvokableTool{invokeTool},
}
```

### MessageModifier

MessageModifier is executed each time before all historical messages are passed to the ChatModel. It is defined as:

```go
// modify the input messages before the model is called.
type MessageModifier func(ctx context.Context, input []*schema.Message) []*schema.Message
```

The framework provides a convenient PersonaModifier to add a system message representing the agent's personality at the top of the message list. It is used as follows:

```go
import (
    "github.com/cloudwego/eino/flow/agent/react"
    "github.com/cloudwego/eino/schema"
)

func main() {
    agent, err := react.NewAgent(ctx, &react.AgentConfig{
        Model: toolableChatModel,
        ToolsConfig: tools,
        
        MessageModifier: func(ctx context.Context, input []*schema.Message) []*schema.Message {
            res := make([]*schema.Message, 0, len(input)+1)

            res = append(res, schema.SystemMessage("You are an expert golang developer."))
            res = append(res, input...)
            return res
        },
    })
    
    agent.Generate(ctx, []*schema.Message{schema.UserMessage("Write a hello world code")})
    // The actual input to the ChatModel would be
    // []*schema.Message{
    //    {Role: schema.System, Content: "You are an expert golang developer."},
    //    {Role: schema.Human, Content: "Write a hello world code"}
    //}
}
```

### MaxStep

Specifies the maximum running steps for an Agent. Each transition from one node to another counts as one step. The default value is the number of nodes + 2.

Since one loop in the Agent comprises the ChatModel and Tools, it equals 2 steps. Therefore, the default value of 12 allows up to 6 loops. However, since the final step must be a ChatModel response (because the ChatModel determines no further tool runs are needed to return the final result), up to 5 tool runs are possible.

Similarly, if you want the Agent to run up to 10 loops (10 ChatModel + 9 Tools), set MaxStep to 20. If you want the Agent to run up to 20 loops, set MaxStep to 40.

```go
func main() {
    agent, err := react.NewAgent(ctx, &react.AgentConfig{
        Model: toolableChatModel,
        ToolsConfig: tools,
        MaxStep: 20,
    }
}
```

### ToolReturnDirectly

If you wish for the Agent to directly return the Tool's Response ToolMessage after the ChatModel selects and executes a specific Tool, you can configure this Tool in ToolReturnDirectly.

```go
a, err = NewAgent(ctx, &AgentConfig{
    Model: cm,
    ToolsConfig: compose.ToolsNodeConfig{
       Tools: []tool.BaseTool{fakeTool, fakeStreamTool},
    },

    MaxStep:            40,
    ToolReturnDirectly: map[string]struct{}{fakeToolName: {}}, // one of the two tools is return directly
})
```

### **StreamToolCallChecker**

Different models may output tool calls in different ways in streaming mode: some models (e.g., OpenAI) will output tool calls directly; some models (e.g., Claude) will output text first and then output tool calls. Therefore, different methods are needed for judgment. This field is used to specify a function for judging whether the streaming output of the model contains tool calls.

It is optional. If not filled in, the method of judging whether the "non-empty package" contains tool calls will be used:

```go
func firstChunkStreamToolCallChecker(_ context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()

    for {
       msg, err := sr.Recv()
       if err == io.EOF {
          return false, nil
       }
       if err != nil {
          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }

       if len(msg.Content) == 0 { // skip empty chunks at the front
          continue
       }

       return false, nil
    }
}
```
The above default implementation applies to the situation where there are only Tool Calls in the Tool Call Message output by the model.

Situations where the default implementation does not apply: There is a non - empty content chunk before outputting the Tool Call. In this case, you need to customize the tool Call checker as follows:

```go
toolCallChecker := func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()
    for {
       msg, err := sr.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             // finish
             break
          }

          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }
    }
    return false, nil
}
```

The custom StreamToolCallChecker above may need to check whether all packages contain ToolCall in extreme cases, resulting in the loss of the "streaming judgment" effect. If you want to retain the "streaming judgment" effect as much as possible, the suggestion to solve this problem is:


> 💡
> Try to add a prompt to restrict the model from outputting additional text when invoking tools. For example: "If you need to invoke the tool, directly output the tool's name without additional text."
> 
> Different models may be affected by prompts to different extents. In actual use, you need to adjust the prompt by yourself and verify the effect.

## **Invocation**

### **Generate**

```go
agent, _ := react.NewAgent(...)

var outMessage *schema.Message
outMessage, err = agent.Generate(ctx, []*schema.Message{
    schema.UserMessage("Write a hello world program in golang"),
})
```

### **Stream**

```go
agent, _ := react.NewAgent(...)

var msgReader *schema.StreamReader[*schema.Message]
msgReader, err = agent.Stream(ctx, []*schema.Message{
    schema.UserMessage("Write a hello world program in golang"),
})

for {
    // msg type is *schema.Message
    msg, err := msgReader.Recv()
    if err != nil {
        if errors.Is(err, io.EOF) {
            // finish
            break
        }
        // error
        log.Printf("failed to recv: %v\n", err)
        return
    }

    fmt.Print(msg.Content)
}
```

### **WithCallbacks**

Callback is a function that executes at specific times when the Agent is running. Since the Agent graph only includes ChatModel and ToolsNode, the Agent's Callback is essentially the Callback for the ChatModel and Tool. The react package provides a helper function to help users quickly build Callback Handlers for these two component types.

```go
// BuildAgentCallback builds a callback handler for the agent.
// e.g.
//
//  callback := BuildAgentCallback(modelHandler, toolHandler)
//  agent, err := react.NewAgent(ctx, &AgentConfig{})
//  agent.Generate(ctx, input, agent.WithComposeOptions(compose.WithCallbacks(callback)))
func BuildAgentCallback(modelHandler *template.ModelCallbackHandler, toolHandler *template.ToolCallbackHandler) callbacks.Handler {
    return template.NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
}
```

## Agent In Graph/Chain

Agent can be embedded as a Lambda into other Graphs:

```go
agent, _ := NewAgent(ctx, &AgentConfig{
    Model: cm,
    ToolsConfig: compose.ToolsNodeConfig{
       Tools: []tool.BaseTool{fakeTool, &fakeStreamToolGreetForTest{}},
    },

    MaxStep: 40,
})

chain := compose.NewChain[[]*schema.Message, string]()
agentLambda, _ := compose.AnyLambda(agent.Generate, agent.Stream, nil, nil)

chain.
    AppendLambda(agentLambda).
    AppendLambda(compose.InvokableLambda(func(ctx context.Context, input *schema.Message) (string, error) {
       t.Log("got agent response: ", input.Content)
       return input.Content, nil
    }))
r, _ := chain.Compile(ctx)

res, _ := r.Invoke(ctx, []*schema.Message{{Role: schema.User, Content: "hello"}},
    compose.WithCallbacks(callbackForTest))
```

## **Related Reading**

- [Eino Tutorial: Host Multi-Agent ](/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)
