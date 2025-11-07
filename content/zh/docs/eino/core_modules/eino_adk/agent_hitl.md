---
Description: ""
date: "2025-11-07"
lastmod: ""
tags: []
title: 'Eino human-in-the-loop框架：技术架构指南'
weight: 8
---

## 概述

本文档提供 Eino 的human-in-the-loop (Human-in-the-Loop, HITL) 框架架构的技术细节，重点介绍中断/恢复机制和底层的寻址系统。

## Alpha 版本发布公告

> **注意**：本文档中描述的human-in-the-loop框架是一个 **Alpha 功能**。

- **发布标签**：`v0.7.0-alpha.1`
- **稳定性**：在正式发布前，API 和功能可能会发生变化。
- **Alpha 阶段**：Alpha 阶段预计将在 2025 年 11 月底前结束。

我们欢迎在此阶段提供反馈和贡献，以帮助我们改进该框架。

## human-in-the-loop的需求

下图说明了在中断/恢复过程中，每个组件必须回答的关键问题。理解这些需求是掌握架构设计背后原因的关键。

<a href="/img/eino/hitl_requirements.png" target="_blank"><img src="/img/eino/hitl_requirements.png" width="100%" /></a>

因此，我们的目标是：
1. 帮助开发者尽可能轻松地回答上述问题。
2. 帮助最终用户尽可能轻松地回答上述问题。
3. 使框架能够自动并开箱即用地回答上述问题。

## 架构概述

以下流程图说明了高层次的中断/恢复流程：

<a href="/img/eino/hitl_architecture.png" target="_blank"><img src="/img/eino/hitl_architecture.png" width="100%" /></a>

以下序列图显示了三个主要参与者之间按时间顺序的交互流程：

<a href="/img/eino/hitl_sequence.png" target="_blank"><img src="/img/eino/hitl_sequence.png" width="100%" /></a>

## ADK 包 API

ADK 包提供了用于构建具有human-in-the-loop能力的可中断 agent 的高级抽象。

### 1. 用于中断的 API

#### `Interrupt`
创建一个基础的中断动作。当 agent 需要暂停执行以请求外部输入或干预，但不需要保存任何内部状态以供恢复时使用。

```go
func Interrupt(ctx context.Context, info any) *AgentEvent
```

**参数:**
- `ctx`: 正在运行组件的上下文。
- `info`: 描述中断原因的面向用户的数据。

**返回:** 带有中断动作的 `*AgentEvent`。

**示例:**
```go
// 在 agent 的 Run 方法内部：

// 创建一个简单的中断以请求澄清。
return adk.Interrupt(ctx, "用户查询不明确，请澄清。")
```

---

#### `StatefulInterrupt`
创建一个中断动作，同时保存 agent 的内部状态。当 agent 具有必须恢复才能正确继续的内部状态时使用。

```go
func StatefulInterrupt(ctx context.Context, info any, state any) *AgentEvent
```

**参数:**
- `ctx`: 正在运行组件的上下文。
- `info`: 描述中断的面向用户的数据。
- `state`: agent 的内部状态对象，它将被序列化并存储。

**返回:** 带有中断动作的 `*AgentEvent`。

**示例:**
```go
// 在 agent 的 Run 方法内部：

// 定义要保存的状态。
type MyAgentState struct {
    ProcessedItems int
    CurrentTopic   string
}

currentState := &MyAgentState{
    ProcessedItems: 42,
    CurrentTopic:   "HITL",
}

// 中断并保存当前状态。
return adk.StatefulInterrupt(ctx, "在继续前需要用户反馈", currentState)
```

---

#### `CompositeInterrupt`
为协调多个子组件的组件创建一个中断动作。它将一个或多个子 agent 的中断组合成一个单一、内聚的中断。任何包含子 agent 的 agent（例如，自定义的 `Sequential` 或 `Parallel` agent）都使用此功能来传播其子级的中断。

```go
func CompositeInterrupt(ctx context.Context, info any, state any, 
    subInterruptSignals ...*InterruptSignal) *AgentEvent
```

**参数:**
- `ctx`: 正在运行组件的上下文。
- `info`: 描述协调器自身中断原因的面向用户的数据。
- `state`: 协调器 agent 自身的状态（例如，被中断的子 agent 的索引）。
- `subInterruptSignals`: 来自被中断子 agent 的 `InterruptSignal` 对象的变长列表。

**返回:** 带有中断动作的 `*AgentEvent`。

**示例:**
```go
// 在一个运行两个子 agent 的自定义顺序 agent 中...
subAgent1 := &myInterruptingAgent{}
subAgent2 := &myOtherAgent{}

// 如果 subAgent1 返回一个中断事件...
subInterruptEvent := subAgent1.Run(ctx, input)

// 父 agent 必须捕获它并将其包装在 CompositeInterrupt 中。
if subInterruptEvent.Action.Interrupted != nil {
    // 父 agent 可以添加自己的状态，比如哪个子 agent 被中断了。
    parentState := map[string]int{"interrupted_child_index": 0}
    
    //向上冒泡中断。
    return adk.CompositeInterrupt(ctx, 
        "一个子 agent 需要注意", 
        parentState, 
        subInterruptEvent.Action.Interrupted.internalInterrupted,
    )
}
```

### 2. 用于获取中断信息的 API

#### `InterruptInfo` 和 `InterruptCtx`
当 agent 执行被中断时，`AgentEvent` 包含结构化的中断信息。`InterruptInfo` 结构体包含一个 `InterruptCtx` 对象列表，每个对象代表层级中的一个中断点。

`InterruptCtx` 为单个可恢复的中断点提供了一个完整的、面向用户的上下文。

```go
type InterruptCtx struct {
    // ID 是中断点的唯一、完全限定地址，用于定向恢复。
    // 例如："agent:A;node:graph_a;tool:tool_call_123"
    ID string

    // Address 是导致中断点的 AddressSegment 段的结构化序列。
    Address Address

    // Info 是与中断关联的面向用户的信息，由触发它的组件提供。
    Info any

    // IsRootCause 指示中断点是否是中断的确切根本原因。
    IsRootCause bool

    // Parent 指向中断链中父组件的上下文（对于顶级中断为 nil）。
    Parent *InterruptCtx
}
```

以下示例展示了如何访问此信息：

```go
// 在应用层，中断后：
if event.Action != nil && event.Action.Interrupted != nil {
    interruptInfo := event.Action.Interrupted
    
    // 获取所有中断点的扁平列表
    interruptPoints := interruptInfo.InterruptContexts 
    
    for _, point := range interruptPoints {
        // 每个点都包含一个唯一的 ID、面向用户的信息及其层级地址
        fmt.Printf("Interrupt ID: %s, Address: %s, Info: %v\n", point.ID, point.Address.String(), point.Info)
    }
}
```

### 3. 用于最终用户恢复的 API

#### `(*Runner).TargetedResume`
使用“显式定向恢复”策略从检查点继续中断的执行。这是最常见和最强大的恢复方式，允许您定位特定的中断点并为其提供数据。

使用此方法时：
- 地址在 `targets` 映射中的组件将是显式目标。
- 地址不在 `targets` 映射中的被中断组件必须重新中断自己以保留其状态。

```go
func (r *Runner) TargetedResume(ctx context.Context, checkPointID string, 
    targets map[string]any, opts ...AgentRunOption) (*AsyncIterator[*AgentEvent], error)
```

**参数:**
- `ctx`: 用于恢复的上下文。
- `checkPointID`: 要从中恢复的检查点的标识符。
- `targets`: 中断 ID 到恢复数据的映射。这些 ID 可以指向整个执行图中的任何可中断组件。
- `opts`: 额外的运行选项。

**返回:** agent 事件的异步迭代器。

**示例:**
```go
// 收到中断事件后...
interruptID := interruptEvent.Action.Interrupted.InterruptContexts[0].ID

// 为特定中断点准备数据。
resumeData := map[string]any{
    interruptID: "这是您请求的澄清。",
}

// 使用目标数据恢复执行。
resumeIterator, err := runner.TargetedResume(ctx, "my-checkpoint-id", resumeData)
if err != nil {
    // 处理错误
}

// 处理来自恢复迭代器的事件
for event := range resumeIterator.Events() {
    if event.Err != nil {
        // 处理事件错误
        break
    }
    // 处理 agent 事件
    fmt.Printf("Event: %+v\n", event)
}
```

### 4. 用于开发者恢复的 API

#### `ResumeInfo` 结构体
`ResumeInfo` 持有恢复中断的 agent 执行所需的所有信息。它由框架创建并传递给 agent 的 `Resume` 方法。

```go
type ResumeInfo struct {
    // WasInterrupted 指示此 agent 是否是中断的直接来源。
    WasInterrupted bool

    // InterruptState 持有通过 StatefulInterrupt 或 CompositeInterrupt 保存的状态。
    InterruptState any

    // IsResumeTarget 指示此 agent 是否是 TargetedResume 的特定目标。
    IsResumeTarget bool

    // ResumeData 持有用户为此 agent 提供的数据。
    ResumeData any

    // ... 其他字段
}
```

**示例:**
```go
import (
    "context"
    "errors"
    "fmt"
    
    "github.com/cloudwego/eino/adk"
)

// 在 agent 的 Resume 方法内部：
func (a *myAgent) Resume(ctx context.Context, info *adk.ResumeInfo, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    if !info.WasInterrupted {
        // 在恢复流程中不应发生。
        return adk.NewAsyncIterator([]*adk.AgentEvent{{Err: errors.New("not an interrupt")}}, nil)
    }

    if !info.IsResumeTarget {
        // 此 agent 不是特定目标，因此必须重新中断以保留其状态。
        return adk.StatefulInterrupt(ctx, "等待工作流的另一部分被恢复", info.InterruptState)
    }

    // 此 agent 是目标。处理恢复数据。
    if info.ResumeData != nil {
        userInput, ok := info.ResumeData.(string)
        if ok {
            // 处理用户输入并继续执行
            fmt.Printf("收到用户输入: %s\n", userInput)
            // 根据用户输入更新 agent 状态
            a.currentState.LastUserInput = userInput
        }
    }
    
    // 继续正常执行逻辑
    return a.Run(ctx, &adk.AgentInput{Input: "resumed execution"})
}
```

## Compose 包 API

`compose` 包提供了用于创建复杂、可中断工作流的低级构建块。

### 1. 用于中断的 API

#### `Interrupt`
创建一个特殊错误，该错误向执行引擎发出信号，以在组件的特定地址处中断当前运行并保存检查点。这是单个、非复合组件发出可恢复中断信号的标准方式。

```go
func Interrupt(ctx context.Context, info any) error
```

**参数:**
- `ctx`: 正在运行组件的上下文，用于检索当前执行地址。
- `info`: 关于中断的面向用户的信息。此信息不会被持久化，但会通过 `InterruptCtx` 暴露给调用应用程序。

---

#### `StatefulInterrupt`
与 `Interrupt` 类似，但也保存组件的内部状态。状态保存在检查点中，并在恢复时通过 `GetInterruptState` 提供回组件。

```go
func StatefulInterrupt(ctx context.Context, info any, state any) error
```

**参数:**
- `ctx`: 正在运行组件的上下文。
- `info`: 关于中断的面向用户的信息。
- `state`: 中断组件需要持久化的内部状态。

---

#### `CompositeInterrupt`
创建一个表示复合中断的特殊错误。它专为“复合”节点（如 `ToolsNode`）或任何协调多个独立的、可中断子流程的组件而设计。它将多个子中断错误捆绑成一个单一的错误，引擎可以将其解构为可恢复点的扁平列表。

```go
func CompositeInterrupt(ctx context.Context, info any, state any, errs ...error) error
```

**参数:**
- `ctx`: 正在运行的复合节点的上下文。
- `info`: 复合节点本身的面向用户的信息（可以为 `nil`）。
- `state`: 复合节点本身的状态（可以为 `nil`）。
- `errs`: 来自子流程的错误列表。这些可以是 `Interrupt`、`StatefulInterrupt` 或嵌套的 `CompositeInterrupt` 错误。

**示例:**
```go
// 一个并行运行多个进程的节点。
var errs []error
for _, process := range processes {
    subCtx := compose.AppendAddressSegment(ctx, "process", process.ID)
    _, err := process.Run(subCtx)
    if err != nil {
        errs = append(errs, err)
    }
}

// 如果任何子流程中断，则将它们捆绑起来。
if len(errs) > 0 {
    // 复合节点可以保存自己的状态，例如，哪些进程已经完成。
    return compose.CompositeInterrupt(ctx, "并行执行需要输入", parentState, errs...)
}
```

### 2. 用于获取中断信息的 API

#### `ExtractInterruptInfo`
从 `Runnable` 的 `Invoke` 或 `Stream` 方法返回的错误中提取结构化的 `InterruptInfo` 对象。这是应用程序在执行暂停后获取所有中断点列表的主要方式。

```go
composeInfo, ok := compose.ExtractInterruptInfo(err)
if ok {
    // 访问中断上下文
    interruptContexts := composeInfo.InterruptContexts
}
```

**示例:**
```go
// 在调用一个中断的图之后...
_, err := graph.Invoke(ctx, "initial input")

if err != nil {
    interruptInfo, isInterrupt := compose.ExtractInterruptInfo(err)
    if isInterrupt {
        fmt.Printf("执行被 %d 个中断点中断。\n", len(interruptInfo.InterruptContexts))
        // 现在你可以检查 interruptInfo.InterruptContexts 来决定如何恢复。
    }
}
```

### 3. 用于最终用户恢复的 API

#### `Resume`
通过不提供数据来定位一个或多个组件，为“显式定向恢复”操作准备上下文。当恢复行为本身就是信号时，这很有用。

```go
func Resume(ctx context.Context, interruptIDs ...string) context.Context
```

**示例:**
```go
// 中断后，我们得到两个中断 ID：id1 和 id2。
// 我们想在不提供特定数据的情况下恢复两者。
resumeCtx := compose.Resume(context.Background(), id1, id2)

// 将此上下文传递给下一个 Invoke/Stream 调用。
// 在对应于 id1 和 id2 的组件中，GetResumeContext 将返回 isResumeFlow = true。
```

---

#### `ResumeWithData`
准备一个上下文以使用数据恢复单个特定组件。它是 `BatchResumeWithData` 的便捷包装器。

```go
func ResumeWithData(ctx context.Context, interruptID string, data any) context.Context
```

**示例:**
```go
// 使用特定数据恢复单个中断点。
resumeCtx := compose.ResumeWithData(context.Background(), interruptID, "这是您请求的特定数据。")

// 将此上下文传递给下一个 Invoke/Stream 调用。
```

---

#### `BatchResumeWithData`
这是准备恢复上下文的核心函数。它将恢复目标（中断 ID）及其相应数据的映射注入到上下文中。中断 ID 作为键存在的组件在调用 `GetResumeContext` 时将收到 `isResumeFlow = true`。

```go
func BatchResumeWithData(ctx context.Context, resumeData map[string]any) context.Context
```

**示例:**
```go
// 一次性恢复多个中断点，每个中断点使用不同的数据。
resumeData := map[string]any{
    "interrupt-id-1": "第一个点的数据。",
    "interrupt-id-2": 42, // 数据可以是任何类型。
    "interrupt-id-3": nil, // 等效于对此 ID 使用 Resume()。
}

resumeCtx := compose.BatchResumeWithData(context.Background(), resumeData)

// 将此上下文传递给下一个 Invoke/Stream 调用。
```

### 4. 用于开发者恢复的 API

#### `GetInterruptState`
提供一种类型安全的方式来检查和检索先前中断的持久化状态。这是组件用来了解其过去状态的主要函数。

```go
func GetInterruptState[T any](ctx context.Context) (wasInterrupted bool, hasState bool, state T)
```

**返回值:**
- `wasInterrupted`: 如果节点是先前中断的一部分，则为 `true`。
- `hasState`: 如果提供了状态并成功转换为类型 `T`，则为 `true`。
- `state`: 类型化的状态对象。

**示例:**
```go
// 在 lambda 或 tool 的执行逻辑内部：
wasInterrupted, hasState, state := compose.GetInterruptState[*MyState](ctx)

if wasInterrupted {
    fmt.Println("此组件在先前的运行中被中断。")
    if hasState {
        fmt.Printf("已恢复状态: %+v\n", state)
    } 
} else {
    // 这是此组件在此执行中第一次运行。
}
```

---

#### `GetResumeContext`
检查当前组件是否是恢复操作的目标，并检索用户提供的任何数据。这通常在 `GetInterruptState` 确认组件被中断后调用。

```go
func GetResumeContext[T any](ctx context.Context) (isResumeFlow bool, hasData bool, data T)
```

**返回值:**
- `isResumeFlow`: 如果组件被恢复调用明确指定为目标，则为 `true`。如果为 `false`，组件必须重新中断以保留其状态。
- `hasData`: 如果为此组件提供了数据，则为 `true`。
- `data`: 用户提供的类型化数据。

**示例:**
```go
// 在 lambda 或 tool 的执行逻辑内部，检查 GetInterruptState 之后：
wasInterrupted, _, oldState := compose.GetInterruptState[*MyState](ctx)

if wasInterrupted {
    isTarget, hasData, resumeData := compose.GetResumeContext[string](ctx)
    if isTarget {
        // 此组件是目标，继续执行逻辑。
        if hasData {
            fmt.Printf("使用用户数据恢复: %s\n", resumeData)
        }
        // 使用恢复的状态和恢复数据完成工作
        result := processWithStateAndData(state, resumeData)
        return result, nil
    } else {
        // 此组件不是目标，因此必须重新中断。
        return compose.StatefulInterrupt(ctx, "等待另一个组件被恢复", oldState)
    }
}
```

## 底层架构：寻址系统

### 对地址的需求

寻址系统旨在解决有效的human-in-the-loop交互中的三个基本需求：

1.  **状态附加**：要将本地状态附加到中断点，我们需要为每个中断点提供一个稳定、唯一的定位器。
2.  **定向恢复**：要为特定的中断点提供定向的恢复数据，我们需要一种精确识别每个点的方法。
3.  **中断定位**：要告诉最终用户中断在执行层级中的确切位置。

### 地址如何满足这些需求

地址系统通过三个关键属性满足这些需求：

- **稳定性**：地址在多次执行中保持一致，确保可以可靠地识别相同的中断点。
- **唯一性**：每个中断点都有一个唯一的地址，从而能够在恢复期间进行精确定位。
- **层级结构**：地址提供了一个清晰的层级路径，准确显示中断发生在执行流中的哪个位置。

### 地址结构和段类型

#### `Address` 结构
```go
type Address struct {
    Segments []AddressSegment
}

type AddressSegment struct {
    Type  AddressSegmentType
    ID    string
    SubID string
}
```

#### 地址结构图

以下图表从 ADK 和 Compose 两个层面说明了 `Address` 及其 `AddressSegment` 的层级结构：

**ADK 层视角** (简化的、以 Agent 为中心的视图):

<a href="/img/eino/hitl_address_adk.png" target="_blank"><img src="/img/eino/hitl_address_adk.png" width="100%" /></a>

**Compose 层视角** (详细的、完整的层级视图):
<a href="/img/eino/hitl_address_compose.png" target="_blank"><img src="/img/eino/hitl_address_compose.png" width="100%" /></a>

### 特定层的地址段类型

#### ADK 层段类型
ADK 层提供了执行层级的简化、以 agent 为中心的抽象：

```go
type AddressSegmentType = core.AddressSegmentType

const (
    AddressSegmentAgent AddressSegmentType = "agent"
    AddressSegmentTool  AddressSegmentType = "tool"
)
```

**关键特性:**
- **Agent 段**: 表示 agent 级别的执行段（通常省略 `SubID`）。
- **Tool 段**: 表示 tool 级别的执行段（`SubID` 用于确保唯一性）。
- **简化视图**: 为 agent 开发者抽象掉底层复杂性。
- **示例路径**: `Agent:A → Agent:B → Tool:search_tool:1`

#### Compose 层段类型
`compose` 层对整个执行层级提供了细粒度的控制和可见性：

```go
type AddressSegmentType = core.AddressSegmentType

const (
    AddressSegmentRunnable AddressSegmentType = "runnable"  // Graph, Workflow, or Chain
    AddressSegmentNode     AddressSegmentType = "node"      // Individual graph nodes
    AddressSegmentTool     AddressSegmentType = "tool"      // Specific tool calls
)
```

**关键特性:**
- **Runnable 段**: 表示顶层可执行文件（Graph、Workflow、Chain）。
- **Node 段**: 表示执行图中的单个节点。
- **Tool 段**: 表示 `ToolsNode` 内的特定 tool 调用。
- **详细视图**: 提供对执行层级的完全可见性。
- **示例路径**: `Runnable:my_graph → Node:sub_graph → Node:tools_node → Tool:mcp_tool:1`

### 可扩展性与设计原则

地址段类型系统被设计为**可扩展的**。框架开发者可以添加新的段类型以支持额外的执行模式或自定义组件，同时保持向后兼容性。

**关键设计原则**：ADK 层提供简化的、以 agent 为中心的抽象，而 `compose` 层处理执行层级的全部复杂性。这种分层方法允许开发者在适合其需求的抽象级别上工作。

## 向后兼容性

human-in-the-loop框架保持与现有代码的完全向后兼容性。所有先前的中断和恢复模式将继续像以前一样工作，同时通过新的寻址系统提供增强的功能。

### 1. 图中断兼容性

在节点/工具中使用 `NewInterruptAndRerunErr` 的先前图中断流程继续保持不变：

```go
// 先前的方法仍然有效
func myTool(ctx context.Context, input string) (string, error) {
    // ... tool 逻辑
    return "", compose.NewInterruptAndRerunErr("需要用户批准")
}

// 最终用户代码保持不变
_, err := graph.Invoke(ctx, input)
if err != nil {
    interruptInfo, exists := compose.ExtractInterruptInfo(err)
    if exists {
        // 现在你可以获得增强的信息
        fmt.Printf("中断上下文: %+v\n", interruptInfo.InterruptContexts)
        // 先前的字段仍然可用
        fmt.Printf("Before nodes: %v\n", interruptInfo.BeforeNodes)
    }
}
```

**增强功能**：`InterruptInfo` 现在包含一个额外的 `[]*InterruptCtx` 字段，提供对中断链的结构化访问，同时保留所有现有功能。

### 2. 静态图中断兼容性

通过 `WithInterruptBeforeNodes` 或 `WithInterruptAfterNodes` 添加到图上的先前静态中断继续工作：

```go
// 先前的静态中断配置仍然有效
graph, err := myGraph.Compile(ctx, 
    compose.WithInterruptBeforeNodes([]string{"critical_node"}),
    compose.WithInterruptAfterNodes([]string{"validation_node"})
)

// 当中断时，最终用户获得增强的信息
interruptInfo, exists := compose.ExtractInterruptInfo(err)
if exists {
    // 先前的字段仍然可用
    fmt.Printf("Before nodes: %v\n", interruptInfo.BeforeNodes)
    fmt.Printf("After nodes: %v\n", interruptInfo.AfterNodes)
    
    // 新的增强功能：访问结构化的中断上下文
    if len(interruptInfo.InterruptContexts) > 0 {
        interruptCtx := interruptInfo.InterruptContexts[0]
        fmt.Printf("图状态: %+v\n", interruptCtx.Info)
        
        // 最终用户可以直接修改状态并将其传回
        // 不再需要使用 WithStateModifier（尽管它仍然有效）
    }
}
```

**增强功能**：除了 `[]BeforeNodes` 和 `[]AfterNodes`，现在还返回一个 `InterruptCtx`，使最终用户可以直接访问图状态。对于喜欢先前方法的开发者，`WithStateModifier` 选项仍然可用。

### 3. Agent 中断兼容性

先前的 agent 中断流程继续保持不变：

```go
// Agent 中断模式保持不变
func (a *myAgent) Run(ctx context.Context, input *adk.AgentInput) *adk.AsyncIterator[*adk.AgentEvent] {
    // ... agent 逻辑
    return adk.Interrupt(ctx, "需要用户输入")
}

// 最终用户访问模式保持不变
func (a *myAgent) Resume(ctx context.Context, info *adk.ResumeInfo) *adk.AsyncIterator[*adk.AgentEvent] {
    // 先前的信息仍然可用
    if info.WasInterrupted {
        fmt.Printf("中断数据: %v\n", info.InterruptInfo.Data)
        // 增强：现在还可以访问结构化的中断上下文
        if info.InterruptInfo != nil && len(info.InterruptInfo.InterruptContexts) > 0 {
            fmt.Printf("中断上下文: %+v\n", info.InterruptInfo.InterruptContexts[0])
        }
    }
    
    // 恢复逻辑：继续正常执行或处理恢复数据
    if info.IsResumeTarget && info.ResumeData != nil {
        // 处理恢复数据并继续
        return a.handleResumeWithData(ctx, info.ResumeData)
    }
    
    // 继续正常执行
    return a.Run(ctx, input)
}
```

**增强功能**：来自 `AgentEvent` 的 `InterruptInfo` 包含所有先前的信息，最终用户仍然可以在 `ResumeInfo` 中访问此信息，并额外受益于结构化的中断上下文。

### 迁移优势

- **无重大变更**：现有代码无需修改即可继续工作。
- **渐进式采用**：团队可以按照自己的节奏采用新功能。
- **增强的功能**：新的寻址系统在保留现有 API 的同时提供了更丰富的上下文。
- **灵活的状态管理**：最终用户可以选择直接状态修改（新）或 `WithStateModifier`（现有）。

这种向后兼容性确保了现有用户的平滑过渡，同时为human-in-the-loop交互提供了强大的新功能。

## 实现示例

有关human-in-the-loop模式的完整、可工作的示例，请参阅 [eino-examples repository](https://github.com/cloudwego/eino-examples/pull/125)。该仓库包含四个作为独立示例实现的典型模式：

### 1. 审批模式
在关键工具调用之前的简单、显式批准。非常适合不可逆操作，如数据库修改或金融交易。

### 2. 审查与编辑模式  
高级模式，允许在执行前进行人工审查和原地编辑工具调用参数。非常适合纠正误解。

### 3. 反馈循环模式
迭代优化模式，其中 agent 生成内容，人类提供定性反馈以进行改进。

### 4. 追问模式
主动模式，其中 agent 识别出不充分的工具输出并请求澄清或下一步行动。

这些示例演示了中断/恢复机制的实际用法，并附有可重用的工具包装器和详细文档。