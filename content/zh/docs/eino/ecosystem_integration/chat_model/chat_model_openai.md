---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: ChatModel - OpenAI
weight: 0
---

## **基本介绍**

OpenAI 模型是 ChatModel 接口的一个实现，用于与 OpenAI 的 GPT 系列模型进行交互。该组件实现了 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)，主要用于以下场景：

- 需要使用 OpenAI 的 GPT 系列模型
- 需要使用 Azure OpenAI Service
- 使用其他 OpenAI 接口兼容的模型

## **使用方式**

### **组件初始化**

OpenAI 模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/model/openai"

func main() {
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
        N:                &n,        // 生成数量
        Stop:             []string{},// 停止词
        PresencePenalty:  &pp,      // 存在惩罚
        FrequencyPenalty: &fp,      // 频率惩罚
        
        // 高级参数
        ResponseFormat:   &format,   // 响应格式
        Seed:            &seed,      // 随机种子
        LogitBias:       map[string]int{}, // Token 偏置
        LogProbs:        &logProbs,  // 是否返回概率
        TopLogProbs:     &topLp,    // Top K 概率数量
        User:            &user,      // 用户标识
    })
}
```

> - 参数具体含义，可以参考: [https://platform.openai.com/docs/api-reference/chat/create](https://platform.openai.com/docs/api-reference/chat/create)
> - azure 相关服务，可以参考: [https://learn.microsoft.com/en-us/azure/ai-services/openai/](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

### **生成对话**

对话生成支持普通模式和流式模式：

```go
func main() {
    // invoke模式
    response, err := model.Generate(ctx, messages)
    
    // 流式模式
    stream, err := model.Stream(ctx, messages)
}
```

消息格式示例：

```go
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
                Type: schema.ChatMessagePartTypeImageURL,
                ImageURL: &schema.ChatMessageImageURL{
                    URL:    "https://example.com/image.jpg",
                    Detail: "high",
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
func main() {
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
}
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
    })
    if err != nil {
        panic(err)
    }
    
    // 准备消息
    messages := []*schema.Message{
        schema.SystemMessage("你是一个助手"),
        schema.UserMessage("介绍一下 eino"),
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

## **相关文档**

- [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - ARK](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ark)
- [ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)
