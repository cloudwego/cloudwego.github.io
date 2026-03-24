---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: Interrupt & CheckPoint使用手册
weight: 7
---

> 💡
> 注意：v0.3.26 版本中因为代码编写错误导致 CheckPoint 的序列化内容产生 break，新接入 CheckPoint 使用 v0.3.26 以后的版本，建议直接使用最新。
>
> eino 提供了兼容分支，使用了 checkpoint 且版本低于 v0.3.26 的业务在升级 eino 时可以先升级到兼容分支，老数据淘汰后再升级到主干。
>
> 因为兼容分支会引入额外的性能开销并且一般来说业务 agent checkpoint 有不太长的有效期，所以分支没有合入主干。

## 介绍

使用 Interrupt & CheckPoint 功能，可以实现在指定位置暂停 Graph 执行并在之后断点续传，如果是 StateGraph，还可以在断点续传前修改 State。

> 💡
> 断点续传仅能复原输入和运行时各节点产生的数据，需要确保 Graph 编排完全相同，以及重新完整传入 CallOption（没有特殊情况应当保持一致，除非依赖 CallOption 在 Resume 时传递数据等）。

## 使用静态 Interrupt

静态 Interrupt 支持在指定 Node 执行前或执行后暂停 Graph，Compile 时传入 WithInterruptAfterNodes 与 WithInterruptBeforeNodes Option 来设置 Interrupt：

```go
import (
    "github.com/cloudwego/eino/compose"
)

func main() {
    g := NewGraph[string, string]()
    err := g.AddLambdaNode("node1", compose.InvokableLambda(func(ctx **context**._Context_, input string) (output string, err error) {/*invokable func*/})
    if err != nil {/* error handle */}
    err = g.AddLambdaNode("node2", compose.InvokableLambda(func(ctx **context**._Context_, input string) (output string, err error) {/*invokable func*/})
    if err != nil {/* error handle */}
    
    /** other graph composed code
    xxx 
    */
    
    err = g.Compile(ctx, compose.WithInterruptAfterNodes([]string{"node1"}), compose.WithInterruptBeforeNodes([]string{"node2"}))
    if err != nil {/* error handle */}
}
```

> 💡
> 目前仅支持 Compile 时设置静态断点，如果需要请求时设置，欢迎提出~

可以从运行返回的 error 中获得本次运行是否 Interrupt 以及 Interrupt 信息：

```go
// compose/checkpoint.go

**type **InterruptInfo **struct **{
    State             any
    BeforeNodes       []string
    AfterNodes        []string
    RerunNodes        []string
    RerunNodesExtra   **map**[string]any
    SubGraphs         **map**[string]*InterruptInfo
    InterruptContexts []*InterruptCtx
}

func ExtractInterruptInfo(err error) (info *InterruptInfo, existed bool) {}
```

例如：

```go
import "github.com/cloudwego/eino/compse"

/***graph compose code
* g := NewGraph
* xxx
* runner := g.Compile
*/

result, err := runner.Invoke(ctx, input)
if info, ok := ExtractInterruptInfo(err); ok {
    // handler info
}
if err != nil {
    // handle error
}
```

> 💡
> Interrupt 时 output 为空值，没有意义。

## 使用 CheckPoint

CheckPoint 记录 Graph 运行状态，使用 CheckPoint 可以在 Interrupt 后恢复运行。

### 实现 CheckPointerStore

CheckPointStore 是一个 key 类型为 string、value 类型为[]byte 的 KV 存储接口，我们没有提供封装和默认实现，需要用户自行实现，用来存储 checkpoint。

```go
// compose/checkpoint.go

type CheckpointStore interface {
    Get(ctx **context**._Context_, key string) (value []byte, existed bool,err error)
    Set(ctx **context**._Context_, key string, value []byte) (err error)
}
```

### 注册序列化方法

CheckPoint 的保存和读取涉及对 Graph 节点输入输出以及 State 的序列化和反序列化，在仅使用简单类型或 eino 内置类型（比如 Message 或 Document）时，用户无需额外操作；当引入自定义 struct 时，需要提前注册类型，Eino 提供了注册方法 `schema.``RegisterName`：

```go
package main

import "github.com/cloudwego/eino/schema"

type MyState struct {
        Counter int
        Note    string
}

func init() {
        // Register the type with a stable name for serialization/persistence.
        // Use the pointer form if you persist pointers to this type.
        // It's recommended to register types within the `init()` function 
        // within the same file your type is declared.
        schema.RegisterName[*MyState]("my_state_v1")
}
```

注册后的类型在序列化时将被额外记录类型信息，因此在反序列化时，即使不指明类型（比如反序列化到 interface{}），Eino 也可以反序列化出正确的类型。注册方法中的 key 唯一标识了这个类型，一旦确定了 key 需要保证其不能改变，否则已持久化的 checkpoint 将不能被正确恢复。

> 💡
> 结构体的未导出字段无法访问，因此不会被存储/恢复

默认情况下，会使用 eino 内置的序列化功能，此时，如果注册的类型实现了 json Marshaler 和 Unmarshaler，此类型的序列化和反序列化会使用自定义方法。

```
// encoding/json

type Marshaler interface {
    MarshalJSON() ([]byte, error)
}

type Unmarshaler interface {
    UnmarshalJSON([]byte) error
}
```

Eino 同时提供了将序列化方式改为 gob 的选项：

```go
r, err := compose.NewChain[*AgentInput, Message]().
    AppendLambda(compose.InvokableLambda(func(ctx context.Context, input *AgentInput) ([]Message, error) {
       return a.genModelInput(ctx, instruction, input)
    })).
    AppendChatModel(a.model).
    Compile(ctx, compose.WithGraphName(a.name),
       compose.WithCheckPointStore(store),
       compose.WithSerializer(&gobSerializer{}))
```

用户可以按偏好选择，选择后不建议轻易变更，历史数据不兼容。

### 开启 CheckPoint

创建 CheckPointStore 后在 Compile Graph 时作为 Option 传入，把 CheckPointer 绑定到 Graph：

```go
import (
    "github.com/cloudwego/eino/compose"
)

func main() {
    /** graph composed code
    xxx 
    */
    
    err = g.Compile(ctx, compose.WithCheckPointStore(store), compose.WithInterruptBeforeNodes([]string{"node2"}))
    if err != nil {/* error handle */}
}
```

之后可以在请求时通过 CallOption 引入 CheckPoint：

```
// compose/checkpoint.go

func WithCheckPointID(checkPointID string) Option
```

Checkpoint id 会被作为 CheckPointStore 的 key 使用，graph 运行时会检查 CheckPointStore 是否存在此 id，如果存在则从 checkpoint 中恢复运行；interrupt 是会把 graph 状态保存到此 id 中。

## 动态 Interrupt

节点返回特殊错误可以动态地触发 Interrupt：

### 在 eino v0.7.0 之前

```
// eino/compose/interrupt.go

// emit a plain interrupt signal
var InterruptAndRerun = errors.New("interrupt and rerun")

// emit an interrupt signal with extra info
**func **NewInterruptAndRerunErr(extra any) error
```

Eino Graph 接收到节点返回此错误后会发生 interrupt，恢复运行时，会再次运行此节点，再次运行前会调用 StateModifier 修改 state（如果已配置）。

这种情况下，再次运行节点时输入会替换为空值，而不是原本的输入，如果再次运行时需要仍需要原本输入，需要提前保存到 State 中。

### 在 eino v0.7.0 及之后

增加了对“保存本地状态”、“透出内部中断信号”、“并行中断”的支持：

```
// eino/compose/interrupt.go

// emit an interrupt signal with user-facing info
func Interrupt(ctx context.Context, info any) error

// emit an interrupt signal with user-facing info AS WELL AS
// persistent LOCALLY-DEFINED state
func StatefulInterrupt(ctx context.Context, info any, state any) error

// emit an interrupt signal WRAPPING other interrupt signals 
// emitted from inner processes, 
// such as ToolsNode wrapping Tools.
func CompositeInterrupt(ctx context.Context, info any, state any, errs ...error)
```

详细设计参见：[Eino human-in-the-loop 框架：技术架构指南](/zh/docs/eino/core_modules/eino_adk/agent_hitl)

## 外部主动 Interrupt

有时，我们希望能在 Graph 外部主动触发中断，保存现场，之后择机恢复。这些场景可能包括实例优雅退出等。这时，可以通过调用 `WithGraphInterrupt` 获取一个 ctx 和一个 interrupt function。其中 ctx 用于传递给 `graph.Invoke()` 等运行方法，interrupt function 用于在用户希望主动中断时调用：

```go
// from compose/graph_call_options.go

_// WithGraphInterrupt creates a context with graph cancellation support._
_// When the returned context is used to invoke a graph or workflow, calling the interrupt function will trigger an interrupt._
_// The graph will wait for current tasks to complete by default._
**func **WithGraphInterrupt(parent context.Context) (ctx context.Context, interrupt **func**(opts ...GraphInterruptOption)) {}
```

在主动调用 interrupt function 时，可以传递超时等参数：

```go
// from compose/graph_call_options.go

_// WithGraphInterruptTimeout specifies the max waiting time before generating an interrupt._
_// After the max waiting time, the graph will force an interrupt. Any unfinished tasks will be re-run when the graph is resumed._
**func **WithGraphInterruptTimeout(timeout time.Duration) GraphInterruptOption {
    **return func**(o *graphInterruptOptions) {
       o.timeout = &timeout
    }
}
```

当外部触发中断时，节点内部没有机会保存局部状态（包括节点的 input），所以 eino 会自动保存被外部中断的节点的 input，在下次执行时自动恢复。非外部触发中断的场景，节点内部发起中断时，保存 input 是每个节点的职责，可通过保存到 graph state 中或使用 `compose.StatefulInterrupt` 保存局部状态。

## 流式传输中的 CheckPoint

流式传输在保存 CheckPoint 时需要拼接数据流，因此需要注册拼接方法：

```go
// compose/stream_concat.go
func RegisterStreamChunkConcatFunc[T any](fn func([]T) (T, error))

// example
type TestStruct struct {
    Body string
}

// RegisterStreamChunkConcatFunc非线程安全，需要在初始化阶段使用
RegisterStreamChunkConcatFunc(func(ss []TestStruct)(TestStruct, error){
    ret := TestStruct{Body:""}
    for i := range ss {
        ret.Body += ss[i].Body
    }
    return ret, nil
})
```

eino 默认提供了*schema.Message、[]*schema.Message 和 string 的 concat 方法。

## 嵌套图中的 Interrupt&CheckPoint

父图传入 CheckPointer 的前提下，AddGraphNode 时使用 WithGraphCompileOptions 传入 InterruptNodes 可以开启子图的 Interrupt&CheckPoint，父图未设置 CheckPointer 时会在 Compile 时报错。

```go
/* graph compose code
xxx
*/
g.AddGraphNode("node1", subGraph, WithGraphCompileOptions(
    WithInterruptAfterNodes([]string{"node2"}),
))
    
g.Compile(ctx, WithCheckPointStore(cp))
```

如果在子图中 interrupt，resume 时修改的 state 应为子图 state。TODO，说明下 StateModifier 中 Path 使用

## 恢复

恢复：Interrupt 并保存 checkpoint 后，后续的 graph 运行。

### 在 eino v0.7.0 之前

通过修改 State 来影响恢复时的行为。

```go
// compose/checkpoint.go

type StateModifier func(ctx context.Context, path NodePath, state any) error
func WithStateModifier(sm StateModifier) GraphCompileOption
```

StateModifier 在 Graph 恢复运行时生效，可以在运行前修改 State，path 在嵌套图中生效，非嵌套视为空数组。

```go
/* graph compose and compile
xxx
*/

// first run interrupt
id := GenUUID()
_, err := runner.Invoke(ctx, input, WithCheckPointID(id))

// resume from id
_, err = runner.Invoke(ctx, input/*unused*/, 
    WithCheckPointID(id),
    WithStateModifier(func(ctx context.Context, path NodePath, state any) error{
        state.(*testState).Field1 = "hello"
        return nil
    }),
)
```

> 💡
> Resume 时 input 不会被读取，此时 input 传空即可。

### 在 eino v0.7.0 及之后

除了 StateModifier 之外，还可以选择性的恢复某个中断点，以及直接给指定的“中断点位”传递“恢复数据”：

```go
// specifically resume particular interrupt point(s), 
// without specifying resume data
func Resume(ctx context.Context, interruptIDs ...string) context.Context

// specifically resume one interrupt point, with custom resume data
func ResumeWithData(ctx context.Context, interruptID string, data any) context.Context

// specifically resume multiple interrupt points, each with custom resume data
func BatchResumeWithData(ctx context.Context, resumeData map[string]any) context.Context
```

其中，`InterruptID` 是从 interrupt error 中获取的：

```go
interruptInfo, isInterrupt := ExtractInterruptInfo(err)
if isInterrupt {
    // maybe multiple interrupt points exist here,
    // we only take the first one for illustration purpose
    interruptID = interruptInfo.InterruptContexts[0].ID
}
```

`resumeData` 是发生中断的点位定义的类型，比如一个 Tool 发生了中断并要求用户“审批”是否执行这个 Tool，自定义了一个 `ApprovalResult` 作为 resumeData：

```go
func (i InvokableApprovableTool) InvokableRun(ctx context.Context, argumentsInJSON string,
   opts ...tool.Option) (string, error) {

   toolInfo, err := i.Info(ctx)
   if err != nil {
      return "", err
   }

   wasInterrupted, _, storedArguments := compose.GetInterruptState[string](ctx)
   if !wasInterrupted { // initial invocation, interrupt and wait for approval
      return "", compose.StatefulInterrupt(ctx, &ApprovalInfo{
         ToolName:        toolInfo.Name,
         ArgumentsInJSON: argumentsInJSON,
         ToolCallID:      compose.GetToolCallID(ctx),
      }, argumentsInJSON)
   }

   isResumeTarget, hasData, data := compose.GetResumeContext[*ApprovalResult](ctx)
   if !isResumeTarget { // was interrupted but not explicitly resumed, reinterrupt and wait for approval again
      return "", compose.StatefulInterrupt(ctx, &ApprovalInfo{
         ToolName:        toolInfo.Name,
         ArgumentsInJSON: storedArguments,
         ToolCallID:      compose.GetToolCallID(ctx),
      }, storedArguments)
   }
   if !hasData {
      return "", fmt.Errorf("tool '%s' resumed with no data", toolInfo.Name)
   }

   if data.Approved {
      return i.InvokableTool.InvokableRun(ctx, storedArguments, opts...)
   }

   if data.DisapproveReason != nil {
      return fmt.Sprintf("tool '%s' disapproved, reason: %s", toolInfo.Name, *data.DisapproveReason), nil
   }

   return fmt.Sprintf("tool '%s' disapproved", toolInfo.Name), nil
}
```

# 例子

### 在 eino v0.7.0 之前

[https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt](https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt)

### 在 eino v0.7.0 之后

[https://github.com/cloudwego/eino/blob/main/compose/resume_test.go](https://github.com/cloudwego/eino/blob/main/compose/resume_test.go)

其中

`TestInterruptStateAndResumeForRootGraph`: 简单动态中断

`TestInterruptStateAndResumeForSubGraph`: 子图中断

`TestInterruptStateAndResumeForToolInNestedSubGraph`: 嵌套子图内部 tool 中断

`TestMultipleInterruptsAndResumes`: 并行中断

`TestReentryForResumedTools`: ReAct Agent 内 tool 中断，恢复后多次循环执行

`TestGraphInterruptWithinLambda`: Lambda 节点内包含独立 Graph 且内部中断
