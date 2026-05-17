---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Runner 与扩展
weight: 6
---

# Runner

Runner 是 Agent 的执行入口，负责管理 Agent 生命周期、上下文初始化、Checkpoint 持久化和中断恢复。**任何 Agent 都应通过 Runner 运行。**

## 基本用法

```go
import "github.com/cloudwego/eino/adk"

// 创建 Runner
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
    CheckPointStore: store, // 可选，启用中断恢复需要
})

// 方式一：Query — 直接发送用户问题
iter := runner.Query(ctx, "帮我搜索今天的新闻")

// 方式二：Run — 传入完整 Messages
iter := runner.Run(ctx, []*schema.Message{
    schema.UserMessage("你好"),
}, adk.WithSessionValues(map[string]any{"user": "alice"}))

// 消费事件流
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // 处理 event
}
```

## 泛型支持

```go
type TypedRunner[M MessageType] struct { ... }
type Runner = TypedRunner[*schema.Message]

func NewTypedRunner[M MessageType](conf TypedRunnerConfig[M]) *TypedRunner[M]
```

`*schema.AgenticMessage` 路径使用 `NewTypedRunner` 构造。

## Interrupt & Resume

Agent 可在运行中主动中断，Runner 自动保存状态（需配置 `CheckPointStore`），后续可从断点恢复。

### 中断

Agent 产出包含 `Interrupted` 的事件即可触发中断：

```go
gen.Send(&adk.AgentEvent{
    Action: &adk.AgentAction{
        Interrupted: &adk.InterruptInfo{Data: myData},
    },
})
```

### 状态持久化

Runner 捕获中断后，将运行状态（输入、对话历史、InterruptInfo）以 CheckPointID 为 key 存入 `CheckPointStore`：

```go
type CheckPointStore interface {
    Set(ctx context.Context, key string, value []byte) error
    Get(ctx context.Context, key string) ([]byte, bool, error)
}
```

调用时通过 Option 传入 CheckPointID：

```go
iter := runner.Run(ctx, messages, adk.WithCheckPointID("cp-123"))
```

> 💡
> ADK 使用 gob 序列化运行状态。自定义类型需提前 gob.RegisterName 注册。框架内置类型已自动注册。

### 恢复

```go
// 简单恢复：隐式恢复所有中断点
iter, err := runner.Resume(ctx, "cp-123")

// 精确恢复：指定目标和数据
iter, err := runner.ResumeWithParams(ctx, "cp-123", &adk.ResumeParams{
    Targets: map[string]any{
        "agent-address": resumeData,
    },
})
```

恢复需要中断的 Agent 实现 `ResumableAgent` 接口：

```go
type TypedResumableAgent[M MessageType] interface {
    TypedAgent[M]
    Resume(ctx context.Context, info *ResumeInfo, opts ...AgentRunOption) *AsyncIterator[*TypedAgentEvent[M]]
}
```

# 多轮运行时：TurnLoop

对于需要多轮交互的场景（聊天应用、持续对话），ADK 提供 `TurnLoop` 运行时：

- **Push-based 事件循环**：Push 新消息触发 Agent 运行
- **抢占（Preempt）**：用户在 Agent 运行中发送新消息时，可取消当前运行
- **Stop**：停止事件循环
- **声明式 Checkpoint/Resume**：TurnLoop 自动管理输入 bookkeeping，应用层只需声明恢复策略

详见：[Agent Cancel 与 TurnLoop 快速入门](/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门)

# Agent Cancel

v0.9 新增的运行时取消能力，支持：

- **CancelMode 位掩码组合**：`CancelModelStream | CancelToolCalls`
- **CancelHandle.Wait()**：等待取消完成
- **与 TurnLoop 集成**：Preempt 时自动触发 Cancel

详见：[Agent Cancel 与 TurnLoop 快速入门](/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门)
