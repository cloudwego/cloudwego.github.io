---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Orchestration Design Principles'
weight: 2
---

The mainstream language for large model application orchestration frameworks is Python, a language known for its flexibility. While flexibility facilitates SDK development, it also places a cognitive burden on SDK users.

Eino, based on Golang, is `statically typed`, performing type checking at compile time, avoiding the runtime type issues of dynamic languages like Python.

## Upstream-Downstream `Type Alignment` as the Fundamental Principle

Eino's most basic orchestration method is graph, along with the simplified wrapper chain. Regardless of the orchestration method, the essence is `logic nodes` + `upstream/downstream relationships`. When the orchestration product runs, it executes from one logic node, then proceeds to run the next node connected to it.

This implies a fundamental assumption: **The output value of the previous running node can be used as the input value of the next node.**

In Golang, there are two basic approaches to implement this assumption:

1. Convert the inputs and outputs of different nodes to a more generalized type, such as `any`, `map[string]any`, etc.
   1. Adopting the approach of generalizing to any, but the corresponding cost is: developers need to explicitly convert to specific types when writing code. This greatly increases the cognitive burden on developers, so this approach was ultimately abandoned.
   2. LangChain's approach can be seen as passing `map[string]any` throughout, where each logic node uses the corresponding key to get the corresponding value according to its needs. In the langchaingo implementation, this is exactly how it's done, but similarly, any in Golang still requires `type assertion` to be used. This approach still has a significant cognitive burden for developers.
2. Keep the input and output types of each node as expected by developers, and ensure upstream and downstream types are consistent during the Compile phase.

Approach 2 is the final solution chosen by Eino. This approach is the easiest to understand when orchestrating - the whole process is like `building blocks`, where each block's protruding and recessed parts have their own specifications, and only matching specifications can form upstream/downstream relationships.

As shown below:

<a href="/img/eino/edge_type_validate.png" target="_blank"><img src="/img/eino/edge_type_validate.png" width="100%" /></a>

For any orchestration, only when the downstream can recognize and process the upstream's output can the orchestration run normally. This fundamental assumption is clearly expressed in Eino, allowing developers to have full confidence in understanding how the orchestration logic runs and flows, rather than guessing whether the values passed from a series of any are correct.

### Type Alignment in Graph

#### Edge

In a graph, a node's output flows to the next node along an `edge`, therefore, nodes connected by edges must be type-aligned.

As shown below:

> This simulates a scenario of ① direct conversation with a large model ② using RAG mode, with results that can be used to compare the effects of both modes

<a href="/img/eino/input_output_type_validate.png" target="_blank"><img src="/img/eino/input_output_type_validate.png" width="100%" /></a>

The green parts in the diagram are normal Edge connections, which require that the upstream output must be `assignable` to the downstream. The acceptable types are:

① Same upstream and downstream types: e.g., upstream outputs *schema.Message and downstream input is also *schema.Message

② Downstream receives an interface, upstream implements that interface: e.g., upstream struct implements the Format() interface, downstream receives an interface{ Format() }. A special case is when downstream is any (empty interface), upstream always implements any, so it can always connect.

③ Upstream is an interface, downstream is a concrete type: When the downstream concrete type implements the upstream interface type, it may or may not work - this cannot be determined at compile time, only at runtime when the upstream's concrete type is determined. For detailed description, see: [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

The yellow parts in the diagram show another type conversion mechanism provided by Eino: if the downstream receives type `map[string]any`, but the upstream output type is not map[string]any, you can use `graph.AddXXXNode(node_key, xxx, compose.WithOutputKey("outkey")` to convert the upstream output type to map[string]any, where the map's key is the OutputKey specified in the option. This mechanism is convenient when multiple edges converge to a single node.

Similarly, if the upstream is `map[string]any`, but the downstream input type is not map[string]any, you can use `graph.AddXXXNode(node_key, xxx, compose.WithInputKey("inkey")` to get one key's value from the upstream output as the downstream's input.

#### Branch

If a node is followed by multiple edges, each edge's downstream node will run once. Branch is another mechanism: a branch is followed by n nodes, but only the node corresponding to the node key returned by the condition will run. Nodes after the same branch must be type-aligned.

As shown below:

> This simulates the running logic of a react agent

<a href="/img/eino/branch_to_draw_loop.png" target="_blank"><img src="/img/eino/branch_to_draw_loop.png" width="100%" /></a>

As you can see, a branch itself has a `condition`, and this function's input must be type-aligned with the upstream. At the same time, each node connected after a branch must also, like the condition, be able to receive the upstream's output.

### Type Alignment in Chain

#### Chain

From an abstract perspective, a chain is a `chain`, as shown below:

<a href="/img/eino/what_is_chain.png" target="_blank"><img src="/img/eino/what_is_chain.png" width="100%" /></a>

Logic node types can be divided into 3 categories:

- Orchestrable components (e.g., chat model, chat template, retriever, lambda, graph, etc.)
- Branch nodes
- Parallel nodes

As you can see, from the chain's perspective, whether it's a simple node (e.g., chat model) or a complex node (e.g., graph, branch, parallel), they are all the same - during execution, one step is one node's execution.

Therefore, between upstream and downstream nodes in a chain, types must be aligned, as follows:

```go
func TestChain() {
    chain := compose.NewChain[map[string]interface,string]()
    
    nodeTemplate := &fakeChatTemplate{} // input: map[string]any, output: []*schema.Message
    
    nodeHistoryLambda := &fakeLambda{} // input: []*schema.Message, output: []*schema.Message
    
    nodeChatModel := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    
    nodeConvertResLambda := &fakeLambda{} // input: *schema.Message, output: string
    
    chain.
        AppendChatTemplate(nodeTemplate).
        AppendLambda(nodeHistoryLambda).
        AppendChatModel(nodeChatModel).
        AppendLambda(nodeConvertResLambda)
}
```

The above logic represented as a diagram:

<a href="/img/eino/nodes_type_validate.png" target="_blank"><img src="/img/eino/nodes_type_validate.png" width="100%" /></a>

If upstream and downstream types are not aligned, chain will return an error at chain.Compile(). Graph will report an error at graph.AddXXXNode().

#### Parallel

Parallel is a special type of node in chain. From the chain's perspective, parallel is no different from other nodes. Inside parallel, its basic topology structure is as follows:

<a href="/img/eino/same_type_of_parallel.png" target="_blank"><img src="/img/eino/same_type_of_parallel.png" width="100%" /></a>

One of the structures formed by multiple edges in a graph is this. The basic assumption here is: each edge in a parallel has exactly one node. Of course, this one node can also be a graph. Note that currently the framework does not directly provide the ability to nest branch or parallel within parallel.

For each node in parallel, since their upstream node is the same, they all need to be type-aligned with the upstream node's output type. For example, in the diagram, the upstream node outputs `*schema.Message`, so each node must be able to receive this type. The receiving methods are the same as in graph, typically using `same type`, `interface definition`, `any`, or `input key option`.

The output of a parallel node is always a `map[string]any`, where the key is the output_key specified in `parallel.AddXXX(output_key, xxx, opts...)`, and the value is the actual output of the internal node.

An example of building a parallel:

```go
func TestParallel() {
    chain := compose.NewChain[map[string]any, map[string]*schema.Message]()
    
    parallel := compose.NewParallel()
    model01 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    model02 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    model03 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    
    parallel.
        AddChatModel("outkey_01", model01).
        AddChatModel("outkey_02", model02).
        AddChatModel("outkey_03", model03)
    
    lambdaNode := &fakeLambdaNode{} // input: map[string]any, output: map[string]*schema.Message
    
    chain.
        AppendParallel(parallel).
        AppendLambda(lambdaNode)
}
```

A parallel's view in a chain is as follows:

> The diagram simulates the same question being answered by different large models, with results that can be used to compare effects

<a href="/img/eino/graph_as_chain_node.png" target="_blank"><img src="/img/eino/graph_as_chain_node.png" width="100%" /></a>

> Note that this structure is only a logical view. Since chain itself is implemented using graph, parallel will be flattened into the underlying graph.

#### Branch

Chain's branch is similar to graph's branch - all nodes in the branch must be type-aligned with the upstream node, so we won't elaborate here. The special thing about chain branch is that all possible branch nodes will connect to the same node in the chain, or all will connect to END.

### Type Alignment in Workflow

The dimension of type alignment in Workflow changes from overall Input & Output to field level. Specifically:

- The overall upstream output is type-aligned to a specific field of the downstream.
- A specific field of the upstream output is type-aligned to the overall downstream.
- A specific field of the upstream output is type-aligned to a specific field of the downstream input.

The principles and rules are the same as overall type alignment.

### Type Alignment of StateHandler

StatePreHandler: The input type needs to align with the corresponding node's non-streaming input type.

```go
// input type is []*schema.Message, aligns with ChatModel's non-streaming input type
preHandler := func(ctx context.Context, input []*schema.Message, state *state) ([]*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePreHandler(preHandler))
```

StatePostHandler: The input type needs to align with the corresponding node's non-streaming output type.

```go
// input type is *schema.Message, aligns with ChatModel's non-streaming output type
postHandler := func(ctx context.Context, input *schema.Message, state *state) (*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePostHandler(postHandler))
```

StreamStatePreHandler: The input type needs to align with the corresponding node's streaming input type.

```go
// input type is *schema.StreamReader[[]*schema.Message], aligns with ChatModel's streaming input type
preHandler := func(ctx context.Context, input *schema.StreamReader[[]*schema.Message], state *state) (*schema.StreamReader[[]*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePreHandler(preHandler))
```

StreamStatePostHandler: The input type needs to align with the corresponding node's streaming output type.

```go
// input type is *schema.StreamReader[*schema.Message], aligns with ChatModel's streaming output type
postHandler := func(ctx context.Context, input *schema.StreamReader[*schema.Message], state *state) (*schema.StreamReader[*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePostHandler(postHandler))
```

### Type Alignment in Invoke and Stream Modes

In Eino, the result of orchestration is a graph or chain. To run it, you need to use `Compile()` to generate a `Runnable` interface.

An important function of Runnable is to provide four calling methods: "Invoke", "Stream", "Collect", and "Transform".

> For an introduction to the above calling methods and detailed Runnable introduction, see: [Eino Stream Programming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

Suppose we have a `Graph[[]*schema.Message, []*schema.Message]` with a ChatModel node and a Lambda node. After Compile, it becomes a `Runnable[[]*schema.Message, []*schema.Message]`.

```go
package main

import (
    "context"
    "io"
    "testing"

    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    "github.com/stretchr/testify/assert"
)

func TestTypeMatch(t *testing.T) {
    ctx := context.Background()

    g1 := compose.NewGraph[[]*schema.Message, string]()
    _ = g1.AddChatModelNode("model", &mockChatModel{})
    _ = g1.AddLambdaNode("lambda", compose.InvokableLambda(func(_ context.Context, msg *schema.Message) (string, error) {
       return msg.Content, nil
    }))
    _ = g1.AddEdge(compose.START, "model")
    _ = g1.AddEdge("model", "lambda")
    _ = g1.AddEdge("lambda", compose.END)

    runner, err := g1.Compile(ctx)
    assert.NoError(t, err)

    c, err := runner.Invoke(ctx, []*schema.Message{
       schema.UserMessage("what's the weather in beijing?"),
    })
    assert.NoError(t, err)
    assert.Equal(t, "the weather is good", c)

    s, err := runner.Stream(ctx, []*schema.Message{
       schema.UserMessage("what's the weather in beijing?"),
    })
    assert.NoError(t, err)

    var fullStr string
    for {
       chunk, err := s.Recv()
       if err != nil {
          if err == io.EOF {
             break
          }
          panic(err)
       }

       fullStr += chunk
    }
    assert.Equal(t, c, fullStr)
}
```

When we call the compiled Runnable above in Stream mode, the model node will output `*schema.StreamReader[*Message]`, but the lambda node is an InvokableLambda that only accepts non-streaming `*schema.Message` as input. This also conforms to the type alignment rules because the Eino framework will automatically concatenate the streamed Message into a complete Message.

In stream mode, concatenating frames is a very common operation. During concatenation, all elements from `*StreamReader[T]` are first extracted and converted to `[]T`, then an attempt is made to concatenate `[]T` into a complete `T`. The framework has built-in support for concatenating the following types:

- `*schema.Message`: See `schema.ConcatMessages()`
- `string`: Implementation logic is equivalent to `+=`
- `[]*schema.Message`: See `compose.concatMessageArray()`
- `Map`: Merge values with the same key, with the same merge logic as above. If there are types that cannot be merged, it fails (note: not overwrite)
- Other slices: Can only be merged when the slice has exactly one non-zero element.

For other scenarios, or when users want to override the default behavior above with custom logic, developers can implement their own concat method and register it to the global concatenation function using `compose.RegisterStreamChunkConcatFunc()`.

Example:

```go
// Assume our own struct is as follows
type tStreamConcatItemForTest struct {
    s string
}

// Implement a concatenation method
func concatTStreamForTest(items []*tStreamConcatItemForTest) (*tStreamConcatItemForTest, error) {
    var s string
    for _, item := range items {
        s += item.s
    }

    return &tStreamConcatItemForTest{s: s}, nil
}

func Init() {
    // Register to the global concatenation method
    compose.RegisterStreamChunkConcatFunc(concatTStreamForTest)
}
```

### Scenarios Where Type Alignment is Checked at Runtime

Eino's Graph type alignment check is performed at `err = graph.AddEdge("node1", "node2")` to check whether the two node types match. This allows type mismatch errors to be discovered during `the graph building process` or `the Compile process`. This applies to rules ① ② ③ listed in [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles).

When the upstream node's output is an `interface`, if the downstream node type implements that `interface`, the upstream may be able to convert to the downstream type (type assertion), but this can only be known during `runtime`. The type check for this scenario is moved to runtime.

The structure is shown below:

<a href="/img/eino/input_type_output_type_in_edge.png" target="_blank"><img src="/img/eino/input_type_output_type_in_edge.png" width="100%" /></a>

This scenario is suitable for cases where developers can handle upstream and downstream type alignment themselves, and can choose downstream execution nodes based on different types.

## Design Choices with Clear Preferences

### External Variables Read-Only Principle

When data flows between Nodes, Branches, and Handlers in Eino's Graph, it is always variable assignment, not Copy. When Input is a reference type, such as Struct pointer, map, or slice, modifications to Input inside Node, Branch, or Handler will have side effects externally and may cause concurrency issues. Therefore, Eino follows the external variables read-only principle: Node, Branch, Handler should not modify Input internally. If modification is needed, copy it first.

This principle also applies to Chunks in StreamReader.

### Fan-in and Merge

**Fan-in**: Data from multiple upstreams flows into the downstream, together serving as the downstream's input. It is necessary to clearly define how multiple upstream outputs are **merged**.

By default, first, the **actual types** of multiple upstream outputs must be the same and be a Map, and keys must not overlap. Second:

- In non-streaming scenarios, after merging, it becomes one Map containing all key-value pairs from all upstreams.
- In streaming scenarios, multiple upstream StreamReaders of the same type are merged into one StreamReader. The actual Recv effect is fair reading from multiple upstream StreamReaders.

When AddNode, you can add the WithOutputKey Option to convert the node's output to a Map:

```go
// This node's output will change from string to map[string]any,
// and the map has only one element, key is your_output_key, value is the actual string output by the node
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

You can also register a Merge method to implement merge of any type:

```go
// eino/compose/values_merge.go
func RegisterValuesMergeFunc[T any](fn func([]T) (T, error))
```

Workflow can map multiple output fields from multiple upstreams to different fields of the downstream node. This is not a merge scenario, but point-to-point field mapping. In fact, eino workflow currently does not support "multiple upstream fields mapping to the same downstream field simultaneously".

### Streaming Handling

Eino believes that components should only need to implement the streaming paradigms that are real in business scenarios. For example, ChatModel doesn't need to implement Collect. Therefore, in orchestration scenarios, Eino automatically helps all nodes **complete missing streaming paradigms**.

Running Graph in Invoke mode, all internal nodes run in Invoke paradigm. Running Graph in Stream, Collect, or Transform mode, all internal nodes run in Transform paradigm.

**Auto Concatenate**: For scenarios where Stream chunks are concatenated into complete content, user-registered custom concatenation functions are used first, followed by framework-provided default behaviors, including Message, Message array, String, Map, and Struct and Struct pointers.

**Auto Box**: For scenarios where non-streaming T needs to become StreamReader[T], the framework executes automatically.

**Auto Merge**: See the "Fan-in and Merge" section above.

**Auto Copy**: Automatic stream copying in scenarios that require it, including a stream fanning out to multiple downstream nodes, and a stream entering one or more callback handlers.

Finally, Eino requires all orchestration elements to be able to sense and handle streams. This includes branch, state handler, callback handler, passthrough, lambda, etc.

For Eino's stream handling capabilities, see [Eino Stream Programming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### Global State

**State**: Pass the State creation method through `compose.WithGenLocalState` when NewGraph. This request-scoped global state can be read and written in various stages of a request.

Eino recommends using `StatePreHandler` and `StatePostHandler`, with the functional positioning of:

- StatePreHandler: Read and write State before each node execution, and replace the node's Input as needed. Input needs to align with the node's non-streaming input type.
- StatePostHandler: Read and write State after each node execution, and replace the node's Output as needed. Input needs to align with the node's non-streaming output type.

For streaming scenarios, use the corresponding `StreamStatePreHandler` and `StreamStatePostHandler`, with input needing to align with the node's streaming input and streaming output types respectively.

These state handlers are located outside the node, affecting the node through modifications to Input or Output, thus ensuring the node's "state-independent" characteristic.

If you need to read and write State inside a node, Eino provides the `ProcessState[S any](ctx context.Context, handler func(context.Context, S) error) error` function.

The Eino framework will lock at all positions where State is read or written.

### Callback Injection

The Eino orchestration framework believes that components entering orchestration may or may not have Callback aspects embedded internally. This information is determined by whether the component implements the `Checker` interface and the return value of the `IsCallbacksEnabled` method in the interface.

- When `IsCallbacksEnabled` returns true, the Eino orchestration framework uses the Callback aspects inside the component implementation.
- Otherwise, it automatically wraps Callback aspects outside the component implementation, (only) reporting input and output.

In either case, RunInfo will be automatically inferred.

At the same time, for the Graph as a whole, Callback aspects will always be injected, with RunInfo being the Graph itself.

For the complete description of Eino's Callback capabilities, see [Eino: Callback User Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).

### Option Distribution

Eino supports various dimensions of Call Option distribution:

- Global by default, i.e., distributed to all nodes, including nested internal graphs.
- Can add Options for a specific component type, which are then distributed to all nodes of that type by default, such as AddChatModelOption. Lambda that defines its own Option type can also specify Options to itself this way.
- Can specify any specific nodes using `DesignateNode(key ...string)`.
- Can specify nested graphs at any depth, or any specific nodes within them, using `DesignateNodeWithPath(path ...*NodePath)`.

For the complete description of Eino's Call Option capabilities, see [Eino: CallOption Capabilities and Specifications](/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities).

### Graph Nesting

The graph orchestration product `Runnable` has a very similar interface form to Lambda. Therefore, a compiled graph can be simply wrapped as a Lambda and nested into other graphs as a Lambda node.

Another way is to directly nest Graph, Chain, Workflow, etc. into other graphs through AddGraph before compilation. The differences between the two approaches are:

- With the Lambda approach, there will be an extra Lambda node level in the trace. Other Callback handler perspectives will also see an extra layer.
- With the Lambda approach, CallOption needs to be received through Lambda's Option, and cannot use DesignateNodeWithPath.
- With the Lambda approach, the internal graph needs to be compiled beforehand. With direct AddGraph, the internal graph is compiled together with the upper-level graph.

## Internal Mechanisms

### Execution Sequence

Taking an InvokableLambda (input is string, output is int) with StatePreHandler, StatePostHandler, InputKey, OutputKey, and no internal Callback aspects as an example, the complete streaming execution sequence in the graph is as follows:

<a href="/img/eino/graph_node_run_wrapper.png" target="_blank"><img src="/img/eino/graph_node_run_wrapper.png" width="100%" /></a>

In workflow scenarios, field mapping occurs at two positions:

- After the node execution's StatePostHandler and "stream copy" steps, the fields needed by each downstream are extracted separately.
- After the "merge" step before node execution and before StatePreHandler, the extracted upstream field values are converted to the current node's input.

### Execution Engine

When `NodeTriggerMode == AnyPredecessor`, the graph executes with the pregel engine, corresponding to a directed cyclic graph topology. The characteristics are:

- All successor nodes of the currently executing one or more nodes form a SuperStep and execute together. At this point, these new nodes become the "current" nodes.
- Supports Branch, supports cycles in the graph, but may require manually adding passthrough nodes to ensure the nodes in the SuperStep meet expectations, as shown below:

<a href="/img/eino/graph_steps_in_graph2.png" target="_blank"><img src="/img/eino/graph_steps_in_graph2.png" width="100%" /></a>

In the above diagram, Node 4 and Node 5 are placed together for execution according to the rules, which is probably not as expected. It needs to be changed to:

<a href="/img/eino/graph_steps_in_graph.png" target="_blank"><img src="/img/eino/graph_steps_in_graph.png" width="100%" /></a>

When `NodeTriggerMode == AllPredecessor`, the graph executes with the dag engine, corresponding to a directed acyclic graph topology. The characteristics are:

- Each node has definite predecessor nodes, and this node only has the condition to run after all predecessor nodes are complete.
- Does not support cycles in the graph, because it would break the assumption that "each node has definite predecessor nodes".
- Supports Branch. At runtime, nodes not selected by the Branch are marked as skipped, not affecting the AllPredecessor semantics.

> 💡
> After setting NodeTriggerMode = AllPredecessor, nodes will execute after all predecessors are ready, but not immediately - they still follow SuperStep semantics, running new runnable nodes after a batch of nodes has completed execution.
>
> If you pass compose.WithEagerExecution() during Compile, ready nodes will run immediately.
>
> In Eino v0.4.0 and later versions, setting NodeTriggerMode = AllPredecessor will enable EagerExecution by default.

In summary, pregel mode is flexible and powerful but has additional cognitive burden, while dag mode is clear and simple but has limited scenarios. In the Eino framework, Chain uses pregel mode, Workflow uses dag mode, and Graph supports both, allowing users to choose between pregel and dag.
