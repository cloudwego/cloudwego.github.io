---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent 取消与 TurnLoop API 文档
weight: 1
---

# Agent 取消与 TurnLoop API 文档

## 概述

本文档描述 Eino ADK（Agent Development Kit）中的核心高级特性：

1. **Agent 取消**：优雅或立即取消运行中 agent 的机制
2. **TurnLoop**：基于推送的事件循环，用于管理 agent 执行周期（依赖 Agent 取消功能）

---

## Agent 取消 API

### 概述

Agent 取消功能提供对运行中 agent 的细粒度控制。支持立即取消和安全点取消（等待特定执行点，如 chat model 调用后或 tool 调用后）。默认情况下，取消模式仅影响根 agent；嵌套在 AgentTool 内的子 agent 不会收到取消通知。使用 `WithRecursive()` 可将取消传播到整个 agent 层级（包括 AgentTool 内的嵌套子 agent），在层级中任意位置先到达安全点时触发取消。

**Checkpoint 保证**：无论使用哪种 `CancelMode`，取消都会在 Runner 维度保存 checkpoint，取消后可通过 `Runner.Resume` 或 `Runner.ResumeWithParams` 恢复执行。使用 `WithRecursive` 时，子 agent 也会尝试触发取消，并将自身的中断信息级联向上传递，最终在根 agent 层面生成一个包含子 agent checkpoint 的完整 checkpoint，从而支持从子 agent 中断处恢复。

### 核心类型

#### `CancelMode`

指定 agent 应在何时被取消。模式可以通过位运算 OR 组合使用。

```go
type CancelMode int

const (
    // CancelImmediate 立即取消 agent，无需等待 ChatModel 或 ToolCalls 安全点。
    // 默认仅中断根 agent；AgentTool 内的子 agent 通过 context 取消作为副作用被清理。
    // 使用 WithRecursive 可将显式的 immediate-cancel 信号传播到子 agent，
    // 以实现干净的 teardown（带 grace period）。
    CancelImmediate CancelMode = 0

    // CancelAfterChatModel 在根 agent 的下一次 chat model 调用完成后取消。
    // 默认仅根 agent 检查此安全点；AgentTool 内的嵌套子 agent 不感知取消。
    // 使用 WithRecursive 将取消传播到所有子 agent——哪个 ChatModel 先完成就触发取消。
    // 注意：此安全点仅在 model 返回了 tool calls 时才会被检查——因为 tool calls
    // 意味着后续还有执行（调 tool → 再调 model → ...），此时取消才有意义。
    // 若 model 直接产出最终回答（无 tool calls），执行流走向结束，不经过此检查点。
    CancelAfterChatModel CancelMode = 1 << iota

    // CancelAfterToolCalls 在根 agent 的下一轮 tool 调用全部完成后取消。
    // 默认仅根 agent 检查此安全点。使用 WithRecursive 传播到所有子 agent。
    CancelAfterToolCalls
)
```

#### `CancelHandle`

用于等待取消完成的句柄。

```go
type CancelHandle struct{ /* unexported fields */ }

func (h *CancelHandle) Wait() error
```

**Wait 返回值：**

- `error`：
  - `nil`：取消成功（详见 CancelError 的 Interrupt 吸收机制）
  - `ErrCancelTimeout`：安全点取消超时，已自动升级为立即取消（取消本身仍然成功）
  - `ErrExecutionEnded`：agent 在取消生效前已结束（正常完成或出错），没有可取消的执行

#### `AgentCancelFunc`

用于取消运行中 agent 的函数类型。

```go
type AgentCancelFunc func(...AgentCancelOption) (*CancelHandle, bool)
```

**返回值：**

- `CancelHandle`：
  - 返回时表示取消请求已提交
  - 通过 `Wait()` 等待取消完成并获取结果
- `bool`：
  - 表示本次调用是否“contribute”到当前执行的 `CancelError`
  - `true`：本次调用的取消选项在 `CancelError` 最终确定前被纳入
  - `false`：取消已最终确定（例如已 handled 或 execution 已结束），本次调用不会影响 `CancelError`
  - TurnLoop 会利用该返回值提供 `TurnContext.Preempted` / `TurnContext.Stopped` 的严格语义

#### `AgentCancelOption`

配置一次 agent 取消请求的不透明选项类型。用户通常不自行实现该类型，而是使用 `WithAgentCancelMode`、`WithAgentCancelTimeout` 和 `WithRecursive` 创建选项。

```go
type AgentCancelOption func(*agentCancelConfig)
```

#### `AgentCancelInfo`

取消操作的信息。

```go
type AgentCancelInfo struct {
    Mode      CancelMode  // 使用的取消模式
    Escalated bool        // 是否升级为立即取消
    Timeout   bool        // 是否超时
}
```

#### `CancelError`

当 agent 被取消时通过 `AgentEvent.Err` 发送的错误。使用 `errors.As` 提取。

**Interrupt 吸收机制**：当取消处于活跃状态时，**任何** interrupt——无论是取消安全点节点产生的还是业务逻辑产生的（如 tool 中的 `tool.Interrupt`）——都会被转换为 `CancelError`。取消会"吸收"业务 interrupt。这是有意为之：

- 在并发执行中（并行 workflow、并发 tool 调用），取消引发的 interrupt 和业务 interrupt 可能作为单一复合信号到达，无法拆分。
- 即使在顺序执行中，在活跃取消期间将业务 interrupt 视为 CancelError 也能提供一致的语义——调用方只需处理 `CancelError` 一种信号，无需区分"取消引发的 interrupt"和"恰好在取消期间触发的业务 interrupt"。
- 业务 interrupt **不会丢失**——checkpoint 保留了完整的 interrupt 层级。恢复运行（`Runner.Resume`）时，agent 重新执行中断的代码路径，业务 interrupt 会自然重新触发。

```go
type CancelError struct {
    Info              *AgentCancelInfo

    InterruptContexts []*InterruptCtx  // 用于定向恢复的上下文（可配合 ResumeWithParams）
}
```

### 函数

#### `WithCancel`

创建一个启用取消功能的 `AgentRunOption`。返回选项和取消函数。

```go
func WithCancel() (AgentRunOption, AgentCancelFunc)
```

**返回值：**

- `AgentRunOption`：传递给 `Run()` 或 `Resume()` 的选项
- `AgentCancelFunc`：用于取消的函数

**示例：**

```go
cancelOpt, cancelFunc := WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// 之后，取消 agent
handle, contributed := cancelFunc(WithAgentCancelMode(CancelAfterChatModel))
if contributed {
    // 本次调用的取消选项已生效
    switch err := handle.Wait(); {
    case err == nil:
        // 取消成功
    case errors.Is(err, ErrExecutionEnded):
        // agent 在取消生效前已结束
    case errors.Is(err, ErrCancelTimeout):
        // 安全点取消超时，已自动升级为立即取消
    }
}
```

### 选项

#### `WithAgentCancelMode`

设置 agent 取消操作的取消模式。

```go
func WithAgentCancelMode(mode CancelMode) AgentCancelOption
```

**参数：**

- `mode CancelMode`：要使用的取消模式

**示例：**

```go
handle, _ := cancelFunc(WithAgentCancelMode(CancelAfterToolCalls))
_ = handle.Wait()
```

#### `WithAgentCancelTimeout`

设置取消操作的超时时间。仅适用于安全点模式。

```go
func WithAgentCancelTimeout(timeout time.Duration) AgentCancelOption
```

**参数：**

- `timeout time.Duration`：超时时长

**行为：**

- 仅对 `CancelAfterChatModel` / `CancelAfterToolCalls` 生效；若在超时内仍未到达安全点，将自动升级为 `CancelImmediate`。升级后同样会保存 checkpoint，可通过 `Runner.Resume` 恢复
- `timeout <= 0` 不会设置有效 deadline，因此不会触发超时升级
- 当发生超时升级时，`CancelHandle.Wait()` 返回 `ErrCancelTimeout`，同时 `CancelError.Info.Timeout=true` 且 `CancelError.Info.Escalated=true`

**示例：**

```go
handle, _ := cancelFunc(
    WithAgentCancelMode(CancelAfterChatModel),
    WithAgentCancelTimeout(5*time.Second),
)
_ = handle.Wait()
```

#### `WithRecursive`

启用递归取消传播。默认情况下，取消模式仅影响根 agent；AgentTool 内的子 agent 不会收到取消通知。`WithRecursive` 使取消传播到所有子 agent：

- **CancelAfterChatModel / CancelAfterToolCalls**：子 agent 检查各自的安全点，哪个先到达就触发取消。
- **CancelImmediate**：子 agent 收到显式的 immediate-cancel 信号以实现干净的 teardown；根 agent 使用 grace period 收集子 agent 的 interrupt。

启用 `WithRecursive` 后，不仅根 agent 会保存 checkpoint，正在执行的 AgentTool 内的子 agent 也会保存各自的 checkpoint。恢复时可从子 agent 中断处继续，无需从根 agent 重新执行。

一旦任何一次取消调用包含了 `WithRecursive`，该标志在整个取消生命周期内保持有效（单调升级）。

```go
func WithRecursive() AgentCancelOption
```

**示例：**

```go
// 取消时传播到嵌套子 agent
handle, _ := cancelFunc(
    WithAgentCancelMode(CancelAfterChatModel),
    WithRecursive(),
)
_ = handle.Wait()

// 升级：先非递归取消，后续调用添加递归
handle1, _ := cancelFunc(WithAgentCancelMode(CancelAfterChatModel))
handle2, _ := cancelFunc(WithRecursive()) // 升级为递归，所有子 agent 现在开始检查安全点
```

### 哨兵错误

#### `ErrCancelTimeout`

当取消操作超时时，由 `CancelHandle.Wait` 返回。

```go
var ErrCancelTimeout = errors.New("cancel timed out")
```

#### `ErrExecutionEnded`

当 agent 在取消生效前已结束（正常完成或出错）时，由 `CancelHandle.Wait` 返回。

注意：在取消活跃期间发生的业务 interrupt 会被吸收为 `CancelError`（见 CancelError 文档），因此它们导致 `nil`（取消成功），**而非** `ErrExecutionEnded`。只有执行完全结束且未发生任何 interrupt 时才会返回此错误。

```go
var ErrExecutionEnded = errors.New("execution already ended")
```

#### `ErrStreamCanceled`

当 `CancelImmediate` 在流式输出进行中触发，框架会立即中止底层流，并在 `AgentEvent.Output.MessageOutput.MessageStream` 的 `.Recv()` 中返回 `ErrStreamCanceled`。这同时适用于 ChatModel 的流式响应和 StreamableTool 的流式输出——两者的流都通过 `AgentEvent.Output.MessageOutput.MessageStream` 暴露给用户，取消监控机制完全对称。

**出现时机**：仅在 `CancelImmediate`（包括安全点取消超时后自动升级的情况）期间，ChatModel 或 StreamableTool 正在进行流式输出时出现。安全点取消（`CancelAfterChatModel` / `CancelAfterToolCalls`）不会产生此错误，因为它们会等到安全点再中断。

**出现位置**：`ErrStreamCanceled` 出现在 `AgentEvent.Output.MessageOutput.MessageStream.Recv()` 中，而非 `AgentEvent.Err`。随后 Runner 会发出一个独立事件，其中 `AgentEvent.Err` 为 `*CancelError`，表示取消完成。注意该事件不包含 `AgentEvent.Action.Interrupted`——`Action.Interrupted` 仅用于业务 interrupt，而取消始终通过 `CancelError` 传递。

```go
var ErrStreamCanceled error = &StreamCanceledError{}
```

#### `StreamCanceledError`

`ErrStreamCanceled` 的具体错误类型。该类型导出是为了让流取消错误可以在 checkpoint 保存时通过 gob 序列化；业务代码通常使用 `errors.Is(err, ErrStreamCanceled)` 判断即可。

```go
type StreamCanceledError struct{}

func (e *StreamCanceledError) Error() string
```

```go
// 处理流式事件时的 ErrStreamCanceled
for {
    event, ok := events.Next()
    if !ok {
        break
    }

    if event.Output != nil && event.Output.MessageOutput != nil && event.Output.MessageOutput.IsStreaming {
        stream := event.Output.MessageOutput.MessageStream
        for {
            chunk, err := stream.Recv()
            if err != nil {
                if errors.Is(err, ErrStreamCanceled) {
                    // 流被立即取消中止（ChatModel 或 StreamableTool），后续事件中会收到 CancelError
                    break
                }
                if err == io.EOF {
                    break
                }
            }
            // 处理 chunk...
            _ = chunk
        }
    }

    if event.Err != nil {
        var cancelErr *CancelError
        if errors.As(event.Err, &cancelErr) {
            // 取消完成，CancelError 包含取消模式和中断上下文等信息
            break
        }
    }
}
```

## TurnLoop API

### 概述

`TurnLoop` 是一个基于推送的事件循环，以轮次（turn）为单位管理 agent 的执行。用户将数据项推送到 TurnLoop 的缓冲区中，TurnLoop 通过配置的 agent 处理这些数据。这种设计实现了灵活的、事件驱动的 agent 工作流。

**注意**：TurnLoop 的部分功能（如抢占和停止）依赖 Agent 取消功能。

### 核心类型

#### `TurnLoop[T, M]`

主要的事件循环实例。通过 `NewTurnLoop()` 创建，然后调用 `Run()` 启动。

```go
type TurnLoop[T any, M MessageType] struct { ... }
```

#### `MessageType`

约束 ADK 可使用的消息类型。当前仅支持 `*schema.Message` 与 `*schema.AgenticMessage`；外部包不能扩展该联合类型。

```go
type MessageType interface {
    *schema.Message | *schema.AgenticMessage
}
```

#### `TypedAgent[M]`

TurnLoop 每轮实际运行的 agent 接口。

```go
type TypedAgent[M MessageType] interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string

    Run(ctx context.Context, input *TypedAgentInput[M], options ...AgentRunOption) *AsyncIterator[*TypedAgentEvent[M]]
}

type Agent = TypedAgent[*schema.Message]
```

#### `TypedAgentInput[M]`

传给 agent 的输入。

```go
type TypedAgentInput[M MessageType] struct {
    Messages        []M
    EnableStreaming bool
}

type AgentInput = TypedAgentInput[*schema.Message]
```

#### `TypedAgentEvent[M]`

agent 执行过程中发出的事件。TurnLoop 的 `OnAgentEvents` 回调消费该类型。

```go
type TypedAgentEvent[M MessageType] struct {
    AgentName string
    RunPath   []RunStep
    Output    *TypedAgentOutput[M]
    Action    *AgentAction
    Err       error
}

type AgentEvent = TypedAgentEvent[*schema.Message]
```

#### `TurnLoopConfig[T, M]`

创建 TurnLoop 的配置结构。

```go
type TurnLoopConfig[T any, M MessageType] struct {
    // GenInput 接收 TurnLoop 实例和所有缓冲的项目，决定处理哪些内容。
    // 返回哪些项目现在消费、哪些留到后续 turn。
    // loop 参数允许在回调中直接调用 Push() 或 Stop()。
    // 必填。
    GenInput func(ctx context.Context, loop *TurnLoop[T, M], items []T) (*GenInputResult[T, M], error)

    // GenResume 在 Run() 期间最多调用一次。当配置了 CheckpointID 时，
    // Run() 会查询 Store 中的 checkpoint：
    //   - 若 checkpoint 包含 runner 状态（即 agent 在 turn 中途被中断），
    //     Run() 调用 GenResume 来规划恢复 turn。
    //   - 否则（无 checkpoint 或 between-turns checkpoint），GenResume 不会被调用，
    //     TurnLoop 通过 GenInput 正常处理。
    // 参数含义：
    //   - inFlightItems：前次运行被取消或业务 interrupt 时正在处理的项目
    //   - unhandledItems：前次运行退出时已缓冲但未处理的项目
    //   - newItems：Run() 调用前通过 Push() 缓冲的新项目
    //
    // 返回 GenResumeResult，描述如何恢复被中断的 agent turn
    // （可选 ResumeParams）以及如何操作缓冲区（Consumed/Remaining）。
    // 可选；仅在需要恢复时必填。
    GenResume func(ctx context.Context, loop *TurnLoop[T, M], inFlightItems, unhandledItems, newItems []T) (*GenResumeResult[T, M], error)

    // PrepareAgent 返回一个配置好的 TypedAgent 来处理被消费的项目。
    // 每个 turn 调用一次，传入 GenInput 决定消费的项目。
    // loop 参数允许在回调中直接调用 Push() 或 Stop()。
    // 必填。
    PrepareAgent func(ctx context.Context, loop *TurnLoop[T, M], consumed []T) (TypedAgent[M], error)

    // OnAgentEvents 处理 agent 发出的事件。
    // TurnContext 提供 per-turn 信息与控制：
    //   - tc.Consumed：触发本次 agent 执行的已消费项目
    //   - tc.Loop：允许在回调中直接调用 Push() 或 Stop()
    //   - tc.Preempted / tc.Stopped：处理事件时的信号
    //
    // 错误处理：返回的 error 仅在回调自身想要中止 TurnLoop 时使用。
    // 回调看到 CancelError 时始终不需要抛出，框架会自动处理：
    //   - Stop 时：框架自动将 CancelError 作为 ExitReason 抛出，TurnLoop 终止。
    //   - Preempt 时：框架不会抛出 CancelError；若回调也返回 nil，TurnLoop 进入下一轮。
    // 实践中，仅在回调内部故障需要终止 TurnLoop 时返回非 nil error。
    //
    // 可选。如果未提供，事件将被消费，第一个错误（包括 Stop 触发的 CancelError）将作为 ExitReason 返回。
    OnAgentEvents func(ctx context.Context, tc *TurnContext[T, M], events *AsyncIterator[*TypedAgentEvent[M]]) error

    // Store 是用于持久化和恢复的检查点存储。可选。
    // 与 CheckpointID 配合使用时，启用自动 checkpoint 恢复。
    // TurnLoop 始终通过 gob 编码持久化 runner checkpoint bytes 和 item 簿记信息
    // （InFlightItems, UnhandledItems），因此使用 Store 时 T 必须可 gob 编解码。
    Store CheckPointStore

    // CheckpointID 与 Store 配合使用，启用声明式的自动 checkpoint 恢复。
    // Run() 时，TurnLoop 使用此 ID 查询 Store：
    //   - 若存在包含 runner 状态的 checkpoint（mid-turn interrupt），调用 GenResume 计划恢复 turn。
    //   - 若存在不含 runner 状态的 checkpoint（between-turns），将存储的 unhandled items 缓冲，
    //     然后通过 GenInput 正常处理。
    //   - 若不存在 checkpoint，TurnLoop 从头开始。
    //
    // 退出时，如果 TurnLoop 保存了新 checkpoint，它将使用同一 CheckpointID 保存。
    // 未保存新 checkpoint 时，TurnLoop 会尝试删除同一 CheckpointID 下的旧 checkpoint
    // 以防止过期恢复（需 Store 实现 CheckPointDeleter）。
    // 使用 WithSkipCheckpoint() 可显式跳过 checkpoint 保存。
    CheckpointID string
}
```

#### `TurnContext[T, M]`

`OnAgentEvents` 回调函数可用的 per-turn 上下文信息。

```go
type TurnContext[T any, M MessageType] struct {
    // Loop 是 TurnLoop 实例，可在回调中调用 Push()/Stop()。
    Loop *TurnLoop[T, M]

    // Consumed 是触发本次 agent 执行的已消费项目。
    Consumed []T

    // Preempted 在至少一次 preemptive Push 实际 contribute 到当前 turn 的
    // CancelError 时关闭（通过 Push + WithPreempt）。
    // "contribute" 表示该次取消调用的 options 在 CancelError 最终确定前被纳入。
    // 若本次 turn 未发生 contribute 的抢占（例如取消已最终确定），该通道保持打开。
    //
    // Preempted 和 Stopped 可能在同一个 turn 内都被关闭——当两个信号在 agent
    // 仍处于取消过程中时先后到达。取消完全处理后到达的信号不会 contribute。
    Preempted <-chan struct{}

    // Stopped 在 Stop() 的取消调用实际 contribute 到当前 turn 的 CancelError 时关闭。
    // 若 Stop 未 contribute（例如取消已最终确定），该通道保持打开。
    //
    // 关于 Preempted 与 Stopped 的关系，参见 Preempted 文档。
    Stopped <-chan struct{}

    // StopCause 返回通过 WithStopCause 传入的业务侧停止原因。
    // 此值仅在 Stopped 通道关闭后才有意义。在此之前返回空字符串。
    StopCause func() string
}
```

#### `GenInputResult[T, M]`

`GenInput` 回调函数的返回结果。

```go
type GenInputResult[T any, M MessageType] struct {
    // RunCtx 是本次 turn 的执行上下文（可选）。
    // 若设置，将用于 PrepareAgent、agent 的 Run/Resume 以及 OnAgentEvents。
    // 需从传入 GenInput 的 ctx 派生，以保留 TurnLoop 的取消语义与继承的 values。
    // 例如：
    //   runCtx := context.WithValue(ctx, traceKey{}, extractTraceID(items))
    //   return &GenInputResult[T, M]{RunCtx: runCtx, ...}, nil
    // 若为 nil，则使用 TurnLoop 的上下文。
    RunCtx context.Context

    // Input 是要执行的 agent 输入
    Input *TypedAgentInput[M]

    // RunOpts 是本次 agent 运行的选项。
    // 注意：不需要在此处传入 WithCheckPointID，TurnLoop 会自动注入 checkpointID 到 Runner 中。
    RunOpts []AgentRunOption

    // Consumed 是本轮 turn 选择处理的项目：
    // 这些项目会从 buffer 中移除，并作为 PrepareAgent 的输入参数。
    Consumed []T

    // Remaining 是保留在 buffer 中供未来 turn 处理的项目：
    // TurnLoop 会在本轮开始执行 agent 前把 Remaining push 回 buffer。
    //
    // 注意：items 中既不在 Consumed 也不在 Remaining 的项目会被丢弃。
    Remaining []T
}
```

#### `GenResumeResult[T, M]`

`GenResume` 回调函数的返回结果。

```go
type GenResumeResult[T any, M MessageType] struct {
    // RunCtx 是本次恢复 turn 的执行上下文（可选）。
    RunCtx context.Context

    // RunOpts 是本次 agent 恢复运行的选项。
    // 注意：不需要在此处传入 WithCheckPointID，TurnLoop 会自动注入 checkpointID 到 Runner 中。
    RunOpts []AgentRunOption

    // ResumeParams 包含恢复被中断 agent 的参数（可选）。
    ResumeParams *ResumeParams

    // Consumed 是本轮恢复 turn 选择处理的项目：
    // 这些项目会从 buffer 中移除，并作为 PrepareAgent 的输入参数。
    Consumed []T

    // Remaining 是保留在 buffer 中供未来 turn 处理的项目：
    // TurnLoop 会在本轮恢复 agent 前把 Remaining push 回 buffer。
    //
    // 注意：(inFlightItems, unhandledItems, newItems) 中既不在 Consumed 也不在 Remaining
    // 的项目会被丢弃。
    Remaining []T
}
```

#### `InterruptError`

当 agent 产生业务 interrupt（`AgentAction.Interrupted`）并导致 TurnLoop 退出时，`ExitReason` 为 `*InterruptError`。它表示 agent 主动暂停在业务定义的 interrupt 点，而不是被取消。

```go
type InterruptError struct {
    // InterruptContexts 提供定向恢复所需的 interrupt 上下文。
    // 每个上下文代表 agent 层级中一个被 interrupt 的位置。
    InterruptContexts []*InterruptCtx
}

func (e *InterruptError) Error() string
```

**行为：**

- `*InterruptError` 会触发 TurnLoop checkpoint 保存；恢复时通过 `GenResume` 的 `inFlightItems` 参数拿到原 turn 正在处理的项目
- `InterruptContexts` 可用于构造 `ResumeParams.Targets`，并通过 `GenResumeResult.ResumeParams` 传给 `Runner.ResumeWithParams`
- 与 `CancelError` 不同，`InterruptError` 表示业务侧主动暂停；取消活跃期间发生的 interrupt 仍会被吸收为 `CancelError`

#### `TurnLoopExitState[T, M]`

TurnLoop 退出时返回的状态，包含退出原因和未处理的项目。

```go
type TurnLoopExitState[T any, M MessageType] struct {
    // ExitReason 表示 TurnLoop 退出的原因。
    // nil 表示正常退出（Stop() 被调用且 TurnLoop 正常完成）。
    // 非 nil 可能是 context 错误、回调错误、*CancelError 等。
    // 当 Stop() 取消了一个正在运行的 agent 时，ExitReason 为 *CancelError。
    // 此字段不包含 checkpoint 错误——见 CheckpointErr。
    ExitReason error

    // UnhandledItems 包含已缓冲但未处理的项目。
    // 即 Push 返回 true 但未被任何 turn 消费的项目。
    // 无论 ExitReason 为何值始终有效。
    UnhandledItems []T

    // InFlightItems 包含被中断 turn 正在处理的项目。
    // 取消（Stop + WithImmediate、WithGraceful 或 WithGracefulTimeout）和业务 interrupt
    // 都会填充该字段；如果 agent 在取消生效前正常完成，则为空。
    // 恢复时通过 GenResume 的 inFlightItems 参数透传给用户。
    InFlightItems []T

    // StopCause 是通过 WithStopCause 传入的业务侧停止原因。
    // 若未调用 Stop 或未提供 cause，则为空字符串。
    StopCause string

    // CheckpointAttempted 表示 TurnLoop 退出时是否尝试保存 checkpoint。
    // 仅当 Store 已配置、CheckpointID 已设置、TurnLoop 退出时非 idle、未使用 WithSkipCheckpoint，
    // 且退出由 Stop() 或业务 interrupt 触发时为 true。
    CheckpointAttempted bool

    // CheckpointErr 是 checkpoint 保存时的错误（如有）。
    // 当 CheckpointAttempted 为 false（未尝试保存）或保存成功时为 nil。
    CheckpointErr error

    // TakeLateItems 返回 TurnLoop 停止后被推送的项目
    // （即 Push 返回 false 的那些项目）。这些项目不包含在 checkpoint 中。
    //
    // 此函数是幂等的：首次调用计算并缓存结果，后续调用返回相同的切片。
    //
    // 调用 TakeLateItems 后，后续的 Push() 将 panic，
    // 以防止项目被静默丢失。
    //
    // 在 Wait() 返回后，可从任意 goroutine 安全调用。
    // 若从未调用 TakeLateItems，late items 将被正常垃圾回收。
    TakeLateItems func() []T
}
```

### 函数

#### `NewTurnLoop`

创建一个新的 TurnLoop，但不启动它。返回的 TurnLoop 立即接受 `Push` 和 `Stop` 调用；推入的项目会被缓冲，直到调用 `Run`。

若 `GenInput` 或 `PrepareAgent` 为 nil，则 panic。

```go
func NewTurnLoop[T any, M MessageType](cfg TurnLoopConfig[T, M]) *TurnLoop[T, M]
```

**参数：**

- `cfg TurnLoopConfig[T, M]`：TurnLoop 的配置

**返回值：**

- `*TurnLoop[T, M]`：未启动的 TurnLoop 实例

**示例：**

```go
loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        return &GenInputResult[string, *schema.Message]{
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(items[0])}},
            Consumed: items,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (TypedAgent[*schema.Message], error) {
        return myAgent, nil
    },
})

// 可以在启动前推入项目或传递引用
_, _ = loop.Push("initial_item")
loop.Run(ctx)
```

### 方法

所有方法在 TurnLoop 未启动时均可安全调用（宽容 API）：

- `Push`：项目被缓冲，`Run` 调用后开始处理。
- `Stop`：设置停止标志，后续 `Run` 将立即退出。
- `Wait`：阻塞直到 `Run` 被调用且 TurnLoop 退出。如果从未调用 `Run`，`Wait` 将永久阻塞。

> 注：Push 在未启动前写入的项目，会在首次 Run 启动后被处理。

#### `Run`

启动 TurnLoop 的处理 goroutine。此方法是非阻塞的：TurnLoop 在后台运行，通过 `Wait` 获取结果。

若在 `TurnLoopConfig` 中配置了 `CheckpointID` 且 `Store` 中存在匹配的 checkpoint，TurnLoop 将自动从该 checkpoint 尝试恢复；否则从头开始处理已 `Push()` 的项目。多次调用 `Run` 是幂等的 no-op：只有首次调用会启动 TurnLoop。

```go
func (l *TurnLoop[T, M]) Run(ctx context.Context)
```

**参数：**

- `ctx context.Context`：TurnLoop 生命周期的上下文

**示例：**

```go
loop := NewTurnLoop(cfg)
loop.Run(context.Background())
```

#### `Push`

向 TurnLoop 的缓冲区添加一个项目进行处理。此方法是非阻塞且线程安全的。

```go
func (l *TurnLoop[T, M]) Push(item T, opts ...PushOption[T, M]) (bool, <-chan struct{})
```

**参数：**

- `item T`：要添加到缓冲区的项目
- `opts ...PushOption[T, M]`：可选的推送选项

**返回值：**

- `bool`：如果 TurnLoop 已停止则返回 `false`（项目仍会被保留，可通过 `TurnLoopExitState.TakeLateItems()` 取回），否则返回 `true`（包括尚未调用 `Run` 的情况，项目将被缓冲）
- `<-chan struct{}`：仅在使用 `WithPreempt` / `WithPreemptTimeout` 时返回非 nil 值。调用方可等待此 channel 关闭，以确认抢占信号已被 TurnLoop 接收并提交取消请求——即当前 turn 已确定会被抢占。具体时机：
  - 若当前有运行中的 agent：channel 在 TurnLoop 调用 cancel 后关闭
  - 若当前无运行中的 agent（TurnLoop 空闲或尚未启动）：channel 立即关闭（无需取消）
  - 若无需等待确认，可忽略此返回值

**示例：**

```go
// 普通推送
ok, _ := loop.Push("message1")
if !ok {
    // 循环已停止，项目可通过 TakeLateItems() 取回
}

// 抢占式推送：推送新项目并请求取消当前 turn
ok, ack := loop.Push("urgent_message", WithPreempt[string, *schema.Message](AnySafePoint))
if !ok {
    // 循环已停止
} else {
    <-ack // 等待确认：抢占信号已被接收，当前 turn 确定会被取消
}
```

##### SafePoint 类型

`SafePoint` 描述 agent 可以在哪个边界被取消。值可以用按位 OR 组合以接受多个安全点。

`SafePoint` 仅用于抢占 API（`WithPreempt`/`WithPreemptTimeout`）。一个关键的设计约束：**抢占始终瞄准安全点**——用户的意图是在一个明确定义的边界处取消，而不是立即中止。立即取消仅在超时升级时才可达（通过 `WithPreemptTimeout`），而非用户的直接选择。这就是为什么 `SafePoint` 没有 "immediate" 值，且 `WithPreempt` 要求非零 `SafePoint`（否则 panic）。

`SafePoint` 在内部映射为 `CancelMode`，但对 TurnLoop 用户隐藏了该细节。

```go
type SafePoint int

const (
    AfterChatModel SafePoint = 1 << iota // 允许 agent 完成当前 chat-model 调用后被取消
    AfterToolCalls                       // 允许 agent 完成当前 tool 调用轮次后被取消
    AnySafePoint = AfterChatModel | AfterToolCalls // AfterChatModel | AfterToolCalls 的简写
)
```

##### `PushOption[T, M]`

配置一次 `Push` 调用的不透明选项类型。用户通常不自行实现该类型，而是使用 `WithPreempt`、`WithPreemptTimeout`、`WithPreemptDelay` 或 `WithPushStrategy` 创建选项。

```go
type PushOption[T any, M MessageType] func(*pushConfig[T, M])
```

##### `WithPreempt`

推送新项目的同时，请求在指定的 `SafePoint` 处取消当前 agent turn。取消完成后，TurnLoop 启动新的 turn，`GenInput` 将看到所有缓冲项目（包括刚推送的）。使用 `WithPreemptTimeout` 添加超时以升级为立即中止。

由于安全点在 turn 级别边界触发（chat model 返回之后或所有 tool 调用完成之后），**取消发生时没有嵌套 agent 在运行**——AgentTools 内的嵌套 agent 要么尚未启动（AfterChatModel），要么已经完成（AfterToolCalls）。因此 `WithPreempt` 的取消不涉及嵌套 agent。而 `WithPreemptTimeout` 在超时升级为立即取消时，会同时终止 AgentTools 内正在运行的嵌套 agent。

`WithPreempt` 和 `WithPreemptTimeout` 互斥；如果同时传给同一个 `Push` 调用，后者生效。

`safePoint` 不能为零；传入 `SafePoint(0)` 会 panic。

```go
func WithPreempt[T any, M MessageType](safePoint SafePoint) PushOption[T, M]
```

**参数：**

- `safePoint SafePoint`：指定 agent 在哪个安全点让出

**示例：**

```go
_, _ = loop.Push("urgent_item", WithPreempt[string, *schema.Message](AnySafePoint))
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AfterToolCalls))
```

##### `WithPreemptTimeout`

与 `WithPreempt` 类似，但添加了超时。如果 agent 在超时时间内未到达安全点，抢占将升级为立即取消。超时升级时，AgentTools 内的嵌套 agent 也会收到取消信号并被终止。

`timeout <= 0` 不会设置有效 deadline，因此不会触发超时升级。

`safePoint` 不能为零；传入 `SafePoint(0)` 会 panic。

```go
func WithPreemptTimeout[T any, M MessageType](safePoint SafePoint, timeout time.Duration) PushOption[T, M]
```

**参数：**

- `safePoint SafePoint`：指定 agent 在哪个安全点让出
- `timeout time.Duration`：超时后升级为立即取消

**示例：**

```go
_, _ = loop.Push("urgent_item", WithPreemptTimeout[string, *schema.Message](AnySafePoint, 5*time.Second))
```

##### `WithPreemptDelay`

设置抢占生效前的延迟时长。必须与 `WithPreempt` 或 `WithPreemptTimeout` 一起使用。

`delay <= 0` 等价于不设置延迟。

```go
func WithPreemptDelay[T any, M MessageType](delay time.Duration) PushOption[T, M]
```

**参数：**

- `delay time.Duration`：抢占前的延迟时长

**示例：**

```go
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AnySafePoint), WithPreemptDelay[string, *schema.Message](2*time.Second))
```

##### `WithPushStrategy`

提供基于当前 turn 状态的动态推送选项解析。回调接收当前 turn 的 context 和 `TurnContext`（如果没有活跃 turn 则为 nil），返回要实际应用的 `PushOption` 列表。

当使用 `WithPushStrategy` 时，同一 `Push` 调用中传入的所有其他 `PushOption` 将被忽略。返回的选项中不得包含另一个 `WithPushStrategy`；嵌套的 strategy 会被静默剥除。

TurnLoop 会先在内部锁下 hold 当前 run loop 并获取当前 turn 快照，然后在该稳定快照上调用回调；回调中读取的 turn 状态与最终推送决策之间不会跨越到下一轮 turn。

```go
func WithPushStrategy[T any, M MessageType](fn func(ctx context.Context, tc *TurnContext[T, M]) []PushOption[T, M]) PushOption[T, M]
```

**参数：**

- `fn func(ctx context.Context, tc *TurnContext[T, M]) []PushOption[T, M]`：策略回调函数
  - `ctx`：当前 turn 的上下文（无活跃 turn 时为 `context.Background()`）
  - `tc`：当前 turn 的 `TurnContext`（无活跃 turn 时为 `nil`）

**示例：**

```go
_, _ = loop.Push(urgentItem, WithPushStrategy(func(ctx context.Context, tc *TurnContext[MyItem, *schema.Message]) []PushOption[MyItem, *schema.Message] {
    if tc == nil {
        return nil // 两轮之间，普通 push
    }
    if isLowPriority(tc.Consumed) {
        return []PushOption[MyItem, *schema.Message]{WithPreempt[MyItem, *schema.Message](AnySafePoint)}
    }
    return nil // 不抢占高优先级任务
}))
```

#### `Stop`

向 TurnLoop 发送停止信号并立即返回（非阻塞）。

不带选项时，当前 agent turn 运行至完成，TurnLoop 在 turn 边界退出而不启动新的 turn。此时 `ExitReason` 为 `nil`。

使用 `WithImmediate()` 立即中止正在运行的 agent turn。使用 `WithGraceful()` 在最近的安全点取消，并递归传播到嵌套 agent。使用 `WithGracefulTimeout()` 在安全点取消并设置升级截止时间。使用 `UntilIdleFor()` 延迟停止，直到 TurnLoop 持续空闲一段时间后自动关停。

可以在 `Run` 之前调用，此时后续 `Run` 将立即退出。

多次调用是允许的；后续调用更新取消选项。不带 `UntilIdleFor` 的 `Stop()` 调用会立即关停 TurnLoop，即使先前的 `UntilIdleFor` 仍在等待中。注意 `WithSkipCheckpoint` 和 `WithStopCause` 具有粘性语义——分别见各自的文档。

如果运行中的 agent 不支持 `WithCancel` 的 `AgentRunOption`，所有取消相关选项（`WithImmediate`、`WithGraceful`、`WithGracefulTimeout`）退化为"在进入下一次迭代时退出 TurnLoop"——当前 agent turn 会运行到完成后 TurnLoop 再退出。

调用 `Wait()` 阻塞直到 TurnLoop 完全退出并获取结果。

```go
func (l *TurnLoop[T, M]) Stop(opts ...StopOption)
```

**参数：**

- `opts ...StopOption`：可选的停止选项

**示例：**

```go
// 不带选项：turn 边界退出（当前 turn 完成后停止，ExitReason 为 nil）
loop.Stop()

// 立即中止当前 agent turn
loop.Stop(WithImmediate())

// 安全点停止（优雅关停，递归传播到嵌套 agent）
loop.Stop(WithGraceful())

// 带超时的安全点停止
loop.Stop(WithGracefulTimeout(10 * time.Second))

// 空闲后停止（持续空闲 30 秒后自动关停）
loop.Stop(UntilIdleFor(30 * time.Second))
```

##### `StopOption`

配置一次 `Stop` 调用的不透明选项类型。用户通常不自行实现该类型，而是使用 `WithImmediate`、`WithGraceful`、`WithGracefulTimeout`、`UntilIdleFor`、`WithSkipCheckpoint` 或 `WithStopCause` 创建选项。

```go
type StopOption func(*stopConfig)
```

##### `WithImmediate`

立即中止正在运行的 agent turn，不等待任何安全点。AgentTools 内的嵌套 agent 也会收到取消信号并被终止。

这是最激进的停止模式，适合优先保证尽快停机的场景；若同时确定未来不需要恢复，应额外使用 `WithSkipCheckpoint()`。

```go
func WithImmediate() StopOption
```

**示例：**

```go
loop.Stop(WithImmediate())
```

##### `WithGraceful`

请求优雅停止：在最近的安全点（tool 调用之后或 chat-model 调用之后）等待，并递归传播到嵌套 agent。不设置时间限制；使用 `WithGracefulTimeout` 添加超时后升级为立即取消。

`WithGraceful` 和 `WithGracefulTimeout` 互斥；如果同时传给同一个 `Stop` 调用，后者生效。

```go
func WithGraceful() StopOption
```

**示例：**

```go
loop.Stop(WithGraceful())
```

##### `WithGracefulTimeout`

与 `WithGraceful` 类似，但添加了超时期限。如果 agent 在 `gracePeriod` 内未到达安全点，停止将升级为立即取消。

`gracePeriod` 必须为正值；传入零或负值会 panic。

```go
func WithGracefulTimeout(gracePeriod time.Duration) StopOption
```

**参数：**

- `gracePeriod time.Duration`：超时后升级为立即取消

**示例：**

```go
loop.Stop(WithGracefulTimeout(10 * time.Second))
```

##### `UntilIdleFor`

延迟停止，直到 TurnLoop 持续空闲（在 turn 之间阻塞且无待处理项目）达到指定时长。每当新项目到达时，计时器从零重置。

当业务代码从外部监控 agent 活动并希望在一段时间无工作后关停 TurnLoop 时很有用，且不与并发的 `Push` 调用产生竞态。

`UntilIdleFor` 不影响正在运行的 agent；它仅在 TurnLoop 空闲时生效。同一次调用中的取消选项（`WithImmediate`、`WithGraceful`、`WithGracefulTimeout`）会被静默忽略。`UntilIdleFor` 可与非取消选项（`WithSkipCheckpoint`、`WithStopCause`）组合。

若需在空闲等待期间升级为立即关停，发起一次新的不带 `UntilIdleFor` 的 `Stop` 调用即可覆盖空闲等待：

```go
loop.Stop(UntilIdleFor(30 * time.Second))  // 等待空闲
// ... 稍后，如果需要立即中止：
loop.Stop(WithImmediate())                 // 覆盖空闲等待，立即关停
```

仅首次 `UntilIdleFor` 的时长生效；后续调用传入不同时长会被忽略。

`duration` 必须为正值；传入零或负值会 panic。

```go
func UntilIdleFor(duration time.Duration) StopOption
```

**参数：**

- `duration time.Duration`：空闲等待时长

**示例：**

```go
// 持续空闲 30 秒后自动关停
loop.Stop(UntilIdleFor(30 * time.Second))

// 空闲关停且不保存 checkpoint
loop.Stop(UntilIdleFor(30*time.Second), WithSkipCheckpoint())
```

##### `WithSkipCheckpoint`

告知 TurnLoop 本次 Stop 不要持久化 checkpoint。适用于调用方确定不会在未来恢复的场景。

标志位是粘性的：一旦任何 `Stop()` 调用设置了此选项，后续的升级调用无法撤消。

```go
func WithSkipCheckpoint() StopOption
```

**示例：**

```go
// 永久停止，不保存 checkpoint
loop.Stop(WithSkipCheckpoint())

// 与取消选项组合：立即中止且不保存 checkpoint
loop.Stop(WithImmediate(), WithSkipCheckpoint())
```

##### `WithStopCause`

为 Stop 调用附带一个业务侧的停止原因字符串。

原因会在两处暴露：

- `TurnLoopExitState.StopCause`：`Wait()` 返回后可用
- `TurnContext.StopCause()`：在 `OnAgentEvents` 中，`<-tc.Stopped` 关闭后可用

若多次 `Stop()` 调用都提供了 cause，以首个非空值为准。

```go
func WithStopCause(cause string) StopOption
```

**参数：**

- `cause string`：业务侧停止原因

**示例：**

```go
loop.Stop(WithStopCause("user session timeout"))

// 组合使用
loop.Stop(
    WithGraceful(),
    WithStopCause("quota exceeded"),
)
```

#### `Wait`

阻塞直到 TurnLoop 退出并返回退出状态。可以从多个 goroutine 安全调用，所有调用者将收到相同的结果。阻塞直到 `Run` 被调用且 TurnLoop 退出；如果从未调用 `Run`，将永久阻塞。

```go
func (l *TurnLoop[T, M]) Wait() *TurnLoopExitState[T, M]
```

**返回值：**

- `*TurnLoopExitState[T, M]`：包含退出原因、未处理项目、checkpoint 状态和业务停止原因的退出状态

**示例：**

```go
loop.Stop()
result := loop.Wait()
if result.ExitReason != nil {
    log.Printf("循环退出时出错: %v", result.ExitReason)
}
```

### 扩展接口

#### `CheckPointStore`

用于保存和读取 checkpoint 的存储接口。`TurnLoopConfig.Store` 使用该接口；当它与 `CheckpointID` 同时配置时，TurnLoop 才会启用自动恢复与持久化。

```go
type CheckPointStore interface {
    Get(ctx context.Context, checkPointID string) ([]byte, bool, error)
    Set(ctx context.Context, checkPointID string, checkPoint []byte) error
}
```

#### `CheckPointDeleter`

`CheckPointStore` 的可选扩展接口。实现此接口的 Store 支持显式删除 checkpoint。

TurnLoop 在未保存新 checkpoint 时，会尝试删除先前加载的 checkpoint，以防止过期恢复。**只有实现了 CheckPointDeleter 的 Store 才会执行此删除**；否则过期 checkpoint 的生命周期由 Store 自身管理。

```go
type CheckPointDeleter interface {
    Delete(ctx context.Context, checkPointID string) error
}
```

---

## 使用示例

### Agent 取消基本使用

```go
ctx := context.Background()
runner := NewRunner(ctx, RunnerConfig{
    Agent: myAgent,
})

// 启用取消功能
cancelOpt, cancelFunc := WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// 在另一个 goroutine 中，在 chat model 完成后取消
go func() {
    time.Sleep(2 * time.Second)
    handle, _ := cancelFunc(
        WithAgentCancelMode(CancelAfterChatModel),
        WithAgentCancelTimeout(5*time.Second),
    )
    err := handle.Wait()
    if err != nil {
        log.Printf("取消失败: %v", err)
    }
}()

// 处理事件
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Err != nil {
        var cancelErr *CancelError
        if errors.As(event.Err, &cancelErr) {
            log.Printf("Agent 被取消: mode=%v, escalated=%v", 
                cancelErr.Info.Mode, cancelErr.Info.Escalated)
        }
        break
    }
    // 处理事件
}
```

### TurnLoop 基本使用

```go
ctx := context.Background()

loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        // 处理所有项目，并为本次 turn 绑定 trace 上下文
        runCtx := context.WithValue(ctx, traceKey{}, extractTrace(items[0]))
        return &GenInputResult[string, *schema.Message]{
            RunCtx:   runCtx,
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(strings.Join(items, "\n"))}},
            Consumed: items,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (Agent, error) {
        return myAgent, nil
    },
    OnAgentEvents: func(ctx context.Context, tc *TurnContext[string, *schema.Message], events *AsyncIterator[*TypedAgentEvent[*schema.Message]]) error {
        for {
            event, ok := events.Next()
            if !ok {
                break
            }
            if event.Err != nil {
                var cancelErr *CancelError
                if errors.As(event.Err, &cancelErr) {
                    // 取消由 TurnLoop 捕获并转化为退出状态，回调不需要主动返回。
                    continue
                }
                return event.Err
            }
            // 处理事件
        }
        return nil
    },
})

// 可以在启动前推入项目
_, _ = loop.Push("用户消息 1")
_, _ = loop.Push("用户消息 2")

// 启动循环
loop.Run(ctx)

// 停止并等待（turn 边界退出，ExitReason 为 nil）
loop.Stop()
result := loop.Wait()
```

### 带抢占功能的 TurnLoop

```go
loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{...})
loop.Run(ctx)

// 推送紧急项目并抢占当前 agent
_, ack := loop.Push("urgent_message", WithPreempt[string, *schema.Message](AnySafePoint))
if ack != nil {
    <-ack
}

// 或带延迟
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AnySafePoint), WithPreemptDelay[string, *schema.Message](1*time.Second))
```

### TurnLoop 声明式 Checkpoint 恢复

```go
ctx := context.Background()

// 第一次运行——配置 Store 和 CheckpointID 启用自动 checkpoint
cfg := TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        return &GenInputResult[string, *schema.Message]{
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(items[0])}},
            Consumed: items,
        }, nil
    },
    GenResume: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], inFlightItems, unhandledItems, newItems []string) (*GenResumeResult[string, *schema.Message], error) {
        all := append(append(inFlightItems, unhandledItems...), newItems...)
        return &GenResumeResult[string, *schema.Message]{
            Consumed: all,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (Agent, error) {
        return myAgent, nil
    },
    Store:        myStore,
    CheckpointID: "my-session-id",
}

loop := NewTurnLoop(cfg)
_, _ = loop.Push("message1")
loop.Run(ctx)

// 停止运行
loop.Stop(WithGraceful())
exit := loop.Wait()

// 从 checkpoint 恢复——使用相同的 cfg（包含相同 CheckpointID），
// Run() 会自动检测并从 checkpoint 恢复
loop2 := NewTurnLoop(cfg)
_, _ = loop2.Push("new_message") // 新项目会作为 newItems 传入 GenResume
loop2.Run(ctx)
result2 := loop2.Wait()
```

---

## 最佳实践

### Agent 取消

1. **选择合适的模式**：优雅取消使用安全点模式（`CancelAfterChatModel`、`CancelAfterToolCalls`），紧急情况使用 `CancelImmediate`
2. **设置超时**：建议为安全点模式设置超时，防止无限等待
3. **处理 CancelError**：在事件错误中检查 `CancelError`，区分取消和失败
4. **理解 Interrupt 吸收**：取消活跃期间的业务 interrupt 会被吸收为 `CancelError`，但 checkpoint 会保留完整数据，恢复时业务 interrupt 会自然重新触发
5. **恢复能力**：使用 `CancelError` 中的 `InterruptContexts` 实现定向恢复
6. **递归传播**：默认取消仅影响根 agent。当 agent 层级中包含 AgentTool 嵌套的子 agent 时，使用 `WithRecursive()` 将取消传播到所有子 agent。不确定时，先不加 `WithRecursive()` ——仅在明确需要子 agent 也响应取消安全点时才启用

### TurnLoop

1. **处理所有事件**：如果提供了 `OnAgentEvents`，应完整消费事件迭代器；未提供时框架会自动 drain 事件
2. **感知抢占/停止**：在 `OnAgentEvents` 中使用 `TurnContext.Preempted` / `TurnContext.Stopped`（`select`）来感知抢占/停止；注意它们仅在对应取消调用实际 contribute 到本次 turn 的 `CancelError` 时才会关闭
3. **声明式 Checkpoint**：在 `TurnLoopConfig` 中同时配置 `Store` 和 `CheckpointID` 以启用自动 checkpoint 恢复；`Run()` 会自动检测并从已有 checkpoint 恢复
4. **恢复运行**：使用相同的 `CheckpointID` 创建新的 TurnLoop 并调用 `Run()`，框架会自动检测 checkpoint 并调用 `GenResume`；新项目通过 `Push()` 在 `Run()` 前缓冲
5. **过期 Checkpoint 清理**：未保存新 checkpoint 时，框架会自动删除先前加载的 checkpoint，防止过期恢复；**只有实现了 CheckPointDeleter 接口的 Store 才会执行此删除**
6. **区分 CancelError 与业务 interrupt**：`*CancelError` 表示取消路径，`*InterruptError` 表示业务侧主动 interrupt；两者都可能产生 checkpoint，并通过 `GenResume` 的 `inFlightItems` 传回在处理中项目
7. **跳过 Checkpoint**：当确定不再恢复时，使用 `WithSkipCheckpoint()` 避免不必要的 checkpoint 写入；该标志在升级调用中保持粘性
8. **业务停止原因**：通过 `WithStopCause()` 附带业务层停止原因，与技术层面的 `ExitReason` 分离；在 `OnAgentEvents` 中通过 `<-tc.Stopped` 后读取 `tc.StopCause()` 获取
9. **T 的 gob 兼容性**：使用 `Store` 时，`T` 必须可 gob 编解码，因为框架通过 gob 持久化 runner bytes 和 item 簿记信息
10. **停止升级**：可多次调用 `Stop()`——后续调用更新取消选项（如从 `WithGraceful()` 升级到 `WithImmediate()`）
11. **空闲关停**：使用 `UntilIdleFor()` 在无工作时自动关停，避免与并发 `Push` 的竞态
12. **上下文派生**：如需 per-turn trace，请在 `GenInput`/`GenResume` 中从 `ctx` 派生 `RunCtx`
13. **Late Items 恢复**：`Push()` 返回 `false` 时项目并未丢失——通过 `TurnLoopExitState.TakeLateItems()` 取回；注意调用 `TakeLateItems` 后不可再 `Push()`
14. **区分退出结果和 Checkpoint 结果**：`ExitReason` 反映 loop 本身的退出原因，`CheckpointAttempted` + `CheckpointErr` 反映 checkpoint 持久化结果，两者独立判断

### 集成使用

1. **抢占 vs 停止**：执行期间的紧急项目使用 `WithPreempt()`，最终关闭使用 `Stop()`
2. **条件抢占**：当抢占决策依赖当前 turn 状态时，使用 `WithPushStrategy` 而非先读状态再调 `Push`——它在原子快照下执行，避免 TOCTOU 竞态
3. **上下文取消**：取消传给 `Run(ctx)` 的 `ctx` 可中止当前 turn 并让 loop 退出（`ExitReason` 通常为 `context.Canceled`/`context.DeadlineExceeded`）；`Stop()` 更适合有序停机并可通过 `WithGraceful`/`WithGracefulTimeout` 控制取消策略
