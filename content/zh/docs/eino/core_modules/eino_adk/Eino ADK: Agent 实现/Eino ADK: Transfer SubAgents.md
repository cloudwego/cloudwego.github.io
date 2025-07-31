---
Description: ""
date: "2025-07-22"
lastmod: ""
tags: []
title: 'Eino ADK: Transfer SubAgents'
weight: 0
---

Agent 运行时产生带有包含 TransferAction 的 AgentEvent 后，Eino ADK 会调用 Action 指定的 Agent，被调用的 Agent 被称为子 Agent（SubAgent）。TransferAction 可以使用 `NewTransferToAgentAction` 快速创建：

```go
import "github.com/cloudwego/eino/adk"

event := adk.NewTransferToAgentAction("dest agent name")
```

为了让 Eino ADK 在接受到 TransferAction 可以找到子 Agent 实例并运行，在运行前需要先调用 `SetSubAgents` 将可能的子 Agent 注册到 Eino ADK 中：

```go
// github.com/cloudwego/eino/adk/flow.go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
```

> 💡
> Transfer 的含义是将任务**移交**给子 Agent，而不是委托或者分配，因此：
>
> 1. 区别于 ToolCall，通过 Transfer 调用子 Agent，子 Agent 运行结束后，不会再调用父 Agent 总结内容或进行下一步操作。
> 2. 调用子 Agent 时，子 Agent 的输入仍然是原始输入，父 Agent 的输出会作为上下文供子 Agent 参考。

以上描述中，产生 TransferAction Agent 天然清楚自己的子 Agent 有哪些，另外一些 Agent 需要根据不同场景配置不同的子 Agent，比如 Eino ADK 提供的 ChatModelAgent，这是一个通用 Agent 模板，需要根据业务实际场景配置子 Agent。这样的 Agent 需要能动态地注册父子 Agent，Eino 定义了 `OnSubAgents` 接口，用来支持此功能：

```go
// github.com/cloudwego/eino/adk/interface.go
type OnSubAgents interface {
    OnSetSubAgents(ctx context.Context, subAgents []Agent) error
    OnSetAsSubAgent(ctx context.Context, parent Agent) error

    OnDisallowTransferToParent(ctx context.Context) error
}
```

如果 Agent 实现了 `OnSubAgents` 接口，`SetSubAgents` 中会调用相应的方法向 Agent 注册。

接下来以一个多功能对话 Agent 演示 Transfer 能力，目标是搭建一个可以查询天气或者与用户对话的 Agent，Agent 结构如下：

![](/img/eino/EdZawsBGPhbH4MbBkSVcWo6Unrg.png)

三个 Agent 均使用 ChatModelAgent 实现：

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/compose"
)

func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
       APIKey: os.Getenv("OPENAI_API_KEY"),
       Model:  os.Getenv("OPENAI_MODEL"),
    })
    if err != nil {
       log.Fatal(err)
    }
    return cm
}

type GetWeatherInput struct {
    City string `json:"city"`
}

func NewWeatherAgent() adk.Agent {
    weatherTool, err := utils.InferTool(
       "get_weather",
       "Gets the current weather for a specific city.", // English description
       func(ctx context.Context, input *GetWeatherInput) (string, error) {
          return fmt.Sprintf(`the temperature in %s is 25°C`, input.City), nil
       },
    )
    if err != nil {
       log.Fatal(err)
    }

    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "WeatherAgent",
       Description: "This agent can get the current weather for a given city.",
       Instruction: "Your sole purpose is to get the current weather for a given city by using the 'get_weather' tool. After calling the tool, report the result directly to the user.",
       Model:       newChatModel(),
       ToolsConfig: adk.ToolsConfig{
          ToolsNodeConfig: compose.ToolsNodeConfig{
             Tools: []tool.BaseTool{weatherTool},
          },
       },
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func NewChatAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "ChatAgent",
       Description: "A general-purpose agent for handling conversational chat.", // English description
       Instruction: "You are a friendly conversational assistant. Your role is to handle general chit-chat and answer questions that are not related to any specific tool-based tasks.",
       Model:       newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func NewRouterAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "RouterAgent",
       Description: "A manual router that transfers tasks to other expert agents.",
       Instruction: `You are an intelligent task router. Your responsibility is to analyze the user's request and delegate it to the most appropriate expert agent.If no Agent can handle the task, simply inform the user it cannot be processed.`,
       Model:       newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}
```

之后使用 Eino ADK 的 Transfer 能力搭建 Multi-Agent 并运行，ChatModelAgent 实现了 OnSubAgent 接口，在 adk.SetSubAgents 方法中会使用此接口向 ChatModelAgent 注册父/子 Agent，不需要用户处理 TransferAction 生成问题：

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"

    "github.com/cloudwego/eino-examples/adk/intro/transfer/subagents"
)

func main() {
    weatherAgent := subagents.NewWeatherAgent()
    chatAgent := subagents.NewChatAgent()
    routerAgent := subagents.NewRouterAgent()

    ctx := context.Background()
    a, err := adk.SetSubAgents(ctx, routerAgent, []adk.Agent{chatAgent, weatherAgent})
    if err != nil {
       log.Fatal(err)
    }

    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: a,
    })

    // query weather
    println("\n\n>>>>>>>>>query weather<<<<<<<<<")
    iter := runner.Query(ctx, "What's the weather in Beijing?")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil {
          fmt.Printf("\nAgent[%s]: transfer to %+v\n\n======\n", event.AgentName, event.Action.TransferToAgent.DestAgentName)
       } else {
          fmt.Printf("\nAgent[%s]:\n%+v\n\n======\n", event.AgentName, event.Output.MessageOutput.Message)
       }
    }

    // failed to route
    println("\n\n>>>>>>>>>failed to route<<<<<<<<<")
    iter = runner.Query(ctx, "Book me a flight from New York to London tomorrow.")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil {
          fmt.Printf("\nAgent[%s]: transfer to %+v\n\n======\n", event.AgentName, event.Action.TransferToAgent.DestAgentName)
       } else {
          fmt.Printf("\nAgent[%s]:\n%+v\n\n======\n", event.AgentName, event.Output.MessageOutput.Message)
       }
    }
}
```

得到结果：

>>>>>>>>> query weather<<<<<<<<<
>>>>>>>>>
>>>>>>>>
>>>>>>>
>>>>>>
>>>>>
>>>>
>>>
>>
>
> Agent[RouterAgent]:
>
> assistant:
>
> tool_calls:
>
> {Index:<nil> ID:call_SKNsPwKCTdp1oHxSlAFt8sO6 Type:function Function:{Name:transfer_to_agent Arguments:{"agent_name":"WeatherAgent"}} Extra:map[]}
>
> finish_reason: tool_calls
>
> usage: &{201 17 218}
>
> ======
>
> Agent[RouterAgent]: transfer to WeatherAgent
>
> ======
>
> Agent[WeatherAgent]:
>
> assistant:
>
> tool_calls:
>
> {Index:<nil> ID:call_QMBdUwKj84hKDAwMMX1gOiES Type:function Function:{Name:get_weather Arguments:{"city":"Beijing"}} Extra:map[]}
>
> finish_reason: tool_calls
>
> usage: &{255 15 270}
>
> ======
>
> Agent[WeatherAgent]:
>
> tool: the temperature in Beijing is 25°C
>
> tool_call_id: call_QMBdUwKj84hKDAwMMX1gOiES
>
> tool_call_name: get_weather
>
> ======
>
> Agent[WeatherAgent]:
>
> assistant: The current temperature in Beijing is 25°C.
>
> finish_reason: stop
>
> usage: &{286 11 297}
>
> ======
>
>>>>>>>>> failed to route<<<<<<<<<
>>>>>>>>>
>>>>>>>>
>>>>>>>
>>>>>>
>>>>>
>>>>
>>>
>>
>
> Agent[RouterAgent]:
>
> assistant: I'm unable to assist with booking flights. Please use a relevant travel service or booking platform to make your reservation.
>
> finish_reason: stop
>
> usage: &{206 23 229}
>
> ======
>
> 完整示例见：github.com/cloudwego/eino-examples/
