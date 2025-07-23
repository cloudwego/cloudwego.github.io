---
Description: ""
date: "2025-07-22"
lastmod: ""
tags: []
title: 'Eino ADK: Transfer SubAgents'
weight: 0
---

After an Agent generates an AgentEvent containing TransferAction during runtime, Eino ADK will call the Agent specified by the Action. The called Agent is referred to as a SubAgent. TransferAction can be quickly created using `NewTransferToAgentAction`:

```go
import "github.com/cloudwego/eino/adk"

event := adk.NewTransferToAgentAction("dest agent name")
```

To enable Eino ADK to find and run the SubAgent instance when receiving TransferAction, you need to call `SetSubAgents` before running to register possible SubAgents in Eino ADK:

```go
// github.com/cloudwego/eino/adk/flow.go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
```

> 💡
> The meaning of Transfer is to **hand over** the task to a SubAgent, not to delegate or assign it, therefore:
>
> 1. Unlike ToolCall, when calling a SubAgent through Transfer, after the SubAgent finishes running, the parent Agent will not be called again to summarize content or perform next steps.
> 2. When calling a SubAgent, the SubAgent's input is still the original input, and the parent Agent's output will serve as context for the SubAgent's reference.

In the above description, the Agent that generates TransferAction naturally knows what its SubAgents are. However, some other Agents need to configure different SubAgents according to different scenarios. For example, ChatModelAgent provided by Eino ADK is a general Agent template that needs to configure SubAgents according to actual business scenarios. Such Agents need to be able to dynamically register parent-child Agent relationships. Eino defines the `OnSubAgents` interface to support this functionality:

```go
// github.com/cloudwego/eino/adk/interface.go
type OnSubAgents interface {
    OnSetSubAgents(ctx context.Context, subAgents []Agent) error
    OnSetAsSubAgent(ctx context.Context, parent Agent) error

    OnDisallowTransferToParent(ctx context.Context) error
}
```

If an Agent implements the `OnSubAgents` interface, `SetSubAgents` will call the corresponding methods to register with the Agent.

Next, we'll demonstrate Transfer capability with a multi-functional conversation Agent. The goal is to build an Agent that can query weather or chat with users. The Agent structure is as follows:

![](/img/eino/EdZawsBGPhbH4MbBkSVcWo6Unrg.png)

All three Agents are implemented using ChatModelAgent:

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

Then use Eino ADK's Transfer capability to build Multi-Agent and run it. ChatModelAgent implements the OnSubAgent interface, and the adk.SetSubAgents method will use this interface to register parent/child Agents with ChatModelAgent, without requiring users to handle TransferAction generation:

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"

    "github.com/cloudwego/eino-examples/adk/intro/transfer/internal"
)

func main() {
    weatherAgent := internal.NewWeatherAgent()
    chatAgent := internal.NewChatAgent()
    routerAgent := internal.NewRouterAgent()

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

Result:

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
> Complete example: github.com/cloudwego/eino-examples/