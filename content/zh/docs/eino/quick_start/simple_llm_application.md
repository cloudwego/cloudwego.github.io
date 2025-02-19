---
Description: ""
date: "2025-02-19"
lastmod: ""
tags: []
title: 实现一个最简 LLM 应用
weight: 1
---

本指南将帮助你快速上手使用 Eino 框架中的 ChatModel 构建一个简单的 LLM 应用。我们将通过实现一个"程序员鼓励师"的例子，来展示如何使用 ChatModel。

> 💡
> 本文中示例的代码片段详见：[eino-examples/quickstart/chat](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat)

## **ChatModel 简介**

ChatModel 是 Eino 框架中对对话大模型的抽象，它提供了统一的接口来与不同的大模型服务（如 OpenAI、Ollama 等）进行交互。

> 组件更详细的介绍参考： [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)

## **Messages 的结构和使用**

在 Eino 中，对话是通过 `schema.Message` 来表示的，这是 Eino 对一个对话消息的抽象定义。每个 Message 包含以下重要字段：

- `Role`: 消息的角色，可以是：
  - `system`: 系统指令，用于设定模型的行为和角色
  - `user`: 用户的输入
  - `assistant`: 模型的回复
  - `tool`: 工具调用的结果
- `Content`: 消息的具体内容

## **实现程序员鼓励师**

让我们通过实现一个程序员鼓励师来学习如何使用 ChatModel。这个助手不仅能提供技术建议，还能在程序员感到难过时给予心理支持。

### 创建对话模板并生成消息

Eino 提供了强大的模板化功能来构建要输入给大模型的消息：

1. 模版渲染，支持三种模版格式：

   - FString：Python 风格的简单字符串格式化（例如："你好，{name}！"）
   - Jinja2：支持丰富表达式的 Jinja2 风格模板（例如："你好，{{name}}！"）
   - GoTemplate：Go 语言内置的 text/template 格式（例如："你好，{{.name}}！"）
2. 消息占位符：支持插入一组消息（如对话历史）

```go
// optional=false 表示必需的消息列表，在模版输入中找不到对应变量会报错
schema.MessagesPlaceholder("chat_history", false)
```

> 更详细的组件介绍可参考： [Eino: ChatTemplate 使用说明](/zh/docs/eino/core_modules/components/chat_template_guide)

下面是完整的 FString 格式 + 消息占位符的对话模板创建及使用代码：

```go
// eino-examples/quickstart/chat/template.go

import (
    "context"

    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// 创建模板，使用 FString 格式
template := prompt.FromMessages(schema.FString,
   // 系统消息模板
   schema.SystemMessage("你是一个{role}。你需要用{style}的语气回答问题。你的目标是帮助程序员保持积极乐观的心态，提供技术建议的同时也要关注他们的心理健康。"),

   // 插入需要的对话历史（新对话的话这里不填）
   schema.MessagesPlaceholder("chat_history", true),

   // 用户消息模板
   schema.UserMessage("问题: {question}"),
)

// 使用模板生成消息
messages, err := template.Format(context.Background(), map[string]any{
   "role":     "程序员鼓励师",
   "style":    "积极、温暖且专业",
   "question": "我的代码一直报错，感觉好沮丧，该怎么办？",
   // 对话历史（这个例子里模拟两轮对话历史）
   "chat_history": []*schema.Message{
      schema.UserMessage("你好"),
      schema.AssistantMessage("嘿！我是你的程序员鼓励师！记住，每个优秀的程序员都是从 Debug 中成长起来的。有什么我可以帮你的吗？", nil),
      schema.UserMessage("我觉得自己写的代码太烂了"),
      schema.AssistantMessage("每个程序员都经历过这个阶段！重要的是你在不断学习和进步。让我们一起看看代码，我相信通过重构和优化，它会变得更好。记住，Rome wasn't built in a day，代码质量是通过持续改进来提升的。", nil),
   },
})
```

### 创建 ChatModel

ChatModel 是 Eino 框架中最核心的组件之一，它提供了与各种大语言模型交互的统一接口。Eino 目前支持以下大语言模型的实现：

- OpenAI：支持 GPT-3.5/GPT-4 等模型 (同样支持 azure 提供的 openai 服务)
- Ollama：支持本地部署的开源模型
- Ark：火山引擎上的模型服务 (例如字节的豆包大模型)
- 更多模型正在支持中

> 支持的模型可以参考：[Eino: 生态集成](/zh/docs/eino/ecosystem_integration)

下面我们以 OpenAI 和 Ollama 为例，展示如何创建和使用 ChatModel：

#### **OpenAI (和下方 ollama 2 选 1)**

```go
// eino-examples/quickstart/chat/openai.go

import (
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
)

chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
   Model:  "gpt-4o",                         // 使用的模型版本
   APIKey: os.Getenv("OPENAI_API_KEY"),      // OpenAI API 密钥
})
```

> OpenAI  ChatModel 的详细信息可以参考：[ChatModel - OpenAI](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_openai)

#### **Ollama(和上方 openai 2 选 1)**

Ollama 支持在本地运行开源模型，适合对数据隐私有要求或需要离线使用的场景。

```go
// eino-examples/quickstart/chat/ollama.go

import (
    "github.com/cloudwego/eino-ext/components/model/ollama"
)


chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    BaseURL: "http://localhost:11434", // Ollama 服务地址
    Model:   "llama2",                 // 模型名称
})
```

> OpenAI 相关信息，可以参考：[ChatModel - Ollama](/zh/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)

无论使用哪种实现，ChatModel 都提供了一致的接口，这意味着你可以轻松地在不同的模型之间切换，而无需修改大量代码。

### 运行 ChatModel

经过前两步得到 ChatModel 的输入 messages 和初始化完成后的 ChatModel 实例后，可以开始尝试运行 ChatModel 了。Eino ChatModel 提供了两种运行模式：输出完整消息(generate)和输出消息流(stream)：

```go
// eino-examples/quickstart/chat/generate.go

/*** create messages
* messages, err := xxx
*/

/*** create chat model
* chatModel, err := xxx
*/ 

result, err := chatModel.Generate(ctx, messages)
streamResult, err := chatModel.Stream(ctx, messages)
```

在实际应用中，有很多场景需要使用流式响应，主要的场景例如「提升用户体验」：stream 运行模式让 ChatModel 提供类似打字机的输出效果，使用户更早得到模型响应。

Eino 中对流式输出的处理方式如下：

```go
// eino-examples/quickstart/chat/stream.go

import (
    "io"
    "log"

    "github.com/cloudwego/eino/schema"
)

func reportStream(sr *schema.StreamReader[*schema.Message]) {
    defer sr.Close()

    i := 0
    for {
       message, err := sr.Recv()
       if err == io.EOF { // 流式输出结束
          return
       }
       if err != nil {
          log.Fatalf("recv failed: %v", err)
       }
       log.Printf("message[%d]: %+v\n", i, message)
       i++
    }
}
```

完整实现参见：[eino-examples/quickstart/chat/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat/main.go)

## **总结**

本示例通过一个程序员鼓励师的案例，展示了如何使用 Eino 框架构建 LLM 应用。从 ChatModel 的创建到消息模板的使用，再到实际的对话实现，相信你已经对 Eino 框架有了基本的了解。无论是选择 OpenAI、Ollama 还是其他模型实现，Eino 都提供了统一且简单的使用方式。希望这个示例能帮助你快速开始构建自己的 LLM 应用。

## **关联阅读**

- 快速开始
  - [Agent-让大模型拥有双手](/zh/docs/eino/quick_start/agent_llm_with_tools)
