---
Description: ""
date: "2025-07-22"
lastmod: ""
tags: []
title: 'Eino ADK: ChatModelAgent'
weight: 0
---

ChatModelAgent is a core pre-built Agent in Eino ADK that encapsulates the complex logic of interacting with large language models (LLMs) and supports using tools to complete tasks.

Below, we will create a book recommendation Agent to demonstrate how to configure and use ChatModelAgent. This Agent will be able to recommend relevant books based on user input.

- Tool Definition

For the book recommendation Agent, we need a tool `book_search` that can retrieve books based on user requirements (genre, rating, etc.). This can be easily created using the tool methods provided by Eino (refer to [How to create a tool?](/en/docs/eino/core_modules/components/tools_node_guide/how_to_create_a_tool)):

```go
import (
    "context"
    "log"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
)

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

- Create ChatModel

Create a ChatModel for ChatModelAgent. Eino provides multiple ChatModel wrappers (such as openai, gemini, doubao, etc., see [Eino: ChatModel Usage Guide](/en/docs/eino/core_modules/components/chat_model_guide)). Here we use openai ChatModel as an example:

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/components/model"
)

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

- Create ChatModelAgent

In addition to configuring ChatModel and tools, you also need to configure Name and Description that describe the Agent's functionality and purpose, as well as Instruction that guides the ChatModel. The Instruction will ultimately be passed to the ChatModel as a system message.

```go
import (
    "context"
    "fmt"
    "log"

    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
)

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

Run through Runner:

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"

    "github.com/cloudwego/eino-examples/adk/intro/chatmodel/internal"
)

func main() {
    ctx := context.Background()
    a := internal.NewBookRecommendAgent()
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: a,
    })
    iter := runner.Query(ctx, "recommend a fiction book to me")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       msg, err := event.Output.MessageOutput.GetMessage()
       if err != nil {
          log.Fatal(err)
       }
       fmt.Printf("\nmessage:\n%v\n======", msg)
    }
}
```

Example result:

> message:
> assistant:
> tool_calls:
> {Index:<nil> ID:call_o2It087hoqj8L7atzr70EnfG Type:function Function:{Name:search_book Arguments:{"genre":"fiction","max_pages":0,"min_rating":0}} Extra:map[]}
>
> finish_reason: tool_calls
> usage: &{140 24 164}
> ======
>
> message:
> tool: {"Books":["God's blessing on this wonderful world!"]}
> tool_call_id: call_o2It087hoqj8L7atzr70EnfG
> tool_call_name: search_book
> ======
>
> message:
> assistant: I recommend the fiction book "God's blessing on this wonderful world!". It's a great choice for readers looking for an exciting story. Enjoy your reading!
> finish_reason: stop
> usage: &{185 31 216}
> ======

# Tool Calling

ChatModelAgent internally uses the [ReAct](https://react-lm.github.io/) pattern, which aims to solve complex problems by having the ChatModel perform explicit, step-by-step "thinking". After configuring tools for ChatModelAgent, its internal execution flow follows the ReAct pattern:

- Call ChatModel (Reason)
- LLM returns tool call request (Action)
- ChatModelAgent executes tool (Act)
- It returns tool results to ChatModel (Observation), then starts a new cycle until ChatModel determines that no more Tool calls are needed.

![](/img/eino/react_agent_pattern.png)

You can configure Tools for ChatModelAgent through ToolsConfig:

```go
// github.com/cloudwego/eino/adk/chatmodel.go

type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
}
```

ToolsConfig reuses Eino Graph ToolsNodeConfig, for details refer to: [Eino: ToolsNode&Tool Usage Guide](/en/docs/eino/core_modules/components/tools_node_guide). Additionally, it provides ReturnDirectly configuration - ChatModelAgent will exit directly after calling Tools configured in ReturnDirectly.

When no tools are configured, ChatModelAgent degrades to a single ChatModel call.

# GenModelInput

When creating ChatModelAgent, you can configure GenModelInput. When the Agent is called, this method will be used to generate the initial input for ChatModel:

```
type GenModelInput func(ctx context.Context, instruction string, input *AgentInput) ([]Message, error)
```

Agent provides a default GenModelInput method:

1. Add Instruction as system message before AgentInput.Messages
2. Render the message list obtained in step 1 using SessionValues as variables

# OutputKey

When creating ChatModelAgent, you can configure OutputKey. After configuration, the last message generated by the Agent will be added to SessionValues with the set OutputKey as the key.

# Exit

The Exit field supports configuring a Tool. After the LLM calls and executes this tool, ChatModelAgent will exit directly, with an effect similar to ToolReturnDirectly. Eino ADK provides an ExitTool that users can use directly:

```go
// github.com/cloudwego/eino/adk/chatmodel.go

type ExitTool struct{}

func (et ExitTool) Info(_ context.Context) (*schema.ToolInfo, error) {
    return ToolInfoExit, nil
}

func (et ExitTool) InvokableRun(ctx context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    type exitParams struct {
       FinalResult string `json:"final_result"`
    }

    params := &exitParams{}
    err := sonic.UnmarshalString(argumentsInJSON, params)
    if err != nil {
       return "", err
    }

    err = SendToolGenAction(ctx, "exit", NewExitAction())
    if err != nil {
       return "", err
    }

    return params.FinalResult, nil
}
```

# Transfer

ChatModelAgent implements the OnSubAgents interface. After using SetSubAgents to set parent or child Agents for ChatModelAgent, ChatModelAgent will add a Transfer Tool and instruct the ChatModel in the prompt to call this Tool with the transfer target AgentName as Tool input when transfer is needed. After this tool is called, the Agent will generate TransferAction and exit.

# AgentTool

ChatModelAgent provides tool methods that can conveniently convert Eino ADK Agent into Tool for ChatModelAgent to call:

```go
// github.com/cloudwego/eino/adk/agent_tool.go

func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

For example, the previously created `BookRecommendAgent` can be converted to Tool using the NewAgentTool method and called by other Agents:

```go
bookRecommender := NewBookRecommendAgent()
bookRecommendeTool := NewAgentTool(ctx, bookRecommender)

// other agent
a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // xxx
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{bookRecommendeTool},
        },
    },
})
```

# Interrupt&Resume

ChatModelAgent supports Interrupt&Resume. We add a tool `ask_for_clarification` to BookRecommendAgent. When the information provided by the user is insufficient to support recommendations, the Agent will call this tool to ask the user for more information. `ask_for_clarification` uses Interrupt&Resume capability to implement "asking" the user.

ChatModelAgent is implemented using Eino Graph. In the agent, you can reuse Eino Graph's Interrupt&Resume capability. The tool returns a special error to make Graph trigger interruption and throw custom information outward. When resuming, Graph will re-run this tool:

```go
// github.com/cloudwego/eino/adk/interrupt.go

func NewInterruptAndRerunErr(extra any) error
```

Additionally define ToolOption to pass new input when resuming:

```go
import (
    "github.com/cloudwego/eino/components/tool"
)

type askForClarificationOptions struct {
    NewInput *string
}

func WithNewInput(input string) tool.Option {
    return tool.WrapImplSpecificOptFn(func(t *askForClarificationOptions) {
       t.NewInput = &input
    })
}
```

> 💡
> Defining tool option is not mandatory. In practice, you can pass new input through other methods like context, closures, etc.

Complete Tool implementation:

```go
import (
    "context"
    "log"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/compose"
)

type askForClarificationOptions struct {
    NewInput *string
}

func WithNewInput(input string) tool.Option {
    return tool.WrapImplSpecificOptFn(func(t *askForClarificationOptions) {
       t.NewInput = &input
    })
}

type AskForClarificationInput struct {
    Question string `json:"question" jsonschema:"description=The specific question you want to ask the user to get the missing information"`
}

func NewAskForClarificationTool() tool.InvokableTool {
    t, err := utils.InferOptionableTool(
       "ask_for_clarification",
       "Call this tool when the user's request is ambiguous or lacks the necessary information to proceed. Use it to ask a follow-up question to get the details you need, such as the book's genre, before you can use other tools effectively.",
       func(ctx context.Context, input *AskForClarificationInput, opts ...tool.Option) (output string, err error) {
          o := tool.GetImplSpecificOptions[askForClarificationOptions](nil, opts...)
          if o.NewInput == nil {
             return "", compose.NewInterruptAndRerunErr(input.Question)
          }
          return *o.NewInput, nil
       })
    if err != nil {
       log.Fatal(err)
    }
    return t
}
```

Add `ask_for_clarification` to the previous Agent:

```go
func NewBookRecommendAgent() adk.Agent {
    // xxx
    a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
       // xxx
       ToolsConfig: adk.ToolsConfig{
          ToolsNodeConfig: compose.ToolsNodeConfig{
             Tools: []tool.BaseTool{NewBookRecommender(), NewAskForClarificationTool()},
          },
       },
    })
    // xxx
}
```

Then configure CheckPointStore in Runner (the example uses the simplest InMemoryStore) and pass CheckPointID when calling Agent for use during resumption. When eino Graph interrupts, it will put Graph's InterruptInfo into Interrupted.Data:

```go
func main() {
    ctx := context.Background()
    a := internal.NewBookRecommendAgent()
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent:           a,
       CheckPointStore: newInMemoryStore(),
    })
    iter := runner.Query(ctx, "recommend a book to me", adk.WithCheckPointID("1"))
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil && event.Action.Interrupted != nil {
          fmt.Printf("\ninterrupt happened, info: %+v\n", event.Action.Interrupted.Data.(*compose.InterruptInfo).RerunNodesExtra["ToolNode"])
          continue
       }
       msg, err := event.Output.MessageOutput.GetMessage()
       if err != nil {
          log.Fatal(err)
       }
       fmt.Printf("\nmessage:\n%v\n======\n\n", msg)
    }
    
    // xxxxxx
}
```

You can see the output during interruption:

> message:
> assistant:
> tool_calls:
> {Index:<nil> ID:call_3HAobzkJvW3JsTmSHSBRftaG Type:function Function:{Name:ask_for_clarification Arguments:{"question":"Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?"}} Extra:map[]}
>
> finish_reason: tool_calls
> usage: &{219 37 256}
> ======
>
> interrupt happened, info: &{ToolCalls:[{Index:<nil> ID:call_3HAobzkJvW3JsTmSHSBRftaG Type:function Function:{Name:ask_for_clarification Arguments:{"question":"Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?"}} Extra:map[]}] ExecutedTools:map[] RerunTools:[call_3HAobzkJvW3JsTmSHSBRftaG] RerunExtraMap:map[call_3HAobzkJvW3JsTmSHSBRftaG:Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?]}

Then ask the user for new input and resume execution:

```go
func main(){
    // xxx
    scanner := bufio.NewScanner(os.Stdin)
    fmt.Print("new input is:\n")
    scanner.Scan()
    nInput := scanner.Text()

    iter, err := runner.Resume(ctx, "1", adk.WithToolOptions([]tool.Option{chatmodel.WithNewInput(nInput)}))
    if err != nil {
        log.Fatal(err)
    }
    for {
        event, ok := iter.Next()
        if !ok {
           break
        }
        if event.Err != nil {
           log.Fatal(event.Err)
        }
        msg, err := event.Output.MessageOutput.GetMessage()
        if err != nil {
           log.Fatal(err)
        }
        fmt.Printf("\nmessage:\n%v\n======\n\n", msg)
    }
}
```

New output:

> new input is:
> recommend me a fiction book
>
> message:
> tool: recommend me a fiction book
> tool_call_id: call_3HAobzkJvW3JsTmSHSBRftaG
> tool_call_name: ask_for_clarification
> ======
>
> message:
> assistant:
> tool_calls:
> {Index:<nil> ID:call_3fC5OqPZLls11epXMv7sZGAF Type:function Function:{Name:search_book Arguments:{"genre":"fiction","max_pages":0,"min_rating":0}} Extra:map[]}
>
> finish_reason: tool_calls
> usage: &{272 24 296}
> ======
>
> message:
> tool: {"Books":["God's blessing on this wonderful world!"]}
> tool_call_id: call_3fC5OqPZLls11epXMv7sZGAF
> tool_call_name: search_book
> ======
>
> message:
> assistant: I recommend the fiction book "God's Blessing on This Wonderful World!" Enjoy your reading!
> finish_reason: stop
> usage: &{317 20 337}
> ======

> Complete example: github.com/cloudwego/eino-examples/adk/intro/chatmodel