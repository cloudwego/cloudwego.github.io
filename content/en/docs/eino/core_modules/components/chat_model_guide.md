---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: 'Eino: ChatModel Guide'
weight: 1
---

## Overview

The `Model` component enables interaction with large language models. It sends user messages to the model and receives responses. It’s essential for:

- Natural-language dialogues
- Text generation and completion
- Generating tool-call parameters
- Multimodal interactions (text, image, audio, etc.)

## Component Definition

### Interfaces

> Code: `eino/components/model/interface.go`

```go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
        *schema.StreamReader[*schema.Message], error)
}

type ToolCallingChatModel interface {
    BaseChatModel

    // WithTools returns a new ToolCallingChatModel instance with the specified tools bound.
    // This method does not modify the current instance, making it safer for concurrent use.
    WithTools(tools []*schema.ToolInfo) (ToolCallingChatModel, error)
}
```

#### Generate

- Purpose: produce a complete model response
- Params:
  - `ctx`: context for request-scoped info and callback manager
  - `input`: list of input messages
  - `opts`: options to configure model behavior
- Returns:
  - `*schema.Message`: the generated response
  - `error`: if generation fails

#### Stream

- Purpose: produce a response as a stream
- Params: same as `Generate`
- Returns:
  - `*schema.StreamReader[*schema.Message]`: stream reader for response chunks
  - `error`

#### WithTools

- Purpose: bind available tools to the model
- Params:
  - `tools`: list of tool info definitions
- Returns:
  - `ToolCallingChatModel`: a model instance with tools bound
  - `error`

### Message Struct

> Code: `eino/schema/message.go`

```go
type Message struct {
    // Role indicates system/user/assistant/tool
    Role RoleType
    // Content is textual content
    Content string
    // MultiContent is deprecated; use UserInputMultiContent
    // Deprecated
    // MultiContent []ChatMessagePart
    // UserInputMultiContent holds multimodal user inputs (text, image, audio, video, file)
    // Use only for user-role messages
    UserInputMultiContent []MessageInputPart
    // AssistantGenMultiContent holds multimodal outputs from the model
    // Use only for assistant-role messages
    AssistantGenMultiContent []MessageOutputPart
    // Name of the sender
    Name string
    // ToolCalls in assistant messages
    ToolCalls []ToolCall
    // ToolCallID for tool messages
    ToolCallID string
    // ResponseMeta contains metadata
    ResponseMeta *ResponseMeta
    // Extra for additional information
    Extra map[string]any
}
```

Message supports:

- Roles: `system`, `user`, `assistant`, `tool`
- Multimodal content: text, image, audio, video, file
- Tool calls and function invocation
- Metadata (reasoning, token usage, etc.)

### Common Options

> Code: `eino/components/model/option.go`

```go
type Options struct {
    // Temperature controls randomness
    Temperature *float32
    // MaxTokens caps output tokens
    MaxTokens *int
    // Model selects a model name
    Model *string
    // TopP controls diversity
    TopP *float32
    // Stop lists stop conditions
    Stop []string
}
```

Use options as:

```go
// Set temperature
WithTemperature(temperature float32) Option

// Set max tokens
WithMaxTokens(maxTokens int) Option

// Set model name
WithModel(name string) Option

// Set top_p
WithTopP(topP float32) Option

// Set stop words
WithStop(stop []string) Option
```

## Usage

### Standalone

```go
import (
    "context"
    "fmt"
    "io"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

// Initialize model (OpenAI example)
cm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
    // config
})

// Prepare messages
messages := []*schema.Message{
    { Role: schema.System, Content: "你是一个有帮助的助手。" },
    { Role: schema.User, Content: "你好！" },
}

// Generate response
response, err := cm.Generate(ctx, messages, model.WithTemperature(0.8))
fmt.Print(response.Content)

// Stream response
streamResult, err := cm.Stream(ctx, messages)
defer streamResult.Close()
for {
    chunk, err := streamResult.Recv()
    if err == io.EOF { break }
    if err != nil { /* handle error */ }
    fmt.Print(chunk.Content)
}
```

### In Orchestration

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino/compose"
)

/*** Initialize ChatModel
* cm, err := xxx
*/

// Use in Chain
c := compose.NewChain[[]*schema.Message, *schema.Message]()
c.AppendChatModel(cm)

// Use in Graph
g := compose.NewGraph[[]*schema.Message, *schema.Message]()
g.AddChatModelNode("model_node", cm)
```

## Options and Callbacks

### Options Example

```go
import "github.com/cloudwego/eino/components/model"

response, err := cm.Generate(ctx, messages,
    model.WithTemperature(0.7),
    model.WithMaxTokens(2000),
    model.WithModel("gpt-4"),
)
```

### Callback Example

```go
import (
    "context"
    "fmt"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
)

// define callback handler
handler := &callbacksHelper.ModelCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *model.CallbackInput) context.Context {
        fmt.Printf("start, input messages: %d\n", len(input.Messages))
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
        fmt.Printf("end, token usage: %+v\n", output.TokenUsage)
        return ctx
    },
    OnEndWithStreamOutput: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[*model.CallbackOutput]) context.Context {
        fmt.Println("stream started")
        defer output.Close()
        for {
            chunk, err := output.Recv()
            if errors.Is(err, io.EOF) { break }
            if err != nil { fmt.Printf("stream read error: %v\n", err); break }
            if chunk == nil || chunk.Message == nil { continue }
            if len(chunk.Message.ToolCalls) > 0 {
                for _, tc := range chunk.Message.ToolCalls {
                    fmt.Printf("ToolCall detected, arguments: %s\n", tc.Function.Arguments)
                }
            }
        }
        return ctx
    },
}

// use callback handler
helper := callbacksHelper.NewHandlerHelper().
    ChatModel(handler).
    Handler()

chain := compose.NewChain[[]*schema.Message, *schema.Message]()
chain.AppendChatModel(cm)
run, _ := chain.Compile(ctx)
result, _ := run.Invoke(ctx, messages, compose.WithCallbacks(helper))
```

## Existing Implementations

1. OpenAI ChatModel: [ChatModel — OpenAI](/en/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
2. Ollama ChatModel: [ChatModel — Ollama](/en/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
3. Ark ChatModel: [ChatModel — Ark](/en/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
4. More: [Eino ChatModel](/en/docs/eino/ecosystem_integration/chat_model/)

## Implementation Notes

1. Implement common options and any provider‑specific options
2. Implement callbacks correctly for both Generate and Stream
3. Close the stream writer after streaming completes to avoid resource leaks

### Option Mechanism

Custom ChatModels can define additional options beyond common `model.Options` using helper wrappers:

```go
import (
    "time"
    "github.com/cloudwego/eino/components/model"
)

type MyChatModelOptions struct {
    Options    *model.Options
    RetryCount int
    Timeout    time.Duration
}

func WithRetryCount(count int) model.Option {
    return model.WrapImplSpecificOptFn(func(o *MyChatModelOptions) { o.RetryCount = count })
}

func WithTimeout(timeout time.Duration) model.Option {
    return model.WrapImplSpecificOptFn(func(o *MyChatModelOptions) { o.Timeout = timeout })
}
```

### Callback Handling

ChatModel implementations should trigger callbacks at appropriate times. Structures defined by the component:

```go
import "github.com/cloudwego/eino/schema"

type CallbackInput struct {
    Messages    []*schema.Message
    Model       string
    Temperature *float32
    MaxTokens   *int
    Extra       map[string]any
}

type CallbackOutput struct {
    Message    *schema.Message
    TokenUsage *schema.TokenUsage
    Extra      map[string]any
}
```

### Complete Implementation Example

```go
import (
    "context"
    "errors"
    "net/http"
    "time"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

type MyChatModel struct {
    client     *http.Client
    apiKey     string
    baseURL    string
    model      string
    timeout    time.Duration
    retryCount int
}

type MyChatModelConfig struct { APIKey string }

func NewMyChatModel(config *MyChatModelConfig) (*MyChatModel, error) {
    if config.APIKey == "" { return nil, errors.New("api key is required") }
    return &MyChatModel{ client: &http.Client{}, apiKey: config.APIKey }, nil
}

func (m *MyChatModel) Generate(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    options := &MyChatModelOptions{
        Options: &model.Options{ Model: &m.model },
        RetryCount: m.retryCount,
        Timeout:    m.timeout,
    }
    options.Options = model.GetCommonOptions(options.Options, opts...)
    options = model.GetImplSpecificOptions(options, opts...)

    ctx = callbacks.OnStart(ctx, &model.CallbackInput{
        Messages: messages,
        Config: &model.Config{
            Model: *options.Options.Model,
        },
    })

    response, err := m.doGenerate(ctx, messages, options)
    if err != nil { callbacks.OnError(ctx, err); return nil, err }

    callbacks.OnEnd(ctx, &model.CallbackOutput{ Message: response })
    return response, nil
}

func (m *MyChatModel) Stream(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    options := &MyChatModelOptions{
        Options: &model.Options{ Model: &m.model },
        RetryCount: m.retryCount,
        Timeout:    m.timeout,
    }
    options.Options = model.GetCommonOptions(options.Options, opts...)
    options = model.GetImplSpecificOptions(options, opts...)

    ctx = callbacks.OnStart(ctx, &model.CallbackInput{
        Messages: messages,
        Config: &model.Config{
            Model: *options.Options.Model,
        },
    })

    // Pipe produces a StreamReader and StreamWriter; writes to the writer are readable from the reader
    sr, sw := schema.Pipe[*model.CallbackOutput](1)

    // Asynchronously generate and write to the stream
    go func() {
        defer sw.Close()
        m.doStream(ctx, messages, options, sw)
    }()

    // Copy stream for callbacks and return a fresh reader
    _, nsr := callbacks.OnEndWithStreamOutput(ctx, sr)
    return schema.StreamReaderWithConvert(nsr, func(t *model.CallbackOutput) (*schema.Message, error) { return t.Message, nil }), nil
}

func (m *MyChatModel) WithTools(tools []*schema.ToolInfo) (model.ToolCallingChatModel, error) {
    return nil, nil
}

func (m *MyChatModel) doGenerate(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions) (*schema.Message, error) {
    return nil, nil
}

func (m *MyChatModel) doStream(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions, sw *schema.StreamWriter[*model.CallbackOutput]) {}
```
