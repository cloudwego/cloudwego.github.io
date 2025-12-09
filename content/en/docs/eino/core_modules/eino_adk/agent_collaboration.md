---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Collaboration'
weight: 4
---

# Collaboration Overview

ADK defines collaboration and composition primitives to build multi‑agent systems. This page introduces collaboration modes, input context strategies, decision autonomy, and composition types with code and diagrams.

## Collaboration Primitives

- Collaboration mode

  <table>
  <tr><td>Mode</td><td>Description</td></tr>
  <tr><td>Transfer</td><td>Hand off the task to another agent. The current agent exits and does not wait for the child agent’s completion.</td></tr>
  <tr><td>ToolCall (AgentAsTool)</td><td>Treat an agent as a tool, wait for its response, and use the output for subsequent processing.</td></tr>
  </table>

- Input context strategy

  <table>
  <tr><td>Strategy</td><td>Description</td></tr>
  <tr><td>Upstream full dialogue</td><td>Receive complete conversation history from upstream agents.</td></tr>
  <tr><td>New task description</td><td>Ignore upstream dialogue and generate a fresh summary as input for the child agent.</td></tr>
  </table>

- Decision autonomy

  <table>
  <tr><td>Autonomy</td><td>Description</td></tr>
  <tr><td>Autonomous</td><td>Agent internally selects downstream agents (often via LLM) when needed. Even preset logic is considered autonomous from the outside.</td></tr>
  <tr><td>Preset</td><td>Agent execution order is predetermined and predictable.</td></tr>
  </table>

## Composition Types

<table>
<tr><td>Type</td><td>Description</td><td>Diagram</td><td>Collab</td><td>Context</td><td>Decision</td></tr>
<tr><td><strong>SubAgents</strong></td><td>Build a parent agent with a list of named subagents, forming a tree. Agent names must be unique within the tree.</td><td><a href="/img/eino/eino_adk_self_driving.png" target="_blank"><img src="/img/eino/eino_adk_self_driving.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Autonomous</td></tr>
<tr><td><strong>Sequential</strong></td><td>Run subagents in order once, then finish.</td><td><a href="/img/eino/eino_adk_sequential_controller.png" target="_blank"><img src="/img/eino/eino_adk_sequential_controller.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>Parallel</strong></td><td>Run subagents concurrently over shared input; finish after all complete.</td><td><a href="/img/eino/eino_adk_parallel_yet_another_2.png" target="_blank"><img src="/img/eino/eino_adk_parallel_yet_another_2.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>Loop</strong></td><td>Run subagents in sequence repeatedly until termination.</td><td><a href="/img/eino/eino_adk_loop_exit.png" target="_blank"><img src="/img/eino/eino_adk_loop_exit.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>AgentAsTool</strong></td><td>Convert an agent into a tool callable by others. `ChatModelAgent` supports this directly.</td><td><a href="/img/eino/eino_collaboration_agent_as_tool_thumbnail.png" target="_blank"><img src="/img/eino/eino_collaboration_agent_as_tool_thumbnail.png" width="100%" /></a></td><td>ToolCall</td><td>New task description</td><td>Autonomous</td></tr>
</table>

## Context Passing

ADK provides two core mechanisms: History and SessionValues.

### History

Concept

- History corresponds to the “Upstream full dialogue” strategy. Every `AgentEvent` produced by upstream agents is saved into History.
- When invoking a new Agent (Workflow/Transfer), History events are converted and appended to that Agent’s `AgentInput`.

By default, assistant/tool messages from other agents are converted into user messages. This tells the current LLM: “Agent_A called some_tool with some_result. Now it’s your turn to decide.” It treats other agents’ behavior as external information rather than the current agent’s own actions, avoiding role confusion.

<a href="/img/eino/eino_adk_message_event.png" target="_blank"><img src="/img/eino/eino_adk_message_event.png" width="100%" /></a>

Filtering by RunPath

- When building `AgentInput` for an Agent, only include History events whose `RunPath` belong to the current Agent’s `RunPath` (equal or prefix).

Definition: RunPathA “belongs to” RunPathB when RunPathA equals RunPathB or RunPathA is a prefix of RunPathB.

Examples of RunPath in different orchestrations:

<table>
<tr><td>Example</td><td>RunPath</td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path_sub_agent.png" target="_blank"><img src="/img/eino/eino_adk_run_path_sub_agent.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>SubAgent: [Agent, SubAgent]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path.png" target="_blank"><img src="/img/eino/eino_adk_run_path.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>Agent (after function call): [Agent]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_collaboration_run_path_sequential.png" target="_blank"><img src="/img/eino/eino_adk_collaboration_run_path_sequential.png" width="100%" /></a></td><td><li>Agent1: [SequentialAgent, LoopAgent, Agent1]</li><li>Agent2: [SequentialAgent, LoopAgent, Agent1, Agent2]</li><li>Agent1: [SequentialAgent, LoopAgent, Agent1, Agent2, Agent1]</li><li>Agent2: [SequentialAgent, LoopAgent, Agent1, Agent2, Agent1, Agent2]</li><li>Agent3: [SequentialAgent, LoopAgent, Agent3]</li><li>Agent4: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent4]</li><li>Agent5: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent5]</li><li>Agent6: [SequentialAgent, LoopAgent, Agent3, ParallelAgent, Agent6]</li></td></tr>
<tr><td><a href="/img/eino/eino_adk_run_path_deterministic.png" target="_blank"><img src="/img/eino/eino_adk_run_path_deterministic.png" width="100%" /></a></td><td><li>Agent: [Agent]</li><li>SubAgent: [Agent, SubAgent]</li><li>Agent: [Agent, SubAgent, Agent]</li></td></tr>
</table>

Customize via `WithHistoryRewriter`:

```go
type HistoryRewriter func(ctx context.Context, entries []*HistoryEntry) ([]Message, error)
func WithHistoryRewriter(h HistoryRewriter) AgentOption
```

### SessionValues

- Global KV store per run; thread‑safe helpers:

```go
func GetSessionValues(ctx context.Context) map[string]any
func AddSessionValues(ctx context.Context, kvs map[string]any)
func GetSessionValue(ctx context.Context, key string) (any, bool)
func AddSessionValue(ctx context.Context, key string, value any)
```

Note: SessionValues are implemented via Context. Runner re‑initializes Context when starting a run, so calling `AddSessionValues` or `AddSessionValue` outside of `Runner.Run` will not take effect.

Inject initial values on run:

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent})
iterator := runner.Run(ctx, []adk.Message{schema.UserMessage("xxx")},
    adk.WithSessionValues(map[string]any{
        PlanSessionKey:      123,
        UserInputSessionKey: []adk.Message{schema.UserMessage("yyy")},
    }),
)
```

## Transfer SubAgents

- Emit a `Transfer` action to hand off control:

```go
event := adk.NewTransferToAgentAction("dest agent name")
```

- Register subagents before running:

```go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
```

- Notes:
  - Transfer hands off control; parent does not summarize after child ends
  - Child receives original input; parent output is context only

-- Agents can implement `OnSubAgents` to handle registration callbacks.

```go
// github.com/cloudwego/eino/adk/interface.go
type OnSubAgents interface {
    OnSetSubAgents(ctx context.Context, subAgents []Agent) error
    OnSetAsSubAgent(ctx context.Context, parent Agent) error
    OnDisallowTransferToParent(ctx context.Context) error
}
```

## Example: Weather + Chat via Transfer

Three `ChatModelAgent`s: a router, a weather agent (tool‑enabled), and a general chat agent. The router uses Transfer to hand off requests based on intent.

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
       "Gets the current weather for a specific city.",
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
       Description: "A general-purpose agent for handling conversational chat.",
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

Wire them together and run:

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"
)

func main() {
    weatherAgent := NewWeatherAgent()
    chatAgent := NewChatAgent()
    routerAgent := NewRouterAgent()

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

Sample output:

```yaml
>>>>>>>>>query weather<<<<<<<<<
Agent[RouterAgent]:
assistant: 
tool_calls:
{Index:<nil> ID:call_SKNsPwKCTdp1oHxSlAFt8sO6 Type:function Function:{Name:transfer_to_agent Arguments:{"agent_name":"WeatherAgent"}} Extra:map[]}

finish_reason: tool_calls
usage: &{201 17 218}
======
Agent[RouterAgent]: transfer to WeatherAgent
======
Agent[WeatherAgent]:
assistant: 
tool_calls:
{Index:<nil> ID:call_QMBdUwKj84hKDAwMMX1gOiES Type:function Function:{Name:get_weather Arguments:{"city":"Beijing"}} Extra:map[]}

finish_reason: tool_calls
usage: &{255 15 270}
======
Agent[WeatherAgent]:
tool: the temperature in Beijing is 25°C
tool_call_id: call_QMBdUwKj84hKDAwMMX1gOiES
tool_call_name: get_weather
======
Agent[WeatherAgent]:
assistant: The current temperature in Beijing is 25°C.
finish_reason: stop
usage: &{286 11 297}
======

>>>>>>>>>failed to route<<<<<<<<<
Agent[RouterAgent]:
assistant: I'm unable to assist with booking flights. Please use a relevant travel service or booking platform to make your reservation.
finish_reason: stop
usage: &{206 23 229}
======
```

Other `OnSubAgents` callbacks when registering child agents:

- `OnSetAsSubAgent`: register parent info to the agent
- `OnDisallowTransferToParent`: when `WithDisallowTransferToParent` is set, inform the agent not to transfer back to its parent

```go
adk.SetSubAgents(
    ctx,
    Agent1,
    []adk.Agent{
       adk.AgentWithOptions(ctx, Agent2, adk.WithDisallowTransferToParent()),
    },
)
```

### Deterministic Transfer

Wrap a subagent so it automatically transfers back to a target (e.g., supervisor) after finishing:

```go
type DeterministicTransferConfig struct {
    Agent        Agent
    ToAgentNames []string
}

func AgentWithDeterministicTransferTo(_ context.Context, config *DeterministicTransferConfig) Agent
```

Used by Supervisor to ensure subagents return control deterministically:

<a href="/img/eino/eino_adk_deterministic_transfer.png" target="_blank"><img src="/img/eino/eino_adk_deterministic_transfer.png" width="100%" /></a>

```go
// github.com/cloudwego/eino/adk/prebuilt/supervisor.go

type SupervisorConfig struct {
        Supervisor adk.Agent
        SubAgents  []adk.Agent
}

func NewSupervisor(ctx context.Context, conf *SupervisorConfig) (adk.Agent, error) {
        subAgents := make([]adk.Agent, 0, len(conf.SubAgents))
        supervisorName := conf.Supervisor.Name(ctx)
        for _, subAgent := range conf.SubAgents {
                subAgents = append(subAgents, adk.AgentWithDeterministicTransferTo(ctx, &adk.DeterministicTransferConfig{
                        Agent:        subAgent,
                        ToAgentNames: []string{supervisorName},
                }))
        }

        return adk.SetSubAgents(ctx, conf.Supervisor, subAgents)
}
```
