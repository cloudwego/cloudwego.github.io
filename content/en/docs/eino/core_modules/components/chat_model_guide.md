---
Description: ""
date: "2025-05-07"
lastmod: ""
tags: []
title: 'Eino: ChatModel guide'
weight: 0
---

## **Basic Introduction**

The Model component is used to interact with large language models (LLM). Its primary function is to send user input messages to the language model and obtain the model's response. This component plays an important role in the following scenarios:

- Natural language dialogue
- Text generation and completion
- Parameter generation for tool invocation
- Multimodal interaction (text, image, audio, etc.)

## **Component Definition**

### **Interface Definition**

> Code Location: eino/components/model/interface.go

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

#### **Generate Method**

- Function: Generates a complete model response
- Parameters:
  - ctx: Context object for passing request-level information and Callback Manager
  - input: List of input messages
  - opts: Optional parameters to configure model behavior
- Return values:
  - `*schema.Message`: The response message generated by the model
  - error: Error information during the generation process

#### **Stream Method**

- Function: Generates model response in a streaming manner
- Parameters: Same as the Generate method
- Return values:
  - `*schema.StreamReader[*schema.Message]`: Stream reader for model response
  - error: Error information during the generation process

#### **WithTools Method**

- Function: Binds available tools to the model
- Parameters:
  - tools: List of tool information
- Return values:
  - ToolCallingChatModel:  chatmodel that with tools info
  - error: Error information during the binding process

### **Message Structure**

> Code Location: eino/schema/message.go

```go
type Message struct {
    // Role indicates the role of the message (system/user/assistant/tool)
    Role RoleType
    // Content is the text content of the message
    Content string
    // MultiContent is multimodal content supporting text, image, audio, etc.
    MultiContent []ChatMessagePart
    // Name is the name of the message sender
    Name string
    // ToolCalls is the tool invocation information in assistant messages
    ToolCalls []ToolCall
    // ToolCallID is the tool invocation ID in tool messages
    ToolCallID string
    // ResponseMeta contains meta-information about the response
    ResponseMeta *ResponseMeta
    // Extra is used to store additional information
    Extra map[string]any
}
```

The `Message` structure is the basic structure for model interaction, supporting:

- Multiple roles: system, user, assistant (AI), tool
- Multimodal content: text, image, audio, video, file
- Tool invocation: supports model calling external tools and functions
- Meta-information: includes reasons for the response, token usage statistics, etc.

### **Common Options**

The Model component provides a set of common options to configure model behavior:

> Code Location: eino/components/model/option.go

```go
type Options struct {
    // Temperature controls the randomness of the output
    Temperature *float32
    // MaxTokens controls the maximum number of tokens generated
    MaxTokens *int
    // Model specifies the name of the model used
    Model *string
    // TopP controls the diversity of the output
    TopP *float32
    // Stop specifies the conditions to stop generation
    Stop []string
}
```

Options can be set in the following way:

```go
// Set temperature
WithTemperature(temperature float32) Option

// Set maximum token count
WithMaxTokens(maxTokens int) Option

// Set model name
WithModel(name string) Option

// Set top_p value
WithTopP(topP float32) Option

// Set stop words
WithStop(stop []string) Option
```

## **How to Use**

### **Use Alone**

```go
import (
    "context"
    "fmt"
    "io"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

// Initialize the model (using OpenAI as an example)
cm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
    // Configuration parameters
})

// Prepare input messages
messages := []*schema.Message{
    {
       Role:    schema.System,
       Content: "You are a helpful assistant.",
    },
    {
       Role:    schema.User,
       Content: "Hello!",
    },
}

// Generate response
response, err := cm.Generate(ctx, messages, model.WithTemperature(0.8))

// Handle response
fmt.Print(response.Content)

// Stream generation
streamResult, err := cm.Stream(ctx, messages)

defer streamResult.Close()

for {
    chunk, err := streamResult.Recv()
    if err == io.EOF {
       break
    }
    if err != nil {
       // Error handling
    }
    // Handle response chunk
    fmt.Print(chunk.Content)
}
```

### **Use in Orchestration**

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

## **Using Option and Callback**

### **Option Usage Example**

```go
import "github.com/cloudwego/eino/components/model"

// Use Option
response, err := cm.Generate(ctx, messages,
    model.WithTemperature(0.7),
    model.WithMaxTokens(2000),
    model.WithModel("gpt-4"),
)
```

### **Callback Usage Example**

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

// Create callback handler
handler := &callbacksHelper.ModelCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *model.CallbackInput) context.Context {
       fmt.Printf("Generation started, number of input messages: %d\n", len(input.Messages))
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
       fmt.Printf("Generation completed, Token usage: %+v\n", output.TokenUsage)
       return ctx
    },
    OnEndWithStreamOutput: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[*model.CallbackOutput]) context.Context {
       fmt.Println("Receiving streaming output")
       defer output.Close()
       return ctx
    },
}

// Use callback handler
helper := callbacksHelper.NewHandlerHelper().
    ChatModel(handler).
    Handler()

/*** compose a chain
* chain := NewChain
* chain.appendxxx().
*       appendxxx().
*       ...
*/

// Use at runtime
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, messages, compose.WithCallbacks(helper))
```

## **Existing Implementations**

1. OpenAI ChatModel: Use OpenAI's GPT series models [ChatModel - OpenAI](/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
2. Ollama ChatModel: Use Ollama local models [ChatModel - Ollama](/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
3. ARK ChatModel: Use ARK platform's model service [ChatModel - ARK](/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
4. See more implementation at: [Eino ChatModel](https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model/)

## **Self-Implementation Reference**

When implementing a custom ChatModel component, you need to pay attention to the following points:

1. Make sure to implement common options
2. Ensure the callback mechanism is implemented
3. Remember to close the writer after completing the output during streaming

### **Option Mechanism**

When customizing ChatModel, if you need options other than the common ones, you can use the component abstraction utility functions to implement custom options, for example:

```go
import (
    "time"

    "github.com/cloudwego/eino/components/model"
)

// Define the Option struct
type MyChatModelOptions struct {
    Options    *model.Options
    RetryCount int
    Timeout    time.Duration
}

// Define Option functions
func WithRetryCount(count int) model.Option {
    return model.WrapImplSpecificOptFn(func(o *MyChatModelOptions) {
       o.RetryCount = count
    })
}

func WithTimeout(timeout time.Duration) model.Option {
    return model.WrapImplSpecificOptFn(func(o *MyChatModelOptions) {
       o.Timeout = timeout
    })
}
```

### **Callback Handling**

ChatModel implementation needs to trigger callbacks at appropriate times. The following structures are defined by the ChatModel component:

```go
import (
    "github.com/cloudwego/eino/schema"
)

// Define callback input and output
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

### **Complete Implementation Example**

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

type MyChatModelConfig struct {
    APIKey string
}

func NewMyChatModel(config *MyChatModelConfig) (*MyChatModel, error) {
    if config.APIKey == "" {
       return nil, errors.New("api key is required")
    }

    return &MyChatModel{
       client: &http.Client{},
       apiKey: config.APIKey,
    }, nil
}

func (m *MyChatModel) Generate(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // 1. Handle options
    options := &MyChatModelOptions{
       Options: &model.Options{
          Model: &m.model,
       },
       RetryCount: m.retryCount,
       Timeout:    m.timeout,
    }
    options.Options = model.GetCommonOptions(options.Options, opts...)
    options = model.GetImplSpecificOptions(options, opts...)

    // 2. Callback before starting generation
    ctx = callbacks.OnStart(ctx, &model.CallbackInput{
       Messages: messages,
       Config: &model.Config{
          Model: *options.Options.Model,
       },
    })

    // 3. Execute generation logic
    response, err := m.doGenerate(ctx, messages, options)

    // 4. Handle errors and end callback
    if err != nil {
       ctx = callbacks.OnError(ctx, err)
       return nil, err
    }

    ctx = callbacks.OnEnd(ctx, &model.CallbackOutput{
       Message: response,
    })

    return response, nil
}

func (m *MyChatModel) Stream(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    // 1. Handle options
    options := &MyChatModelOptions{
       Options: &model.Options{
          Model: &m.model,
       },
       RetryCount: m.retryCount,
       Timeout:    m.timeout,
    }
    options.Options = model.GetCommonOptions(options.Options, opts...)
    options = model.GetImplSpecificOptions(options, opts...)

    // 2. Callback before starting streaming generation
    ctx = callbacks.OnStart(ctx, &model.CallbackInput{
       Messages: messages,
       Config: &model.Config{
          Model: *options.Options.Model,
       },
    })

    // 3. Create Streaming Response
    // Pipe creates a StreamReader and a StreamWriter, writing to the StreamWriter can be read from the StreamReader, and both are thread-safe.
    // Implement asynchronous writing to the StreamWriter with the generated content, returning the StreamReader as the result
    // ***StreamReader is a data stream that can only be read once. When implementing the callback by yourself, it is necessary to pass the data stream to the callback through OnEndWithCallbackOutput and also return the data stream, requiring a copy of the data stream
    // Considering that such scenarios always require copying the data stream, the OnEndWithCallbackOutput function will internally copy and return an unread stream
    // The following code demonstrates a streaming processing method, but it is not the only way
    sr, sw := schema.Pipe[*model.CallbackOutput](1)

    // 4. Start Asynchronous Generation
    go func() {
       defer sw.Close()

       // Stream writing
       m.doStream(ctx, messages, options, sw)
    }()

    // 5. Complete Callback
    _, nsr := callbacks.OnEndWithStreamOutput(ctx, sr)

    return schema.StreamReaderWithConvert(nsr, func(t *model.CallbackOutput) (*schema.Message, error) {
       return t.Message, nil
    }), nil
}

func (m *MyChatModel) BindTools(tools []*schema.ToolInfo) error {
    // Implement tool binding logic
    return nil
}

func (m *MyChatModel) doGenerate(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions) (*schema.Message, error) {
    // Implement generation logic
    return nil, nil
}

func (m *MyChatModel) doStream(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions, sr *schema.StreamWriter[*model.CallbackOutput]) {
    // Stream generate text written into sr
    return
}
```
