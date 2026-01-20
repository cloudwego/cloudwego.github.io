---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: ChatModel - ARK
weight: 0
---

## **ARK Model**

A Volcengine Ark model implementation for [Eino](https://github.com/cloudwego/eino) that implements the `ToolCallingChatModel` interface. This enables seamless integration with Eino's LLM capabilities to enhance natural language processing and generation.

This package provides two different models:

- **ChatModel**: for text-based and multi-modal chat completion.
- **ImageGenerationModel**: for generating images from text prompts or images.
- **ResponseAPI**: methods and helpers for interacting with the OpenAI-compatible API.

## Features

- Implements `github.com/cloudwego/eino/components/model.Model`
- Easy integration with Eino's model system
- Configurable model parameters
- Supports chat completion, image generation, and Response API
- Supports streaming responses
- Supports custom response parsing
- Flexible model configuration

## Quick Install

```bash
go get github.com/cloudwego/eino-ext/components/model/ark@latest
```

### Quick Start

Here's a quick example of how to use `ChatModel`:

```go
package main

import (
        "context"
        "encoding/json"
        "errors"
        "io"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })

        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        inMsgs := []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "how do you generate answer for user question as a machine, please answer in short?",
                },
        }

        msg, err := chatModel.Generate(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("generate output: \n")
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s \n", string(respBody))

        sr, err := chatModel.Stream(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        chunks := make([]*schema.Message, 0, 1024)
        for {
                msgChunk, err := sr.Recv()
                if errors.Is(err, io.EOF) {
                        break
                }
                if err != nil {
                        log.Fatalf("Stream Recv failed, err=%v", err)
                }

                chunks = append(chunks, msgChunk)
        }

        msg, err = schema.ConcatMessages(chunks)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }

        log.Printf("stream final output: \n")
        log.Printf("  request_id: %s \n")
        respBody, _ = json.MarshalIndent(msg, "  ", "  ")
        log.Printf("body: %s \n", string(respBody))
}
```

### Configuration

`ChatModel` can be configured using the `ark.ChatModelConfig` struct:

```go
type ChatModelConfig struct {
    // Timeout specifies the maximum duration to wait for API responses
    // Optional. Default: 10 minutes
    Timeout *time.Duration `json:"timeout"`
    
    // RetryTimes specifies the number of retry attempts for failed API calls
    // Optional. Default: 2
    RetryTimes *int `json:"retry_times"`
    
    // BaseURL specifies the base URL for Ark service
    // Optional. Default: "https://ark.cn-beijing.volces.com/api/v3"
    BaseURL string `json:"base_url"`
    // Region specifies the region where Ark service is located
    // Optional. Default: "cn-beijing"
    Region string `json:"region"`
    
    // The following three fields are about authentication - either APIKey or AccessKey/SecretKey pair is required
    // For authentication details, see: https://www.volcengine.com/docs/82379/1298459
    // APIKey takes precedence if both are provided
    APIKey    string `json:"api_key"`
    AccessKey string `json:"access_key"`
    SecretKey string `json:"secret_key"`
    
    // The following fields correspond to Ark's chat completion API parameters
    // Ref: https://www.volcengine.com/docs/82379/1298454
    
    // Model specifies the ID of endpoint on ark platform
    // Required
    Model string `json:"model"`
    
    // MaxTokens limits the maximum number of tokens that can be generated in the chat completion and the range of values is [0, 4096]
    // Optional. Default: 4096
    MaxTokens *int `json:"max_tokens,omitempty"`
    
    // Temperature specifies what sampling temperature to use
    // Generally recommend altering this or TopP but not both
    // Range: 0.0 to 1.0. Higher values make output more random
    // Optional. Default: 1.0
    Temperature *float32 `json:"temperature,omitempty"`
    
    // TopP controls diversity via nucleus sampling
    // Generally recommend altering this or Temperature but not both
    // Range: 0.0 to 1.0. Lower values make output more focused
    // Optional. Default: 0.7
    TopP *float32 `json:"top_p,omitempty"`
    
    // Stop sequences where the API will stop generating further tokens
    // Optional. Example: []string{"\n", "User:"}
    Stop []string `json:"stop,omitempty"`
    
    // FrequencyPenalty prevents repetition by penalizing tokens based on frequency
    // Range: -2.0 to 2.0. Positive values decrease likelihood of repetition
    // Optional. Default: 0
    FrequencyPenalty *float32 `json:"frequency_penalty,omitempty"`
    
    // LogitBias modifies likelihood of specific tokens appearing in completion
    // Optional. Map token IDs to bias values from -100 to 100
    LogitBias map[string]int `json:"logit_bias,omitempty"`
    
    // PresencePenalty prevents repetition by penalizing tokens based on presence
    // Range: -2.0 to 2.0. Positive values increase likelihood of new topics
    // Optional. Default: 0
    PresencePenalty *float32 `json:"presence_penalty,omitempty"`
    
    // CustomHeader the http header passed to model when requesting model
    CustomHeader map[string]string `json:"custom_header"`
}
```

## Image Generation

### Quick Start

Here's a quick example of how to use `ImageGenerationModel`:

```go
package main

import (
        "context"
        "encoding/json"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"
        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and an image generation model ID
        imageGenerationModel, err := ark.NewImageGenerationModel(ctx, &ark.ImageGenerationConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_IMAGE_MODEL_ID"), // Use an appropriate image model ID
        })

        if err != nil {
                log.Fatalf("NewImageGenerationModel failed, err=%v", err)
        }

        inMsgs := []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "a photo of a cat sitting on a table",
                },
        }

        msg, err := imageGenerationModel.Generate(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("generate output:")
        log.Printf("  request_id: %s", ark.GetArkRequestID(msg))
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s", string(respBody))

        sr, err := imageGenerationModel.Stream(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        log.Printf("stream output:")
        index := 0
        for {
                msgChunk, err := sr.Recv()
                if errors.Is(err, io.EOF) {
                        break
                }
                if err != nil {
                        log.Fatalf("Stream Recv failed, err=%v", err)
                }

                respBody, _ = json.MarshalIndent(msgChunk, "  ", "  ")
                log.Printf("stream chunk %d: body: %s \n", index, string(respBody))
                index++
        }
}
```

### Configuration

`ImageGenerationModel` can be configured using the `ark.ImageGenerationConfig` struct:

```go
type ImageGenerationConfig struct {
    // For authentication, APIKey is required as the image generation API only supports API Key authentication.
    // For authentication details, see: https://www.volcengine.com/docs/82379/1298459
    // Required
    APIKey string `json:"api_key"`
    
    // Model specifies the ID of endpoint on ark platform
    // Required
    Model string `json:"model"`
    
    // Timeout specifies the maximum duration to wait for API responses
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default: 10 minutes
    Timeout *time.Duration `json:"timeout"`
    
    // HTTPClient specifies the client to send HTTP requests.
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default &http.Client{Timeout: Timeout}
    HTTPClient *http.Client `json:"http_client"`
    
    // RetryTimes specifies the number of retry attempts for failed API calls
    // Optional. Default: 2
    RetryTimes *int `json:"retry_times"`
    
    // BaseURL specifies the base URL for Ark service
    // Optional. Default: "https://ark.cn-beijing.volces.com/api/v3"
    BaseURL string `json:"base_url"`
    
    // Region specifies the region where Ark service is located
    // Optional. Default: "cn-beijing"
    Region string `json:"region"`
    
    // The following fields correspond to Ark's image generation API parameters
    // Ref: https://www.volcengine.com/docs/82379/1541523
    
    // Size specifies the dimensions of the generated image.
    // It can be a resolution keyword (e.g., "1K", "2K", "4K") or a custom resolution
    // in "{width}x{height}" format (e.g., "1920x1080").
    // When using custom resolutions, the total pixels must be between 1280x720 and 4096x4096,
    // and the aspect ratio (width/height) must be between 1/16 and 16.
    // Optional. Defaults to "2048x2048".
    Size string `json:"size"`
    
    // SequentialImageGeneration determines if the model should generate a sequence of images.
    // Possible values:
    //  - "auto": The model decides whether to generate multiple images based on the prompt.
    //  - "disabled": Only a single image is generated.
    // Optional. Defaults to "disabled".
    SequentialImageGeneration SequentialImageGeneration `json:"sequential_image_generation"`
    
    // SequentialImageGenerationOption sets the maximum number of images to generate when
    // SequentialImageGeneration is set to "auto".
    // The value must be between 1 and 15.
    // Optional. Defaults to 15.
    SequentialImageGenerationOption *model.SequentialImageGenerationOptions `json:"sequential_image_generation_option"`
    
    // ResponseFormat specifies how the generated image data is returned.
    // Possible values:
    //  - "url": A temporary URL to download the image (valid for 24 hours).
    //  - "b64_json": The image data encoded as a Base64 string in the response.
    // Optional. Defaults to "url".
    ResponseFormat ImageResponseFormat `json:"response_format"`
    
    // DisableWatermark, if set to true, removes the "AI Generated" watermark
    // from the bottom-right corner of the image.
    // Optional. Defaults to false.
    DisableWatermark bool `json:"disable_watermark"`
}
```

## Examples

### Text Generation

```go
package main

import (
        "context"
        "encoding/json"
        "errors"
        "io"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })

        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        inMsgs := []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "how do you generate answer for user question as a machine, please answer in short?",
                },
        }

        msg, err := chatModel.Generate(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("generate output:")
        log.Printf("  request_id: %s", ark.GetArkRequestID(msg))
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s", string(respBody))

        sr, err := chatModel.Stream(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        chunks := make([]*schema.Message, 0, 1024)
        for {
                msgChunk, err := sr.Recv()
                if errors.Is(err, io.EOF) {
                        break
                }
                if err != nil {
                        log.Fatalf("Stream Recv failed, err=%v", err)
                }

                chunks = append(chunks, msgChunk)
        }

        msg, err = schema.ConcatMessages(chunks)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }

        log.Printf("stream final output:")
        log.Printf("  request_id: %s", ark.GetArkRequestID(msg))
        respBody, _ = json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s \n", string(respBody))
}
```

### Multimodal Support (Image Understanding)

```go
package main

import (
        "context"
        "encoding/base64"
        "log"
        "os"

        "github.com/cloudwego/eino/components/prompt"
        "github.com/cloudwego/eino/compose"
        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        multiModalMsg := schema.UserMessage("")
        image, err := os.ReadFile("./examples/generate_with_image/eino.png")
        if err != nil {
                log.Fatalf("os.ReadFile failed, err=%v \n", err)
        }

        imageStr := base64.StdEncoding.EncodeToString(image)

        multiModalMsg.UserInputMultiContent = []schema.MessageInputPart{
                {
                        Type: schema.ChatMessagePartTypeText,
                        Text: "What do you see in this image?",
                },
                {
                        Type: schema.ChatMessagePartTypeImageURL,
                        Image: &schema.MessageInputImage{
                                MessagePartCommon: schema.MessagePartCommon{
                                        Base64Data: &imageStr,
                                        MIMEType:   "image/png",
                                },
                                Detail: schema.ImageURLDetailAuto,
                        },
                },
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                multiModalMsg,
        })
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("Ark ChatModel output:%v \n", resp)

        // demonstrate how to use ChatTemplate to generate with image
        imgPlaceholder := "{img}"
        ctx = context.Background()
        chain := compose.NewChain[map[string]any, *schema.Message]()
        _ = chain.AppendChatTemplate(prompt.FromMessages(schema.FString,
                &schema.Message{
                        Role: schema.User,
                        UserInputMultiContent: []schema.MessageInputPart{
                                {
                                        Type: schema.ChatMessagePartTypeText,
                                        Text: "What do you see in this image?",
                                },
                                {
                                        Type: schema.ChatMessagePartTypeImageURL,
                                        Image: &schema.MessageInputImage{
                                                MessagePartCommon: schema.MessagePartCommon{
                                                        Base64Data: &imgPlaceholder,
                                                        MIMEType:   "image/png",
                                                },
                                                Detail: schema.ImageURLDetailAuto,
                                        },
                                },
                        },
                }))
        _ = chain.AppendChatModel(chatModel)
        r, err := chain.Compile(ctx)
        if err != nil {
                log.Fatalf("Compile failed, err=%v", err)
        }

        resp, err = r.Invoke(ctx, map[string]any{
                "img": imageStr,
        })
        if err != nil {
                log.Fatalf("Run failed, err=%v", err)
        }

        log.Printf("Ark ChatModel output with ChatTemplate:%v \n", resp)
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

        "github.com/cloudwego/eino-ext/components/model/ark"
        "github.com/cloudwego/eino/schema"
        arkModel "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v", err)
                return
        }

        streamMsgs, err := chatModel.Stream(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        }, ark.WithReasoningEffort(arkModel.ReasoningEffortHigh))

        if err != nil {
                log.Printf("Generate failed, err=%v", err)
                return
        }

        defer streamMsgs.Close() // do not forget to close the stream

        msgs := make([]*schema.Message, 0)

        log.Printf("typewriter output:")
        for {
                msg, err := streamMsgs.Recv()
                if err == io.EOF {
                        break
                }
                msgs = append(msgs, msg)
                if err != nil {
                        log.Printf("stream.Recv failed, err=%v", err)
                        return
                }
                fmt.Print(msg.Content)
        }

        msg, err := schema.ConcatMessages(msgs)
        if err != nil {
                log.Printf("ConcatMessages failed, err=%v", err)
                return
        }

        log.Printf("output: %s \n", msg.Content)
}
```

### Tool Calling

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/ark"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v", err)
                return
        }

        err = chatModel.BindTools([]*schema.ToolInfo{
                {
                        Name: "user_company",
                        Desc: "Query the user's company and position information based on their name and email",
                        ParamsOneOf: schema.NewParamsOneOfByParams(
                                map[string]*schema.ParameterInfo{
                                        "name": {
                                                Type: "string",
                                                Desc: "The user's name",
                                        },
                                        "email": {
                                                Type: "string",
                                                Desc: "The user's email",
                                        },
                                }),
                },
                {
                        Name: "user_salary",
                        Desc: "Query the user's salary information based on their name and email",
                        ParamsOneOf: schema.NewParamsOneOfByParams(
                                map[string]*schema.ParameterInfo{
                                        "name": {
                                                Type: "string",
                                                Desc: "The user's name",
                                        },
                                        "email": {
                                                Type: "string",
                                                Desc: "The user's email",
                                        },
                                }),
                },
        })
        if err != nil {
                log.Printf("BindForcedTools failed, err=%v", err)
                return
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.System,
                        Content: "You are a real estate agent. Use the user_company and user_salary APIs to provide relevant property information based on the user's salary and job. Email is required",
                },
                {
                        Role:    schema.User,
                        Content: "My name is zhangsan, and my email is zhangsan@bytedance.com. Please recommend some suitable houses for me.",
                },
        })

        if err != nil {
                log.Printf("Generate failed, err=%v", err)
                return
        }

        log.Printf("output:%v \n", resp)
}
```

### Image Generation

```go
package main

import (
        "context"
        "encoding/json"
        "errors"
        "io"
        "log"
        "os"

        "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"

        "github.com/cloudwego/eino-ext/components/model/ark"
        "github.com/cloudwego/eino/schema"
)

func ptr[T any](v T) *T {
        return &v
}

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        imageGenerationModel, err := ark.NewImageGenerationModel(ctx, &ark.ImageGenerationConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),

                // Control the size of image generated by the model.
                Size: "1K",

                // Control whether to generate a set of images.
                SequentialImageGeneration: ark.SequentialImageGenerationAuto,

                // Control the maximum number of images to generate
                SequentialImageGenerationOption: &model.SequentialImageGenerationOptions{
                        MaxImages: ptr(2),
                },

                // Control the format of the generated jpeg image.
                ResponseFormat: ark.ImageResponseFormatURL,

                // Control whether to add a watermark to the generated image
                DisableWatermark: false,
        })

        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        inMsgs := []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "generate two images of a cat",
                },
        }

        // Use ImageGeneration API
        msg, err := imageGenerationModel.Generate(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("generate output:")
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s \n", string(respBody))

        sr, err := imageGenerationModel.Stream(ctx, inMsgs)
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        log.Printf("stream output:")
        index := 0
        chunks := make([]*schema.Message, 0, 1024)
        for {
                msgChunk, err := sr.Recv()
                if errors.Is(err, io.EOF) {
                        break
                }
                if err != nil {
                        log.Fatalf("Stream Recv failed, err=%v", err)
                }

                chunks = append(chunks, msgChunk)

                respBody, _ = json.MarshalIndent(msgChunk, "  ", "  ")
                log.Printf("stream chunk %d: body: %s\n", index, string(respBody))
                index++
        }

        msg, err = schema.ConcatMessages(chunks)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }
        log.Printf("stream final output:")
        log.Printf("  request_id: %s \n", ark.GetArkRequestID(msg))
        respBody, _ = json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s \n", string(respBody))
}
```

### ContextAPI Prefix Cache

```go
package main

import (
        "context"
        "encoding/json"
        "io"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        info, err := chatModel.CreatePrefixCache(ctx, []*schema.Message{
                schema.UserMessage("my name is megumin"),
        }, 3600)
        if err != nil {
                log.Fatalf("CreatePrefix failed, err=%v", err)
        }

        inMsgs := []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "what is my name?",
                },
        }

        msg, err := chatModel.Generate(ctx, inMsgs, ark.WithCache(&ark.CacheOption{
                APIType:   ark.ContextAPI,
                ContextID: &info.ContextID,
        }))
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        log.Printf("\ngenerate output: \n")
        log.Printf("  request_id: %s\n", ark.GetArkRequestID(msg))
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s\n", string(respBody))

        outStreamReader, err := chatModel.Stream(ctx, inMsgs, ark.WithCache(&ark.CacheOption{
                APIType:   ark.ContextAPI,
                ContextID: &info.ContextID,
        }))
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        var msgs []*schema.Message
        for {
                item, e := outStreamReader.Recv()
                if e == io.EOF {
                        break
                }
                if e != nil {
                        log.Fatal(e)
                }

                msgs = append(msgs, item)
        }
        msg, err = schema.ConcatMessages(msgs)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }
        log.Printf("\nstream output: \n")
        log.Printf("  request_id: %s\n", ark.GetArkRequestID(msg))
        respBody, _ = json.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s\n", string(respBody))
}
```

### Response API Prefix Cache

```go
package main

import (
        "context"
        "encoding/json"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
                Cache: &ark.CacheConfig{
                        APIType: ptrOf(ark.ResponsesAPI),
                },
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        err = chatModel.BindTools([]*schema.ToolInfo{
                {
                        Name: "article_content_extractor",
                        Desc: "Extract key statements and chapter summaries from the provided article content",
                        ParamsOneOf: schema.NewParamsOneOfByParams(
                                map[string]*schema.ParameterInfo{
                                        "content": {
                                                Type:     schema.String,
                                                Desc:     "The full article content to analyze and extract key information from",
                                                Required: true,
                                        },
                                }),
                },
        })

        if err != nil {
                log.Fatalf("BindTools failed, err=%v", err)
        }

        // create response prefix cache, note: more than 1024 tokens are required, otherwise the prefix cache cannot be created
        cacheInfo, err := chatModel.CreatePrefixCache(ctx, []*schema.Message{
                schema.SystemMessage(`Once upon a time, in a quaint little village surrounded by vast green forests and blooming meadows, there lived a spirited young girl known as Little Red Riding Hood. She earned her name from the vibrant red cape that her beloved grandmother had sewn for her, a gift that she cherished deeply. This cape was more than just a piece of clothing; it was a symbol of the bond between her and her grandmother, who lived on the other side of the great woods, near a sparkling brook that bubbled merrily all year round.

                        One sunny morning, Little Red Riding Hood's mother called her into the cozy kitchen, where the aroma of freshly baked bread filled the air. "My dear," she said, "your grandmother isn't feeling well today. I want you to take her this basket of treats. There are some delicious cakes, a jar of honey, and her favorite herbal tea. Can you do that for me?"
                        
                        Little Red Riding Hood's eyes sparkled with excitement as she nodded eagerly. "Yes, Mama! I'll take good care of them!" Her mother handed her a beautifully woven basket, filled to the brim with goodies, and reminded her, "Remember to stay on the path and don't talk to strangers."
                        
                        "I promise, Mama!" she replied confidently, pulling her red hood over her head and setting off on her adventure. The sun shone brightly, and birds chirped merrily as she walked, making her feel like she was in a fairy tale.
                        
                        As she journeyed through the woods, the tall trees whispered secrets to one another, and colorful flowers danced in the gentle breeze. Little Red Riding Hood was so enchanted by the beauty around her that she began to hum a tune, her voice harmonizing with the sounds of nature.
                        
                        However, unbeknownst to her, lurking in the shadows was a cunning wolf. The wolf was known throughout the forest for his deceptive wit and insatiable hunger. He watched Little Red Riding Hood with keen interest, contemplating his next meal.
                        
                        "Good day, little girl!" the wolf called out, stepping onto the path with a friendly yet sly smile.
                        
                        Startled, she halted and took a step back. "Hello there! I'm just on my way to visit my grandmother," she replied, clutching the basket tightly.
                        
                        "Ah, your grandmother! I know her well," the wolf said, his eyes glinting with mischief. "Why don't you pick some lovely flowers for her? I'm sure she would love them, and I'm sure there are many beautiful ones just off the path."
                        
                        Little Red Riding Hood hesitated for a moment but was easily convinced by the wolf's charming suggestion. "That's a wonderful idea! Thank you!" she exclaimed, letting her curiosity pull her away from the safety of the path. As she wandered deeper into the woods, her gaze fixed on the vibrant blooms, the wolf took a shortcut towards her grandmother's house.
                        
                        When the wolf arrived at Grandma's quaint cottage, he knocked on the door with a confident swagger. "It's me, Little Red Riding Hood!" he shouted in a high-pitched voice to mimic the girl.
                        
                        "Come in, dear!" came the frail voice of the grandmother, who had been resting on her cozy bed, wrapped in warm blankets. The wolf burst through the door, his eyes gleaming with the thrill of his plan.
                        
                        With astonishing speed, the wolf gulped down the unsuspecting grandmother whole. Afterward, he dressed in her nightgown, donning her nightcap and climbing into her bed. He lay there, waiting for Little Red Riding Hood to arrive, concealing his wicked smile behind a facade of innocence.
                        
                        Meanwhile, Little Red Riding Hood was merrily picking flowers, completely unaware of the impending danger. After gathering a beautiful bouquet of wildflowers, she finally made her way back to the path and excitedly skipped towards her grandmother's cottage.
                        
                        Upon arriving, she noticed the door was slightly ajar. "Grandmother, it's me!" she called out, entering the dimly lit home. It was silent, with only the faint sound of an old clock ticking in the background. She stepped into the small living room, a feeling of unease creeping over her.
                        
                        "Grandmother, are you here?" she asked, peeking into the bedroom. There, she saw a figure lying under the covers. 
                        
                        "Grandmother, what big ears you have!" she exclaimed, taking a few cautious steps closer.
                        
                        "All the better to hear you with, my dear," the wolf replied in a voice that was deceptively sweet.
                        
                        "Grandmother, what big eyes you have!" Little Red Riding Hood continued, now feeling an unsettling chill in the air.
                        
                        "All the better to see you with, my dear," the wolf said, his eyes narrowing as he tried to contain his glee.
                        
                        "Grandmother, what big teeth you have!" she exclaimed, the terror flooding her senses as she began to realize this was no ordinary visit.
                        
                        "All the better to eat you with!" the wolf roared, springing out of the bed with startling speed.
                        
                        Just as the wolf lunged towards her, a brave woodsman, who had been passing by the cottage and heard the commotion, burst through the door. His strong presence was a beacon of hope in the dire situation. "Stay back, wolf!" he shouted with authority, brandishing his axe.
                        
                        The wolf, taken aback by the sudden intrusion, hesitated for a moment. Before he could react, the woodsman swung his axe with determination, and with a swift motion, he drove the wolf away, rescuing Little Red Riding Hood and her grandmother from certain doom.
                        
                        Little Red Riding Hood was shaking with fright, but relief washed over her as the woodsman helped her grandmother out from behind the bed where the wolf had hidden her. The grandmother, though shaken, was immensely grateful to the woodsman for his bravery. "Thank you so much! You saved us!" she cried, embracing him warmly.
                        
                        Little Red Riding Hood, still in shock but filled with gratitude, looked up at the woodsman and said, "I promise I will never stray from the path again. Thank you for being our hero!"
                        
                        From that day on, the woodland creatures spoke of the brave woodsman who saved Little Red Riding Hood and her grandmother. Little Red Riding Hood learned a valuable lesson about being cautious and listening to her mother's advice. The bond between her and her grandmother grew stronger, and they often reminisced about that day's adventure over cups of tea, surrounded by cookies and laughter.
                        
                        To ensure safety, Little Red Riding Hood always took extra precautions when traveling through the woods, carrying a small whistle her grandmother had given her. It would alert anyone nearby if she ever found herself in trouble again.
                        
                        And so, in the heart of that small village, life continued, filled with love, laughter, and the occasional adventure, as Little Red Riding Hood and her grandmother thrived, forever grateful for the friendship of the woodsman who had acted as their guardian that fateful day.
                        
                        And they all lived happily ever after.
                        
                        The end.`),
        }, 300)
        if err != nil {
                log.Fatalf("CreatePrefixCache failed, err=%v", err)
        }

        // use cache information in subsequent requests
        cacheOpt := &ark.CacheOption{
                APIType:                ark.ResponsesAPI,
                HeadPreviousResponseID: &cacheInfo.ResponseID,
        }

        outMsg, err := chatModel.Generate(ctx, []*schema.Message{
                schema.UserMessage("What is the main idea expressed above？"),
        }, ark.WithCache(cacheOpt))

        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        respID, ok := ark.GetResponseID(outMsg)
        if !ok {
                log.Fatalf("not found response id in message")
        }

        log.Printf("\ngenerate output: \n")
        log.Printf("  request_id: %s\n", respID)
        respBody, _ := json.MarshalIndent(outMsg, "  ", "  ")
        log.Printf("  body: %s\n", string(respBody))
}
func ptrOf[T any](v T) *T {
        return &v

}
```

When you don't want to use cache for messages that have already been cached, you can call `InvalidateMessageCaches(messages []*schema.Message) error` to clear the cache markers in the messages. This way, when the ARK SDK constructs the Responses API request, it cannot find the corresponding ResponseID based on the cache marker, and thus will not assign a value to PreviousResponseID in the Responses API.

### ContextAPI Session Cache

```go
package main

import (
        "context"
        "encoding/json"
        "fmt"
        "io"
        "log"
        "os"
        "time"

        arkModel "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"

        "github.com/cloudwego/eino-ext/components/model/ark"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        instructions := []*schema.Message{
                schema.SystemMessage("Your name is superman"),
        }

        cacheInfo, err := chatModel.CreateSessionCache(ctx, instructions, 86400, nil)
        if err != nil {
                log.Fatalf("CreateSessionCache failed, err=%v", err)
        }

        thinking := &arkModel.Thinking{
                Type: arkModel.ThinkingTypeDisabled,
        }

        cacheOpt := &ark.CacheOption{
                APIType:   ark.ContextAPI,
                ContextID: &cacheInfo.ContextID,
                SessionCache: &ark.SessionCacheConfig{
                        EnableCache: true,
                        TTL:         86400,
                },
        }

        msg, err := chatModel.Generate(ctx, instructions,
                ark.WithThinking(thinking),
                ark.WithCache(cacheOpt))
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        <-time.After(500 * time.Millisecond)

        msg, err = chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "What's your name?",
                },
        },
                ark.WithThinking(thinking),
                ark.WithCache(cacheOpt))
        if err != nil {
                log.Fatalf("Generate failed, err=%v", err)
        }

        fmt.Printf("\ngenerate output: \n")
        fmt.Printf("  request_id: %s\n", ark.GetArkRequestID(msg))
        respBody, _ := json.MarshalIndent(msg, "  ", "  ")
        fmt.Printf("  body: %s\n", string(respBody))

        outStreamReader, err := chatModel.Stream(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "What do I ask you last time?",
                },
        },
                ark.WithThinking(thinking),
                ark.WithCache(cacheOpt))
        if err != nil {
                log.Fatalf("Stream failed, err=%v", err)
        }

        fmt.Println("\ntypewriter output:")
        var msgs []*schema.Message
        for {
                item, e := outStreamReader.Recv()
                if e == io.EOF {
                        break
                }
                if e != nil {
                        log.Fatal(e)
                }

                fmt.Print(item.Content)
                msgs = append(msgs, item)
        }

        msg, err = schema.ConcatMessages(msgs)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }
        fmt.Print("\n\nstream output: \n")
        fmt.Printf("  request_id: %s\n", ark.GetArkRequestID(msg))
        respBody, _ = json.MarshalIndent(msg, "  ", "  ")
        fmt.Printf("  body: %s\n", string(respBody))
}
```

### ResponseAPI Session Cache

```go
package main

import (
        "context"
        "fmt"
        "io"
        "log"
        "os"

        arkModel "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ark"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Model:  os.Getenv("ARK_MODEL_ID"),
                Cache: &ark.CacheConfig{
                        SessionCache: &ark.SessionCacheConfig{
                                EnableCache: true,
                                TTL:         86400,
                        },
                },
        })
        if err != nil {
                log.Fatalf("NewChatModel failed, err=%v", err)
        }

        thinking := &arkModel.Thinking{
                Type: arkModel.ThinkingTypeDisabled,
        }
        cacheOpt := &ark.CacheOption{
                APIType: ark.ResponsesAPI,
                SessionCache: &ark.SessionCacheConfig{
                        EnableCache: true,
                        TTL:         86400,
                },
        }

        useMsgs := []*schema.Message{
                schema.UserMessage("Your name is superman"),
                schema.UserMessage("What's your name?"),
                schema.UserMessage("What do I ask you last time?"),
        }

        var input []*schema.Message
        for _, msg := range useMsgs {
                input = append(input, msg)

                streamResp, err := chatModel.Stream(ctx, input,
                        ark.WithThinking(thinking),
                        ark.WithCache(cacheOpt))
                if err != nil {
                        log.Fatalf("Stream failed, err=%v", err)
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

                resp, err := schema.ConcatMessages(messages)
                if err != nil {
                        log.Fatalf("ConcatMessages of ark failed, err=%v", err)
                }

                fmt.Printf("stream output: \n%v\n\n", resp)

                input = append(input, resp)
        }
}
```

When you don't want to use cache for messages that have already been cached, you can call `InvalidateMessageCaches(messages []*schema.Message) error` to clear the cache markers in the messages. This way, when the ARK SDK constructs the Responses API request, it cannot find the corresponding ResponseID based on the cache marker, and thus will not assign a value to PreviousResponseID in the Responses API.

## **Usage**

### ChatModel

#### **Component Initialization**

The Ark model is initialized through the `NewChatModel` function with the following main configuration parameters:

```go
import "github.com/cloudwego/eino-ext/components/model/ark"

model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
    // Service configuration
    BaseURL:    "https://ark.cn-beijing.volces.com/api/v3", // Service URL
    Region:     "cn-beijing",                               // Region
    HTTPClient: httpClient,                                 // Custom HTTP client
    Timeout:    &timeout,                                   // Timeout
    RetryTimes: &retries,                                  // Retry times
    
    // Authentication configuration (choose one)
    APIKey:    "your-api-key",     // API Key authentication
    AccessKey: "your-ak",          // AK/SK authentication
    SecretKey: "your-sk",
    
    // Model configuration
    Model:     "endpoint-id",      // Model endpoint ID
    
    // Generation parameters
    MaxTokens:         &maxTokens, // Maximum generation length
    Temperature:       &temp,      // Temperature
    TopP:             &topP,      // Top-P sampling
    Stop:             []string{},  // Stop words
    FrequencyPenalty: &fp,        // Frequency penalty
    PresencePenalty:  &pp,        // Presence penalty
    
    // Advanced parameters
    LogitBias:        map[string]int{}, // Token bias
    CustomHeader:     map[string]string{}, // HTTP custom header
})
```

#### **Generate Conversation**

Conversation generation supports both normal mode and streaming mode:

```go
func main() {
    // Normal mode
    response, err := model.Generate(ctx, messages)
    
    // Streaming mode
    stream, err := model.Stream(ctx, messages)
}
```

Message format example:

> Note: Whether multimodal images are supported depends on the specific model

```go
func main() {
    imgUrl := "https://example.com/image.jpg",
    messages := []*schema.Message{
        // System message
        schema.SystemMessage("You are an assistant"),
        
        // Multimodal message (with image)
        {
            Role: schema.User,
            UserInputMultiContent: []schema.MessageInputPart{
                {
                    Type: schema.ChatMessagePartTypeText,
                    Text: "What is this image?",
                },
                {
                    Type: schema.ChatMessagePartTypeImageURL,
                    Image: &schema.MessageInputImage{
                        MessagePartCommon: schema.MessagePartCommon{
                            URL: &imgUrl,
                        },
                    Detail: schema.ImageURLDetailAuto,
                    },
                },
            },
        },
    }
}
```

#### **Tool Calling**

Supports binding tools:

```go
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

// Bind tools
err := model.BindTools(tools)
```

> For tool-related information, please refer to [Eino: ToolsNode Guide](/docs/eino/core_modules/components/tools_node_guide)

#### **Complete Usage Examples**

##### **Direct Conversation**

```go
package main

import (
    "context"
    "time"

    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    timeout := 30 * time.Second
    // Initialize model
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
       APIKey:  "your-api-key",
       Region:  "cn-beijing",
       Model:   "endpoint-id",
       Timeout: &timeout,
    })
    if err != nil {
       panic(err)
    }

    // Prepare messages
    messages := []*schema.Message{
       schema.SystemMessage("You are an assistant"),
       schema.UserMessage("Introduce Volcengine"),
    }

    // Generate response
    response, err := model.Generate(ctx, messages)
    if err != nil {
       panic(err)
    }

    // Process response
    println(response.Content)

    // Get token usage
    if usage := response.ResponseMeta.Usage; usage != nil {
       println("Prompt Tokens:", usage.PromptTokens)
       println("Completion Tokens:", usage.CompletionTokens)
       println("Total Tokens:", usage.TotalTokens)
    }
}
```

##### **Streaming Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        APIKey:  "your-api-key",
        Model:   "ep-xxx",
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Introduce Eino"),
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

### ImageGeneration Model

#### Component Initialization

The Seedream (seedream4.0) image generation model is initialized through the `NewImageGenerationModel` function:

```go
import "github.com/cloudwego/eino-ext/components/model/ark"

// Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
imageGenerationModel, err := ark.NewImageGenerationModel(ctx, &ark.ImageGenerationConfig{
    // Service configuration
    BaseURL:    "https://ark.cn-beijing.volces.com/api/v3", // Service URL
    Region:     "cn-beijing",                               // Region
    HTTPClient: httpClient,                                 // Custom HTTP client
    Timeout:    &timeout,                                   // Timeout
    RetryTimes: &retries,                                  // Retry times
    
    // Model configuration
    APIKey: os.Getenv("ARK_API_KEY"),
    Model:  os.Getenv("ARK_MODEL_ID"),

    // Generation configuration
    Size:                             "1K",                                     // Specify generated image size
    SequentialImageGeneration:        ark.SequentialImageGenerationAuto,        // Determine whether to generate a set of images
    SequentialImageGenerationOption:  &model.SequentialImageGenerationOptions{  // Maximum number of images when generating a set
       MaxImages: ptr(2),
    },
    ResponseFormat:   ark.ImageResponseFormatURL,                               // Image data return method, URL or Base64
    DisableWatermark: false,                                                    // Whether to include "AI Generated" watermark
})
```

#### Generate Conversation

The image generation model also supports both normal mode and streaming mode:

```go
func main() {
    // Normal mode
    response, err := model.Generate(ctx, messages)
    
    // Streaming mode
    stream, err := model.Stream(ctx, messages)
}
```

#### Complete Usage Examples

##### Direct Conversation

```go
import (
    "context"
    "encoding/json"
    "errors"
    "io"
    "log"
    "os"

    "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"

    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

// Pointer helper function
func ptr[T any](v T) *T {
    return &v
}

func main() {
    // Initialize model
    ctx := context.Background()
    imageGenerationModel, err := ark.NewImageGenerationModel(ctx, &ark.ImageGenerationConfig{
       APIKey: os.Getenv("ARK_API_KEY"),
       Model:  os.Getenv("ARK_MODEL_ID"),
       Size: "1920x1080",
       SequentialImageGeneration: ark.SequentialImageGenerationDisabled,
       ResponseFormat: ark.ImageResponseFormatURL,
       DisableWatermark: false,
    })

    if err != nil {
       log.Fatalf("NewChatModel failed, err=%v", err)
    }

    // Prepare messages
    inMsgs := []*schema.Message{
       {
          Role:    schema.User,
          Content: "generate two images of a cat",
       },
    }

    // Generate image
    msg, err := imageGenerationModel.Generate(ctx, inMsgs)
    if err != nil {
       log.Fatalf("Generate failed, err=%v", err)
    }

    // Print image information
    log.Printf("\ngenerate output: \n")
    respBody, _ := json.MarshalIndent(msg, "  ", "  ")
    log.Printf("  body: %s\n", string(respBody))
}
```

##### Streaming Conversation

```go
import (
    "context"
    "encoding/json"
    "errors"
    "io"
    "log"
    "os"

    "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"

    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

// Pointer helper function
func ptr[T any](v T) *T {
    return &v
}

func main() {
    // Initialize model
    ctx := context.Background()
    imageGenerationModel, err := ark.NewImageGenerationModel(ctx, &ark.ImageGenerationConfig{
       APIKey: os.Getenv("ARK_API_KEY"),
       Model:  os.Getenv("ARK_MODEL_ID"),
       Size: "1K",
       SequentialImageGeneration: ark.SequentialImageGenerationAuto,
       SequentialImageGenerationOption: &model.SequentialImageGenerationOptions{
          MaxImages: ptr(2),
       },
       ResponseFormat: ark.ImageResponseFormatURL,
       DisableWatermark: false,
    })

    if err != nil {
       log.Fatalf("NewChatModel failed, err=%v", err)
    }

    // Prepare messages
    inMsgs := []*schema.Message{
       {
          Role:    schema.User,
          Content: "generate two images of a cat",
       },
    }

    // Stream generate images
    sr, err := imageGenerationModel.Stream(ctx, inMsgs)
    if err != nil {
        log.Fatalf("Stream failed, err=%v", err)
    }
    
    // Process streaming information
    log.Printf("stream output: \n")
    index := 0
    for {
        msgChunk, err := sr.Recv()
        if errors.Is(err, io.EOF) {
           break
        }
        if err != nil {
           log.Fatalf("Stream Recv failed, err=%v", err)
        }
    
        respBody, _ = json.MarshalIndent(msgChunk, "  ", "  ")
        log.Printf("stream chunk %d: body: %s\n", index, string(respBody))
        index++
    }
}
```

### [More Examples](https://github.com/cloudwego/eino-ext/tree/main/components/model/ark/examples)

## **Related Documentation**

- [Eino: ChatModel Guide](/docs/eino/core_modules/components/chat_model_guide)
- [ChatModel - OpenAI](/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
- [ChatModel - Ollama](/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
- [Volcengine Official Site](https://www.volcengine.com/product/doubao)
