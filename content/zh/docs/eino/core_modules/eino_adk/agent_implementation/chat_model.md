---
Description: ""
date: "2025-09-30"
lastmod: ""
tags: []
title: 'Eino ADK: ChatModelAgent'
weight: 1
---

## ChatModelAgent 概述

### Import Path

```
import github.com/cloudwego/eino/adk
```

### 什么是 ChatModelAgent

`ChatModelAgent` 是 Eino ADK 中的一个核心预构建 的 Agent，它封装了与大语言模型（LLM）进行交互、并支持使用工具来完成任务的复杂逻辑。

### ChatModelAgent ReAct 模式

`ChatModelAgent` 内使用了 [ReAct](https://react-lm.github.io/) 模式，该模式旨在通过让 ChatModel 进行显式的、一步一步的“思考”来解决复杂问题。为 `ChatModelAgent` 配置了工具后，它在内部的执行流程就遵循了 ReAct 模式：

- 调用 ChatModel（Reason）
- LLM 返回工具调用请求（Action）
- ChatModelAgent 执行工具（Act）
- 它将工具结果返回给 ChatModel（Observation），然后开始新的循环，直到 ChatModel 判断不需要调用 Tool 结束。

当没有配置工具时，`ChatModelAgent` 退化为一次 ChatModel 调用。

<a href="/img/eino/NSX1w1ZJghC4f8bmyfeczj0lnGb.png" target="_blank"><img src="/img/eino/NSX1w1ZJghC4f8bmyfeczj0lnGb.png" width="50%" /></a>

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

### ChatModelAgent 配置字段

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

- `Name`：Agent 名称
- `Description`：Agent 描述
- `Instruction`：调用 ChatModel 时的 System Prompt，支持 f-string 渲染
- `Model`：运行所使用的 ChatModel，要求支持工具调用
- `ToolsConfig`：工具配置
  - ToolsConfig 复用了 Eino Graph ToolsNodeConfig，详细参考：[Eino: ToolsNode&Tool 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)。
  - ReturnDirectly：当 ChatModelAgent 调用配置在 ReturnDirectly 中的 Tool 后，将携带结果立刻退出，不会按照 react 模式返回 ChatModel。如果命中了多个 Tool，只有首个 Tool 会返回。Map key 为 Tool 名称。
- `GenModelInput`：Agent 被调用时会使用该方法将 `Instruction` 和 `AgentInput` 转换为调用 ChatModel 的 Messages。Agent 提供了默认的 GenModelInput 方法：
  1. 将 `Instruction` 作为 `System Message` 加到 `AgentInput.Messages` 前
  2. 将 `SessionValues` 为 variables 渲染到步骤 1 的 message list 中
- `OutputKey`：配置后，ChatModelAgent 运行产生的最后一条 Message 将会以 `OutputKey` 为 key 设置到 `SessionValues` 中
- `MaxIterations`：react 模式下 ChatModel 最大生成次数，超过时 Agent 会报错退出，默认值为 20
- `Exit`：Exit 是一个特殊的 Tool，当模型调用这个工具并执行后，ChatModelAgent 将直接退出，效果与 `ToolsConfig.ReturnDirectly` 类似。ADK 提供了一个默认 ExitTool 实现供用户使用：

```go
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

### ChatModelAgent Transfer

`ChatModelAgent` 支持将其他 Agent 的元信息转为自身的 Tool ，经由 ChatModel 判断实现动态 Transfer：

- `ChatModelAgent` 实现了 `OnSubAgents` 接口，使用 `SetSubAgents` 为 `ChatModelAgent` 设置子 Agents 后，`ChatModelAgent` 会增加一个 `Transfer Tool`，并且在 prompt 中指示 ChatModel 在需要 transfer 时调用这个 Tool 并以 transfer 目标 AgentName 作为 Tool 输入。

```go
const (
    _TransferToAgentInstruction _= `Available other agents: %s

Decision rule:
- If you're best suited for the question according to your description: ANSWER
- If another agent is better according its description: CALL '%s' function with their agent name

When transferring: OUTPUT ONLY THE FUNCTION CALL`
)

func genTransferToAgentInstruction(ctx context.Context, agents []Agent) string {
    var sb strings.Builder
    for _, agent := range agents {
       sb.WriteString(fmt.Sprintf("\n- Agent name: %s\n  Agent description: %s",
          agent.Name(ctx), agent.Description(ctx)))
    }

    return fmt.Sprintf(_TransferToAgentInstruction_, sb.String(), _TransferToAgentToolName_)
}
```

- `Transfer Tool` 运行会设置 Transfer Event，指定跳转到目标 Agent 上，完成后 ChatModelAgent 退出。
- Agent Runner 接收到 Transfer Event 后，跳转到目标 Agent 上执行，完成 Transfer 操作

### ChatModelAgent AgentAsTool

当需要被调用的 Agent 不需要完整的运行上下文，仅需要明确清晰的入参即可正确运行时，该 Agent 可以转换为 Tool 交由 `ChatModelAgent` 判断调用：

- ADK 中提供了工具方法，可以方便地将 Eino ADK Agent 转化为 Tool 供 ChatModelAgent 调用：

```go
// github.com/cloudwego/eino/adk/agent_tool.go    

func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

- 被转换为 Tool 后的 Agent 可以通过 `ToolsConfig` 直接注册在 ChatModelAgent 中

```go
bookRecommender := NewBookRecommendAgent()
bookRecommendeTool := NewAgentTool(ctx, bookRecommender)

a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{bookRecommendeTool},
        },
    },
})
```

## ChatModelAgent 使用示例

### 场景说明

创建一个图书推荐 Agent，Agent 将能够根据用户的输入推荐相关图书。


### 步骤 1: 定义工具

图书推荐 Agent 需要一个根据能够根据用户要求（题材、评分等）检索图书的工具 `book_search` 。

利用 Eino 提供的工具方法可以方便地创建（可参考[如何创建一个 tool ?](/zh/docs/eino/core_modules/components/tools_node_guide/how_to_create_a_tool)）：

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

### 步骤 2: 创建 ChatModel

Eino 提供了多种 ChatModel 封装（如 openai、gemini、doubao 等，详见 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)），这里以 openai ChatModel 为例：

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

### 步骤 3: 创建 ChatModelAgent

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


### 步骤 4: 通过 Runner 运行

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

### 运行结果

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

## ChatModelAgent 中断与恢复

### 介绍

`ChatModelAgent` 使用了 Eino Graph 实现，因此在 agent 中可以复用 Eino Graph 的 Interrupt&Resume 能力。

- Interrupt 时，通过在工具中返回特殊错误使 Graph 触发中断并向外抛出自定义信息，在恢复时 Graph 会重新运行此工具：

```go
// github.com/cloudwego/eino/adk/interrupt.go

func NewInterruptAndRerunErr(extra any) error
```

- Resume 时，支持自定义 ToolOption，用于在恢复时传递额外信息到 Tool 中：

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

### 场景说明

下面我们将基于上面【ChatModelAgent 使用示例】小节中的代码，为 `BookRecommendAgent` 增加一个工具 `ask_for_clarification`，当用户提供的信息不足以支持推荐时，Agent 将调用这个工具向用户询问更多信息，`ask_for_clarification` 使用了 Interrupt&Resume 能力来实现向用户“询问”。

### 步骤 1 : 新增 Tool 支持中断

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

### 步骤 2: 添加 Tool 到 Agent 中

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

### 步骤 3: Agent Runner 配置 CheckPointStore

在 Runner 中配置 `CheckPointStore`（例子中使用最简单的 InMemoryStore），并在调用 Agent 时传入 `CheckPointID`，用于在恢复时使用。另外，在中断时，Graph 会将 `InterruptInfo` 放入 `Interrupted.Data` 中：

```go
func newInMemoryStore() compose.CheckPointStore {
    return &inMemoryStore{
       mem: map[string][]byte{},
    }
}

func main() {
    ctx := context.Background()
    a := subagents.NewBookRecommendAgent()
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       EnableStreaming: true, // you can disable streaming here
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
          fmt.Printf("\ninterrupt happened, info: %+v\n", event.Action.Interrupted.Data.(*adk.ChatModelAgentInterruptInfo).RerunNodesExtra["ToolNode"])
          continue
       }
       msg, err := event.Output.MessageOutput.GetMessage()
       if err != nil {
          log.Fatal(err)
       }
       fmt.Printf("\nmessage:\n%v\n======\n\n", msg)
    }

    scanner := bufio.NewScanner(os.Stdin)
    fmt.Print("\nyour input here: ")
    scanner.Scan()
    fmt.Println()
    nInput := scanner.Text()

    iter, err := runner.Resume(ctx, "1", adk.WithToolOptions([]tool.Option{subagents.WithNewInput(nInput)}))
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

       prints.Event(event)
    }
}
```

### 运行结果

运行后会发生中断

```
message:
assistant: 
tool_calls:
{Index:<nil> ID:call_3HAobzkJvW3JsTmSHSBRftaG Type:function Function:{Name:ask_for_clarification Arguments:{"question":"Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?"}} Extra:map[]}

finish_reason: tool_calls
usage: &{219 37 256}
======


interrupt happened, info: &{ToolCalls:[{Index:<nil> ID:call_3HAobzkJvW3JsTmSHSBRftaG Type:function Function:{Name:ask_for_clarification Arguments:{"question":"Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?"}} Extra:map[]}] ExecutedTools:map[] RerunTools:[call_3HAobzkJvW3JsTmSHSBRftaG] RerunExtraMap:map[call_3HAobzkJvW3JsTmSHSBRftaG:Could you please specify the genre you're interested in and any preferences like maximum page length or minimum user rating?]}
your input here:
```

stdin 输入后，从 CheckPointStore 取出之前中断状态，结合补全的输入，继续运行

```
new input is:
recommend me a fiction book

message:
tool: recommend me a fiction book
tool_call_id: call_3HAobzkJvW3JsTmSHSBRftaG
tool_call_name: ask_for_clarification
======


message:
assistant: 
tool_calls:
{Index:<nil> ID:call_3fC5OqPZLls11epXMv7sZGAF Type:function Function:{Name:search_book Arguments:{"genre":"fiction","max_pages":0,"min_rating":0}} Extra:map[]}

finish_reason: tool_calls
usage: &{272 24 296}
======


message:
tool: {"Books":["God's blessing on this wonderful world!"]}
tool_call_id: call_3fC5OqPZLls11epXMv7sZGAF
tool_call_name: search_book
======


message:
assistant: I recommend the fiction book "God's Blessing on This Wonderful World!" Enjoy your reading!
finish_reason: stop
usage: &{317 20 337}
======
```

## 总结

`ChatModelAgent` 是 ADK 核心 Agent 实现，充当应用程序 "思考" 的部分，利用 LLM 强大的功能进行推理、理解自然语言、作出决策、生成相应、进行工具交互。

`ChatModelAgent` 的行为是非确定性的，通过 LLM 来动态的决定使用哪些工具，或转交控制权到其他 Agent 上。
