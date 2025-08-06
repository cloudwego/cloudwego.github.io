---
Description: ""
date: "2025-08-06"
lastmod: ""
tags: []
title: 'Eino ADK: Agent 扩展'
weight: 0
---

# Agent Runner

Runner 是 Eino ADK 中负责执行 Agent 的核心引擎。它的主要作用是管理和控制 Agent 的整个生命周期，如处理多 Agent 协作，保存传递上下文等，interrupt、callback 等切面能力也均依赖 Runner 实现。任何 Agent 都应通过 Runner 来运行。

# Interrupt & Resume

该功能允许一个正在运行的 Agent 主动中断其执行，保存当前状态，并在稍后从中断点恢复执行。这对于处理需要外部输入、长时间等待或可暂停的任务流非常有用。

## Interrupted Action

在 Agent 的执行过程中，可以通过产生包含 Interrupted Action 的 AgentEvent 来主动中断 Runner 的运行：

```go
// github.com/cloudwego/eino/adk/interface.go
type AgentAction struct {
    // other actions
    Interrupted *InterruptInfo
    // other actions
}

// github.com/cloudwego/eino/adk/interrupt.go
type InterruptInfo struct {
    Data any
}
```

当中断发生时，可以通过 InterruptInfo 结构体附带自定义的中断信息。此信息：

1. 会被传递给调用者，可以通过该信息向调用者说明中断原因等
2. 如果后续需要恢复 Agent 运行，InterruptInfo 会在恢复时重新传递给中断的 Agent，Agent 可以依据该信息恢复运行

## 状态持久化 (Checkpoint)

当 Runner 捕获到这个带有 Interrupted Action 的 Event 时，会立即终止当前的执行流程。 如果：

1. Runner 中设置了 CheckPointStore

```go
// github.com/cloudwego/eino/adk/runner.go
type RunnerConfig struct {
    // other fields
    CheckPointStore CheckPointStore
}

// github.com/cloudwego/eino/adk/interrupt.go
type CheckPointStore interface {
    Set(ctx context.Context, key string, value []byte) error
    Get(ctx context.Context, key string) ([]byte, bool, error)
}
```

1. 调用 Runner 时通过 AgentRunOption WithCheckPointID 传入 CheckPointID

```go
// github.com/cloudwego/eino/adk/interrupt.go
func WithCheckPointID(id string) _AgentRunOption_
```

Runner 在终止运行后会将当前运行状态（原始输入、对话历史等）以及 Agent 抛出的 InterruptInfo 以 CheckPointID 为 key 持久化到 CheckPointStore 中。

> 💡
> 为了保存 interface 中数据的原本类型，Eino ADK 使用 gob（[https://pkg.go.dev/encoding/gob](https://pkg.go.dev/encoding/gob)）序列化运行状态。因此在使用自定义类型时需要提前使用 gob.Register 或 gob.RegisterName 注册类型（更推荐后者，前者使用路径加类型名作为默认名字，因此类型的位置和名字均不能发生变更）。Eino 会自动注册框架内置的类型。

## Resume

运行中断，调用 Runner 的 Resume 接口传入中断时的 CheckPointID 可以恢复运行：

```go
// github.com/cloudwego/eino/adk/runner.go
func (r *Runner) Resume(ctx context.Context, checkPointID string, opts ...AgentRunOption) (*AsyncIterator[*AgentEvent], error)
```

恢复 Agent 运行需要发生中断的 Agent 实现了 ResumableAgent 实现了 ResumableAgent 接口， Runner 从 CheckPointerStore 读取运行状态并恢复运行，其中 InterruptInfo 和上次运行配置的 EnableStreaming 会作为输入提供给 Agent：

```go
// github.com/cloudwego/eino/adk/interface.go
type ResumableAgent interface {
    Agent

    Resume(ctx context.Context, info *ResumeInfo, opts ...AgentRunOption) *AsyncIterator[*AgentEvent]
}

// github.com/cloudwego/eino/adk/interrupt.go
type ResumeInfo struct {
    EnableStreaming bool
    *_InterruptInfo_
}
```

Resume 如果向 Agent 传入新信息，可以定义 AgentRunOption，在调用 Runner.Resume 时传入。

# Callback

TODO
