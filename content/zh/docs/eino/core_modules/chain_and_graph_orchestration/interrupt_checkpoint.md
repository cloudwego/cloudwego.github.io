---
Description: ""
date: "2025-08-07"
lastmod: ""
tags: []
title: 'Eino: Interrupt & CheckPoint使用手册'
weight: 6
---

# 介绍

使用 Interrupt & CheckPoint 功能，可以实现在指定位置暂停 Graph 执行并在之后断点续传，如果是 StateGraph，还可以在断点续传前修改 State。

> 💡
> 断点续传仅能复原输入和运行时各节点产生的数据，需要确保 Graph 编排和 CallOptions 完全相同。

# 使用 Interrupt

Interrupt 支持在指定 Node 执行前或执行后暂停 Graph，Compile 时传入 WithInterruptAfterNodes 与 WithInterruptBeforeNodes Option 来设置 Interrupt：

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
> 目前仅支持 Compile 时设置断点，如果需要请求时设置，欢迎提出~

可以从运行返回的 error 中获得本次运行是否 Interrupt 以及 Interrupt 信息：

```go
// compose/checkpoint.go

type InterruptInfo struct {
    State any
    BeforeNodes []string
    AfterNodes []string
    SubGraph map[string]InterruptInfo
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

# 使用 CheckPoint

CheckPoint 记录 Graph 运行状态，使用 CheckPoint 可以在 Interrupt 后恢复运行。

## 实现 CheckPointerStore

CheckPointStore 是一个 key 类型为 string、value 类型为[]byte 的 KV 存储接口，我们没有提供封装和默认实现，需要用户自行实现，用来存储 checkpoint。

```go
// coompose/checkpoint.go

type CheckpointStore interface {
    Get(ctx **context**._Context_, key string) (value []byte, existed bool,err error)
    Set(ctx **context**._Context_, key string, value []byte) (err error)
}
```

## 注册序列化方法

CheckPoint 的保存和读取涉及对 Graph 节点输入输出以及 State 的序列化和反序列化，在仅使用简单类型或 eino 内置类型（比如 Message 或 Document）时，用户无需额外操作；当引入自定义 struct 时，需要提前注册类型，Eino 提供了注册方法 RegisterSerializableType：

```go
import "github.com/cloudwego/eino/compose"

type MyStruct struct {
    // struct body
}

// func RegisterSerializableType[T any](name string) error
err = compose.RegisterSerializableType[MyStruct]("MyStruct")
```

注册后的类型在序列化时将被额外记录类型信息，因此在反序列化时，即使不指明类型（比如反序列化到 interface{}），Eino 也可以反序列化出正确的类型。注册方法中的 key 唯一标识了这个类型，一旦确定了 key 需要保证其不能改变，否则已持久化的 checkpoint 将不能被正确恢复。

> 💡
> 结构体的未导出字段无法访问，因此不会被存储/恢复

如果注册的类型实现了 json Marshaler 和 Unmarshaler，此类型的序列化和反序列化会使用自定义方法。

```
// encoding/json

type Marshaler interface {
    MarshalJSON() ([]byte, error)
}

type Unmarshaler interface {
    UnmarshalJSON([]byte) error
}
```

## 开启 CheckPoint

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

func WithCheckPointID(checkPointID string, sm StateModifier) Option
type StateModifier func(ctx context.Context, path NodePath, state any) error
func WithStateModifier(sm StateModifier) GraphCompileOption
```

Checkpoint id 会被作为 CheckPointStore 的 key 使用，graph 运行时会检查 CheckPointStore 是否存在此 id，如果存在则从 checkpoint 中恢复运行；interrupt 是会把 graph 状态保存到此 id 中。

StateModifier 在 Graph 恢复运行时生效，可以在运行前修改 State，path 在嵌套图中生效，非嵌套是为空数组。

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

## 动态 Interrupt

节点返回特殊错误可以动态地触发 Interrupt：

```
// eion/compose/checkpoint.go
var InterruptAndRerun = errors.New("interrupt and rerun")
```

Eino Graph 接收到节点返回此错误后会发生 interrupt，恢复运行时，会再次运行此节点，再次运行前会调用 StateModifier 修改 state（如果已配置）。

这种情况下，再次运行节点时输入会替换为空值，而不是原本的输入，如果再次运行时需要仍需要原本输入，需要提前保存到 State 中。

# 流式传输中的 CheckPoint

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

# 嵌套图中的 Interrupt&CheckPoint

父图传入 CheckPointer 的前提下，AddAnyGraph 时使用 WithGraphCompileOptions 传入 InterruptNodes 可以开启子图的 Interrupt&CheckPoint，父图未设置 CheckPointer 时会在 Compile 时报错。

```go
/* graph compose code
xxx
*/
g.AddAnyGraph("node1", subGraph, WithGraphCompileOptions(
    WithInterruptAfterNodes([]string{"node2"}),
))
    
g.Compile(ctx, WithCheckPointer(cp))
```

如果在子图中 interrupt，resume 时修改的 state 应为子图 state。TODO，说明下 StateModifier 中 Path 使用

# 例子

[https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt](https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt)
