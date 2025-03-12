---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: ChatModel - ARK
weight: 0
---

## **基本介绍**

Ark 是 ChatModel 接口的一个实现，用于与火山引擎 Ark Runtime 服务进行交互。Ark Runtime 是火山引擎提供的大语言模型运行时服务，提供了丰富的模型选择和完整的 API 功能。本组件通过 Ark Runtime Go SDK 与服务进行交互，可调用火山引擎上部署的 豆包大模型、暗影之月大模型 等。该组件实现了 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)。

## **使用方式**

### **组件初始化**

Ark 模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
    // 服务配置
    BaseURL:    "https://ark.cn-beijing.volces.com/api/v3", // 服务地址
    Region:     "cn-beijing",                               // 区域
    HTTPClient: httpClient,                                 // 自定义 HTTP 客户端
    Timeout:    &timeout,                                   // 超时时间
    RetryTimes: &retries,                                  // 重试次数
    
    // 认证配置（二选一）
    APIKey:    "your-api-key",     // API Key 认证
    AccessKey: "your-ak",          // AK/SK 认证
    SecretKey: "your-sk",
    
    // 模型配置
    Model:     "endpoint-id",      // 模型端点 ID
    
    // 生成参数
    MaxTokens:         &maxTokens, // 最大生成长度
    Temperature:       &temp,      // 温度
    TopP:             &topP,      // Top-P 采样
    Stop:             []string{},  // 停止词
    FrequencyPenalty: &fp,        // 频率惩罚
    PresencePenalty:  &pp,        // 存在惩罚
    
    // 高级参数
    LogitBias:        map[string]int{}, // Token 偏置
    CustomHeader:     map[string]string{}, // http custom header
})
```

### **生成对话**

对话生成支持普通模式和流式模式：

```go
func main() {
    // 普通模式
    response, err := model.Generate(ctx, messages)
    
    // 流式模式
    stream, err := model.Stream(ctx, messages)
}
```

消息格式示例：

> 注意，是否支持多模态的图片需要看具体的模型

```go
func main() {
    messages := []*schema.Message{
        // 系统消息
        schema.SystemMessage("你是一个助手"),
        
        // 文本消息
        schema.UserMessage("你好"),
        
        // 多模态消息（包含图片）
        {
            Role: schema.User,
            MultiContent: []schema.ChatMessagePart{
                {
                    Type: schema.ChatMessagePartTypeText,
                    Text: "这张图片是什么？",
                },
                {
                    Type: schema.ChatMessagePartTypeImageURL,
                    ImageURL: &schema.ChatMessageImageURL{
                        URL:    "https://example.com/image.jpg",
                        Detail: schema.ImageURLDetailAuto,
                    },
                },
            },
        },
    }
}
```

### **工具调用**

支持绑定工具：

```go
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

> 工具相关信息，可以参考 [[🚧]Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)

### **完整使用示例**

#### **直接对话**

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
    
    // 初始化模型
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        APIKey:  "your-api-key",
        Region:  "cn-beijing",
        Model:   "endpoint-id",
        Timeout: ptrOf(30 * time.Second),
    })
    if err != nil {
        panic(err)
    }
    
    // 准备消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个助手"),
        schema.UserMessage("介绍一下火山引擎"),
    }
    
    // 生成回复
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
    
    // 处理回复
    println(response.Content)
    
    // 获取 Token 使用情况
    if usage := response.ResponseMeta.Usage; usage != nil {
        println("提示 Tokens:", usage.PromptTokens)
        println("生成 Tokens:", usage.CompletionTokens)
        println("总 Tokens:", usage.TotalTokens)
    }
}
```

#### **流式对话**

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
    
    // 初始化模型
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        APIKey:  "your-api-key",
        Model:   "ep-xxx",
    })
    if err != nil {
        panic(err)
    }
    
    // 准备消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个助手"),
        schema.UserMessage("介绍一下 Eino"),
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

## **相关文档**

- [[🚧]Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [[🚧]ChatModel - OpenAI](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
- [[🚧]ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
- [火山引擎官网](https://www.volcengine.com/product/doubao)
