---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: 第二章：ChatModelAgent、Runner、AgentEvent（Console 多轮）
weight: 2
---

本章目标：引入 Runner 实现多轮对话，理解 Agent 事件流和对话历史管理。

## 代码位置

- 入口代码：[cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)

## 前置条件

与第一章一致：需要配置一个可用的 ChatModel（OpenAI 或 Ark）。

## 运行

在 `examples/quickstart/chatwitheino` 目录下执行：

```bash
go run ./cmd/ch02
```

输出示例：

```
you> 你好
[assistant] 你好！有什么我可以帮助你的吗？
you> 我刚才说了什么？
[assistant] 你刚才说了"你好"。
```

## 从单轮到多轮：为什么需要 Runner

第一章我们实现了单轮对话，但有两个问题：

1. **没有历史记忆**：每次调用都是独立的，Agent 不知道之前说了什么
2. **手动管理流式输出**：需要自己处理 `stream.Recv()` 循环

**Runner 的定位：**

- **Runner 是 Agent 的运行时容器**：管理 Agent 的调用和事件流
- **Runner 不管理对话历史**：历史由外部维护和传入
- **Runner 提供统一的事件流**：把 Agent 的执行过程抽象为一系列事件

**简单类比：**

- **Agent** = "演员"（知道怎么演）
- **Runner** = "导演"（管理演出流程）
- **对话历史** = "剧本"（由外部编剧维护）

## 关键概念

### Agent 接口

```go
type Agent interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
}
```

### Runner

`Runner` 是 Agent 的运行时容器：

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
})
```

Runner 的核心方法 `Run` 接收对话历史，返回事件迭代器：

```go
events := runner.Run(ctx, history)
```

### AgentEvent

Runner 返回的 `AsyncIterator[*AgentEvent]` 包含以下事件类型：

```go
type AgentEvent struct {
    Output     *AgentOutput     // Agent 的输出
    ToolCall   *ToolCallEvent   // Tool 调用事件
    ToolResult *ToolResultEvent // Tool 执行结果
    Interrupt  *InterruptEvent  // 中断事件（后续章节）
}
```

### 事件消费模式

```go
events := runner.Run(ctx, history)
for {
    event, ok := events.Next()
    if !ok {
        break
    }
    if event.Output != nil && event.Output.MessageOutput != nil {
        // 处理消息输出（完整或流式）
    }
}
```

## 对话历史管理

### 简单内存管理

第二章使用最简单的方式管理对话历史：一个 `[]*schema.Message` 切片。

```
对话流程：
1. history = []
2. 用户输入 → history = append(history, userMsg)
3. Agent 回复 → history = append(history, assistantMsg)
4. 下一轮用户输入 → 重复 2-3
```

**关键代码片段（**注意：这是简化后的代码片段，不能直接运行，完整代码请参考** [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)）：

```go
history := make([]*schema.Message, 0, 16)

for {
    // 读取用户输入
    line := readUserInput()
    
    // 追加到历史
    history = append(history, schema.UserMessage(line))
    
    // 运行 Agent
    events := runner.Run(ctx, history)
    
    // 收集 Assistant 回复
    content := printAndCollectAssistantFromEvents(events)
    
    // 追加到历史
    history = append(history, schema.AssistantMessage(content, nil))
}
```

## 本章小结

- **Runner**：Agent 的运行时容器，管理调用流程和事件流
- **AgentEvent**：统一的事件类型，包含输出、Tool 调用、中断等
- **对话历史**：由外部维护，每轮追加 user 和 assistant 消息
- **多轮对话**：通过传入完整历史实现上下文连续

## 扩展思考

**内存管理的问题：**

- 历史无限增长 → 需要裁剪策略
- 进程重启丢失 → 需要持久化
- 多会话混乱 → 需要 Session 管理

这些问题将在第三章通过引入 Session/Store 机制解决。
