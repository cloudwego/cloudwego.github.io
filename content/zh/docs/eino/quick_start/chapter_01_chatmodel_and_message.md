---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: 第一章：ChatModel 与 Message（Console）
weight: 1
---

本章目标：创建最基本的 AI 对话程序，理解 ChatModel 和 Agent 的核心概念。

## 代码位置

- 入口代码：[cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)

## 前置条件

你需要配置一个可用的 ChatModel。Eino 支持多种模型后端，本教程使用 OpenAI 或 Ark 作为示例：

**方式一：使用 OpenAI**

```bash
export OPENAI_API_KEY=sk-xxx
export OPENAI_MODEL=gpt-4.1-mini  # 可选，默认使用 gpt-4.1-mini
export OPENAI_BASE_URL=https://api.openai.com/v1  # 可选
```

**方式二：使用 Ark（字节跳动火山引擎）**

```bash
export ARK_API_KEY=xxx
export ARK_MODEL=ep-xxx  # Ark 模型的 Endpoint ID
export ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3  # 可选
```

## 运行

在 `examples/quickstart/chatwitheino` 目录下执行：

```bash
go run ./cmd/ch01 -- "你好，请介绍一下你自己"
```

输出示例（流式输出，逐字显示）：

```
你好！我是一个AI助手，基于大语言模型技术开发...
```

## 核心概念

### ChatModel：LLM 的标准接口

`ChatModel` 是 Eino 对大语言模型的统一抽象：

```go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
}
```

不管底层是 OpenAI、Anthropic 还是其他模型，都实现同一个接口。

### Message：对话的基本单元

```go
type Message struct {
    Role     string      // system / user / assistant / tool
    Content  string      // 消息内容
    // ...其他字段
}
```

常用构造函数：

```go
schema.SystemMessage("你是一个有用的助手")
schema.UserMessage("你好")
schema.AssistantMessage("你好！有什么可以帮助你的？", nil)
```

## 从 API 调用到单轮对话

### 裸调 ChatModel

最直接的方式是直接调用 ChatModel 的 `Stream` 方法：

```
messages := []*schema.Message{
    schema.SystemMessage("你是一个有用的助手"),
    schema.UserMessage("你好"),
}
stream, err := chatModel.Stream(ctx, messages)
```

这就是一次最基本的 LLM 调用。

### 使用 ChatModelAgent

`ChatModelAgent` 是 Eino 中最基础的 Agent 封装，它包装了 ChatModel 并提供：

- **系统 Prompt 管理**：通过 `Instruction` 字段设置
- **Tool 集成**：后续章节会用到
- **中间件支持**：后续章节会用到

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "MyChatAgent",
    Description: "A helpful assistant",
    Instruction: "你是一个有用的助手",
    Model:       chatModel,
})
```

### 本章的简化流程

```
用户输入 → ChatModelAgent.Stream() → 流式输出
```

**关键代码片段（**注意：这是简化后的代码片段，不能直接运行，完整代码请参考** [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)）：

```go
// 创建 Agent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "MyChatAgent",
    Instruction: instruction,
    Model:       chatModel,
})

// 流式调用
stream, err := agent.Stream(ctx, messages)

// 逐 chunk 输出
for {
    frame, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    fmt.Print(frame.Content)
}
```

## 本章小结

- **ChatModel**：LLM 的统一接口，支持 `Generate`（完整响应）和 `Stream`（流式响应）
- **Message**：对话的基本单元，包含 Role 和 Content
- **ChatModelAgent**：最基础的 Agent，包装 ChatModel 并提供扩展能力
- **流式输出**：通过 `Stream` + `Recv` 实现逐字输出

## 扩展思考

**为什么用 Agent 而不是直接调 ChatModel？**

- Agent 提供了 Instruction（系统 Prompt）的标准管理
- Agent 后续可以集成 Tool、Middleware 等能力
- Agent 是 Eino ADK 的统一入口
