---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: ChatModel - OpenAI
weight: 0
---

## **OpenAI 模型**

一个针对 [Eino](https://github.com/cloudwego/eino) 的 OpenAI 模型实现，实现了 `ToolCallingChatModel` 接口。这使得能够与 Eino 的 LLM 功能无缝集成，以增强自然语言处理和生成能力

## **特性**

- 实现了 `github.com/cloudwego/eino/components/model.Model`
- 轻松与 Eino 的模型系统集成
- 可配置的模型参数
- 支持聊天补全
- 支持流式响应
- 支持自定义响应解析
- 灵活的模型配置

## 安装

```go
go get github.com/cloudwego/eino-ext/components/model/openai@latest
```

## 快速开始[ ](http://localhost:1313/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai/#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)

以下是如何使用 OpenAI 模型的快速示例：

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/openai"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                // 如果您想使用 Azure OpenAI 服务，请设置这两个字段。
                // BaseURL: "https://{RESOURCE_NAME}.openai.azure.com",
                // ByAzure: true,
                // APIVersion: "2024-06-01",
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
                ReasoningEffort: openai.ReasoningEffortLevelHigh,
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }
        fmt.Printf("output: \n%v", resp)

}
```

## 配置

可以使用 `openai.ChatModelConfig` 结构体配置模型：

```go
type ChatModelConfig struct {
// APIKey is your authentication key
// Use OpenAI API key or Azure API key depending on the service
// Required
APIKey string `json:"api_key"`

// Timeout specifies the maximum duration to wait for API responses
// If HTTPClient is set, Timeout will not be used.
// Optional. Default: no timeout
Timeout time.Duration `json:"timeout"`

// HTTPClient specifies the client to send HTTP requests.
// If HTTPClient is set, Timeout will not be used.
// Optional. Default &http.Client{Timeout: Timeout}
HTTPClient *http.Client `json:"http_client"`

// The following three fields are only required when using Azure OpenAI Service, otherwise they can be ignored.
// For more details, see: https://learn.microsoft.com/en-us/azure/ai-services/openai/

// ByAzure indicates whether to use Azure OpenAI Service
// Required for Azure
ByAzure bool `json:"by_azure"`

// AzureModelMapperFunc is used to map the model name to the deployment name for Azure OpenAI Service.
// This is useful when the model name is different from the deployment name.
// Optional for Azure, remove [,:] from the model name by default.
AzureModelMapperFunc func(model string) string

// BaseURL is the Azure OpenAI endpoint URL
// Format: https://{YOUR_RESOURCE_NAME}.openai.azure.com. YOUR_RESOURCE_NAME is the name of your resource that you have created on Azure.
// Required for Azure
BaseURL string `json:"base_url"`

// APIVersion specifies the Azure OpenAI API version
// Required for Azure
APIVersion string `json:"api_version"`

// The following fields correspond to OpenAI's chat completion API parameters
// Ref: https://platform.openai.com/docs/api-reference/chat/create

// Model specifies the ID of the model to use
// Required
Model string `json:"model"`

// MaxTokens limits the maximum number of tokens that can be generated in the chat completion
// Optional. Default: model's maximum
// Deprecated: use MaxCompletionTokens. Not compatible with o1-series models.
// refs: https://platform.openai.com/docs/api-reference/chat/create#chat-create-max_tokens
MaxTokens *int `json:"max_tokens,omitempty"`

// MaxCompletionTokens specifies an upper bound for the number of tokens that can be generated for a completion, including visible output tokens and reasoning tokens.
MaxCompletionTokens *int `json:"max_completion_tokens,omitempty"`

// Temperature specifies what sampling temperature to use
// Generally recommend altering this or TopP but not both.
// Range: 0.0 to 2.0. Higher values make output more random
// Optional. Default: 1.0
Temperature *float32 `json:"temperature,omitempty"`

// TopP controls diversity via nucleus sampling
// Generally recommend altering this or Temperature but not both.
// Range: 0.0 to 1.0. Lower values make output more focused
// Optional. Default: 1.0
TopP *float32 `json:"top_p,omitempty"`

// Stop sequences where the API will stop generating further tokens
// Optional. Example: []string{"\n", "User:"}
Stop []string `json:"stop,omitempty"`

// PresencePenalty prevents repetition by penalizing tokens based on presence
// Range: -2.0 to 2.0. Positive values increase likelihood of new topics
// Optional. Default: 0
PresencePenalty *float32 `json:"presence_penalty,omitempty"`

// ResponseFormat 指定模型响应的格式
// 可选。用于结构化输出
ResponseFormat *ChatCompletionResponseFormat `json:"response_format,omitempty"`

// Seed enables deterministic sampling for consistent outputs
// Optional. Set for reproducible results
Seed *int `json:"seed,omitempty"`

// FrequencyPenalty prevents repetition by penalizing tokens based on frequency
// Range: -2.0 to 2.0. Positive values decrease likelihood of repetition
// Optional. Default: 0
FrequencyPenalty *float32 `json:"frequency_penalty,omitempty"`

// LogitBias modifies likelihood of specific tokens appearing in completion
// Optional. Map token IDs to bias values from -100 to 100
LogitBias map[string]int `json:"logit_bias,omitempty"`

// User unique identifier representing end-user
// Optional. Helps OpenAI monitor and detect abuse
User *string `json:"user,omitempty"`

// ExtraFields will override any existing fields with the same key.
// Optional. Useful for experimental features not yet officially supported.
ExtraFields map[string]any `json:"extra_fields,omitempty"`

// ReasoningEffort will override the default reasoning level of "medium"
// Optional. Useful for fine tuning response latency vs. accuracy
ReasoningEffort ReasoningEffortLevel

// Modalities are output types that you would like the model to generate. Most models are capable of generating text, which is the default: ["text"]
// The gpt-4o-audio-preview model can also be used to generate audio. To request that this model generate both text and audio responses, you can use: ["text", "audio"]
Modalities []Modality `json:"modalities,omitempty"`

// Audio parameters for audio output. Required when audio output is requested with modalities: ["audio"]
Audio *Audio `json:"audio,omitempty"`
}
```

## 示例

### 文本生成[ ](http://localhost:1313/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai/#%E6%96%87%E6%9C%AC%E7%94%9F%E6%88%90)

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/openai"
)

func main() {
        ctx := context.Background()

        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                // 如果您想使用 Azure OpenAI 服务，请设置这两个字段。
                // BaseURL: "https://{RESOURCE_NAME}.openai.azure.com",
                // ByAzure: true,
                // APIVersion: "2024-06-01",
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
                ReasoningEffort: openai.ReasoningEffortLevelHigh,
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }
        fmt.Printf("output: \n%v", resp)

}
```

### 多模态支持(图片理解)[ ](http://localhost:1313/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai/#%E5%A4%9A%E6%A8%A1%E6%80%81%E6%94%AF%E6%8C%81%E5%9B%BE%E7%89%87%E7%90%86%E8%A7%A3)

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/openai"
)

func main() {
        ctx := context.Background()

        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)

        }

        multiModalMsg := &schema.Message{
                UserInputMultiContent: []schema.MessageInputPart{
                        {
                                Type: schema.ChatMessagePartTypeText,
                                Text: "this picture is a landscape photo, what's the picture's content",
                        },
                        {
                                Type: schema.ChatMessagePartTypeImageURL,
                                Image: &schema.MessageInputImage{
                                        MessagePartCommon: schema.MessagePartCommon{
                                                URL: of("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT11qEDxU4X_MVKYQVU5qiAVFidA58f8GG0bQ&s"),
                                        },
                                        Detail: schema.ImageURLDetailAuto,
                                },
                        },
                },
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                multiModalMsg,
        })
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        fmt.Printf("output: \n%v", resp)
}

func of[T any](a T) *T {
        return &a
}
```

### 流式生成

```go
package main

import (
        "context"
        "fmt"
        "io"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/openai"
)

func main() {
        ctx := context.Background()
        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
        })
        if err != nil {
                log.Fatalf("NewChatModel of openai failed, err=%v", err)
        }

        streamMsgs, err := chatModel.Stream(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })

        if err != nil {
                log.Fatalf("Stream of openai failed, err=%v", err)
        }

        defer streamMsgs.Close()

        fmt.Printf("typewriter output:")
        for {
                msg, err := streamMsgs.Recv()
                if err == io.EOF {
                        break
                }
                if err != nil {
                        log.Fatalf("Recv of streamMsgs failed, err=%v", err)
                }
                fmt.Print(msg.Content)
        }

        fmt.Print("\n")
}
```

### 工具调用[ ](http://localhost:1313/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai/#%E5%B7%A5%E5%85%B7%E8%B0%83%E7%94%A8)

```go
package main

import (
        "context"
        "fmt"
        "io"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/openai"
)

func main() {
        ctx := context.Background()
        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
        })
        if err != nil {
                log.Fatalf("NewChatModel of openai failed, err=%v", err)
        }
        err = chatModel.BindForcedTools([]*schema.ToolInfo{
                {
                        Name: "user_company",
                        Desc: "Retrieve the user's company and position based on their name and email.",
                        ParamsOneOf: schema.NewParamsOneOfByParams(
                                map[string]*schema.ParameterInfo{
                                        "name":  {Type: "string", Desc: "user's name"},
                                        "email": {Type: "string", Desc: "user's email"}}),
                }, {
                        Name: "user_salary",
                        Desc: "Retrieve the user's salary based on their name and email.\n",
                        ParamsOneOf: schema.NewParamsOneOfByParams(
                                map[string]*schema.ParameterInfo{
                                        "name":  {Type: "string", Desc: "user's name"},
                                        "email": {Type: "string", Desc: "user's email"},
                                }),
                }})
        if err != nil {
                log.Fatalf("BindForcedTools of openai failed, err=%v", err)
        }
        resp, err := chatModel.Generate(ctx, []*schema.Message{{
                Role:    schema.System,
                Content: "As a real estate agent, provide relevant property information based on the user's salary and job using the user_company and user_salary APIs. An email address is required.",
        }, {
                Role:    schema.User,
                Content: "My name is John and my email is john@abc.com，Please recommend some houses that suit me.",
        }})
        if err != nil {
                log.Fatalf("Generate of openai failed, err=%v", err)
        }
        fmt.Printf("output: \n%v", resp)

        streamResp, err := chatModel.Stream(ctx, []*schema.Message{
                {
                        Role:    schema.System,
                        Content: "As a real estate agent, provide relevant property information based on the user's salary and job using the user_company and user_salary APIs. An email address is required.",
                }, {
                        Role:    schema.User,
                        Content: "My name is John and my email is john@abc.com，Please recommend some houses that suit me.",
                },
        })
        if err != nil {
                log.Fatalf("Stream of openai failed, err=%v", err)
        }
        var messages []*schema.Message
        for {
                chunk, err := streamResp.Recv()
                if err == io.EOF {
                        break
                }
                if err != nil {
                        log.Fatalf("Recv of streamResp failed, err=%v", err)
                }
                messages = append(messages, chunk)
        }
        resp, err = schema.ConcatMessages(messages)
        if err != nil {
                log.Fatalf("ConcatMessages of openai failed, err=%v", err)
        }
        fmt.Printf("stream output: \n%v", resp)
}
```

### 音频生成[ ](http://localhost:1313/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai/#%E9%9F%B3%E9%A2%91%E7%94%9F%E6%88%90)

```go
package main

import (
        "context"

        "log"
        "os"

        "github.com/bytedance/sonic"
        "github.com/cloudwego/eino-ext/components/model/openai"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                // 如果您想使用 Azure OpenAI 服务，请设置这两个字段。
                // BaseURL: "https://{RESOURCE_NAME}.openai.azure.com",
                // ByAzure: true,
                // APIVersion: "2024-06-01",
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
                ReasoningEffort: openai.ReasoningEffortLevelHigh,
                Modalities:      []openai.Modality{openai.AudioModality, openai.TextModality},
                Audio: &openai.Audio{
                        Format: openai.AudioFormatMp3,
                        Voice:  openai.AudioVoiceAlloy,
                },
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role: schema.User,
                        UserInputMultiContent: []schema.MessageInputPart{
                                {Type: schema.ChatMessagePartTypeText, Text: "help me convert the following text to speech"},
                                {Type: schema.ChatMessagePartTypeText, Text: "Hello, what can I help you with?"},
                        },
                },
        })
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        respBody, _ := sonic.MarshalIndent(resp, " ", " ")
        log.Printf(" body: %s\n", string(respBody))

}
```

### 结构化输出

```go
package main

import (
        "context"
        "encoding/json"
        "fmt"
        "log"
        "os"

        "github.com/eino-contrib/jsonschema"
        orderedmap "github.com/wk8/go-ordered-map/v2"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/openai"
)

func main() {
        type Person struct {
                Name   string `json:"name"`
                Height int    `json:"height"`
                Weight int    `json:"weight"`
        }

        js := &jsonschema.Schema{
                Type: string(schema.Object),
                Properties: orderedmap.New[string, *jsonschema.Schema](
                        orderedmap.WithInitialData[string, *jsonschema.Schema](
                                orderedmap.Pair[string, *jsonschema.Schema]{
                                        Key: "name",
                                        Value: &jsonschema.Schema{
                                                Type: string(schema.String),
                                        },
                                },
                                orderedmap.Pair[string, *jsonschema.Schema]{
                                        Key: "height",
                                        Value: &jsonschema.Schema{
                                                Type: string(schema.Integer),
                                        },
                                },
                                orderedmap.Pair[string, *jsonschema.Schema]{
                                        Key: "weight",
                                        Value: &jsonschema.Schema{
                                                Type: string(schema.Integer),
                                        },
                                },
                        ),
                ),
        }

        ctx := context.Background()
        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                APIKey:  os.Getenv("OPENAI_API_KEY"),
                Model:   os.Getenv("OPENAI_MODEL"),
                BaseURL: os.Getenv("OPENAI_BASE_URL"),
                ByAzure: func() bool {
                        if os.Getenv("OPENAI_BY_AZURE") == "true" {
                                return true
                        }
                        return false
                }(),
                ResponseFormat: &openai.ChatCompletionResponseFormat{
                        Type: openai.ChatCompletionResponseFormatTypeJSONSchema,
                        JSONSchema: &openai.ChatCompletionResponseFormatJSONSchema{
                                Name:        "person",
                                Description: "data that describes a person",
                                Strict:      false,
                                JSONSchema:  js,
                        },
                },
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.System,
                        Content: "Parse the user input into the specified json struct",
                },
                {
                        Role:    schema.User,
                        Content: "John is one meter seventy tall and weighs sixty kilograms",
                },
        })

        if err != nil {
                log.Fatalf("Generate of openai failed, err=%v", err)
        }

        result := &Person{}
        err = json.Unmarshal([]byte(resp.Content), result)
        if err != nil {
                log.Fatalf("Unmarshal of openai failed, err=%v", err)
        }
        fmt.Printf("%+v", *result)
}
```

## **使用方式**

### **组件初始化**

OpenAI 模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/model/openai"

model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
    // Azure OpenAI Service 配置（可选）
    ByAzure:    false,           // 是否使用 Azure OpenAI
    BaseURL:    "your-url",      // Azure API 基础 URL
    APIVersion: "2023-05-15",    // Azure API 版本

    // 基础配置
    APIKey:  "your-key",         // API 密钥
    Timeout: 30 * time.Second,   // 超时时间

    // 模型参数
    Model:            "gpt-4",   // 模型名称
    MaxTokens:        &maxTokens,// 最大生成长度
    Temperature:      &temp,     // 温度
    TopP:             &topP,     // Top-P 采样
    Stop:             []string{},// 停止词
    PresencePenalty:  &pp,      // 存在惩罚
    FrequencyPenalty: &fp,      // 频率惩罚

    // 高级参数
    ResponseFormat:   &format,   // 响应格式
    Seed:            &seed,      // 随机种子
    LogitBias:       map[string]int{}, // Token 偏置
    User:            &user,      // 用户标识
    
    ReasoningEffort:openai.ReasoningEffortLevelHigh, // 推理级别, 默认 "medium"
    
    Modalities:     make([]openai.Modality, 0), // 模型回复模态类型: ["text","audio"] 默认 text
    
    Audio: &openai.Audio{  //  音频输出参数，当模态存在audio时，此字段必填
        Format: openai.AudioFormatMp3,
        Voice:  openai.AudioVoiceAlloy,
    },
    
    ExtraFields： map[string]any{}, // 额外字段，此字段将新增或者覆盖访问请求字段，用于实验性验证
       
})
```

> - 参数具体含义，可以参考: [https://platform.openai.com/docs/api-reference/chat/create](https://platform.openai.com/docs/api-reference/chat/create)
> - azure 相关服务，可以参考: [https://learn.microsoft.com/en-us/azure/ai-services/openai/](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

### **生成对话**

对话生成支持普通模式和流式模式：

```go
// invoke模式
response, err := model.Generate(ctx, messages)
    
// 流式模式
stream, err := model.Stream(ctx, messages)
```

消息格式示例：

```go
import (
    "os"
   "encoding/base64"

    "github.com/cloudwego/eino/schema"
)

// base64 格式的图片数据
image, err := os.ReadFile("./examples/image/eino.png")
    if err != nil {
        log.Fatalf("os.ReadFile failed, err=%v\n", err)
    }

imageStr := base64.StdEncoding.EncodeToString(image)

messages := []*schema.Message{
    // 系统消息
    schema.SystemMessage("你是一个助手"),
    
    // 多模态消息（包含图片）
    {
        Role: schema.User,
        UserInputMultiContent: []schema.MessageInputPart{
            {
                Type: schema.ChatMessagePartTypeImageURL,
                Image: &schema.MessageInputImage{
                    MessagePartCommon: schema.MessagePartCommon{
                        Base64Data: &imageStr,
                        MIMEType:   "image/png",    // required when use Base64Data
                    },
                Detail: schema.ImageURLDetailAuto,
                },
            },
            {
                Type: schema.ChatMessagePartTypeText,
                Text: "这张图片是什么？",
            },
        },
    },
}
```

### **工具调用**

支持绑定工具和强制工具调用：

```go
import "github.com/cloudwego/eino/schema"

// 定义工具
tools := []*schema.ToolInfo{
    {
       Name: "search",
       Desc: "搜索信息",
       ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
          "query": {
             Type:     schema.String,
             Desc:     "搜索关键词",
             Required: true,
          },
       }),
    },
}
// 绑定可选工具
err := model.BindTools(tools)

// 绑定强制工具
err := model.BindForcedTools(tools)
```

> 工具相关信息，可以参考 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)

### **完整使用示例**

#### **直接对话**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化模型
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key", // required
        Timeout: 30 * time.Second,
        Model:   "gpt-4", // required
        
        // 如果模型支持语音生成，并且有需求生成语音时，需要进行如下配置
        // Modalities: []openai.Modality{openai.AudioModality, openai.TextModality},
        //Audio: &openai.Audio{
        //        Format: openai.AudioFormatMp3,
        //        Voice:  openai.AudioVoiceAlloy,
        //},
},
        
    })
    if err != nil {
        panic(err)
    }
    
    // base64 格式的图片数据
    image, err := os.ReadFile("./examples/image/cat.png")
        if err != nil {
            log.Fatalf("os.ReadFile failed, err=%v\n", err)
        }

    imageStr := base64.StdEncoding.EncodeToString(image)

    // 请求消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个图片生成助手，可以仿照用户给定的图片生成一个风格近似的图片"),
        {
            Role: schema.User,
            UserInputMultiContent: []schema.MessageInputPart{
                {
                    Type: schema.ChatMessagePartTypeImage,
                    Image: &schema.MessageInputImage{
                    MessagePartCommon: schema.MessagePartCommon{
                        Base64Data: &imageStr,
                        MIMEType:   "image/png",    // required when use Base64Data
                    },
                    Detail: schema.ImageURLDetailAuto,
                },
                {
                    Type: schema.ChatMessagePartTypeText,
                    Text: "Generate an image of a cat",
                },
            },
        },
    }
    
    // 生成回复
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
          
    // 处理回复
    /*
        生成的多模态内容存储在 response.AssistantGentMultiContent 字段中
        本例中最终生成的 message 形如：
        AssistantMessage = schema.Message{
                        Role: schema.Assistant,
                         AssistantGenMultiContent : []schema.MessageOutputPart{
                             {Type: schema.ChatMessagePartTypeImageURL,
                              Image: &schema.MessageOutputImage{
                                  MessagePartCommon: schema.MessagePartCommon{
                                      Base64Data: &DataStr, 
                                      MIMEType: "image/png",
                                      },
                                  },
                              },
                          },
                      }
    */
    
    fmt.Printf("Assistant: %s\n", resp)
}
```

#### **流式对话**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化模型
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key",
        Timeout: 30 * time.Second,
        Model:   "gpt-4",
    })
    if err != nil {
        panic(err)
    }
    
    // 准备消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个助手"),
        schema.UserMessage("写一个故事"),
    }
    
    // 获取流式回复
    reader, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer reader.Close() // 注意要关闭
    
    // 处理流式内容
    for {
        chunk, err := reader.Recv()
        if err != nil {
            break
        }
        print(chunk.Content)
    }
}
```

### [更多示例](https://github.com/cloudwego/eino-ext/tree/main/components/model/openai/examples)

## **相关文档**

- [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - ARK](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
- [ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
