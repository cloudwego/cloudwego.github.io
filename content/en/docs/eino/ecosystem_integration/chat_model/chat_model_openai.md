---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: ChatModel - OpenAI
weight: 0
---

## **OpenAI Model**

An OpenAI model implementation for [Eino](https://github.com/cloudwego/eino) that implements the `ToolCallingChatModel` interface. This enables seamless integration with Eino's LLM capabilities for enhanced natural language processing and generation.

## **Features**

- Implements `github.com/cloudwego/eino/components/model.Model`
- Easy integration with Eino's model system
- Configurable model parameters
- Support for chat completion
- Support for streaming responses
- Custom response parsing support
- Flexible model configuration

## Installation

```go
go get github.com/cloudwego/eino-ext/components/model/openai@latest
```

## Quick Start

Here's a quick example of how to use the OpenAI model:

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
                // If you want to use Azure OpenAI Service, set these two fields.
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

## Configuration

You can configure the model using the `openai.ChatModelConfig` struct:

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

// ResponseFormat specifies the format of the model's response
// Optional. Use for structured outputs
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

## Examples

### Text Generation

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
                // If you want to use Azure OpenAI Service, set these two fields.
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

### Multimodal Support (Image Understanding)

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

### Streaming Generation

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

### Tool Calling

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

### Audio Generation

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
                // If you want to use Azure OpenAI Service, set these two fields.
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

### Structured Output

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

## **Usage**

### **Component Initialization**

The OpenAI model is initialized through the `NewChatModel` function with the following main configuration parameters:

```go
import "github.com/cloudwego/eino-ext/components/model/openai"

model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
    // Azure OpenAI Service configuration (optional)
    ByAzure:    false,           // Whether to use Azure OpenAI
    BaseURL:    "your-url",      // Azure API base URL
    APIVersion: "2023-05-15",    // Azure API version

    // Basic configuration
    APIKey:  "your-key",         // API key
    Timeout: 30 * time.Second,   // Timeout

    // Model parameters
    Model:            "gpt-4",   // Model name
    MaxTokens:        &maxTokens,// Maximum generation length
    Temperature:      &temp,     // Temperature
    TopP:             &topP,     // Top-P sampling
    Stop:             []string{},// Stop words
    PresencePenalty:  &pp,      // Presence penalty
    FrequencyPenalty: &fp,      // Frequency penalty

    // Advanced parameters
    ResponseFormat:   &format,   // Response format
    Seed:            &seed,      // Random seed
    LogitBias:       map[string]int{}, // Token bias
    User:            &user,      // User identifier
    
    ReasoningEffort:openai.ReasoningEffortLevelHigh, // Reasoning level, default "medium"
    
    Modalities:     make([]openai.Modality, 0), // Model response modality types: ["text","audio"] default text
    
    Audio: &openai.Audio{  // Audio output parameters, required when modality includes audio
        Format: openai.AudioFormatMp3,
        Voice:  openai.AudioVoiceAlloy,
    },
    
    ExtraFields： map[string]any{}, // Extra fields, will add or override request fields, used for experimental validation
       
})
```

> - For detailed parameter meanings, refer to: [https://platform.openai.com/docs/api-reference/chat/create](https://platform.openai.com/docs/api-reference/chat/create)
> - For Azure-related services, refer to: [https://learn.microsoft.com/en-us/azure/ai-services/openai/](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

### **Generate Conversation**

Conversation generation supports both normal mode and streaming mode:

```go
// Invoke mode
response, err := model.Generate(ctx, messages)
    
// Streaming mode
stream, err := model.Stream(ctx, messages)
```

Message format example:

```go
import (
    "os"
   "encoding/base64"

    "github.com/cloudwego/eino/schema"
)

// Base64 format image data
image, err := os.ReadFile("./examples/image/eino.png")
    if err != nil {
        log.Fatalf("os.ReadFile failed, err=%v\n", err)
    }

imageStr := base64.StdEncoding.EncodeToString(image)

messages := []*schema.Message{
    // System message
    schema.SystemMessage("You are an assistant"),
    
    // Multimodal message (with image)
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
                Text: "What is this image?",
            },
        },
    },
}
```

### **Tool Calling**

Supports binding tools and forced tool calling:

```go
import "github.com/cloudwego/eino/schema"

// Define tools
tools := []*schema.ToolInfo{
    {
       Name: "search",
       Desc: "Search for information",
       ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
          "query": {
             Type:     schema.String,
             Desc:     "Search keywords",
             Required: true,
          },
       }),
    },
}
// Bind optional tools
err := model.BindTools(tools)

// Bind forced tools
err := model.BindForcedTools(tools)
```

> For tool-related information, refer to [Eino: ToolsNode Guide](/docs/eino/core_modules/components/tools_node_guide)

### **Complete Usage Examples**

#### **Direct Conversation**

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
    
    // Initialize model
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key", // required
        Timeout: 30 * time.Second,
        Model:   "gpt-4", // required
        
        // If the model supports audio generation and you need to generate audio, configure as follows
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
    
    // Base64 format image data
    image, err := os.ReadFile("./examples/image/cat.png")
        if err != nil {
            log.Fatalf("os.ReadFile failed, err=%v\n", err)
        }

    imageStr := base64.StdEncoding.EncodeToString(image)

    // Request messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an image generation assistant that can generate images similar in style to the user's provided image"),
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
    
    // Generate response
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
          
    // Process response
    /*
        The generated multimodal content is stored in the response.AssistantGentMultiContent field
        In this example, the final generated message looks like:
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

#### **Streaming Conversation**

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
    
    // Initialize model
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key",
        Timeout: 30 * time.Second,
        Model:   "gpt-4",
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Write a story"),
    }
    
    // Get streaming response
    reader, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer reader.Close() // Remember to close
    
    // Process streaming content
    for {
        chunk, err := reader.Recv()
        if err != nil {
            break
        }
        print(chunk.Content)
    }
}
```

### [More Examples](https://github.com/cloudwego/eino-ext/tree/main/components/model/openai/examples)

## **Related Documentation**

- [Eino: ChatModel Guide](/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode Guide](/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - ARK](/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
- [ChatModel - Ollama](/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
