---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: ChatModel - Ollama
weight: 0
---

# Ollama 模型

一个针对 [Eino](https://github.com/cloudwego/eino) 的 Ollama 模型实现，实现了 `ToolCallingChatModel` 接口。这使得能够与 Eino 的 LLM 功能无缝集成，以增强自然语言处理和生成能力。

## 特性

- 实现了 `github.com/cloudwego/eino/components/model.Model`
- 轻松与 Eino 的模型系统集成
- 可配置的模型参数
- 支持聊天补全
- 支持流式响应
- 支持自定义响应解析
- 灵活的模型配置

## 安装

```bash
go get github.com/cloudwego/eino-ext/components/model/ollama@latest
```

## 快速开始

以下是如何使用 Ollama 模型的快速示例：

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {
        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL: "http://localhost:11434",
                Model:   modelName,
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v\n", err)
                return
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })
        if err != nil {
                log.Printf("Generate failed, err=%v\n", err)
                return
        }

        log.Printf("output: \n%v\n", resp)
}
```

## 配置

可以使用 `ollama.ChatModelConfig` 结构体配置模型：

```go
type ChatModelConfig struct {
    BaseURL string        `json:"base_url"`
    Timeout time.Duration `json:"timeout"` // request timeout for http client
    
    // HTTPClient specifies the client to send HTTP requests.
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default &http.Client{Timeout: Timeout}
    HTTPClient *http.Client `json:"http_client"`
    
    Model     string          `json:"model"`
    Format    json.RawMessage `json:"format"`
    KeepAlive *time.Duration  `json:"keep_alive"`
    
    Options *Options `json:"options"`
    
    Thinking *ThinkValue `json:"thinking"`
}


type Options struct {
    Runner
    
    // NumKeep specifies the number of tokens from the prompt to retain when the context size is exceeded and tokens need to be trimmed.
    NumKeep int `json:"num_keep,omitempty"`
    // Seed sets the random number seed for the model. Using the same seed with the same parameters will produce the same output.
    Seed int `json:"seed,omitempty"`
    // NumPredict sets the maximum number of tokens to generate.
    NumPredict int `json:"num_predict,omitempty"`
    // TopK controls the diversity of the generated text by limiting the selection of tokens to the top k most likely tokens.
    TopK int `json:"top_k,omitempty"`
    // TopP, also known as nucleus sampling, is another way to control the diversity of the generated text. It filters out the least likely tokens whose cumulative probability is below a certain threshold.
    TopP float32 `json:"top_p,omitempty"`
    // MinP is a parameter that works with TopP to ensure that the generated text is not too constrained. It sets a minimum probability for a token to be considered.
    MinP float32 `json:"min_p,omitempty"`
    // TypicalP is a parameter that helps to generate more "typical" or expected text by sampling from a reduced set of tokens that are considered typical.
    TypicalP float32 `json:"typical_p,omitempty"`
    // RepeatLastN specifies how many of the last N tokens to consider for penalizing repetition.
    RepeatLastN int `json:"repeat_last_n,omitempty"`
    // Temperature controls the randomness of the generated text. A higher temperature results in more random and creative output, while a lower temperature produces more predictable and conservative text.
    Temperature float32 `json:"temperature,omitempty"`
    // RepeatPenalty is used to penalize the model for repeating tokens that have already appeared in the generated text.
    RepeatPenalty float32 `json:"repeat_penalty,omitempty"`
    // PresencePenalty is used to penalize the model for introducing new tokens that were not present in the prompt.
    PresencePenalty float32 `json:"presence_penalty,omitempty"`
    // FrequencyPenalty is used to penalize the model for using tokens that appear frequently in the training data.
    FrequencyPenalty float32 `json:"frequency_penalty,omitempty"`
    // Stop is a list of strings that will cause the generation to stop if they are encountered.
    Stop []string `json:"stop,omitempty"`
}

type ThinkValue struct {
    // Value can be a bool or string
    Value interface{}
}
```

## 示例

### 文本生成

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {
        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL: "http://localhost:11434",
                Model:   modelName,
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v\n", err)
                return
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })
        if err != nil {
                log.Printf("Generate failed, err=%v\n", err)
                return
        }

        log.Printf("output: \n%v\n", resp)
}
```

### 多模态支持(图片理解)

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {
        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL: "http://localhost:11434",
                Model:   modelName,
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v\n", err)
                return
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

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {
        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL: "http://localhost:11434",
                Model:   modelName,
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v\n", err)
                return
        }

        streamMsgs, err := chatModel.Stream(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })

        if err != nil {
                log.Printf("Generate failed, err=%v", err)
                return
        }

        defer streamMsgs.Close()

        log.Println("typewriter output:")
        for {
                msg, err := streamMsgs.Recv()
                if err == io.EOF {
                        break
                }
                if err != nil {
                        log.Printf("\nstream.Recv failed, err=%v", err)
                        return
                }
                fmt.Print(msg.Content)
        }

        fmt.Print("\n")
}
```

### 工具调用

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {

        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL: "http://localhost:11434",
                Model:   modelName,
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

        log.Printf("output: \n%+v", resp)
}
```

### 开启 Thinking 模式

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino/schema"
        ollamaapi "github.com/eino-contrib/ollama/api"

        "github.com/cloudwego/eino-ext/components/model/ollama"
)

func main() {
        ctx := context.Background()
        modelName := os.Getenv("MODEL_NAME")
        thinking := ollamaapi.ThinkValue{Value: true}
        chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
                BaseURL:  "http://localhost:11434",
                Model:    modelName,
                Thinking: &thinking,
        })
        if err != nil {
                log.Printf("NewChatModel failed, err=%v\n", err)
                return
        }

        resp, err := chatModel.Generate(ctx, []*schema.Message{
                {
                        Role:    schema.User,
                        Content: "as a machine, how do you answer user's question?",
                },
        })
        if err != nil {
                log.Printf("Generate failed, err=%v\n", err)
                return
        }

        log.Printf("output thinking: \n%v\n", resp.ReasoningContent)
        log.Printf("output content: \n%v\n", resp.Content)
}
```

## 

## **基本介绍**

~~Ollama 模型是 ChatModel 接口的一个实现，用于与 Ollama 本地大语言模型服务进行交互，Ollama 是一个开源的本地大语言模型运行框架，支持多种开源模型（如 Llama、Mistral 等），提供简单的 API 接口和完整的性能监控。。该组件实现了 ~~[Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)

## **使用方式**

### **组件初始化**

Ollama 模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
import (
    "github.com/cloudwego/eino-ext/components/model/ollama"
    "github.com/ollama/ollama/api"
)

model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    // 基础配置
    BaseURL: "http://localhost:11434", // Ollama 服务地址
    Timeout: 30 * time.Second,         // 请求超时时间

    // 模型配置
    Model:     "llama2",   // 模型名称
    Format:    json.RawMessage("json"),     // 输出格式（可选）
    KeepAlive: &keepAlive, // 保持连接时间

    // 模型参数
    Options: &api.Options{
       Runner: api.Runner{
          NumCtx:    4096, // 上下文窗口大小
          NumGPU:    1,    // GPU 数量
          NumThread: 4,    // CPU 线程数
       },
       Temperature:   0.7,        // 温度
       TopP:          0.9,        // Top-P 采样
       TopK:          40,         // Top-K 采样
       Seed:          42,         // 随机种子
       NumPredict:    100,        // 最大生成长度
       Stop:          []string{}, // 停止词
       RepeatPenalty: 1.1,        // 重复惩罚
    },
})
```

### **生成对话**

对话生成支持普通模式和流式模式：

```go
// 普通模式
response, err := model.Generate(ctx, messages)
    
// 流式模式
stream, err := model.Stream(ctx, messages)
```

消息格式示例：

```go
import "github.com/cloudwego/eino/schema"

messages := []*schema.Message{
    // 系统消息
    schema.SystemMessage("你是一个助手"),
        
    // 用户消息
    schema.UserMessage("你好")
}
```

### **工具调用**

支持绑定工具：

> 注意，仅有支持 function call 的模型才能使用这个能力

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

// 绑定工具
err := model.BindTools(tools)
```

### **完整使用示例**

#### **基本对话**

```go
package main

import (
    "context"
    "time"

    "github.com/cloudwego/eino-ext/components/model/ollama"
    "github.com/cloudwego/eino/schema"
    "github.com/ollama/ollama/api"
)

func main() {
    ctx := context.Background()

    // 初始化模型
    model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
       BaseURL: "http://localhost:11434",
       Timeout: 30 * time.Second,
       Model:   "llama2",
       Options: &api.Options{
          Temperature: 0.7,
          NumPredict:  100,
       },
    })
    if err != nil {
       panic(err)
    }

    // 准备消息
    messages := []*schema.Message{
       schema.SystemMessage("你是一个助手"),
       schema.UserMessage("介绍一下 Ollama"),
    }

    // 生成回复
    response, err := model.Generate(ctx, messages)
    if err != nil {
       panic(err)
    }

    // 处理回复
    println(response.Content)
}
```

#### **流式对话**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ollama"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化模型
    model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
        BaseURL:  "http://localhost:11434",
        Timeout:  30 * time.Second,
        Model:    "llama2",
    })
    if err != nil {
        panic(err)
    }
    
    // 准备消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个助手"),
        schema.UserMessage("讲个笑话"),
    }
    
    // 获取流式回复
    stream, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer stream.Close() // 注意关闭 reader
    
    // 处理流式内容
    for {
        chunk, err := stream.Recv()
        if err != nil {
            break
        }
        print(chunk.Content)
    }
}
```

### [更多示例](https://github.com/cloudwego/eino-ext/tree/main/components/model/ollama/examples)

## **相关文档**

- [[🚧]Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [[🚧]ChatModel - OpenAI](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
- [[🚧]Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Ollama 模型库](https://ollama.ai/library)
