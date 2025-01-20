---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: 'Eino: ChatModel 使用说明'
weight: 0
---

## **基本介绍**

Model 组件是一个用于与大语言模型交互的组件。它的主要作用是将用户的输入消息发送给语言模型，并获取模型的响应。这个组件在以下场景中发挥重要作用：

- 自然语言对话
- 文本生成和补全
- 工具调用的参数生成
- 多模态交互（文本、图片、音频等）

## **组件定义**

### **接口定义**

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
    BindTools(tools []*schema.ToolInfo) error
}
```

#### **Generate 方法**

- 功能：生成完整的模型响应
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - input：输入消息列表
  - opts：可选参数，用于配置模型行为
- 返回值：
  - `*schema.Message`：模型生成的响应消息
  - error：生成过程中的错误信息

#### **Stream 方法**

- 功能：以流式方式生成模型响应
- 参数：与 Generate 方法相同
- 返回值：
- _*schema.StreamReader[*schema.Message]__：模型响应的流式读取器_
- error：生成过程中的错误信息

#### **BindTools 方法**

- 功能：为模型绑定可用的工具
- 参数：
  - tools：工具信息列表
- 返回值：
  - error：绑定过程中的错误信息

### **Message 结构体 **

```go
type Message struct {
    // Role 表示消息的角色（system/user/assistant/tool）
    Role RoleType
    // Content 是消息的文本内容
    Content string
    // MultiContent 是多模态内容，支持文本、图片、音频等
    MultiContent []ChatMessagePart
    // Name 是消息的发送者名称
    Name string
    // ToolCalls 是 assistant 消息中的工具调用信息
    ToolCalls []ToolCall
    // ToolCallID 是 tool 消息的工具调用 ID
    ToolCallID string
    // ResponseMeta 包含响应的元信息
    ResponseMeta *ResponseMeta
    // Extra 用于存储额外信息
    Extra map[string]any
}
```

Message 结构体是模型交互的基本结构，支持：

- 多种角色：system（系统）、user（用户）、assistant（ai）、tool（工具）
- 多模态内容：文本、图片、音频、视频、文件
- 工具调用：支持模型调用外部工具和函数
- 元信息：包含响应原因、token 使用统计等

### **公共 Option**

Model 组件提供了一组公共 Option 用于配置模型行为：

```go
type Options struct {
    // Temperature 控制输出的随机性
    Temperature *float32
    // MaxTokens 控制生成的最大 token 数量
    MaxTokens *int
    // Model 指定使用的模型名称
    Model *string
    // TopP 控制输出的多样性
    TopP *float32
    // Stop 指定停止生成的条件
    Stop []string
}
```

可以通过以下方式设置 Option：

```go
// 设置温度
WithTemperature(temperature float32) Option

// 设置最大 token 数
WithMaxTokens(maxTokens int) Option

// 设置模型名称
WithModel(name string) Option

// 设置 top_p 值
WithTopP(topP float32) Option

// 设置停止词
WithStop(stop []string) Option
```

## **使用方式**

### **单独使用**

```go
// 初始化模型 (以openai为例)
model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
    // 配置参数
})
if err != nil {
    return err
}

// 准备输入消息
messages := []*schema.Message{
    {
        Role:    schema.System,
        Content: "你是一个有帮助的助手。",
    },
    {
        Role:    schema.User,
        Content: "你好！",
    },
}

// 生成响应
response, err := model.Generate(ctx, messages, model.WithTemperature(0.8))
if err != nil {
    return err
}

// 流式生成
stream, err := model.Stream(ctx, messages)
if err != nil {
    return err
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        return err
    }
    // 处理响应片段
    fmt.Print(chunk.Content)
}
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[[]*schema.Message, *schema.Message]()
chain.AppendChatModel(model)

// 编译并运行
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, messages)

// 在 Graph 中使用
graph := compose.NewGraph[[]*schema.Message, *schema.Message]()
graph.AddChatModelNode("model_node", model)
```

## **Option 和 Callback 使用**

### **Option 使用示例**

```go
// 使用 Option
response, err := model.Generate(ctx, messages,
    model.WithTemperature(0.7),
    model.WithMaxTokens(2000),
    model.WithModel("gpt-4"),
)
```

### **Callback 使用示例**

```go
// 创建 callback handler
handler := &model.CallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *model.CallbackInput) context.Context {
        fmt.Printf("开始生成，输入消息数量: %d\n", len(input.Messages))
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
        fmt.Printf("生成完成，Token 使用情况: %+v\n", output.TokenUsage)
        return ctx
    },
    OnEndWithStreamOutput: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[*model.CallbackOutput]) context.Context {
        fmt.Println("开始接收流式输出")
        return ctx
    },
}

// 使用 callback handler
helper := template.NewHandlerHelper().
    ChatModel(handler).
    Handler()

// 在运行时使用
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, messages, compose.WithCallbacks(helper))
```

## **已有实现**

1. OpenAI ChatModel: 使用 OpenAI 的 GPT 系列模型 [ChatModel - OpenAI](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
2. Ollama ChatModel: 使用 Ollama 本地模型 [ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
3. ARK ChatModel: 使用 ARK 平台的模型服务 [ChatModel - ARK](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ark)

## **自行实现参考**

实现自定义的 ChatModel 组件时，需要注意以下几点：

1. 注意要实现公共的 option
2. 注意实现 callback 机制
3. 在流式输出时记得完成输出后要 close writer

### **Option 机制**

自定义 ChatModel 需要实现自己的 Option 机制：

```go
// 定义 Option 结构体
type MyChatModelOptions struct {
    Options *model.Options
    RetryCount int
    Timeout time.Duration
}

// 定义 Option 函数
func WithRetryCount(count int) model.Option {
    return model.WrapModelImplSpecificOptFn(func(o *MyChatModelOptions) {
        o.RetryCount = count
    })
}

func WithTimeout(timeout time.Duration) model.Option {
    return model.WrapModelImplSpecificOptFn(func(o *MyChatModelOptions) {
        o.Timeout = timeout
    })
}
```

### **Callback 处理**

ChatModel 实现需要在适当的时机触发回调，以下结构由 ChatModel 组件定义：

```go
// 定义回调输入输出
type CallbackInput struct {
    Messages []*schema.Message
    Model string
    Temperature *float32
    MaxTokens *int
    Extra map[string]any
}

type CallbackOutput struct {
    Message *schema.Message
    TokenUsage *schema.TokenUsage
    Extra map[string]any
}
```

### **完整实现示例**

```go
type MyChatModel struct {
    client    *http.Client
    apiKey    string
    baseURL   string
    model     string
    timeout   time.Duration
    retryCount int
}

func NewMyChatModel(config *MyChatModelConfig) (*MyChatModel, error) {
    if config.APIKey == "" {
        return nil, errors.New("api key is required")
    }
    
    return &MyChatModel{
        client:    &http.Client{},
        apiKey:    config.APIKey,
        baseURL:   config.BaseURL,
        model:     config.DefaultModel,
        timeout:   config.DefaultTimeout,
        retryCount: config.DefaultRetryCount,
    }, nil
}

func (m *MyChatModel) Generate(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // 1. 处理选项
    options := &MyChatModelOptions{
        Options: &model.Options{
            Model: &m.model,
        },
        RetryCount: m.retryCount,
        Timeout: m.timeout,
    }
    options.Options = model.GetCommonOptions(options.Options, opts...)
    options = model.GetImplSpecificOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始生成前的回调
    ctx = cm.OnStart(ctx, info, &model.CallbackInput{
        Messages: messages,
        Model: *options.Options.Model,
        Temperature: options.Options.Temperature,
        MaxTokens: options.Options.MaxTokens,
    })
    
    // 4. 执行生成逻辑
    response, err := m.doGenerate(ctx, messages, options)
    
    // 5. 处理错误和完成回调
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &model.CallbackOutput{
        Message: response.Message,
        TokenUsage: response.TokenUsage,
    })
    
    return response.Message, nil
}

func (m *MyChatModel) Stream(ctx context.Context, messages []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    // 1. 处理选项
    options := &MyChatModelOptions{
        Options: &model.Options{
            Model: &m.model,
        },
        RetryCount: m.retryCount,
        Timeout: m.timeout,
    }
    options = model.GetCommonOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始流式生成前的回调
    ctx = cm.OnStart(ctx, info, &model.CallbackInput{
        Messages: messages,
        Model: *options.Options.Model,
        Temperature: options.Options.Temperature,
        MaxTokens: options.Options.MaxTokens,
    })
    
    // 4. 创建流式响应
    reader, writer := schema.Pipe[*schema.Message](1)
    
    // 5. 启动异步生成
    go func() {
        defer writer.Close()
        
        // 执行流式生成
        err := m.doStream(ctx, messages, options, writer)
        if err != nil {
            cm.OnError(ctx, info, err)
            return
        }
        
        // 完成回调
        cm.OnEndWithStreamOutput(ctx, info, stream)
    }()
    
    return reader, nil
}

func (m *MyChatModel) BindTools(tools []*schema.ToolInfo) error {
    // 实现工具绑定逻辑
    return nil
}

func (m *MyChatModel) doGenerate(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions) (*model.Response, error) {
    // 实现生成逻辑
    return response, err
}

func (m *MyChatModel) doStream(ctx context.Context, messages []*schema.Message, opts *MyChatModelOptions, writer *schema.StreamWriter[*schema.Message]) error {
    // 实现流式生成逻辑
    return err
}
```
