---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Interrupt & CheckPoint Manual'
weight: 7
---

> 💡
> Note: A bug in v0.3.26 broke CheckPoint serialization. For new CheckPoint usage, use v0.3.26+ (preferably latest).
>
> Eino provides a compatibility branch for users with pre-v0.3.26 checkpoints to migrate; once old data is invalidated, upgrade to mainline. The branch incurs overhead and is not merged due to typical short checkpoint lifetimes.

## Introduction

`Interrupt & CheckPoint` lets you pause a Graph at specified locations and resume later. For `StateGraph`, you can modify `State` before resuming.

> 💡
> Resuming restores inputs and per-node runtime data. Ensure the Graph orchestration is identical and pass the same CallOptions again (unless you explicitly rely on CallOptions to carry resume-time data).

## Using Static Interrupt

Static Interrupt supports pausing before or after specified nodes. Set `WithInterruptAfterNodes` and `WithInterruptBeforeNodes` at compile:

```go
import (
    "github.com/cloudwego/eino/compose"
)

func main() {
    g := NewGraph[string, string]()
    err := g.AddLambdaNode("node1", compose.InvokableLambda(func(ctx context.Context, input string) (output string, err error) {/*invokable func*/})
    if err != nil {/* error handle */}
    err = g.AddLambdaNode("node2", compose.InvokableLambda(func(ctx context.Context, input string) (output string, err error) {/*invokable func*/})
    if err != nil {/* error handle */}
    
    /** other graph composed code
    xxx 
    */
    
    err = g.Compile(ctx, compose.WithInterruptAfterNodes([]string{"node1"}), compose.WithInterruptBeforeNodes([]string{"node2"}))
    if err != nil {/* error handle */}
}
```

> 💡
> Tip: Currently only compile-time static breakpoints are supported. If you need request-time configuration, please open an issue.

Extract interrupt info from the run error:

```go
// compose/checkpoint.go

type InterruptInfo struct {
    State             any
    BeforeNodes       []string
    AfterNodes        []string
    RerunNodes        []string
    RerunNodesExtra   map[string]any
    SubGraphs         map[string]*InterruptInfo
    InterruptContexts []*InterruptCtx
}

func ExtractInterruptInfo(err error) (info *InterruptInfo, existed bool) {}
```

Example:

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
> During interrupt, the output is empty and should be ignored.

## Using CheckPoint

CheckPoint records Graph runtime state to support resuming.

### Implement CheckpointStore

`CheckpointStore` is a KV storage with key type `string` and value type `[]byte`. Eino does not provide a default implementation; implement your own to persist checkpoints.

```go
// compose/checkpoint.go

type CheckpointStore interface {
    Get(ctx context.Context, key string) (value []byte, existed bool,err error)
    Set(ctx context.Context, key string, value []byte) (err error)
}
```

### Register Types For Serialization

Saving and loading checkpoints involves serialization of node inputs/outputs and `State`. For simple or Eino built-in types (e.g., `Message`, `Document`), no action is needed. For custom structs, register types in advance with `schema.RegisterName`:

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

After registration, type metadata is included during serialization. On deserialization, Eino can restore the correct type even when the destination is `interface{}`. The key uniquely identifies the type; once chosen, do not change it, otherwise persisted checkpoints cannot be restored.

> 💡
> Struct unexported fields are inaccessible and thus not stored/restored.

By default, Eino uses its built-in serializer. If a registered type implements `json.Marshaler` and `json.Unmarshaler`, those custom methods are used.

```
// encoding/json

type Marshaler interface {
    MarshalJSON() ([]byte, error)
}

type Unmarshaler interface {
    UnmarshalJSON([]byte) error
}
```

Eino also provides an option to use `gob` serialization:

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

Choose based on preference; avoid switching later, as historical data will be incompatible.

### Enable CheckPoint

Bind `CheckpointStore` at compile and set interrupt nodes if needed:

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

At request time, provide a checkpoint ID:

```
// compose/checkpoint.go

func WithCheckPointID(checkPointID string) Option
```

The checkpoint ID is used as the `CheckpointStore` key. During execution, if the ID exists, the graph resumes from it; on interrupt, the graph stores its state under that ID.

## Dynamic Interrupt

Nodes can trigger dynamic interrupts by returning special errors.

### Prior to Eino v0.7.0

```
// eino/compose/interrupt.go

// emit a plain interrupt signal
var InterruptAndRerun = errors.New("interrupt and rerun")

// emit an interrupt signal with extra info
func NewInterruptAndRerunErr(extra any) error
```

When the graph receives such an error, it interrupts. On resume, the node runs again; before rerun, `StateModifier` is applied if configured. The rerun's input is replaced with a zero value rather than the original; if the original input is needed, save it into `State` beforehand.

### From Eino v0.7.0 onward

Support is added for local state persistence, exposing inner interrupt signals, and parallel interrupts:

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

See design details: [Eino human-in-the-loop framework: architecture guide](/docs/eino/core_modules/eino_adk/agent_hitl)

## External Active Interrupt

Sometimes, we want to actively trigger an interrupt from outside the Graph, save the state, and resume later. These scenarios may include graceful instance shutdown, etc. In such cases, you can call `WithGraphInterrupt` to get a ctx and an interrupt function. The ctx is passed to `graph.Invoke()` and other run methods, while the interrupt function is called when you want to actively interrupt:

```go
// from compose/graph_call_options.go

// WithGraphInterrupt creates a context with graph cancellation support.
// When the returned context is used to invoke a graph or workflow, calling the interrupt function will trigger an interrupt.
// The graph will wait for current tasks to complete by default.
func WithGraphInterrupt(parent context.Context) (ctx context.Context, interrupt func(opts ...GraphInterruptOption)) {}
```

When actively calling the interrupt function, you can pass parameters such as timeout:

```go
// from compose/graph_call_options.go

// WithGraphInterruptTimeout specifies the max waiting time before generating an interrupt.
// After the max waiting time, the graph will force an interrupt. Any unfinished tasks will be re-run when the graph is resumed.
func WithGraphInterruptTimeout(timeout time.Duration) GraphInterruptOption {
    return func(o *graphInterruptOptions) {
       o.timeout = &timeout
    }
}
```

When an external interrupt is triggered, the node has no opportunity to save local state (including the node's input), so Eino automatically saves the input of externally interrupted nodes and restores it on the next execution. For non-external interrupt scenarios, when a node initiates an interrupt internally, saving the input is the responsibility of each node, which can be done by saving to the graph state or using `compose.StatefulInterrupt` to save local state.

## CheckPoint in Streaming

Streaming checkpoints require concatenation of chunks. Register a concat function:

```go
// compose/stream_concat.go
func RegisterStreamChunkConcatFunc[T any](fn func([]T) (T, error))

// example
type TestStruct struct {
    Body string
}

// RegisterStreamChunkConcatFunc is not thread-safe; call during initialization
RegisterStreamChunkConcatFunc(func(ss []TestStruct)(TestStruct, error){
    ret := TestStruct{Body:""}
    for i := range ss {
        ret.Body += ss[i].Body
    }
    return ret, nil
})
```

Eino provides defaults for `*schema.Message`, `[]*schema.Message`, and `string`.

## Interrupt & CheckPoint in Nested Graphs

When the parent sets a `CheckpointStore`, use `WithGraphCompileOptions` during `AddGraphNode` to configure child interrupts:

```go
/* graph compose code
xxx
*/
g.AddGraphNode("node1", subGraph, WithGraphCompileOptions(
    WithInterruptAfterNodes([]string{"node2"}),
))
    
g.Compile(ctx, WithCheckPointStore(cp))
```

If a child interrupts, resuming modifies the child's state. TODO: clarify Path usage in `StateModifier`.

## Recovery

Recovery: subsequent graph runs after an interrupt and checkpoint save.

### Prior to Eino v0.7.0

Modify `State` to affect resume behavior.

```go
// compose/checkpoint.go

type StateModifier func(ctx context.Context, path NodePath, state any) error
func WithStateModifier(sm StateModifier) GraphCompileOption
```

`StateModifier` is applied during graph resume, before execution. `path` applies to nested graphs; for non-nested graphs, it is an empty slice.

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
> During resume, input is ignored; pass a zero value.

### From Eino v0.7.0 onward

In addition to `StateModifier`, you can selectively resume particular interrupt points and provide resume data:

```go
// specifically resume particular interrupt point(s), 
// without specifying resume data
func Resume(ctx context.Context, interruptIDs ...string) context.Context

// specifically resume one interrupt point, with custom resume data
func ResumeWithData(ctx context.Context, interruptID string, data any) context.Context

// specifically resume multiple interrupt points, each with custom resume data
func BatchResumeWithData(ctx context.Context, resumeData map[string]any) context.Context
```

`InterruptID` is retrieved from the interrupt error:

```go
interruptInfo, isInterrupt := ExtractInterruptInfo(err)
if isInterrupt {
    // possibly multiple interrupt points; take the first for illustration
    interruptID = interruptInfo.InterruptContexts[0].ID
}
```

`resumeData` is defined by the interrupt point. For example, a Tool interrupts to request approval and defines `ApprovalResult` as resume data:

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
   if !isResumeTarget { // interrupted but not explicitly resumed; reinterrupt and wait for approval again
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

# Examples

### Prior to Eino v0.7.0

[https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt](https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt)

### From Eino v0.7.0 onward

[https://github.com/cloudwego/eino/blob/main/compose/resume_test.go](https://github.com/cloudwego/eino/blob/main/compose/resume_test.go)

Including:

`TestInterruptStateAndResumeForRootGraph`: simple dynamic interrupt

`TestInterruptStateAndResumeForSubGraph`: subgraph interrupt

`TestInterruptStateAndResumeForToolInNestedSubGraph`: nested subgraph tool interrupt

`TestMultipleInterruptsAndResumes`: parallel interrupts

`TestReentryForResumedTools`: tool interrupt in ReAct Agent, multiple re-entries after resume

`TestGraphInterruptWithinLambda`: Lambda node contains a standalone Graph and interrupts internally
