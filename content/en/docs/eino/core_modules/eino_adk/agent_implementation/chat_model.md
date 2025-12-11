---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: 'Eino ADK: ChatModelAgent'
weight: 1
---

# ChatModelAgent Overview

## Import Path

`import "github.com/cloudwego/eino/adk"`

## What is ChatModelAgent

`ChatModelAgent` is a core prebuilt Agent in Eino ADK. It encapsulates interaction with LLMs and supports tools to accomplish complex tasks.

## ChatModelAgent ReAct Mode

`ChatModelAgent` uses the [ReAct](https://react-lm.github.io/) pattern, designed to solve complex problems by letting the ChatModel perform explicit, step‑by‑step “thinking”. When tools are configured, its internal execution follows ReAct:

- Call ChatModel (Reason)
- LLM returns a tool‑call request (Action)
- ChatModelAgent executes the tool (Act)
- It sends the tool result back to ChatModel (Observation), then starts a new loop until the model decides no tool is needed and stops

When no tools are configured, `ChatModelAgent` falls back to a single ChatModel call.

<a href="/img/eino/eino_adk_chat_model_agent_view.png" target="_blank"><img src="/img/eino/eino_adk_chat_model_agent_view.png" width="100%" /></a>

Configure tools via `ToolsConfig`:

```go
type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
}
```

ToolsConfig reuses Eino Graph `ToolsNodeConfig`. See: [Eino: ToolsNode & Tool Guide](/docs/eino/core_modules/components/tools_node_guide)

## Configuration Fields

```go
type ChatModelAgentConfig struct {
    // Name of the agent. Better be unique across all agents.
    Name string
    // Description of the agent's capabilities.
    // Helps other agents determine whether to transfer tasks to this agent.
    Description string
    // Instruction used as the system prompt for this agent.
    // Optional. If empty, no system prompt will be used.
    // Supports f-string placeholders for session values in default GenModelInput, for example:
    // "You are a helpful assistant. The current time is {Time}. The current user is {User}."
    // These placeholders will be replaced with session values for "Time" and "User".
    Instruction string

    Model model.ToolCallingChatModel

    ToolsConfig ToolsConfig

    // GenModelInput transforms instructions and input messages into the model's input format.
    // Optional. Defaults to defaultGenModelInput which combines instruction and messages.
    GenModelInput GenModelInput

    // Exit defines the tool used to terminate the agent process.
    // Optional. If nil, no Exit Action will be generated.
    // You can use the provided 'ExitTool' implementation directly.
    Exit tool.BaseTool

    // OutputKey stores the agent's response in the session.
    // Optional. When set, stores output via AddSessionValue(ctx, outputKey, msg.Content).
    OutputKey string

    // MaxIterations defines the upper limit of ChatModel generation cycles.
    // The agent will terminate with an error if this limit is exceeded.
    // Optional. Defaults to 20.
    MaxIterations int
}

type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
}

type GenModelInput func(ctx context.Context, instruction string, input *AgentInput) ([]Message, error)
```

- `Name`: agent name
- `Description`: agent description
- `Instruction`: system prompt when calling ChatModel; supports f‑string rendering
- `Model`: ToolCallingChatModel is required to support tool calls
- `ToolsConfig`: tool configuration
  - Reuses Eino Graph `ToolsNodeConfig` (see: [Eino: ToolsNode & Tool Guide](/docs/eino/core_modules/components/tools_node_guide)).
  - `ReturnDirectly`: after calling a listed tool, ChatModelAgent exits immediately with the result; if multiple tools are listed, only the first match returns. Map key is the tool name.
- `GenModelInput`: transforms `Instruction` and `AgentInput` to ChatModel messages; default:
  1. Prepend `Instruction` as a System Message to `AgentInput.Messages`
  2. Render `SessionValues` variables into the message list
- `OutputKey`: stores the final message’s content into `SessionValues` under `OutputKey`
- `MaxIterations`: upper bound on the ReAct loop; default 20
- `Exit`: special tool that causes immediate agent termination when invoked; ADK provides a default `ExitTool` implementation:

```go
type ExitTool struct{}

func (et ExitTool) Info(_ context.Context) (*schema.ToolInfo, error) { return ToolInfoExit, nil }

func (et ExitTool) InvokableRun(ctx context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    type exitParams struct { FinalResult string `json:"final_result"` }
    params := &exitParams{}
    err := sonic.UnmarshalString(argumentsInJSON, params)
    if err != nil { return "", err }
    err = SendToolGenAction(ctx, "exit", NewExitAction())
    if err != nil { return "", err }
    return params.FinalResult, nil
}
```

## ChatModelAgent Transfer

`ChatModelAgent` implements `OnSubAgents`. After `SetSubAgents`, it adds a Transfer Tool and instructs the model to call it with the target agent name when transfer is needed:

```go
const TransferToAgentInstruction = `Available other agents: %s

Decision rule:
- If you're best suited for the question according to your description: ANSWER
- If another agent is better according its description: CALL '%s' function with their agent name

When transferring: OUTPUT ONLY THE FUNCTION CALL`
```

– `Transfer Tool` sets a Transfer Event to jump to the target Agent; then ChatModelAgent exits.
– Agent Runner receives the Transfer Event and switches execution to the target Agent.

## ChatModelAgent AgentAsTool

Convert an agent to a tool when clear input suffices:

```go
// github.com/cloudwego/eino/adk/agent_tool.go
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

Register the converted Agent tool in `ToolsConfig` so `ChatModelAgent` can decide when to call it.

# ChatModelAgent Usage Example

## Scenario

Create a book recommendation Agent that can recommend relevant books based on user input.

## Implementation

### Step 1: Define the tool

```go
type BookSearchInput struct {
    Genre     string `json:"genre" jsonschema:"description=Preferred book genre,enum=fiction,enum=sci-fi,enum=mystery,enum=biography,enum=business"`
    MaxPages  int    `json:"max_pages" jsonschema:"description=Maximum page length (0 for no limit)"`
    MinRating int    `json:"min_rating" jsonschema:"description=Minimum user rating (0-5 scale)"`
}

type BookSearchOutput struct {
    Books []string
}

func NewBookRecommender() tool.InvokableTool {
    bookSearchTool, err := utils.InferTool("search_book", "Search books based on user preferences", func(ctx context.Context, input *BookSearchInput) (output *BookSearchOutput, err error) {
       // search code
       // ...
       return &BookSearchOutput{Books: []string{"God's blessing on this wonderful world!"}}, nil
    })
    if err != nil {
       log.Fatalf("failed to create search book tool: %v", err)
    }
    return bookSearchTool
}
```

### Step 2: Create ChatModel

```go
func NewChatModel() model.ToolCallingChatModel {
    ctx := context.Background()
    apiKey := os.Getenv("OPENAI_API_KEY")
    openaiModel := os.Getenv("OPENAI_MODEL")

    cm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
       APIKey: apiKey,
       Model:  openaiModel,
    })
    if err != nil {
       log.Fatal(fmt.Errorf("failed to create chatmodel: %w", err))
    }
    return cm
}
```

### Step 3: Create ChatModelAgent

```go
func NewBookRecommendAgent() adk.Agent {
    ctx := context.Background()

    a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
       Name:        "BookRecommender",
        Description: "An agent that can recommend books",
        Instruction: `You are an expert book recommender. Based on the user's request, use the "search_book" tool to find relevant books. Finally, present the results to the user.`,
        Model:       NewChatModel(),
        ToolsConfig: adk.ToolsConfig{
           ToolsNodeConfig: compose.ToolsNodeConfig{
              Tools: []tool.BaseTool{NewBookRecommender()},
           },
        },
    })
    if err != nil {
       log.Fatal(fmt.Errorf("failed to create chatmodel: %w", err))
    }

    return a
}
```

### Step 4: Run via Runner

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{ Agent: a })
iter := runner.Query(ctx, "recommend a fiction book to me")
for {
    event, ok := iter.Next(); if !ok { break }
    if event.Err != nil { log.Fatal(event.Err) }
    msg, err := event.Output.MessageOutput.GetMessage()
    if err != nil { log.Fatal(err) }
    fmt.Printf("\nmessage:\n%v\n======", msg)
}
```

## Run Result

```yaml
message:
assistant: 
tool_calls:
{Index:<nil> ID:call_o2It087hoqj8L7atzr70EnfG Type:function Function:{Name:search_book Arguments:{"genre":"fiction","max_pages":0,"min_rating":0}} Extra:map[]}

finish_reason: tool_calls
usage: &{140 24 164}
======


message:
tool: {"Books":["God's blessing on this wonderful world!"]}
tool_call_id: call_o2It087hoqj8L7atzr70EnfG
tool_call_name: search_book
======


message:
assistant: I recommend the fiction book "God's blessing on this wonderful world!". It's a great choice for readers looking for an exciting story. Enjoy your reading!
finish_reason: stop
usage: &{185 31 216}
======
```

# ChatModelAgent Interrupt & Resume

## Introduction

`ChatModelAgent` uses Eino Graph internally, so the agent reuses Graph’s Interrupt & Resume capability.

– On interrupt, a tool returns a special error to trigger Graph interrupt and emit custom info; on resume, Graph reruns this tool:

```go
// github.com/cloudwego/eino/adk/interrupt.go

func NewInterruptAndRerunErr(extra any) error
```

– On resume, pass custom `tool.Option`s to supply extra info to tools:

```go
import (
    "github.com/cloudwego/eino/components/tool"
)

type askForClarificationOptions struct { NewInput *string }
func WithNewInput(input string) tool.Option {
    return tool.WrapImplSpecificOptFn(func(t *askForClarificationOptions) { t.NewInput = &input })
}
```

## Example

Add `ask_for_clarification` tool that interrupts until new input is provided, then resumes and continues.
