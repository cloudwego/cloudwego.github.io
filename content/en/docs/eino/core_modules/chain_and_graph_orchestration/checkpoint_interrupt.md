---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino: Interrupt & CheckPoint Manual'
weight: 7
---

> Note: A bug in v0.3.26 broke CheckPoint serialization. For new CheckPoint usage, use v0.3.26+ (preferably latest).
>
> Eino provides a compatibility branch for users with pre-v0.3.26 checkpoints to migrate; once old data is invalidated, upgrade to mainline. The branch incurs overhead and is not merged due to typical short checkpoint lifetimes.

## Introduction

`Interrupt & CheckPoint` lets you pause a Graph at specified locations and resume later. For `StateGraph`, you can modify `State` before resuming.

> Resuming restores inputs and per-node runtime data. Ensure the Graph orchestration and CallOptions are identical.

## Using Interrupt

Interrupt supports pausing before or after specified nodes. Set `WithInterruptAfterNodes` and `WithInterruptBeforeNodes` at compile:

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

> Tip: Currently only compile-time configuration is supported. If you need request-time configuration, please open an issue.

Extract interrupt info from the run error:

```go
type InterruptInfo struct {
    State any
    BeforeNodes []string
    AfterNodes []string
    SubGraph map[string]InterruptInfo
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

> During interrupt, the output is empty and should be ignored.

## Using CheckPoint

CheckPoint records Graph runtime state to support resuming.

### Implement CheckpointStore

Key–value storage (`string` → `[]byte`). Eino doesn’t provide a default; implement it for persistence.

```go
// coompose/checkpoint.go

type CheckpointStore interface {
    Get(ctx **context**._Context_, key string) (value []byte, existed bool,err error)
    Set(ctx **context**._Context_, key string, value []byte) (err error)
}
```

### Register Types For Serialization

CheckPoint serialization requires types for node inputs/outputs and `State`. For simple/built-in types, no action is needed. For custom `struct`s, register via `RegisterSerializableType`:

```go
type MyStruct struct{}
err := compose.RegisterSerializableType[MyStruct]("MyStruct")
```

The name must remain stable; otherwise persisted checkpoints cannot be restored. Unexported fields are not stored/restored. If a type implements `json.Marshaler`/`json.Unmarshaler`, those are used.

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

At request time, provide a checkpoint ID and optional state modifier:

```go
func WithCheckPointID(checkPointID string, sm StateModifier) Option
type StateModifier func(ctx context.Context, path NodePath, state any) error
func WithStateModifier(sm StateModifier) GraphCompileOption
```

If the ID exists, the graph resumes from it; on interrupt, the graph stores its state under that ID. `StateModifier` applies when resuming; use `path` to target nested graphs (empty for non-nested).

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

> During resume, input is ignored; pass a zero value.

## Dynamic Interrupt

Nodes can trigger dynamic interrupts by returning a special error:

```
// eion/compose/checkpoint.go
var InterruptAndRerun = errors.New("interrupt and rerun")
```

When the Eino Graph sees this error, it interrupts. On resume, the node runs again; before rerun, `StateModifier` is applied if configured. The rerun’s input is replaced with a zero value instead of the original; if the original is needed, save it into `State`.

## CheckPoint in Streaming

Streaming checkpoints require concatenation of chunks. Register a concat function:

```go
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

When the parent sets a `CheckpointStore`, use `WithGraphCompileOptions` during `AddAnyGraph` to configure child interrupts:

```go
g.AddAnyGraph("node1", subGraph, WithGraphCompileOptions(WithInterruptAfterNodes([]string{"node2"})))
g.Compile(ctx, WithCheckPointStore(cp))
```

If a child interrupts, resuming modifies the child’s state. TODO: clarify Path usage in `StateModifier`.

## Examples

- https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt
