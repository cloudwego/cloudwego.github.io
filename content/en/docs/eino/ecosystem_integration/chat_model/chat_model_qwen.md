---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: ChatModel - qwen
weight: 0
---

A Qwen model implementation for [Eino](https://github.com/cloudwego/eino) that implements the `ToolCallingChatModel` interface. This enables seamless integration with Eino's LLM capabilities for enhanced natural language processing and generation.

## **Features**

- Implements `github.com/cloudwego/eino/components/model.Model`
- Easy integration with Eino's model system
- Configurable model parameters
- Support for chat completion
- Support for streaming responses
- Custom response parsing support
- Flexible model configuration

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/model/qwen@latest
```

## **Quick Start**

Here's a quick example of how to use the Qwen model:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    
    "github.com/cloudwego/eino-ext/components/model/qwen"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    // get api key: https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key?spm=a2c4g.11186623.help-menu-2400256.d_3_0.1ebc47bb0ClCgF
    apiKey := os.Getenv("DASHSCOPE_API_KEY")
    modelName := os.Getenv("MODEL_NAME")
    chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
        BaseURL:     "https://dashscope.aliyuncs.com/compatible-mode/v1",
        APIKey:      apiKey,
        Timeout:     0,
        Model:       modelName,
        MaxTokens:   of(2048),
        Temperature: of(float32(0.7)),
        TopP:        of(float32(0.7)),
    })

    if err != nil {
        log.Fatalf("NewChatModel of qwen failed, err=%v", err)
    }

    resp, err := chatModel.Generate(ctx, []*schema.Message{
        schema.UserMessage("as a machine, how do you answer user's question?"),
    })
    if err != nil {
        log.Fatalf("Generate of qwen failed, err=%v", err)
    }

    fmt.Printf("output: \n%v", resp)

}

func of[T any](t T) *T {
    return &t
}
```

## **Configuration**

The model can be configured using the `qwen.ChatModelConfig` struct:

```go
type ChatModelConfig struct {
    APIKey string `json:"api_key"`
    Timeout time.Duration `json:"timeout"`
    HTTPClient *http.Client `json:"http_client"`
    BaseURL string `json:"base_url"`
    Model string `json:"model"`
    MaxTokens *int `json:"max_tokens,omitempty"`
    Temperature *float32 `json:"temperature,omitempty"`
    TopP *float32 `json:"top_p,omitempty"`
    Stop []string `json:"stop,omitempty"`
    PresencePenalty *float32 `json:"presence_penalty,omitempty"`
    ResponseFormat *openai.ChatCompletionResponseFormat `json:"response_format,omitempty"`
    Seed *int `json:"seed,omitempty"`
    FrequencyPenalty *float32 `json:"frequency_penalty,omitempty"`
    LogitBias map[string]int `json:"logit_bias,omitempty"`
    User *string `json:"user,omitempty"`
    EnableThinking *bool `json:"enable_thinking,omitempty"`
}
```

## **Examples**

### **Text Generation**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    
    "github.com/cloudwego/eino-ext/components/model/qwen"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    // get api key: https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key?spm=a2c4g.11186623.help-menu-2400256.d_3_0.1ebc47bb0ClCgF
    apiKey := os.Getenv("DASHSCOPE_API_KEY")
    modelName := os.Getenv("MODEL_NAME")
    chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
        BaseURL:     "https://dashscope.aliyuncs.com/compatible-mode/v1",
        APIKey:      apiKey,
        Timeout:     0,
        Model:       modelName,
        MaxTokens:   of(2048),
        Temperature: of(float32(0.7)),
        TopP:        of(float32(0.7)),
    })

    if err != nil {
        log.Fatalf("NewChatModel of qwen failed, err=%v", err)
    }

    resp, err := chatModel.Generate(ctx, []*schema.Message{
        schema.UserMessage("as a machine, how do you answer user's question?"),
    })
    if err != nil {
        log.Fatalf("Generate of qwen failed, err=%v", err)
    }

    fmt.Printf("output: \n%v", resp)

}

func of[T any](t T) *T { return &t }
```

### **Multimodal Understanding (Image Understanding)**

```go
package main

import (
    "context"
    "encoding/base64"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/model/qwen"
)

func main() {
    ctx := context.Background()
    chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
        BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        APIKey:  os.Getenv("DASHSCOPE_API_KEY"),
        Model:   os.Getenv("MODEL_NAME"),
        MaxTokens:   of(2048),
        Temperature: of(float32(0.7)),
        TopP:        of(float32(0.7)),
    })
    if err != nil { log.Fatalf("NewChatModel of qwen failed, err=%v", err) }

    image, err := os.ReadFile("./examples/generate_with_image/test.jpg")
    if err != nil { log.Fatalf("os.ReadFile failed, err=%v\n", err) }

    resp, err := chatModel.Generate(ctx, []*schema.Message{ {
        Role: schema.User,
        UserInputMultiContent: []schema.MessageInputPart{
            { Type: schema.ChatMessagePartTypeText, Text: "What do you see in this image?" },
            { Type: schema.ChatMessagePartTypeImageURL, Image: &schema.MessageInputImage{ MessagePartCommon: schema.MessagePartCommon{ Base64Data: of(base64.StdEncoding.EncodeToString(image)), MIMEType: "image/jpeg" }, Detail: schema.ImageURLDetailAuto } },
        },
    } })
    if err != nil { log.Printf("Generate error: %v", err); return }
    fmt.Printf("Assistant: %s\n", resp.Content)
}

func of[T any](t T) *T { return &t }
```

### **Streaming Generation**

```go
package main

import (
    "context"
    "fmt"
    "io"
    "log"
    "os"

    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/model/qwen"
)

func main() {
    ctx := context.Background()
    chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
        BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        APIKey:  os.Getenv("DASHSCOPE_API_KEY"),
        Model:   os.Getenv("MODEL_NAME"),
        MaxTokens:   of(2048),
        Temperature: of(float32(0.7)),
        TopP:        of(float32(0.7)),
    })
    if err != nil { log.Fatalf("NewChatModel of qwen failed, err=%v", err) }

    sr, err := chatModel.Stream(ctx, []*schema.Message{ schema.UserMessage("hello") })
    if err != nil { log.Fatalf("Stream of qwen failed, err=%v", err) }

    var ms []*schema.Message
    for {
        m, err := sr.Recv()
        if err != nil { if err == io.EOF { break } ; log.Fatalf("Stream of qwen failed, err=%v", err) }
        fmt.Println(m)
        // assistant: hello
        // finish_reason:
        // : !
        // finish_reason:
        // : What
        // finish_reason:
        // : can I help
        // finish_reason:
        // : you with?
        // finish_reason:
        // :
        // finish_reason: stop
        // usage: &{9 7 16}
        ms = append(ms, m)
    }
    sm, err := schema.ConcatMessages(ms)
    if err != nil { log.Fatalf("ConcatMessages failed, err=%v", err) }
    fmt.Println(sm)
    // assistant: hello! What can I help you with?
    // finish_reason: stop
    // usage: &{9 7 16}
}

func of[T any](t T) *T { return &t }
```

### **Tool Calling**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/model/qwen"
)

func main() {
    ctx := context.Background()
    chatModel, err := qwen.NewChatModel(ctx, &qwen.ChatModelConfig{
        BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        APIKey:  os.Getenv("DASHSCOPE_API_KEY"),
        Model:   os.Getenv("MODEL_NAME"),
        MaxTokens:   of(2048),
        Temperature: of(float32(0.7)),
        TopP:        of(float32(0.7)),
    })
    if err != nil { log.Fatalf("NewChatModel of qwen failed, err=%v", err) }

    err = chatModel.BindTools([]*schema.ToolInfo{
        { Name: "user_company", Desc: "Query the user's company and position information based on their name and email", ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{ "name": {Type: "string", Desc: "The user's name"}, "email": {Type: "string", Desc: "The user's email"} }) },
        { Name: "user_salary", Desc: "Query the user's salary information based on their name and email", ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{ "name": {Type: "string", Desc: "The user's name"}, "email": {Type: "string", Desc: "The user's email"} }) },
    })
    if err != nil { log.Fatalf("BindTools of qwen failed, err=%v", err) }

    resp, err := chatModel.Generate(ctx, []*schema.Message{{ Role: schema.System, Content: "You are a real estate agent. Use the user_company and user_salary APIs to provide relevant property information based on the user's salary and job. Email is required" }, { Role: schema.User, Content: "My name is zhangsan, and my email is zhangsan@bytedance.com. Please recommend some suitable houses for me." }})
    if err != nil { log.Fatalf("Generate of qwen failed, err=%v", err) }
    fmt.Printf("output: \n%v", resp)
}

func of[T any](t T) *T { return &t }
```

### [More Examples](https://github.com/cloudwego/eino-ext/tree/main/components/model/qwen/examples)

## **Related Documentation**

- `Eino: ChatModel Guide` at `/en/docs/eino/core_modules/components/chat_model_guide`
- `Eino: ToolsNode Guide` at `/en/docs/eino/core_modules/components/tools_node_guide`
- `ChatModel - ARK` at `/en/docs/eino/ecosystem_integration/chat_model/chat_model_ark`
- `ChatModel - Ollama` at `/en/docs/eino/ecosystem_integration/chat_model/chat_model_ollama`
