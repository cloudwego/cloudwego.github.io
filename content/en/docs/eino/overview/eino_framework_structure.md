---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: The structure of the Eino Framework
weight: 0
---

## Overall Structure

Six key concepts in Eino:

- Components Abstraction
  - Each Component has a corresponding interface abstraction and multiple implementations. Can be used directly or orchestrated
    - When orchestrated, the node's input/output matches the interface abstraction
  - Similar to out-of-the-box atomic components like ChatModel, PromptTemplate, Retriever, Indexer etc.
  - The Component concept in Eino is relatively loose - anything that satisfies one of the following responsibilities can be called a Component:
    - Can be added to Graph Node as an orchestration object
    - Can be used as a dependency injection component for other orchestration objects
- Flow Integration Components
  - Based on the framework's Components and Graph, provides pre-orchestrated integration component capabilities for common application scenarios
  - May provide capability to be orchestrated again
  - Examples: Agent, MultiAgent etc.
- Runnable -- Low User Awareness
  - Orchestration objects and products in the orchestration framework
  - All Components must be converted to Runnable objects when being orchestrated, generally invisible to users
  - When a graph is compiled into an executable object, it is essentially a Runnable object
- Compose Orchestration
  - Connects various Component instances as Node nodes through graph point-line relationships, where data flows along directed edges and executes in different nodes
  - Supports multiple orchestration forms like Graph, Chain, Workflow etc., all essentially expressing data flow transmission and node execution order through directed graphs
- Aspect Capabilities
  - Aspect capabilities provided before and after each node execution in the Graph
  - Examples: Trace, metrics, logging etc.
- Stream
  - Component instances added to Nodes may have streaming or non-streaming inputs/outputs. Compose orchestration can connect these different forms of input/output, transmit data streams and execute nodes. This capability is called streaming orchestration
  - For example, ChatModel output and ASR input/output are streaming

## Component

For the specific responsibilities of each Component type, please refer to their corresponding interface definitions

> The following is an illustrative explanation and is not complete. Please refer to the [code repository](https://github.com/cloudwego/eino-ext/tree/main/components) for authoritative information.

```
eino/components // component root folder
├── document
│   ├── interface.go 
│   └── option.go
├── embedding
│   ├── callback_extra.go
│   ├── interface.go // one component abstraction
│   ├── ark          // one component implementation
│   ├── openai
│   └── option.go
├── indexer
│   ├── callback_extra.go
│   ├── interface.go
│   ├── option.go
│   └── volc_vikingdb
├── model
│   ├── callback_extra.go
│   ├── interface.go
│   ├── ark
│   ├── openai
│   └── option.go
├── prompt
│   ├── callback_extra.go
│   ├── chat_template.go
│   ├── chat_template_test.go
│   └── interface.go
├── retriever
│   ├── callback_extra.go
│   ├── interface.go
│   ├── option.go
│   └── volc_vikingdb
├── tool
│   ├── duckduckgo
│   ├── interface.go
│   └── option.go
├── types.go
```

## Runnable

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

- The Runnable abstraction is divided into 4 Lambda operators based on whether the input/output is streaming
- In Compose orchestration, component instances added to Nodes are uniformly converted into the above Runnable abstractions
- When a Component is converted to Runnable, based on any Lambda operator it provides, combined with Streaming and Concat capabilities, the remaining unprovided Lambda operators are completed
  - Conversion between streaming and non-streaming: (using StreamReader[T] and T to represent streaming and non-streaming respectively)
    - Concat
      - Receives T-Frames from StreamReader[T] completely and merges them into a complete T
    - Streaming
      - Converts T into a StreamReader[T] with only one T-Frame for streaming transmission
- Based on these two conversion relationships, Eino can encapsulate and convert any interface with N(N<=4) interaction modes provided by users into a complete Runnable[I, O]
- The actual streaming capability in the programming output depends on the following orchestration paradigms

<a href="/img/eino/en_eino_stream.png" target="_blank"><img src="/img/eino/en_eino_stream.png" width="100%" /></a>

## Stream

Notice: Stream handling logic is quite complex in scenarios like **production**, **consumption**, **copying**, **merging**, and **transformation**. Any oversight in implementation can lead to issues such as producer/consumer deadlocks, goroutine leaks or overflow, memory leaks or overflow, and high CPU load. To reduce stability issues, Eino strictly requires the use of Eino-provided Streams, which is why Stream is implemented as a Struct rather than an interface.

Complex streaming operation scenarios:

- Conversion between streaming and non-streaming interfaces
  - When converting from stream to non-stream, all data frames in the stream need to be Concatenated into a complete data structure
  - When converting from non-stream to stream, a data structure needs to be converted into a stream with only one data frame
- The same data stream may need to be read and consumed multiple times, such as by multiple aspects. Since a stream can only be read once completely, it needs to be copied based on the number of consumers
  - When copying streams, both consumption coordination and 'Close' coordination need to be considered. If any stream isn't properly closed, it may prevent resources from being properly released
- Merging multiple streams into one stream

To make the Stream API interface clearer and easier to use, it aligns with Golang's built-in io.Pipe() method definition.

- API interface is defined as: `schema.Pipe[T any](cap int) (*StreamReader[T], *StreamWriter[T])`
  - where cap indicates the stream's buffer size, i.e., how many chunks the sender can send without blocking when there's no consumption
  - `StreamWriter` is similar to PipeWriter in io.Pipe
  - `StreamReader` is similar to PipeReader in io.Pipe, but with an additional `Copy(n int) []*StreamReader[T]` method
- **WARNING**: Whenever you see `*StreamReader[T]` or `*StreamWriter[T]`, don't forget to Close(), otherwise the stream may not be properly released. Generally, stream production and consumption are in separate Goroutines, which could lead to Goroutine leaks.

For Stream API design, see source code: [eino/schema/stream.go](https://github.com/cloudwego/eino/blob/main/schema/stream.go)

```go
// Pipe creates a new stream with the given capacity that represented with StreamWriter and StreamReader.
// The capacity is the maximum number of items that can be buffered in the stream.
// e.g.
//
//  sr, sw := schema.Pipe[string](3)
//  go func() { // send data
//     defer sw.Close()
//     for i := 0; i < 10; i++ {
//        sw.send(i, nil)
//     }
//  }
//
//  defer sr.Close()
//  for chunk, err := sr.Recv() {
//     if errors.Is(err, io.EOF) {
//        break
//     }
//     fmt.Println(chunk)
//  }
func Pipe[T any](cap int) (*StreamReader[T], *StreamWriter[T]) {
    stm := newStream[T](cap)
    return stm.asReader(), &StreamWriter[T]{stm: stm}
}

// StreamWriter the sender of a stream.
type StreamWriter[T any] struct {
    stm *stream[T]
}

func (sw *StreamWriter[T]) Send(chunk T, err error) (closed bool) {
    return sw.stm.send(chunk, err)
}

// Close notify the receiver that the stream sender has finished.
// The stream receiver will get an error of io.EOF from StreamReader.Recv().
func (sw *StreamWriter[T]) Close() {
    sw.stm.closeSend()
}

// StreamReader the receiver of a stream.
type StreamReader[T any] struct {}

func (sr *StreamReader[T]) Recv() (T, error) {}

// Close notify the sender that the stream receiver has finished.
// AKA: CloseRecv.
func (sr *StreamReader[T]) Close() {}

// Copy creates a slice of new StreamReader.
// The number of copies, indicated by the parameter n, should be a non-zero positive integer.
// The original StreamReader will become unusable after Copy.
func (sr *StreamReader[T]) Copy(n int) []*StreamReader[T] {}
```

## Compose

### Graph

#### Node

- Adding a Component instance to a Graph forms a Node
- Components can be used independently or orchestrated by Graph
- Add{Component}Node() interface listing. Only a few interfaces are listed here; for a more detailed interface list, please check the latest Eino SDK
  - For common component types, a standard behavioral semantic is abstracted and different implementations are provided
  - Business logic can add any custom function as a node using AddLambdaNode

```go
// AddChatModelNode add node that implements model.ChatModel.
func (g *graph) AddChatModelNode(key string, node model.ChatModel, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toChatModelNode(key, node, opts...))
}

// AddChatTemplateNode add node that implements prompt.ChatTemplate.
func (g *graph) AddChatTemplateNode(key string, node prompt.ChatTemplate, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toChatTemplateNode(key, node, opts...))
}

func (g *graph) AddToolsNode(key string, node *ToolsNode, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toToolsNode(key, node, opts...))
}

// AddLambdaNode add node that implements at least one of Invoke[I, O], Stream[I, O], Collect[I, O], Transform[I, O].
// due to the lack of supporting method generics, we need to use function generics to generate Lambda run as Runnable[I, O].
// for Invoke[I, O], use compose.InvokableLambda()
// for Stream[I, O], use compose.StreamableLambda()
// for Collect[I, O], use compose.CollectableLambda()
// for Transform[I, O], use compose.TransformableLambda()
// for arbitrary combinations of 4 kinds of lambda, use compose.AnyLambda()
func (g *graph) AddLambdaNode(key string, node *Lambda, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toLambdaNode(key, node, opts...))
}

// AddGraphNode add one kind of Graph[I, O]、Chain[I, O]、StateChain[I, O, S] as a node.
// for Graph[I, O], comes from NewGraph[I, O]()
// for Chain[I, O], comes from NewChain[I, O]()
// for StateGraph[I, O, S], comes from NewStateGraph[I, O, S]()
func (g *graph) AddGraphNode(key string, node AnyGraph, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toAnyGraphNode(key, node, opts...))
}

func (g *graph) AddRetrieverNode(key string, node retriever.Retriever, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toRetrieverNode(key, node, opts...))
}
```

#### Edge

Eino provides multiple ways to add edges

##### Add**Edge**

```go
// AddEdge adds an edge to the graph, edge means a data flow from startNode to endNode.
// the previous node's output type must be set to the next node's input type.
// NOTE: startNode and endNode must have been added to the graph before adding edge.
// e.g.
//
//  graph.AddNode("start_node_key", compose.NewPassthroughNode())
//  graph.AddNode("end_node_key", compose.NewPassthroughNode())
//
//  err := graph.AddEdge("start_node_key", "end_node_key")
func (g *graph) AddEdge(startNode, endNode string) (err error) {}
```

- Add a directed data transmission link between two nodes to control the direction of data flow and the execution order of nodes

<a href="/img/eino/en_eino_parallel_edge.png" target="_blank"><img src="/img/eino/en_eino_parallel_edge.png" width="100%" /></a>

##### **AddBranch**

```go
// AddBranch adds a branch to the graph.
// e.g.
//
//  condition := func(ctx context.Context, in string) (string, error) {
//     return "next_node_key", nil
//  }
//  endNodes := map[string]bool{"path01": true, "path02": true}
//  branch := compose.NewGraphBranch(condition, endNodes)
//
//  graph.AddBranch("start_node_key", branch)
func (g *graph) AddBranch(startNode string, branch *GraphBranch) (err error) {}
```

- Based on the provided custom selection function, select and execute the matching Node from multiple Nodes according to computed conditions at runtime

<a href="/img/eino/en_eino_branch_select.png" target="_blank"><img src="/img/eino/en_eino_branch_select.png" width="100%" /></a>

##### **Parallel**

- Connect multiple nodes in parallel to form nodes that execute concurrently
- There is no AddParallel method; **Parallel** is formed by using AddEdge to build multiple parallel topological paths

<a href="/img/eino/en_eino_parallel_node.png" target="_blank"><img src="/img/eino/en_eino_parallel_node.png" width="100%" /></a>

#### Graph

- Create a graph instance using NewGraph, and draw nodes and edges through graph.AddXXXNode, graph.AddEdge, and graph.AddBranch to ultimately form a compilable and executable graph

```go
// stateless graph
g := NewGraph[map[string]any, *schema.Message]()

type testState struct {
    ms []string
}

genFn := func(ctx context.Context) *testState {
    return &testState{}
}

// stateful graph
sg := NewGraph[string, string](WithGenLocalState(genFn))

// a chain is a simplified version of graph
chain := NewChain[map[string]any, string]()
```

### Chain

> Chain - A simplified Graph that connects different types of Nodes in sequence, forming head-to-tail data flow transmission and sequential execution.

#### **AppendXXX**

> XXX can be various component types such as ChatModel, Prompt, Indexer, Retriever, Graph, etc.
>
> Since Chain is a simplified Graph, Chain and Graph can be nested through AppendGraph

- Connects multiple Nodes in series according to the input order, where data is passed and executed sequentially through the connected Nodes

<a href="/img/eino/en_eino_chain_nodes.png" target="_blank"><img src="/img/eino/en_eino_chain_nodes.png" width="100%" /></a>

#### **AppendParallel**

> Add a node that has multiple concurrently executing sub-nodes

```go
// Parallel run multiple nodes in parallel
//
// use `NewParallel()` to create a new parallel type
// Example:

parallel := NewParallel()
parallel.AddChatModel("output_key01", chat01)
parallel.AddChatModel("output_key01", chat02)

chain := NewChain[any,any]()
chain.AppendParallel(parallel)
```

- Create a Parallel to accommodate multiple sub-nodes that execute concurrently

<a href="/img/eino/en_eino_parallel.png" target="_blank"><img src="/img/eino/en_eino_parallel.png" width="100%" /></a>

#### **AppendBranch**

> Add a node that selects one from multiple sub-nodes to execute based on a condition calculation method

```go
// NewChainBranch creates a new ChainBranch instance based on a given condition.
// It takes a generic type T and a GraphBranchCondition function for that type.
// The returned ChainBranch will have an empty key2BranchNode map and a condition function
// that wraps the provided cond to handle type assertions and error checking.
// eg.

condition := func(ctx context.Context, in string, opts ...any) (endNode string, err error) {
    // logic to determine the next node
    return "some_next_node_key", nil
}

cb := NewChainBranch[string](condition)
cb.AddPassthrough("next_node_key_01", xxx) // node in branch, represent one path of branch
cb.AddPassthrough("next_node_key_02", xxx) // node in branch

chain := NewChain[string, string]()
chain.AppendBranch(cb)
```

<a href="/img/eino/en_eino_branch_one_way.png" target="_blank"><img src="/img/eino/en_eino_branch_one_way.png" width="100%" /></a>

### Workflow

A directed acyclic graph that allows field-level upstream and downstream data mapping.

## Aspects (Callbacks)

Components (including Lambda) and Graph orchestration together solve the problem of "defining business logic." However, cross-cutting functionalities like logging, tracing, metrics, and screen display need a mechanism to be injected into Components (including Lambda) and Graph.

Additionally, users might want to access intermediate information during the execution of specific Component implementations, such as VikingDBRetriever providing additional DB Name information, or ArkChatModel providing temperature parameters. A mechanism is needed to expose these intermediate states.

Callbacks support both '**cross-cutting functionality injection'** and '**intermediate state exposure'**. Specifically: users provide and register "functions" (Callback Handlers), which Components and Graph call back at fixed "timings" (or aspects, points) to provide corresponding information.

**Entities** in Eino, such as Components and Graph, at fixed **timings** (Callback Timing), call back user-provided **functions** (Callback Handlers), and pass information about **who they are** (RunInfo) and **what happened** (Callback Input & Output).

For details, see: [Eino: Callback Mannual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)
