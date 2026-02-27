---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: ChatModel - Qianfan
weight: 0
---

## **Qianfan 模型**

一个针对 [Eino](https://github.com/cloudwego/eino) 的千帆模型实现，实现了 `ToolCallingChatModel` 接口。这使得能够与 Eino 的 LLM 功能无缝集成，以增强自然语言处理和生成能力。

## 特性

- 实现了 `github.com/cloudwego/eino/components/model.Model`
- 轻松与 Eino 的模型系统集成
- 可配置的模型参数
- 支持聊天补全
- 支持流式响应
- 自定义响应解析支持
- 灵活的模型配置

## 安装

```bash
go get github.com/cloudwego/eino-ext/components/model/qianfan@latest
```

## 快速开始

以下是如何使用千帆模型的快速示例：

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/qianfan"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()
        qcfg := qianfan.GetQianfanSingletonConfig()
        // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
        qcfg.AccessKey = "your_access_key"
        qcfg.SecretKey = "your_secret_key"
        modelName := os.Getenv("MODEL_NAME")
        cm, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
                Model:               modelName,
                Temperature:         of(float32(0.7)),
                TopP:                of(float32(0.7)),
                MaxCompletionTokens: of(1024),
                Seed:                of(0),
        })

        if err != nil {
                log.Fatalf("NewChatModel of qianfan failed, err=%v", err)
        }

        ir, err := cm.Generate(ctx, []*schema.Message{
                schema.UserMessage("hello"),
        })

        if err != nil {
                log.Fatalf("Generate of qianfan failed, err=%v", err)
        }

        fmt.Println(ir)
        // assistant: 你好！我是文心一言，很高兴与你交流。请问你有什么想问我的吗？无论是关于知识、创作还是其他任何问题，我都会尽力回答你。
}

func of[T any](t T) *T {
        return &t
}
```

## 配置

可以使用 `qianfan.ChatModelConfig` 结构体配置模型：

```go
// ChatModelConfig config for qianfan chat completion
// see: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Wm3fhy2vb
type ChatModelConfig struct {
        // Model is the model to use for the chat completion.
        Model string

        // LLMRetryCount is the number of times to retry a failed request.
        LLMRetryCount *int

        // LLMRetryTimeout is the timeout for each retry attempt.
        LLMRetryTimeout *float32

        // LLMRetryBackoffFactor is the backoff factor for retries.
        LLMRetryBackoffFactor *float32

        // Temperature controls the randomness of the output. A higher value makes the output more random, while a lower value makes it more focused and deterministic. Default is 0.95, range (0, 1.0].
        Temperature *float32

        // TopP controls the diversity of the output. A higher value increases the diversity of the generated text. Default is 0.7, range [0, 1.0].
        TopP *float32

        // PenaltyScore reduces the generation of repetitive tokens by adding a penalty. A higher value means a larger penalty. Range: [1.0, 2.0].
        PenaltyScore *float64

        // MaxCompletionTokens is the maximum number of tokens to generate in the completion. Range [2, 2048].
        MaxCompletionTokens *int

        // Seed is the random seed for generation. Range (0, 2147483647).
        Seed *int

        // Stop is a list of strings that will stop the generation when the model generates a token that is a suffix of one of the strings.
        Stop []string

        // User is a unique identifier representing the end-user.
        User *string

        // FrequencyPenalty specifies the frequency penalty to control the repetition of generated text. Range [-2.0, 2.0].
        FrequencyPenalty *float64

        // PresencePenalty specifies the presence penalty to control the repetition of generated text. Range [-2.0, 2.0].
        PresencePenalty *float64

        // ParallelToolCalls specifies whether to call tools in parallel. Defaults to true.
        ParallelToolCalls *bool

        // ResponseFormat specifies the format of the response.
        ResponseFormat *ResponseFormat
}
```

## 示例

### 文本生成

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/qianfan"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        qcfg := qianfan.GetQianfanSingletonConfig()
        // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
        qcfg.AccessKey = "your_access_key"
        qcfg.SecretKey = "your_secret_key"
        modelName := os.Getenv("MODEL_NAME")
        cm, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
                Model:               modelName,
                Temperature:         of(float32(0.7)),
                TopP:                of(float32(0.7)),
                MaxCompletionTokens: of(1024),
                Seed:                of(0),
        })

        if err != nil {
                log.Fatalf("NewChatModel of qianfan failed, err=%v", err)
        }

        ir, err := cm.Generate(ctx, []*schema.Message{
                schema.UserMessage("hello"),
        })

        if err != nil {
                log.Fatalf("Generate of qianfan failed, err=%v", err)
        }

        fmt.Println(ir)
}

func of[T any](t T) *T {
        return &t
}
```

### 多模态理解(图片理解)

```go
package main

import (
        "context"
        "encoding/base64"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/qianfan"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()
        qcfg := qianfan.GetQianfanSingletonConfig()
        // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
        qcfg.AccessKey = "your_access_key"
        qcfg.SecretKey = "your_secret_key"
        modelName := os.Getenv("MODEL_NAME")
        chatModel, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
                Model:               modelName,
                Temperature:         of(float32(0.7)),
                TopP:                of(float32(0.7)),
                MaxCompletionTokens: of(1024),
                Seed:                of(0),
        })

        if err != nil {
                log.Fatalf("NewChatModel of qianfan failed, err=%v", err)
        }

        image, err := os.ReadFile("./examples/generate_with_image/test.jpg")
        if err != nil {
                log.Fatalf("os.ReadFile failed, err=%v\n", err)
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
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
                                                        Base64Data: of(base64.StdEncoding.EncodeToString(image)),
                                                        MIMEType:   "image/jpeg",
                                                },
                                                Detail: schema.ImageURLDetailAuto,
                                        },
                                },
                        },
                },
        })
        if err != nil {
                log.Printf("Generate error: %v", err)
                return
        }
        fmt.Printf("Assistant: %s\n", resp.Content)
}

func of[T any](t T) *T {
        return &t
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

        "github.com/cloudwego/eino-ext/components/model/qianfan"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()
        qcfg := qianfan.GetQianfanSingletonConfig()
        // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
        qcfg.AccessKey = "your_access_key"
        qcfg.SecretKey = "your_secret_key"
        modelName := os.Getenv("MODEL_NAME")
        cm, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
                Model:               modelName,
                Temperature:         of(float32(0.7)),
                TopP:                of(float32(0.7)),
                MaxCompletionTokens: of(1024),
        })
        if err != nil {
                log.Fatalf("NewChatModel of qianfan failed, err=%v", err)
        }

        sr, err := cm.Stream(ctx, []*schema.Message{
                schema.UserMessage("hello"),
        })

        if err != nil {
                log.Fatalf("Stream of qianfan failed, err=%v", err)
        }

        var ms []*schema.Message
        for {
                m, err := sr.Recv()
                if err != nil {
                        if err == io.EOF {
                                break
                        }

                        log.Fatalf("Stream of qianfan failed, err=%v", err)
                }

                fmt.Println(m)
                ms = append(ms, m)
        }
        sm, err := schema.ConcatMessages(ms)
        if err != nil {
                log.Fatalf("ConcatMessages failed, err=%v", err)
        }

        fmt.Println(sm)
}

func of[T any](t T) *T {
        return &t
}
```

### 工具调用

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/model/qianfan"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()
        qcfg := qianfan.GetQianfanSingletonConfig()
        // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
        qcfg.AccessKey = "your_access_key"
        qcfg.SecretKey = "your_secret_key"

        modelName := os.Getenv("MODEL_NAME")
        cm, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
                Model:               modelName,
                Temperature:         of(float32(0.7)),
                TopP:                of(float32(0.7)),
                MaxCompletionTokens: of(1024),
        })
        if err != nil {
                log.Fatalf("NewChatModel of qianfan failed, err=%v", err)
        }

        err = cm.BindTools([]*schema.ToolInfo{
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
                log.Fatalf("BindTools of qianfan failed, err=%v", err)
        }

        resp, err := cm.Generate(ctx, []*schema.Message{
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
                log.Fatalf("Generate of qianfan failed, err=%v", err)
        }

        fmt.Println(resp)
}

func of[T any](t T) *T {
        return &t
}
```

## **使用方式**

### **组件初始化**

Qianfan  模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/model/qianfan"
ctx := context.Background()
qcfg := qianfan.GetQianfanSingletonConfig()
// How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
qcfg.AccessKey = "your_access_key"
qcfg.SecretKey = "your_secret_key"

model, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
    Model:                 "ernie-3.5-8k",      // 模型名称, 指定使用的模型，例如 ERNIE-Bot-4
    Temperature:           of(float32(0.7)),    // 温度，较高的值（如 0.8）会使输出更随机，而较低的值（如 0.2）会使其更具确定性。默认 0.95，范围 (0, 1.0]
    TopP:                  of(float32(0.7)),      // Top-p，影响输出文本的多样性，取值越大，生成文本的候选词越多。默认 0.7，范围 [0, 1.0]
    MaxCompletionTokens:   of(1024),            // 生成结果的最大 token 数量, 范围 [2, 2048]
    Seed:                  of(0),                 // 随机种子, 用于生成可复现结果, 范围 (0, 2147483647)
    Stop:                  make([]string, 0),     // 停止符, 一个字符串列表，当模型生成其中任何一个字符串时，会停止生成
    PenaltyScore:          nil,                   // 重复惩罚, 通过对已生成的 token 增加惩罚，减少重复。较高的值意味着较大的惩罚。范围 [1.0, 2.0]
    LLMRetryCount:         of(0),                 // 请求失败的重试次数
    LLMRetryTimeout:       nil,                   // 每次重试请求的超时时间（秒）
    LLMRetryBackoffFactor: nil,                   // 重试之间的等待时间的增长因子

    FrequencyPenalty:  nil, // 频率惩罚, 根据 token 在文本中出现的频率来惩罚新 token。较高的值会鼓励模型使用较不频繁的 token
    PresencePenalty:   nil, // 存在惩罚, 根据 token 是否已在文本中出现来惩罚新 token。较高的值会鼓励模型引入新概念
    ParallelToolCalls: nil, // 并行工具调用, 是否允许模型并行调用多个工具
    ResponseFormat:    &qianfan.ResponseFormat{}, // 指定响应的格式，例如 JSON
})
```

> - 参数具体含义，可以参考: [https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

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
    
    "github.com/cloudwego/eino-ext/components/model/qianfan"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    qcfg := qianfan.GetQianfanSingletonConfig()
    // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
    qcfg.AccessKey = "your_access_key"
    qcfg.SecretKey = "your_secret_key"
    
    model, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
        Model:                 "ernie-3.5-8k",      
        Temperature:           of(float32(0.7)),    
        TopP:                  of(float32(0.7)),     
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
        生成的多模态内容存储在 response.AssistantGenMultiContent 字段中
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
    
    "github.com/cloudwego/eino-ext/components/model/qianfan"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    qcfg := qianfan.GetQianfanSingletonConfig()
    // How to get Access Key/Secret Key: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
    qcfg.AccessKey = "your_access_key"
    qcfg.SecretKey = "your_secret_key"
    
    model, err := qianfan.NewChatModel(ctx, &qianfan.ChatModelConfig{
        Model:                 "ernie-3.5-8k",      
        Temperature:           of(float32(0.7)),    
        TopP:                  of(float32(0.7)),     
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

### [更多示例](https://github.com/cloudwego/eino-ext/tree/main/components/model/qianfan/examples)

## **相关文档**

- [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - ARK](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
- [ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
