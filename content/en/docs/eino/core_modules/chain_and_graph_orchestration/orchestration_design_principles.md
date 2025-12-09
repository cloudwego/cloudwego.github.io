---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: Orchestration Design Principles'
weight: 2
---

`langchain`/`langgraph` are popular orchestration solutions in Python/TS — both highly flexible languages. Flexibility accelerates SDK development but often burdens users with ambiguity. Go’s simplicity and static typing help reduce cognitive load. Eino embraces this with “deterministic types” plus “compile-time type checking”.

## Upstream–Downstream Type Alignment as a First Principle

Eino’s orchestration centers on Graph (and simplified Chain). Fundamentally, it’s “logic nodes” plus “upstream/downstream relations”. At runtime, outputs of one node become inputs of the next.

We assume: the upstream output can be fed to the downstream input.

In Go, two approaches:

1) Use generalized types (e.g., `any`, `map[string]any`) everywhere.
   - With `any`, developers must assert types repeatedly; high cognitive load.
   - With `map[string]any`, nodes extract values by keys. Still requires type assertions, not ideal.

2) Preserve each node’s expected types, and enforce upstream–downstream compatibility at compile time.

Eino chooses (2). Orchestration becomes like “LEGO”: only matching studs/sockets connect.

<a href="/img/eino/edge_type_validate.png" target="_blank"><img src="/img/eino/edge_type_validate.png" width="100%" /></a>

Only downstream nodes that understand upstream outputs can run. Eino makes this explicit so developers can build with confidence instead of guessing with `any`.

### Type Alignment in Graph

#### Edges

<a href="/img/eino/input_output_type_validate.png" target="_blank"><img src="/img/eino/input_output_type_validate.png" width="100%" /></a>

Edges require assignable types:

1) Same types: e.g., upstream `*schema.Message` → downstream `*schema.Message`.
2) Downstream expects an interface that upstream implements. Special case: downstream `any` — everything assigns.
3) Upstream is an interface, downstream is a concrete type: depends on runtime concrete type; compile-time cannot guarantee. Only when the upstream concrete type implements the downstream expectation will it work.

Yellow paths show Eino’s map conversion: when downstream needs `map[string]any` but upstream doesn’t produce it, use `compose.WithOutputKey("outkey")` to wrap upstream output into a map with the given key. Similarly, `compose.WithInputKey("inkey")` lets downstream pick a specific key from upstream’s map output.

#### Branches

A node with multiple edges runs all downstream nodes. A `Branch` chooses exactly one downstream based on a condition function. All branch targets must be type-compatible with upstream outputs.

<a href="/img/eino/branch_to_draw_loop.png" target="_blank"><img src="/img/eino/branch_to_draw_loop.png" width="100%" /></a>

### Type Alignment in Chain

#### Chain

<a href="/img/eino/what_is_chain.png" target="_blank"><img src="/img/eino/what_is_chain.png" width="100%" /></a>

All node pairs must align. Example:

```go
chain := compose.NewChain[map[string]interface{}, string]()
chain.
  AppendChatTemplate(&fakeChatTemplate{}).
  AppendLambda(&fakeLambda{}).
  AppendChatModel(&fakeChatModel{}).
  AppendLambda(&fakeLambda{})
```

<a href="/img/eino/nodes_type_validate.png" target="_blank"><img src="/img/eino/nodes_type_validate.png" width="100%" /></a>

Misalignment causes compile errors: Chain errors at `Compile()`, Graph errors at `AddXXXNode()`.

#### Parallel

<a href="/img/eino/same_type_of_parallel.png" target="_blank"><img src="/img/eino/same_type_of_parallel.png" width="100%" /></a>

Parallel assumes exactly one node per branch (that node can itself be a Graph). All parallel nodes must accept the upstream’s output type. Parallel outputs a `map[string]any`, with keys from `AddXXX(outKey, ...)` and values as node outputs.

<a href="/img/eino/graph_as_chain_node.png" target="_blank"><img src="/img/eino/graph_as_chain_node.png" width="100%" /></a>

#### Branch in Chain

Similar to Graph; all branch targets must align. Chain branches typically converge to the same downstream node or END.

### Type Alignment in Workflow

Field-level mapping replaces whole-object alignment:

- Whole output → specific field
- Specific field → whole input
- Specific field → specific field

Same principles apply as whole-object alignment.

### StateHandlers

StatePreHandler: input type must align with the node’s non‑streaming input type.

```go
// input type: []*schema.Message, aligns to ChatModel non‑streaming input
preHandler := func(ctx context.Context, input []*schema.Message, state *state) ([]*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePreHandler(preHandler))
```

StatePostHandler: input type must align with the node’s non‑streaming output type.

```go
// input type: *schema.Message, aligns to ChatModel non‑streaming output
postHandler := func(ctx context.Context, input *schema.Message, state *state) (*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePostHandler(postHandler))
```

StreamStatePreHandler: input type must align with the node’s streaming input type.

```go
// input type: *schema.StreamReader[[]*schema.Message], aligns to ChatModel streaming input
preHandler := func(ctx context.Context, input *schema.StreamReader[[]*schema.Message], state *state) (*schema.StreamReader[[]*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePreHandler(preHandler))
```

StreamStatePostHandler: input type must align with the node’s streaming output type.

```go
// input type: *schema.StreamReader[*schema.Message], aligns to ChatModel streaming output
postHandler := func(ctx context.Context, input *schema.StreamReader[*schema.Message], state *state) (*schema.StreamReader[*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePostHandler(postHandler))
```

### Invoke vs Stream Alignment

`Runnable` offers `Invoke/Stream/Collect/Transform`. See [Streaming Essentials](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

Assume a `Graph[[]*schema.Message, []*schema.Message]` with a ChatModel node and a Lambda node, compiled to `Runnable[[]*schema.Message, []*schema.Message]`:

```go
g1 := compose.NewGraph[[]*schema.Message, string]()
_ = g1.AddChatModelNode("model", &mockChatModel{})
_ = g1.AddLambdaNode("lambda", compose.InvokableLambda(func(_ context.Context, msg *schema.Message) (string, error) {
   return msg.Content, nil
}))
_ = g1.AddEdge(compose.START, "model")
_ = g1.AddEdge("model", "lambda")
_ = g1.AddEdge("lambda", compose.END)

runner, _ := g1.Compile(ctx)
c, _ := runner.Invoke(ctx, []*schema.Message{ schema.UserMessage("what's the weather in beijing?") })
s, _ := runner.Stream(ctx, []*schema.Message{ schema.UserMessage("what's the weather in beijing?") })
var fullStr string
for {
   chunk, err := s.Recv()
   if err != nil {
      if err == io.EOF { break }
      panic(err)
   }
   fullStr += chunk
}
```

In Stream mode, ChatModel outputs `*schema.StreamReader[*schema.Message]`, while the downstream InvokableLambda expects non‑stream `*schema.Message`. Eino auto‑concatenates streamed frames into a full message, satisfying type alignment.

Concatenation behavior:
- `*schema.Message`: see `schema.ConcatMessages()`
- `string`: equivalent to `+=`
- `[]*schema.Message`: concatenated via framework helper
- `Map`: merge values by key with type‑appropriate concatenation; fails if types cannot be merged
- Other slices: only concatenated when exactly one element is non‑zero

You can override defaults by registering custom concat functions via `compose.RegisterStreamChunkConcatFunc`.

### Runtime Type Checks

Graph verifies type alignment during `AddEdge("node1", "node2")` and at `Compile()` for rules above. When upstream outputs an interface and the downstream expects a concrete type, the final assignability is only known at runtime once the upstream concrete type is available; the framework performs runtime checks for that scenario.

<a href="/img/eino/input_type_output_type_in_edge.png" target="_blank"><img src="/img/eino/input_type_output_type_in_edge.png" width="100%" /></a>

## Opinionated Design Choices

### Fan‑in and Merge

Multiple upstreams can feed into one downstream. Define how to merge outputs:

- Without custom merge functions, upstream actual types must be identical and be a `map`; keys must be disjoint. Non‑stream: merged into one map; stream: merged into one `StreamReader` with fair reading.
- Use `WithOutputKey` to convert a node’s output into a map:

```go
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

- Register custom merge:

```go
// eino/compose/values_merge.go
func RegisterValuesMergeFunc[T any](fn func([]T) (T, error))
```

Workflow maps fields across nodes; upstream structs are converted to maps, so the same merge rules apply.

### Streaming Handling

- Auto concatenate: prefer user‑registered concat functions, then framework defaults (Message, Message array, string, map, struct and pointers)
- Auto boxing: convert non‑stream `T` to `StreamReader[T]`
- Auto merge: see Fan‑in above
- Auto copy: duplicate streams where needed (fan‑out to multiple downstreams, callbacks)

All orchestration elements can sense/handle streams (branch, state handler, callback handler, passthrough, lambda, etc.). See [Streaming Essentials](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### Global State

- Provide `State` via `compose.WithGenLocalState` when creating a Graph; request‑scoped and readable/writable across steps
- Use `StatePreHandler` and `StatePostHandler` to read/write state and optionally replace node input/output; match input types to node non‑stream types (and the streaming variants for stream types)
- External handlers modify inputs/outputs outside nodes, preserving node statelessness
- Internal state access: `compose.ProcessState[S any](ctx context.Context, handler func(context.Context, S) error)`
- All state access is synchronized by the framework

### Callback Injection

Components may or may not implement callback aspects. If a component implements `Checker` with `IsCallbacksEnabled()==true`, the framework uses the component’s internal callbacks; otherwise it wraps external callbacks reporting only input/output. Graph always injects callbacks with `RunInfo` for itself. See [Callback Manual](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).

### Option Distribution

- Global by default — applies to all nodes, including nested graphs
- Component‑type options — e.g., `AddChatModelOption` applies to all ChatModel nodes; Lambda with its own option type can be targeted similarly
- Specific nodes — `DesignateNode(key ...string)`
- Nested graphs or their nodes — `DesignateNodeWithPath(path ...*NodePath)`

See [CallOption Capabilities](/en/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities).

### Graph Nesting

Compiled graphs (`Runnable`) are Lambda‑like; you can wrap them as a Lambda and nest into other graphs, or add subgraphs pre‑compile via `AddGraph`.

- Lambda wrapping adds an extra Lambda level in traces/callbacks
- Lambda wrapping carries options via Lambda options, not `DesignateNodeWithPath`
- Lambda wrapping requires pre‑compilation; `AddGraph` compiles the inner graph with the parent

### Internal Mechanics

#### Execution Sequence

Full streaming execution sequence for an InvokableLambda (string→int) with State handlers, InputKey/OutputKey and external callbacks:

<a href="/img/eino/graph_node_run_wrapper.png" target="_blank"><img src="/img/eino/graph_node_run_wrapper.png" width="100%" /></a>

Workflow performs field mapping after `StatePostHandler` and stream copy, and before `StatePreHandler` via merge.

#### Execution Engines

- `NodeTriggerMode == AnyPredecessor` → pregel engine (directed cyclic graph)
  - After current nodes run, all successors form a SuperStep and run together
  - Supports Branch and cycles; may need passthrough nodes to shape SuperSteps

<a href="/img/eino/graph_steps_in_graph2.png" target="_blank"><img src="/img/eino/graph_steps_in_graph2.png" width="100%" /></a>

Refactor with passthrough to meet expectations:

<a href="/img/eino/graph_steps_in_graph.png" target="_blank"><img src="/img/eino/graph_steps_in_graph.png" width="100%" /></a>

- `NodeTriggerMode == AllPredecessor` → DAG engine (directed acyclic graph)
  - Each node runs only after all predecessors complete
  - Cycles not supported; Branch is supported (unselected branch nodes are marked skipped at runtime)
  - SuperStep semantics apply; use `compose.WithEagerExecution()` to run ready nodes immediately. In v0.4.0+, AllPredecessor defaults to eager execution.

Summary: pregel is flexible but cognitively heavy; DAG is clear but constrained. In Eino, Chain uses pregel, Workflow uses DAG, Graph supports both selectable by users.
