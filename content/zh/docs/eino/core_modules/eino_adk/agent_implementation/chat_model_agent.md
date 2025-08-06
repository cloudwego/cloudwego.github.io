---
Description: ""
date: "2025-08-06"
lastmod: ""
tags: []
title: 'Eino ADK: ChatModelAgent'
weight: 0
---

ChatModelAgent 是 Eino ADK 中的一个核心预构建 的 Agent，它封装了与大语言模型（LLM）进行交互、并支持使用工具来完成任务的复杂逻辑。

下面，我们将创建一个图书推荐 Agent，演示如何配置和使用 ChatModelAgent 。这个 Agent 将能够根据用户的输入推荐相关图书。

- 工具定义

对图书推荐 Agent，需要一个根据能够根据用户要求（题材、评分等）检索图书的工具 `book_search` 利用 Eino 提供的工具方法可以方便地创建（可参考[如何创建一个 tool ?](/zh/docs/eino/core_modules/components/tools_node_guide/how_to_create_a_tool)）：

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

- 创建 ChatModel

为 ChatModelAgent 创建 ChatModel，Eino 提供了多种 ChatModel 封装（如 openai、gemini、doubao 等，详见 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)），这里以 openai ChatModel 为例：

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

- 创建 ChatModelAgent

除了配置 ChatModel 和工具外，还需要配置描述 Agent 功能用途的 Name 和 Description，以及指示 ChatModel 的 Instruction，Instruction 最终会作为 system message 被传递给 ChatModel。

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

通过 Runner 运行：

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

示例结果：

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

# 工具调用

ChatModelAgent 内使用了 [ReAct](https://react-lm.github.io/) 模式，该模式旨在通过让 ChatModel 进行显式的、一步一步的“思考”来解决复杂问题。为 ChatModelAgent 配置了工具后，它在内部的执行流程就遵循了 ReAct 模式：

- 调用 ChatModel（Reason）
- LLM 返回工具调用请求（Action）
- ChatModelAgent 执行工具（Act）
- 它将工具结果返回给 ChatModel（Observation），然后开始新的循环，直到 ChatModel 判断不需要调用 Tool 结束。

<a href="/img/eino/react_agent_pattern.png" target="_blank"><img src="/img/eino/react_agent_pattern.png" width="100%" /></a>

可以通过 ToolsConfig 为 ChatModelAgent 配置 Tool：

```go
// github.com/cloudwego/eino/adk/chatmodel.go

type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
}
```

ToolsConfig 复用了 Eino Graph ToolsNodeConfig，详细参考：[Eino: ToolsNode&Tool 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)。额外提供了 ReturnDirectly 配置，ChatModelAgent 调用配置在 ReturnDirectly 中的 Tool 后会直接退出。

当没有配置工具时，ChatModelAgent 退化为一次 ChatModel 调用。

# GenModelInput

ChatModelAgent 创建时可以配置 GenModelInput，Agent 被调用时会使用该方法生成 ChatModel 的初始输入：

```
type GenModelInput func(ctx context.Context, instruction string, input *AgentInput) ([]Message, error)
```

Agent 提供了默认的 GenModelInput 方法：

1. 将 Instruction 作为 system message 加到 AgentInput.Messages 前
2. 以 SessionValues 为 variables 渲染 1 中得到的 message list

# OutputKey

ChatModelAgent 创建时可以配置 OutputKey，配置后 Agent 产生的最后一个 message 会被以设置的 OutputKey 为 key 添加到 SessionValues 中。

# Exit

Exit 字段支持配置一个 Tool，当 LLM 调用这个工具后并执行后，ChatModelAgent 将直接退出，效果类似 ToolReturnDirectly。Eino ADK 提供了一个 ExitTool，用户可以直接使用：

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

ChatModelAgent 实现了 OnSubAgents 接口，使用 SetSubAgents 为 ChatModelAgent 设置父或子 Agent 后，ChatModelAgent 会增加一个 Transfer Tool，并且在 prompt 中指示 ChatModel 在需要 transfer 时调用这个 Tool 并以 transfer 目标 AgentName 作为 Tool 输入。在此工具被调用后，Agent 会产生 TransferAction 并退出。

# AgentTool

ChatModelAgent 提供了工具方法，可以方便地将 Eino ADK Agent 转化为 Tool 供 ChatModelAgent 调用：

```go
// github.com/cloudwego/eino/adk/agent_tool.go

func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

比如之前创建的 `BookRecommendAgent` 可以使用 NewAgentTool 方法转换为 Tool，并被其他 Agent 调用：

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

ChatModelAgent 支持 Interrupt&Resume，我们给 BookRecommendAgent 增加一个工具 `ask_for_clarification`，当用户提供的信息不足以支持推荐时，Agent 将调用这个工具向用户询问更多信息，`ask_for_clarification` 使用了 Interrupt&Resume 能力来实现向用户“询问”。

ChatModelAgent 使用了 Eino Graph 实现，在 agent 中可以复用 Eino Graph 的 Interrupt&Resume 能力，工具返回特殊错误使 Graph 触发中断并向外抛出自定义信息，在恢复时 Graph 会重新运行此工具：

```go
// github.com/cloudwego/eino/adk/interrupt.go

func NewInterruptAndRerunErr(extra any) error
```

另外定义 ToolOption 来在恢复时传递新输入：

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
> 定义 tool option 不是必须的，实践时可以根据 context、闭包等其他方式传递新输入

完整的 Tool 实现如下：

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

将 `ask_for_clarification` 添加到之前的 Agent 中：

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

之后在 Runner 中配置 CheckPointStore（例子中使用最简单的 InMemoryStore），并在调用 Agent 时传入 CheckPointID，用来在恢复时使用。eino Graph 在中断时，会把 Graph 的 InterruptInfo 放入 Interrupted.Data 中：

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

可以在中断看到输出：

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

之后向用户询问新输入并恢复运行：

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

新的输出为：

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

> 完整示例见：github.com/cloudwego/eino-examples/adk/intro/chatmodel
