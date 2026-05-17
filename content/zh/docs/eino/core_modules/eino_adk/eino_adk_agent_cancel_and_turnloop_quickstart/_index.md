---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Cancel 与 TurnLoop 快速入门
weight: 10
---

Eino ADK 中 **Agent 取消** 和 **TurnLoop** 两项核心特性的快速入门指南。自 [v0.9.0-alpha.9](https://github.com/cloudwego/eino/releases/tag/v0.9.0-alpha.9) 版本引入。

## 类型约定

本文示例统一使用以下泛型实例化：

- `T = string`（推送给 TurnLoop 的业务项类型）
- `M = *schema.Message`（Agent 消息类型，即标准 `Message`）

ADK 中相关类型别名：

```go
type Agent         = TypedAgent[*schema.Message]
type AgentInput    = TypedAgentInput[*schema.Message]
type AgentEvent    = TypedAgentEvent[*schema.Message]
```

当需要使用 `*schema.AgenticMessage` 时，将 `M` 替换为对应类型即可，所有 API 签名完全对称。

---

## 第一部分：Agent 取消

### 场景

用户向 agent 发送请求后，因等待过长或需求变更，希望取消当前执行。

### 核心 API

```go
// 创建取消选项和取消函数
cancelOpt, cancelFunc := adk.WithCancel()

// 启动 agent，传入取消选项
iter := runner.Run(ctx, []*schema.Message{schema.UserMessage("你好")}, cancelOpt)

// 发起取消（可在任意 goroutine 调用）
handle, contributed := cancelFunc(adk.WithAgentCancelMode(adk.CancelImmediate))
// contributed == true: 本次调用影响了执行结果
// contributed == false: agent 已结束或取消已完成，本次调用无实际效果

err := handle.Wait()
```

`CancelHandle.Wait()` 的三种返回值：

```go
switch {
case err == nil:
    // 取消成功
case errors.Is(err, adk.ErrCancelTimeout):
    // 安全点超时，已自动升级为立即取消
case errors.Is(err, adk.ErrExecutionEnded):
    // agent 在取消生效前已自然结束
}
```

### 三种取消模式

<table>
<tr><td>模式</td><td>行为</td><td>适用场景</td></tr>
<tr><td><pre>CancelImmediate</pre></td><td>立即中断，不等待安全点</td><td>紧急停止、超时兜底</td></tr>
<tr><td><pre>CancelAfterChatModel</pre></td><td>等当前 ChatModel 调用完成后取消</td><td>需要完整模型回答</td></tr>
<tr><td><pre>CancelAfterToolCalls</pre></td><td>等当前 ToolCalls 全部完成后取消</td><td>确保 tool 副作用完整</td></tr>
</table>

> 💡
> `CancelMode` 是位掩码，可组合使用：`CancelAfterChatModel | CancelAfterToolCalls` 等价于"哪个安全点先到达就取消"。

### 安全点取消

```go
// 等 ChatModel 完成后取消，5 秒超时保护
handle, _ := cancelFunc(
    adk.WithAgentCancelMode(adk.CancelAfterChatModel),
    adk.WithAgentCancelTimeout(5*time.Second),
)
```

> 💡
> 安全点模式务必配合 `WithAgentCancelTimeout`。若 agent 永远不到达安全点，超时后自动升级为立即取消。

### 递归取消

默认取消仅影响根 agent。使用 `WithRecursive()` 将取消传播到 AgentTool 内嵌套的子 agent：

```go
handle, _ := cancelFunc(
    adk.WithAgentCancelMode(adk.CancelAfterChatModel),
    adk.WithRecursive(),
)
```

### 消费端识别取消

```go
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Err != nil {
        var cancelErr *adk.CancelError
        if errors.As(event.Err, &cancelErr) {
            log.Printf("Agent 被取消 (mode=%v, escalated=%v)",
                cancelErr.Info.Mode, cancelErr.Info.Escalated)
        }
        break
    }
    // 处理正常事件...
}
```

---

## 第二部分：TurnLoop

### 场景

构建一个持续运行的 agent 服务：用户随时发送消息，agent 按轮次处理；紧急消息可抢占当前执行。

### Turn 生命周期

<a href="/img/eino/XrWqwC669hGGoibW1q3c2ToTnvf.png" target="_blank"><img src="/img/eino/XrWqwC669hGGoibW1q3c2ToTnvf.png" width="100%" /></a>

### 基本用法

```go
loop := adk.NewTurnLoop(adk.TurnLoopConfig[string, *schema.Message]{
    // GenInput：接收缓冲区所有项目，决定本轮消费哪些
    GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
        return &adk.GenInputResult[string, *schema.Message]{
            Input:    &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(strings.Join(items, "\n"))}},
            Consumed: items,
        }, nil
    },

    // PrepareAgent：根据本轮消费项构建 Agent
    PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
        return myAgent, nil
    },

    // OnAgentEvents：处理 agent 事件流（可选）
    OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
        for {
            event, ok := events.Next()
            if !ok {
                break
            }
            if event.Err != nil {
                return event.Err
            }
            log.Printf("收到事件: agent=%s", event.AgentName)
        }
        return nil
    },
})

loop.Push("消息 1")
loop.Push("消息 2")
loop.Run(ctx)         // 非阻塞，启动后台处理
loop.Push("消息 3")   // 运行中仍可推入
loop.Stop()
result := loop.Wait() // 阻塞至退出
```

### 核心回调

<table>
<tr><td>回调</td><td>必填</td><td>职责</td></tr>
<tr><td><pre>GenInput</pre></td><td>✅</td><td>接收缓冲区所有项目，返回 <pre>Consumed</pre>（本轮处理）和 <pre>Remaining</pre>（留给后续轮次）。<strong>不在两者中的项目会被丢弃。</strong></td></tr>
<tr><td><pre>PrepareAgent</pre></td><td>✅</td><td>根据 Consumed 项目构建 Agent（设置 prompt、tools、middleware 等）</td></tr>
<tr><td><pre>OnAgentEvents</pre></td><td>❌</td><td>处理 agent 事件流。未设置时默认 drain 事件并返回首个错误</td></tr>
<tr><td><pre>GenResume</pre></td><td>❌</td><td>从 checkpoint 恢复时调用，决定如何合并 interrupted/unhandled/new items</td></tr>
</table>

> 💡
> `OnAgentEvents` 中**不要传播 CancelError**——框架会自动处理。Stop 导致的 `CancelError` 作为 `ExitReason` 传播；Preempt 导致的 `CancelError` 被框架吞掉，循环继续下一轮。回调仅在自身出现致命错误时才应返回 non-nil error。

### 抢占（Preempt）

```go
// 推送紧急消息，在安全点取消当前 agent
accepted, ack := loop.Push("紧急消息！", adk.WithPreempt[string, *schema.Message](adk.AnySafePoint))

if accepted {
    <-ack // 等待抢占信号被提交（当前 turn 保证会被取消）
}
```

抢占是原子操作——"推入新消息"和"取消当前 agent"作为整体执行：

1. 紧急消息入缓冲区
2. 当前 agent 在安全点被取消
3. TurnLoop 自动开始新 turn
4. `GenInput` 收到所有缓冲项目（含紧急消息），重新决策

> 💡
> `WithPreempt` 始终使用安全点取消，**不自动设置 WithRecursive**。而 `WithPreemptTimeout` 会自动启用 `WithRecursive`——超时升级为立即取消时，嵌套子 agent 也会被终止。

### 带超时 / 带延迟的抢占

```go
// 安全点等待，5 秒超时后升级为立即取消（自动递归）
loop.Push("紧急", adk.WithPreemptTimeout[string, *schema.Message](adk.AnySafePoint, 5*time.Second))

// 2 秒宽限期后再发起抢占
loop.Push("新消息",
    adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
    adk.WithPreemptDelay[string, *schema.Message](2*time.Second),
)
```

### 条件抢占：WithPushStrategy

当抢占决策依赖当前 turn 状态时，使用 `WithPushStrategy` 避免 TOCTOU 竞态：

```go
loop.Push(urgentItem, adk.WithPushStrategy(
    func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message]) []adk.PushOption[string, *schema.Message] {
        if tc == nil {
            return nil // 当前无活跃 turn，无需抢占
        }
        if isLowPriority(tc.Consumed) {
            return []adk.PushOption[string, *schema.Message]{
                adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
            }
        }
        return nil // 当前是高优先级任务，不抢占
    },
))
```

### 在 OnAgentEvents 中感知抢占和停止

`TurnContext` 提供 `Preempted` 和 `Stopped` 两个信号通道：

```go
OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
    for {
        event, ok := events.Next()
        if !ok {
            break
        }

        select {
        case <-tc.Preempted:
            log.Println("当前 turn 被抢占，正在收尾...")
        case <-tc.Stopped:
            log.Printf("循环正在停止，原因: %s", tc.StopCause())
        default:
        }

        if event.Err != nil {
            return event.Err
        }
        // 处理事件...
    }
    return nil
},
```

> 💡
> `Preempted` / `Stopped` 仅在对应的取消调用实际 "contribute" 到当前 turn 的 `CancelError` 时才关闭。如果取消已被其他信号最终确定，通道保持打开。

### 停止 TurnLoop

```go
// 等当前 turn 完成后退出（ExitReason 为 nil）
loop.Stop()

// 立即中止当前 agent（递归传播到嵌套 agent）
loop.Stop(adk.WithImmediate())

// 安全点停止（递归传播，无超时）
loop.Stop(adk.WithGraceful())

// 带超时的安全点停止（超时后升级为立即取消）
loop.Stop(adk.WithGracefulTimeout(10 * time.Second))

// 空闲后自动关停（持续空闲 30 秒后停止）
loop.Stop(adk.UntilIdleFor(30 * time.Second))
```

> 💡
> 可多次调用 `Stop()` 升级取消策略。典型模式：先 `WithGraceful()`，超时后再 `WithImmediate()`。

### 附带停止原因

```go
loop.Stop(
    adk.WithGraceful(),
    adk.WithStopCause("quota exceeded"),
)
result := loop.Wait()
log.Printf("停止原因: %s", result.StopCause)
```

---

## 第三部分：声明式 Checkpoint 恢复

### 场景

Agent 被取消或中断后，下次启动时自动从断点恢复，而非从头开始。TurnLoop 自动管理输入簿记（bookkeeping），应用层只需声明 interrupted/unhandled/new items 如何重入后续 turn。

### 配置 Checkpoint

在 `TurnLoopConfig` 中同时设置 `Store` 和 `CheckpointID` 即可启用：

```go
store := NewMyCheckpointStore() // 实现 CheckPointStore 接口

cfg := adk.TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
        return &adk.GenInputResult[string, *schema.Message]{
            Input:    &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(items[0])}},
            Consumed: items[:1],
            Remaining: items[1:],
        }, nil
    },

    PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
        return myAgent, nil
    },

    // GenResume：从 checkpoint 恢复时调用
    GenResume: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], interruptedItems, unhandledItems, newItems []string) (*adk.GenResumeResult[string, *schema.Message], error) {
        all := append(append(interruptedItems, unhandledItems...), newItems...)
        return &adk.GenResumeResult[string, *schema.Message]{
            Consumed:  all[:1],
            Remaining: all[1:],
        }, nil
    },

    Store:        store,
    CheckpointID: "session-123",
}
```

### 恢复流程

`Run()` 启动时自动查询 Store：

<table>
<tr><td>Checkpoint 状态</td><td>行为</td></tr>
<tr><td>存在 mid-turn checkpoint（agent 执行中被中断）</td><td>调用 <pre>GenResume</pre>，将 interrupted/unhandled/new items 交给应用层决策后恢复执行</td></tr>
<tr><td>存在 between-turns checkpoint（轮次间被停止）</td><td>将已缓冲项目加入 buffer，通过 <pre>GenInput</pre> 正常处理</td></tr>
<tr><td>不存在 checkpoint</td><td>从头开始</td></tr>
</table>

```go
// 第一次运行
loop := adk.NewTurnLoop(cfg)
loop.Push("消息 1")
loop.Run(ctx)
loop.Stop(adk.WithGraceful())
exit := loop.Wait()
log.Printf("checkpoint 尝试: %v, err: %v", exit.CheckpointAttempted, exit.CheckpointErr)

// 第二次运行（相同 cfg，包含相同 CheckpointID）
loop2 := adk.NewTurnLoop(cfg)
loop2.Push("新消息") // 作为 newItems 传入 GenResume
loop2.Run(ctx)       // 自动检测 checkpoint 并恢复
result := loop2.Wait()
```

### 跳过 Checkpoint

```go
loop.Stop(adk.WithSkipCheckpoint()) // 本次退出不保存 checkpoint
```

### 实现 CheckPointStore

```go
type CheckPointStore interface {
    Get(ctx context.Context, checkPointID string) ([]byte, bool, error)
    Set(ctx context.Context, checkPointID string, checkPoint []byte) error
}
```

可选实现 `CheckPointDeleter` 以支持显式删除过期 checkpoint：

```go
type CheckPointDeleter interface {
    Delete(ctx context.Context, checkPointID string) error
}
```

正常退出（未保存新 checkpoint）时，TurnLoop 会尝试删除先前加载的 checkpoint 以防过期恢复。**只有实现了 CheckPointDeleter 的 Store 才会执行删除**；否则由 Store 自身管理生命周期。

> 💡
> 使用 `Store` 时，泛型参数 `T` 必须支持 `encoding/gob` 编解码——TurnLoop 通过 gob 持久化 runner checkpoint 和 item 簿记信息。

---

## 第四部分：完整示例

模拟一个支持优先级调度、抢占和 checkpoint 恢复的聊天服务：

```go
package main

import (
    "context"
    "log"
    "strings"
    "time"

    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    store := adk.NewInMemoryStore()

    cfg := adk.TurnLoopConfig[string, *schema.Message]{
        GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
            // 按优先级排序后，只消费第一条，其余留给后续轮次
            sorted := sortByPriority(items)
            return &adk.GenInputResult[string, *schema.Message]{
                Input:     &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(sorted[0])}},
                Consumed:  sorted[:1],
                Remaining: sorted[1:], // 不在两者中的项目会被丢弃
            }, nil
        },

        GenResume: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], interruptedItems, unhandledItems, newItems []string) (*adk.GenResumeResult[string, *schema.Message], error) {
            all := append(append(interruptedItems, unhandledItems...), newItems...)
            return &adk.GenResumeResult[string, *schema.Message]{
                Consumed:  all[:1],
                Remaining: all[1:],
            }, nil
        },

        PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
            return buildAgent(consumed), nil
        },

        OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
            for {
                event, ok := events.Next()
                if !ok {
                    break
                }
                // 感知抢占/停止信号，做收尾处理
                select {
                case <-tc.Preempted:
                    log.Println("被更高优先级消息抢占")
                case <-tc.Stopped:
                    log.Printf("服务关停: %s", tc.StopCause())
                default:
                }
                if event.Err != nil {
                    // 不传播 CancelError，框架自动处理
                    return event.Err
                }
                log.Printf("[%s] %s", event.AgentName, extractText(event))
            }
            return nil
        },

        Store:        store,
        CheckpointID: "chat-session-001",
    }

    loop := adk.NewTurnLoop(cfg)
    loop.Push("你好，帮我查一下天气")
    loop.Run(ctx)

    // 1 秒后发送紧急消息抢占
    time.AfterFunc(1*time.Second, func() {
        loop.Push("停！先帮我处理这个紧急问题",
            adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
        )
    })

    // 5 秒后优雅关停
    time.AfterFunc(5*time.Second, func() {
        loop.Stop(
            adk.WithGracefulTimeout(3*time.Second),
            adk.WithStopCause("service shutdown"),
        )
    })

    result := loop.Wait()
    log.Printf("退出原因: %v", result.ExitReason)
    log.Printf("未处理消息: %v", result.UnhandledItems)
    log.Printf("停止原因: %s", result.StopCause)
    log.Printf("checkpoint: attempted=%v, err=%v", result.CheckpointAttempted, result.CheckpointErr)

    // 下次以相同 cfg 启动将自动从 checkpoint 恢复
}
```

---

## 常见问题

### Q: 安全点取消会不会永远等不到安全点？

会。如果 agent 陷入长时间运行的 tool 或 model 调用，安全点可能迟迟不到。**务必配合 WithAgentCancelTimeout 使用**，超时后自动升级为 `CancelImmediate`。

### Q: `WithRecursive` 什么时候需要？

默认取消仅影响根 agent。当 agent 层级中包含 AgentTool 嵌套的子 agent，且你希望子 agent 也在安全点响应取消时，才需要。不确定时，先不加。

### Q: 泛型参数 T 有什么要求？

当配置了 `Store` 时，`T` 必须可被 `encoding/gob` 编解码。基础类型（`string`、`int` 等）和全导出字段的 struct 默认支持。若 `T` 包含 interface 字段，需通过 `gob.Register` 注册具体类型。

### Q: `Push` 在 loop 停止后会怎样？

`Push` 返回 `(false, closedCh)`。这些 "late items" 不会进入 checkpoint，可在 `Wait()` 返回后通过 `result.TakeLateItems()` 回收。一旦调用 `TakeLateItems()`，后续 `Push` 会 panic 以防数据静默丢失。

### Q: 多次调用 `Stop()` 会怎样？

安全——每次调用可以升级取消策略。典型模式：

```go
loop.Stop(adk.WithGraceful())           // 先尝试优雅停止
time.AfterFunc(3*time.Second, func() {
    loop.Stop(adk.WithImmediate())       // 3 秒后升级为立即取消
})
```

### Q: `GenInput` 返回的 items 不在 Consumed 也不在 Remaining 会怎样？

会被丢弃。这是刻意设计——允许 `GenInput` 在决策时过滤掉不需要的项目。
