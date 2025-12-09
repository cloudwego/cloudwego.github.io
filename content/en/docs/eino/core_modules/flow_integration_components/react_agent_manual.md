---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino: ReAct Agent Manual'
weight: 1
---

# Introduction

Eino’s ReAct Agent implements the [ReAct logic](https://react-lm.github.io/), enabling fast, flexible agent construction and invocation.

> Code: [Implementation Directory](https://github.com/cloudwego/eino/tree/main/flow/agent/react)

## Topology and Data Flow

Under the hood, ReAct Agent uses `compose.Graph`. Typically two nodes: `ChatModel` and `Tools`. All historical messages are stored in `state`. Before passing history to `ChatModel`, messages are copied and processed by `MessageModifier`. When `ChatModel` returns without any tool call, the final message is returned.

<a href="/img/eino/react_agent_graph.png" target="_blank"><img src="/img/eino/react_agent_graph.png" width="100%" /></a>

If any tool is marked `ReturnDirectly`, a `Branch` follows `ToolsNode` to short-circuit and end when such a tool is invoked; otherwise the flow returns to `ChatModel`.

## Initialization

Provide a `ToolCallingChatModel` and `ToolsConfig`. Optional: `MessageModifier`, `MaxStep`, `ToolReturnDirectly`, `StreamToolCallChecker`.

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
    // initialize chat model
    toolableChatModel, err := openai.NewChatModel(...)
    
    // initialize tools
    tools := compose.ToolsNodeConfig{
        InvokableTools:  []tool.InvokableTool{mytool},
        StreamableTools: []tool.StreamableTool{myStreamTool},
    }
    
    // create agent
    agent, err := react.NewAgent(ctx, &react.AgentConfig{
        ToolCallingModel: toolableChatModel,
        ToolsConfig: tools,
        ...
    }
}
```

### Model

ReAct requires a `ToolCallingChatModel`. Inside the agent, `WithTools` is called to bind the agent’s tools to the model:

```go
// BaseChatModel defines the basic interface for chat models.
// It provides methods for generating complete outputs and streaming outputs.
// This interface serves as the foundation for all chat model implementations.
//
//go:generate  mockgen -destination ../../internal/mock/components/model/ChatModel_mock.go --package model -source interface.go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
}

// ToolCallingChatModel extends BaseChatModel with tool calling capabilities.
// It provides a WithTools method that returns a new instance with
// the specified tools bound, avoiding state mutation and concurrency issues.
type ToolCallingChatModel interface {
    BaseChatModel

    // WithTools returns a new ToolCallingChatModel instance with the specified tools bound.
    // This method does not modify the current instance, making it safer for concurrent use.
    WithTools(tools []*schema.ToolInfo) (ToolCallingChatModel, error)
}
```

Supported implementations include OpenAI and Ark (any provider that supports tool calls).
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
        ToolCallingModel: chatModel,
        ToolsConfig: ...,
    })
}

func arkExample() {
    arkModel, err := ark.NewChatModel(context.Background(), ark.ChatModelConfig{
        APIKey: os.Getenv("ARK_API_KEY"),
        Model:  os.Getenv("ARK_MODEL"),
    })

    agent, err := react.NewAgent(ctx, react.AgentConfig{
        ToolCallingModel: arkModel,
        ToolsConfig: ...,
    })
}
```

### ToolsConfig

`toolsConfig` is `compose.ToolsNodeConfig`. To build a Tools node, provide Tool info and a run function. Tool interfaces:
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

You can implement tools per the interfaces, or use helpers to construct tools:
```go
userInfoTool := utils.NewTool(
    &schema.ToolInfo{
       Name: "user_info",
       Desc: "根据用户的姓名和邮箱，查询用户的公司、职位、薪酬信息",
       ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
          "name": {
             Type: "string",
             Desc: "用户的姓名",
          },
          "email": {
             Type: "string",
             Desc: "用户的邮箱",
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

Executed before each call to `ChatModel`:

```go
// modify the input messages before the model is called.
type MessageModifier func(ctx context.Context, input []*schema.Message) []*schema.Message
```

Configure `MessageModifier` inside the Agent to adjust the messages passed to the model:

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
    
            res = append(res, schema.SystemMessage("你是一个 golang 开发专家."))
            res = append(res, input...)
            return res
        },
    })
    
    agent.Generate(ctx, []*schema.Message{schema.UserMessage("写一个 hello world 的代码")})
    // 实际输入：
    // []*schema.Message{
    //    {Role: schema.System, Content:"你是一个 golang 开发专家."},
    //    {Role: schema.Human, Content: "写一个 hello world 的代码"}
    // }
}
```

### MaxStep

Specify the maximum number of steps. One loop is `ChatModel` + `Tools` (2 steps). Default is `node count + 2`.

Since one loop is 2 steps, default `12` supports up to 6 loops. The final step must be a `ChatModel` result (no tool call), so at most 5 Tools.

For 10 loops (10×ChatModel + 9×Tools), set `MaxStep` to 20; for 20 loops set `MaxStep` to 40.

### ToolReturnDirectly and Stream Tool Call Checking

If a tool is `ReturnDirectly`, its output is returned immediately; configure `ToolReturnDirectly` with the tool name. For streaming models, set `StreamToolCallChecker` to determine tool-call presence in streams (model-dependent behavior).

Default checker (first non-empty chunk must be tool-call):
```go
func firstChunkStreamToolCallChecker(_ context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()
    for {
        msg, err := sr.Recv()
        if errors.Is(err, io.EOF) { return false, nil }
        if err != nil { return false, err }
        if len(msg.ToolCalls) > 0 { return true, nil }
        if len(msg.Content) == 0 { continue }
        return false, nil
    }
}
```

If the provider outputs non-empty text before tool-calls, implement a custom checker that scans all chunks for tool-calls:
```go
toolCallChecker := func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()
    for {
        msg, err := sr.Recv()
        if errors.Is(err, io.EOF) { break }
        if err != nil { return false, err }
        if len(msg.ToolCalls) > 0 { return true, nil }
    }
    return false, nil
}
```

Tip: add a prompt like “If you need to call tools, output only tool-calls, not text” to preserve a streaming experience where possible.

## Invocation

### Generate

```go
agent, _ := react.NewAgent(...)

var outMessage *schema.Message
outMessage, err = agent.Generate(ctx, []*schema.Message{
    schema.UserMessage("写一个 golang 的 hello world 程序"),
})
```

### Stream

```go
agent, _ := react.NewAgent(...)

var msgReader *schema.StreamReader[*schema.Message]
msgReader, err = agent.Stream(ctx, []*schema.Message{
    schema.UserMessage("写一个 golang 的 hello world 程序"),
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

### WithCallbacks

Callback handlers run at defined timings. Since the agent graph has only ChatModel and ToolsNode, the agent’s callbacks are those two component callbacks. A helper is provided to build them:

```go
import (
    template "github.com/cloudwego/eino/utils/callbacks"
)
// BuildAgentCallback builds a callback handler for agent.
// e.g.
//
//  callback := BuildAgentCallback(modelHandler, toolHandler)
//  agent, err := react.NewAgent(ctx, &AgentConfig{})
//  agent.Generate(ctx, input, agent.WithComposeOptions(compose.WithCallbacks(callback)))
func BuildAgentCallback(modelHandler *template.ModelCallbackHandler, toolHandler *template.ToolCallbackHandler) callbacks.Handler {
    return template.NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
}
```

### Options

React agent supports dynamic runtime options.

Scenario 1: modify the model config at runtime:

```go
// WithChatModelOptions returns an agent option that specifies model.Option for the chat model in agent.
func WithChatModelOptions(opts ...model.Option) agent.AgentOption {
    return agent.WithComposeOptions(compose.WithChatModelOption(opts...))
}
```

Scenario 2: modify the Tool list at runtime:

```go
// WithToolList returns an agent option that specifies the list of tools can be called which are BaseTool but must implement InvokableTool or StreamableTool.
func WithToolList(tools ...tool.BaseTool) agent.AgentOption {
    return agent.WithComposeOptions(compose.WithToolsNodeOption(compose.WithToolList(tools...)))
}
```

Also update ChatModel’s bound tools: `WithChatModelOptions(model.WithTools(...))`

Scenario 3: modify options for a specific Tool:

```go
// WithToolOptions returns an agent option that specifies tool.Option for the tools in agent.
func WithToolOptions(opts ...tool.Option) agent.AgentOption {
    return agent.WithComposeOptions(compose.WithToolsNodeOption(compose.WithToolOption(opts...)))
}
```

### Get Intermediate Results

Use `WithMessageFuture` to capture intermediate `*schema.Message` during execution:

```go
// WithMessageFuture returns an agent option and a MessageFuture interface instance.
// The option configures the agent to collect messages generated during execution,
// while the MessageFuture interface allows users to asynchronously retrieve these messages.
func WithMessageFuture() (agent.AgentOption, MessageFuture) {
    h := &cbHandler{started: make(chan struct{})}

    cmHandler := &ub.ModelCallbackHandler{
       OnEnd:                 h.onChatModelEnd,
       OnEndWithStreamOutput: h.onChatModelEndWithStreamOutput,
    }
    toolHandler := &ub.ToolCallbackHandler{
       OnEnd:                 h.onToolEnd,
       OnEndWithStreamOutput: h.onToolEndWithStreamOutput,
    }
    graphHandler := callbacks.NewHandlerBuilder().
       OnStartFn(h.onGraphStart).
       OnStartWithStreamInputFn(h.onGraphStartWithStreamInput).
       OnEndFn(h.onGraphEnd).
       OnEndWithStreamOutputFn(h.onGraphEndWithStreamOutput).
       OnErrorFn(h.onGraphError).Build()
    cb := ub.NewHandlerHelper().ChatModel(cmHandler).Tool(toolHandler).Graph(graphHandler).Handler()

    option := agent.WithComposeOptions(compose.WithCallbacks(cb))

    return option, h
}
```

Pass the option into Generate or Stream. Use `GetMessages` or `GetMessageStreams` to read intermediate messages.

Tip: the agent still runs synchronously. Read the future in a goroutine or run the agent in a goroutine.

### Agent In Graph/Chain

Agent can be embedded via `compose.AnyLambda` and appended to Chain/Graph.

## Demo

### Basic Info

简介：这是一个拥有两个 tool (query_restaurants 和 query_dishes ) 的 `美食推荐官`

地址：[eino-examples/flow/agent/react](https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react)

使用方式:

1. clone eino-examples repo，并 cd 到根目录
2. 提供一个 `OPENAI_API_KEY`: `export OPENAI_API_KEY=xxxxxxx`
3. 运行 demo: `go run flow/agent/react/react.go`

### 运行过程

<a href="/img/eino/agent_cli_demo.gif" target="_blank"><img src="/img/eino/agent_cli_demo.gif" width="100%" /></a>

### 运行过程解释

- 模拟用户输入了 `我在海淀区，给我推荐一些菜，需要有口味辣一点的菜，至少推荐有 2 家餐厅`
- agent 运行第一个节点 `ChatModel`，大模型判断出需要做一次 ToolCall 调用来查询餐厅，并且给出的参数为：

```json
"function": {
    "name": "query_restaurants",
    "arguments": "{\"location\":\"海淀区\",\"topn\":2}"
}
```

- 进入 `Tools` 节点，调用 查询餐厅 的 tool，并且得到结果，结果返回了 2 家海淀区的餐厅信息:

```json
[{"id":"1001","name":"老地方餐厅","place":"北京老胡同 5F, 左转进入","desc":"","score":3},{"id":"1002","name":"人间味道餐厅","place":"北京大世界商城-1F","desc":"","score":5}]
```

- 得到 tool 的结果后，此时对话的 history 中包含了 tool 的结果，再次运行 `ChatModel`，大模型判断出需要再次调用另一个 ToolCall，用来查询餐厅有哪些菜品，注意，由于有两家餐厅，因此大模型返回了 2 个 ToolCall，如下：

```json
"Message": {
    "role": "ai",
    "content": "",
    "tool_calls": [ // <= 这里有 2 个 tool call
      {
        "index": 1,
        "id": "call_wV7zA3vGGJBhuN7r9guhhAfF",
        "function": {
          "name": "query_dishes",
          "arguments": "{\"restaurant_id\": \"1002\", \"topn\": 5}"
        }
      },
      {
        "index": 0,
        "id": "call_UOsp0jRtzEbfxixNjP5501MF",
        "function": {
          "name": "query_dishes",
          "arguments": "{\"restaurant_id\": \"1001\", \"topn\": 5}"
        }
      }
    ]
  }
```

- 再次进入到 `Tools` 节点，由于有 2 个 tool call，Tools 节点内部并发执行这两个调用，并且均加入到对话的 history 中，从 callback 的调试日志中可以看到结果如下：

```json
=========[OnToolStart]=========
{"restaurant_id": "1001", "topn": 5}
=========[OnToolEnd]=========
[{"name":"红烧肉","desc":"一块红烧肉","price":20,"score":8},{"name":"清泉牛肉","desc":"很多的水煮牛肉","price":50,"score":8},{"name":"清炒小南瓜","desc":"炒的糊糊的南瓜","price":5,"score":5},{"name":"韩式辣白菜","desc":"这可是开过光的辣白菜，好吃得很","price":20,"score":9},{"name":"酸辣土豆丝","desc":"酸酸辣辣的土豆丝","price":10,"score":9}]
=========[OnToolStart]=========
{"restaurant_id": "1002", "topn": 5}
=========[OnToolEnd]=========
[{"name":"红烧排骨","desc":"一块一块的排骨","price":43,"score":7},{"name":"大刀回锅肉","desc":"经典的回锅肉, 肉很大","price":40,"score":8},{"name":"火辣辣的吻","desc":"凉拌猪嘴，口味辣而不腻","price":60,"score":9},{"name":"辣椒拌皮蛋","desc":"擂椒皮蛋，下饭的神器","price":15,"score":8}]
```

- 得到所有 tool call 返回的结果后，再次进入 `ChatModel` 节点，这次大模型发现已经拥有了回答用户提问的所有信息，因此整合信息后输出结论，由于调用时使用的 `Stream` 方法，因此流式返回的大模型结果。

## Related Reading

- [Eino Tutorial: Host Multi-Agent ](/en/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)
