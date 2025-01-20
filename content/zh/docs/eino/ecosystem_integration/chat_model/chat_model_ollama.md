---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: ChatModel - Ollama
weight: 0
---

## **基本介绍**

Ollama 模型是 ChatModel 接口的一个实现，用于与 Ollama 本地大语言模型服务进行交互，Ollama 是一个开源的本地大语言模型运行框架，支持多种开源模型（如 Llama、Mistral 等），提供简单的 API 接口和完整的性能监控。。该组件实现了 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)

## **使用方式**

### **组件初始化**

Ollama 模型通过 `NewChatModel` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/model/ollama"

model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    // 基础配置
    BaseURL:  "http://localhost:11434", // Ollama 服务地址
    Timeout:  30 * time.Second,         // 请求超时时间
    
    // 模型配置
    Model:     "llama2",                // 模型名称
    Format:    "json",                  // 输出格式（可选）
    KeepAlive: &keepAlive,             // 保持连接时间
    
    // 模型参数
    Options: &api.Options{
        Temperature:     0.7,           // 温度
        TopP:           0.9,           // Top-P 采样
        TopK:           40,            // Top-K 采样
        Seed:           42,            // 随机种子
        NumPredict:     100,           // 最大生成长度
        Stop:           []string{},    // 停止词
        RepeatPenalty:  1.1,          // 重复惩罚
        NumCtx:         4096,          // 上下文窗口大小
        NumGPU:         1,             // GPU 数量
        NumThread:      4,             // CPU 线程数
    },
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

```go
func main() {
    messages := []*schema.Message{
        // 系统消息
        schema.SystemMessage("你是一个助手"),
        
        // 用户消息
        schema.UserMessage("你好")
    }
}
```

### **工具调用**

支持绑定工具：

> 注意，仅有支持 function call 的模型才能使用这个能力

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
    
    // 绑定工具
    err := model.BindTools(tools)
}
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
)

func main() {
    ctx := context.Background()
    
    // 初始化模型
    model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
        BaseURL:  "http://localhost:11434",
        Timeout:  30 * time.Second,
        Model:    "llama2",
        Options: &api.Options{
            Temperature: 0.7,
            NumPredict: 100,
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
    
    // 获取性能指标
    if metrics, ok := response.ResponseMeta.Extra["ollama_metrics"].(api.Metrics); ok {
        println("评估时间:", metrics.EvalDuration)
        println("总时间:", metrics.TotalDuration)
    }
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

## **相关文档**

- [[🚧]Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
- [[🚧]ChatModel - OpenAI](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai)
- [[🚧]Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Ollama 模型库](https://ollama.ai/library)
