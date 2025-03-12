---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: 'Eino: React Agent 使用手册'
weight: 0
---

# 简介

Eino React Agent 是实现了 [React 逻辑](https://react-lm.github.io/) 的智能体框架，用户可以用来快速灵活地构建并调用 React Agent.

> 💡
> 代码实现详见：[实现代码目录](https://github.com/cloudwego/eino/tree/main/flow/agent/react)

## 节点拓扑&数据流图

react agent 底层使用 `compose.Graph` 作为编排方案，一般来说有 2 个节点: ChatModel、Tools，中间运行过程中的所有历史消息都会放入 state 中，在将所有历史消息传递给 ChatModel 之前，会 copy 消息交由 MessageModifier 进行处理，处理的结果再传递给 ChatModel。直到 ChatModel 返回的消息中不再有 tool call，则返回最终消息。

<a href="/img/eino/react_agent_graph.png" target="_blank"><img src="/img/eino/react_agent_graph.png" width="100%" /></a>

当 Tools 列表中至少有一个 Tool 配置了 ReturnDirectly 时，ReAct Agent 结构会更复杂：在 ToolsNode 之后会增加一个 Branch，判断是否调用了一个 ReturnDirectly 的 Tool，如果是，直接 END，否则照旧进入 ChatModel。

## 初始化

提供了 ReactAgent 初始化函数，必填参数为 Model 和 ToolsConfig，选填参数为 MessageModifier, MaxStep, ToolReturnDirectly 和 StreamToolCallChecker.

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
    // 先初始化所需的 chatModel
    toolableChatModel, err := openai.NewChatModel(...)
    
    // 初始化所需的 tools
    tools := compose.ToolsNodeConfig{
        InvokableTools:  []tool.InvokableTool{mytool},
        StreamableTools: []tool.StreamableTool{myStreamTool},
    }
    
    // 创建 agent
    agent, err := react.NewAgent(ctx, react.AgentConfig{
        Model: toolableChatModel,
        ToolsConfig: tools,
        ...
    }
}
```

### Model

model 接收一个 ChatModel，在 agent 内部，会调用 BindTools 接口，定义为:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
        *schema.StreamReader[*schema.Message], error)
        
    BindTools(tools []*schema.ToolInfo) error
}
```

目前，eino 提供了 openai, ark 等实现，只要底层模型支持 tool call 即可。

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
    })

    agent, err := react.NewAgent(ctx, react.AgentConfig{
        Model: arkModel,
        ToolsConfig: ...,
    })
}
```

### ToolsConfig

toolsConfig 类型为 `compose.ToolsNodeConfig`, 在 eino 中，若要构建一个 Tool 节点，则需要提供 Tool 的信息，以及调用 Tool 的 function。tool 的接口定义如下:

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

用户可以根据 tool 的接口定义自行实现所需的 tool，同时框架也提供了更简便的构建 tool 的方法：

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

MessageModifier 会在每次把所有历史消息传递给 ChatModel 之前执行，其定义为：

```go
// modify the input messages before the model is called.
type MessageModifier func(ctx context.Context, input []*schema.Message) []*schema.Message
```

框架提供了一个简便的 PersonaModifier，用于在消息列表的最头部增加一个代表 agent 个性的 system message，使用如下:

```go
import (
    "github.com/cloudwego/eino/flow/agent/react"
    "github.com/cloudwego/eino/schema"
)

func main() {
    persona := `你是一个 golang 开发专家.`
    
    agent, err := react.NewAgent(ctx, &react.AgentConfig{
        Model: toolableChatModel,
        ToolsConfig: tools,
        
        // MessageModifier
        MessageModifier: react.NewPersonaModifier(persona),
    })
    
    agent.Generate(ctx, []*schema.Message{schema.UserMessage("写一个 hello world 的代码")})
    // 实际到 ChatModel 的 input 为
    // []*schema.Message{
    //    {Role: schema.System, Content: "你是一个 golang 开发专家."},
    //    {Role: schema.Human, Content: "写一个 hello world 的代码"}
    //}
}
```

### MaxStep

指定 Agent 最大运行步长，每次从一个节点转移到下一个节点为一步，默认值为 node 个数 + 2。

由于 Agent 中一次循环为 ChatModel + Tools，即为 2 步，因此默认值 12 最多可运行 6 个循环。但由于最后一步必须为 ChatModel 返回 (因为 ChatModel 结束后判断无须运行 tool 才能返回最终结果)，因此最多运行 5 次 tool。

同理，若希望最多可运行 10 个循环 (10 次 ChatModel + 9 次 Tools)，则需要设置 MaxStep 为 20。若希望最多运行 20 个循环，则 MaxStep 需为 40。

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

如果希望当 ChatModel 选择了特定的 Tool 并执行后，Agent 直接把 Tool 的 Response ToolMessage 返回去，则可以在 ToolReturnDirectly 中配置这个 Tool。

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

### StreamToolCallChecker

不同的模型在流式模式下输出工具调用的方式可能不同: 某些模型(如 OpenAI) 会直接输出工具调用；某些模型 (如 Claude) 会先输出文本，然后再输出工具调用。因此需要使用不同的方法来判断，这个字段用来指定判断模型流式输出中是否包含工具调用的函数。

可选填写，未填写时使用首包是否包含工具调用判断：

```go
func firstChunkStreamToolCallChecker(___ context.Context, _sr_ *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()

    msg, err := sr.Recv()
    if err != nil {
        return false, err
    }

    if len(msg.ToolCalls) == 0 {
        return false, nil
    }

    return true, nil
}
```

部分模型流式输出工具调用时会先输出一段文本（比如 Claude），这会导致默认 StreamToolCallChecker 错误判断没有工具调用而直接返回，使用这类模型时必须自行实现正确的 StreamToolCallChecker。

> 💡
> 对于流式输出工具调用时会先输出一段文本的模型，可以尝试添加 prompt 来约束模型在工具调用时不额外输出文本，从而解决这一问题，例如：“如果需要调用 tool，直接输出 tool，不要输出文本”。
>
> 不同模型受 prompt 影响可能不同，实际使用时需要自行调整 prompt 并验证效果。

## 调用

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

Callback 是在 Agent 运行时特定时机执行的回调，由于 Agent 这个 Graph 里面只有 ChatModel 和 ToolsNode，因此 Agent 的 Callback 就是 ChatModel 和 Tool 的 Callback。react 包中提供了一个 helper function 来帮助用户快速构建针对这两个组件类型的 Callback Handler。

```go
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

## Agent In Graph/Chain

Agent 可作为 Lambda 嵌入到其他的 Graph 中:

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

## Demo

### 基本信息

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

## 关联阅读

- [Eino Tutorial: Host Multi-Agent ](/zh/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)
