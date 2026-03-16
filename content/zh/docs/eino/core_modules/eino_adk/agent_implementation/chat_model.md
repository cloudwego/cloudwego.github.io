---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: ChatModelAgent
weight: 1
---

# ChatModelAgent 概述

## Import Path

`import ``github.com/cloudwego/eino/adk`

## 什么是 ChatModelAgent

`ChatModelAgent` 是 Eino ADK 中的一个核心预构建 的 Agent，它封装了与大语言模型（LLM）进行交互、并支持使用工具来完成任务的复杂逻辑。

## ChatModelAgent ReAct 模式

`ChatModelAgent` 内使用了 [ReAct](https://react-lm.github.io/) 模式，该模式旨在通过让 ChatModel 进行显式的、一步一步的“思考”来解决复杂问题。为 `ChatModelAgent` 配置了工具后，它在内部的执行流程就遵循了 ReAct 模式：

- 调用 ChatModel（Reason）
- LLM 返回工具调用请求（Action）
- ChatModelAgent 执行工具（Act）
- 它将工具结果返回给 ChatModel（Observation），然后开始新的循环，直到 ChatModel 判断不需要调用 Tool 结束。

当没有配置工具时，`ChatModelAgent` 退化为一次 ChatModel 调用。

<a href="/img/eino/eino_adk_chat_model_agent_view.png" target="_blank"><img src="/img/eino/eino_adk_chat_model_agent_view.png" width="100%" /></a>

可以通过 ToolsConfig 为 ChatModelAgent 配置 Tool：

```go
// github.com/cloudwego/eino/adk/chatmodel.go

type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
    
    // EmitInternalEvents indicates whether internal events from agentTool should be emitted
    // to the parent generator via a tool option injection at run-time.
    EmitInternalEvents bool
}
```

ToolsConfig 复用了 Eino Graph ToolsNodeConfig，详细参考：[Eino: ToolsNode&Tool 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)。额外提供了 ReturnDirectly 配置，ChatModelAgent 调用配置在 ReturnDirectly 中的 Tool 后会直接退出。

## ChatModelAgent 配置字段

> 💡
> 注意：GenModelInput 默认情况下，会通过 adk.GetSessionValues() 并以 F-String 的格式渲染 Instruction，如需关闭此行为，可定制 GenModelInput 方法。

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
    
    // ModelRetryConfig configures retry behavior for the ChatModel.
    // When set, the agent will automatically retry failed ChatModel calls
    // based on the configured policy.
    // Optional. If nil, no retry will be performed.
    ModelRetryConfig *ModelRetryConfig
}

type ToolsConfig struct {
    compose.ToolsNodeConfig

    // Names of the tools that will make agent return directly when the tool is called.
    // When multiple tools are called and more than one tool is in the return directly list, only the first one will be returned.
    ReturnDirectly map[string]bool
    
    // EmitInternalEvents indicates whether internal events from agentTool should be emitted
    // to the parent generator via a tool option injection at run-time.
    EmitInternalEvents bool
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
  - EmitInternalEvents：当通过 adk.AgentTool() 将一个 Agent 通过 ToolCall 的形式当成 SubAgent 时，默认情况下，这个 SubAgent 不会发送 AgentEvent，只将最终结果作为 ToolResult 返回。
- `GenModelInput`：Agent 被调用时会使用该方法将 `Instruction` 和 `AgentInput` 转换为调用 ChatModel 的 Messages。Agent 提供了默认的 GenModelInput 方法：
  1. 将 `Instruction` 作为 `System Message` 加到 `AgentInput.Messages` 前
  2. 将 `SessionValues` 为 variables 渲染到步骤 1 的 message list 中

> 💡
> 默认的 `GenModelInput` 使用 pyfmt 渲染，message list 中的文本会被作为 pyfmt 模板，这意味着文本中的 '{' 与 '}' 都会被视为关键字，如果希望直接输入这两个字符，需要进行转义 '{{'、'}}'

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

- `ModelRetryConfig`: 配置后，ChatModel 请求过程中发生的各种错误（包括直接返回错误、流式响应过程中发生错误等），都会按照配置的策略选择是否以及何时进行重试。如果是流式响应过程中发生错误，则这一次流式响应依然会第一时间通过 AgentEvent 的形式返回出去。如果这次流式响应过程中的错误，按照配置的策略，会进行重试，则消费 AgentEvent 中的 message stream，会得到 `WillRetryError`。用户可以处理这个 error，做对应的上屏展示等处理，示例如下：

```go
iterator := agent.Run(ctx, input)
for {
    event, ok := iterator.Next()
    if !ok {
        break
    }
    
    if event.Err != nil {
        handleFinalError(event.Err)
        break
    }
    
    // Process streaming output
    if event.Output != nil && event.Output.MessageOutput.IsStreaming {
        stream := event.Output.MessageOutput.MessageStream
        for {
            msg, err := stream.Recv()
            if err == io.EOF {
                break  // Stream completed successfully
            }
            if err != nil {
                // Check if this error will be retried (more streams coming)
                var willRetry *adk.WillRetryError
                if errors.As(err, &willRetry) {
                    log.Printf("Attempt %d failed, retrying...", willRetry.RetryAttempt)
                    break  // Wait for next event with new stream
                }
                // Original error - won't retry, agent will stop and the next AgentEvent probably will be an error
                log.Printf("Final error (no retry): %v", err)
                break
            }
            // Display chunk to user
            displayChunk(msg)
        }
    }
}
```

## ChatModelAgent Transfer

`ChatModelAgent` 支持将其他 Agent 的元信息转为自身的 Tool ，经由 ChatModel 判断实现动态 Transfer：

- `ChatModelAgent` 实现了 `OnSubAgents` 接口，使用 `SetSubAgents` 为 `ChatModelAgent` 设置子 Agents 后，`ChatModelAgent` 会增加一个 `Transfer Tool`，并且在 prompt 中指示 ChatModel 在需要 transfer 时调用这个 Tool 并以 transfer 目标 AgentName 作为 Tool 输入。

```go
const (
    TransferToAgentInstruction = `Available other agents: %s

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

    return fmt.Sprintf(TransferToAgentInstruction, sb.String(), TransferToAgentToolName)
}
```

- `Transfer Tool` 运行会设置 Transfer Event，指定跳转到目标 Agent 上，完成后 ChatModelAgent 退出。
- Agent Runner 接收到 Transfer Event 后，跳转到目标 Agent 上执行，完成 Transfer 操作

## ChatModelAgent AgentAsTool

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

## ChatModelAgent Middleware

`ChatModelAgentMiddleware` 是 `ChatModelAgent` 的扩展机制，允许开发者在 Agent 执行的各个阶段注入自定义逻辑：

<a href="/img/eino/TXVlwT7Iohh1EtbEeC6cIptxnZd.png" target="_blank"><img src="/img/eino/TXVlwT7Iohh1EtbEeC6cIptxnZd.png" width="100%" /></a>

`ChatModelAgentMiddleware` 定义为 interface，开发者可以实现此 interface 并通过配置到 `ChatModelAgentConfig` 使其在 `ChatModelAgent` 中生效：

```go
type ChatModelAgentMiddleware interface {
    // ...
}

a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Handlers: []adk.ChatModelAgentMiddleware{
        &MyMiddleware{},
    },
})
```

**使用 BaseChatModelAgentMiddleware**

`BaseChatModelAgentMiddleware` 提供所有方法的默认空实现。通过嵌入它，可以只覆盖需要的方法：

```go
type MyMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
    // 自定义字段
    logger *log.Logger
}

// 只需覆盖需要的方法
func (m *MyMiddleware) BeforeModelRewriteState(
    ctx context.Context, 
    state *adk.ChatModelAgentState, 
    mc *adk.ModelContext,
) (context.Context, *adk.ChatModelAgentState, error) {
    m.logger.Printf("Messages count: %d", len(state.Messages))
    return ctx, state, nil
}
```

### BeforeAgent

在每次 Agent 运行前调用，可用于修改指令和工具配置。ChatModelAgentContext 定义了 BeforeAgent 中可读写的内容：

```go
type ChatModelAgentContext struct {
    // InstructionAgent 是当前 Agent 的指令
    Instruction string
    // Tools 是当前配置的原始工具列表
    Tools []tool.BaseTool
    // ReturnDirectly 配置调用后直接返回的工具名称集合
    ReturnDirectly map[string]bool
}

type ChatModelAgentMiddleware interface {
    // ...
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)
    // ...
}
```

例子：

```go
func (m *MyMiddleware) BeforeAgent(
    ctx context.Context, 
    runCtx *adk.ChatModelAgentContext,
) (context.Context, *adk.ChatModelAgentContext, error) {
    // 拷贝 runCtx，避免修改输入
    nRunCtx := *runCtx
    
    // 修改指令
    nRunCtx.Instruction += "\n\n请始终使用中文回复。"
    
    // 添加工具
    nRunCtx.Tools = append(runCtx.Tools, myCustomTool)
    
    // 设置工具直接返回
    nRunCtx.ReturnDirectly["my_tool"] = true
    
    return ctx, &nRunCtx, nil
}
```

### BeforeModelRewriteState / AfterModelRewriteState

在每次模型调用前/后调用，可用于检查和修改消息历史。ModelContext 定义了只读内容，ChatModelAgentState 定义了可读写内容：

```go
type ModelContext struct {
    // Tools 包含当前配置给 Agent 的工具列表
    // 在请求时填充，包含将要发送给模型的工具信息
    Tools []*schema.ToolInfo

    // ModelRetryConfig 包含模型的重试配置
    // 从 Agent 的 ModelRetryConfig 填充
    ModelRetryConfig *ModelRetryConfig
}

type ChatModelAgentState struct {
    // Messages 包含当前会话中的所有消息
    Messages []Message
}

type ChatModelAgentMiddleware interface {
    BeforeModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)
    AfterModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)
}
```

例子：

```go
func (m *MyMiddleware) BeforeModelRewriteState(
    ctx context.Context,
    state *adk.ChatModelAgentState,
    mc *adk.ModelContext,
) (context.Context, *adk.ChatModelAgentState, error) {
    // 拷贝 state，避免修改入参
    nState := *state
    
    // 检查消息历史
    if len(state.Messages) > 50 {
        // 截断过旧的消息
        nState.Messages = state.Messages[len(state.Messages)-50:]
    }
    return ctx, &nState, nil
}

func (m *MyMiddleware) AfterModelRewriteState(
    ctx context.Context,
    state *adk.ChatModelAgentState,
    mc *adk.ModelContext,
) (context.Context, *adk.ChatModelAgentState, error) {
    // 模型响应是最后一条消息
    lastMsg := state.Messages[len(state.Messages)-1]
    m.logger.Printf("Model response: %s", lastMsg.Content)
    return ctx, state, nil
}
```

### WrapModel

包装模型调用，可用于拦截和修改模型的输入输出：

```go
type ChatModelAgentMiddleware interface {
    WrapModel(ctx context.Context, m model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error)
}
```

例子：

```go
func (m *MyMiddleware) WrapModel(
    ctx context.Context,
    chatModel model.BaseChatModel,
    mc *adk.ModelContext,
) (model.BaseChatModel, error) {
    return &loggingModel{
        inner: chatModel,
        logger: m.logger,
    }, nil
}

type loggingModel struct {
    inner  model.BaseChatModel
    logger *log.Logger
}

func (m *loggingModel) Generate(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    m.logger.Printf("Input messages: %d", len(msgs))
    resp, err := m.inner.Generate(ctx, msgs, opts...)
    m.logger.Printf("Output: %v, error: %v", resp != nil, err)
    return resp, err
}

func (m *loggingModel) Stream(ctx context.Context, msgs []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    return m.inner.Stream(ctx, msgs, opts...)
}
```

### WrapInvokableToolCall / WrapStreamableToolCall

包装工具调用，可用于拦截和修改工具的输入输出：

```go
// InvokableToolCallEndpoint 是工具调用的函数签名。
// Middleware 开发者围绕这个 Endpoint 添加自定义逻辑。
type InvokableToolCallEndpoint func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error)

// StreamableToolCallEndpoint 是流式工具调用的函数签名。
// Middleware 开发者围绕这个 Endpoint 添加自定义逻辑。
type StreamableToolCallEndpoint func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (*schema.StreamReader[string], error)

type ToolContext struct {
    // Name 说明了本次调用工具的名称
    Name   string
    // CallID 说明了本次调用工具的 ToolCallID
    CallID string
}

type ChatModelAgentMiddleware interface {
    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)
}
```

例子：

```go
func (m *MyMiddleware) WrapInvokableToolCall(
    ctx context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    tCtx *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
        m.logger.Printf("Calling tool: %s (ID: %s)", tCtx.Name, tCtx.CallID)
        start := time.Now()
        
        result, err := endpoint(ctx, argumentsInJSON, opts...)
        
        m.logger.Printf("Tool %s completed in %v", tCtx.Name, time.Since(start))
        return result, err
    }, nil
}
```

# ChatModelAgent 使用示例

## 场景说明

创建一个图书推荐 Agent，Agent 将能够根据用户的输入推荐相关图书。

## 代码实现

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

### 

### 步骤 4: 通过 Runner 运行

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/adk"

    "github.com/cloudwego/eino-examples/adk/intro/chatmodel/subagents"
)

func main() {
    ctx := context.Background()
    a := subagents.NewBookRecommendAgent()
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

## 运行结果

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

# ChatModelAgent 中断与恢复

## 介绍

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

## 示例

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
          // Tool 内部通过 AgentTool() 调用 SubAgent 时，是否将这个 SubAgent 的 AgentEvent 输出
          EmitInternalEvents: true,
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

# 总结

`ChatModelAgent` 是 ADK 核心 Agent 实现，充当应用程序 "思考" 的部分，利用 LLM 强大的功能进行推理、理解自然语言、作出决策、生成相应、进行工具交互。

`ChatModelAgent` 的行为是非确定性的，通过 LLM 来动态的决定使用哪些工具，或转交控制权到其他 Agent 上。
