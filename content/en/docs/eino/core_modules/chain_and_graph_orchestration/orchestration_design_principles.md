---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: Orchestration Design Principles'
weight: 2
---

The mainstream language for large model application orchestration frameworks is Python, known for its flexibility. While flexibility brings convenience to SDK development, it also adds cognitive burden for SDK users.

Eino, based on Golang, is `statically typed`, performing type checking at Compile time, avoiding runtime type issues common in dynamic languages like Python.

## `Type Alignment` of Upstream and Downstream as the Basic Principle

Eino's most basic orchestration method is graph, as well as the simplified wrapper chain. Regardless of which orchestration method is used, the essence is `logic nodes` + `upstream-downstream relationships`. When the orchestration product runs, it runs from one logic node, then runs the next node connected to this node in the next step.

This implies a basic assumption: **The output value of the previous running node can serve as the input value for the next node.**

In Golang, there are two basic approaches to implement this assumption:

1. Convert the input and output of different nodes to a more generalized type, such as `any`, `map[string]any`, etc.
   1. Adopting the generalization to any approach, but the corresponding cost is: developers need to explicitly convert to specific types when writing code. This would greatly increase developers' cognitive burden, so this approach was ultimately abandoned.
   2. Langchain's approach can be seen as passing `map[string]any` throughout, with each logic node taking the corresponding value using the corresponding key according to its needs. In the langchaingo implementation, it follows this approach, but similarly, any in Golang still requires `type assertion` to be used. This approach still has significant cognitive burden for developers.
2. Keep the input and output types of each node as expected by developers, and ensure upstream and downstream types are consistent during the Compile phase.

Approach 2 is the final approach chosen by Eino. This approach is the easiest to understand during orchestration. The entire process is like `building blocks`, where each block's protruding and recessed parts have their own specifications, and only when specifications match can they form upstream-downstream relationships.

As shown in the figure below:

<a href="/img/eino/edge_type_validate.png" target="_blank"><img src="/img/eino/edge_type_validate.png" width="100%" /></a>

For orchestration, only when downstream can recognize and process upstream output can the orchestration run normally. This basic assumption is clearly expressed in Eino, allowing developers to have full confidence in understanding how the orchestration logic runs and flows when using Eino for orchestration, rather than guessing whether the passed value is correct from a series of any.

### Type Alignment in Graph

#### Edge

In a graph, a node's output flows to the next node along `edges`, so nodes connected by edges must have type alignment.

As shown in the figure below:

> This simulates scenarios of ① direct conversation with large model ② using RAG mode, with results available for comparing the effects of both modes

<a href="/img/eino/input_output_type_validate.png" target="_blank"><img src="/img/eino/input_output_type_validate.png" width="100%" /></a>

The green parts in the figure are normal Edge connections, requiring that upstream output can be `assigned` to downstream. Acceptable types include:

① Same upstream and downstream types: e.g., upstream outputs *schema.Message and downstream inputs also *schema.Message

② Downstream accepts interface, upstream implements that interface: e.g., upstream struct implements Format() interface, downstream accepts interface{ Format() }. A special case is when downstream is any (empty interface), upstream always implements any, so connection is always possible.

③ Upstream is interface, downstream is concrete type: When the downstream concrete type implements the upstream interface type, it may or may not work, cannot be determined at compile time, only at runtime when the upstream's concrete type is determined. For detailed description, see: [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

The yellow parts in the figure are another type conversion mechanism provided by Eino: if downstream accepts type `map[string]any`, but upstream output type is not map[string]any, you can use `graph.AddXXXNode(node_key, xxx, compose.WithOutputKey("outkey")` to convert upstream output type to map[string]any, where the map key is the OutputKey specified in the option. This mechanism is convenient when multiple edges converge to a node.

Similarly, if upstream is `map[string]any`, but downstream input type is not map[string]any, you can use `graph.AddXXXNode(node_key, xxx, compose.WithInputKey("inkey")` to get one key's value from upstream output as downstream input.

#### Branch

If a node is followed by multiple edges, all downstream nodes of each edge will run once. Branch is another mechanism: a branch has n nodes following it, but only the node corresponding to the node key returned by condition will run. All nodes following the same branch must have type alignment.

As shown in the figure below:

> This simulates the running logic of a react agent

<a href="/img/eino/branch_to_draw_loop.png" target="_blank"><img src="/img/eino/branch_to_draw_loop.png" width="100%" /></a>

As you can see, a branch itself has a `condition`, whose input must align with upstream type. Also, each node following a branch must, like condition, be able to receive upstream output.

### Type Alignment in Chain

#### Chain

From an abstract perspective, chain is a `chain`, as shown below:

<a href="/img/eino/what_is_chain.png" target="_blank"><img src="/img/eino/what_is_chain.png" width="100%" /></a>

Logic node types can be divided into 3 categories:

- Orchestratable components (such as chat model, chat template, retriever, lambda, graph, etc.)
- Branch nodes
- Parallel nodes

As you can see, from the chain's perspective, whether it's a simple node (e.g., chat model) or a complex node (e.g., graph, branch, parallel), they're all the same. During execution, one step is the running of one node.

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

The logic above represented in a figure is as follows:

<a href="/img/eino/nodes_type_validate.png" target="_blank"><img src="/img/eino/nodes_type_validate.png" width="100%" /></a>

If upstream and downstream types don't align, chain will return an error at chain.Compile(). Graph will report an error at graph.AddXXXNode().

#### Parallel

Parallel is a special type of node in chain. From the chain's perspective, parallel is no different from other nodes. Internally, parallel's basic topology is as follows:

<a href="/img/eino/same_type_of_parallel.png" target="_blank"><img src="/img/eino/same_type_of_parallel.png" width="100%" /></a>

One of the structures formed by multiple edges in graph is this. The basic assumption here is: each edge in a parallel has one and only one node. Of course, this one node can also be a graph. But note that currently the framework doesn't directly provide the ability to nest branch or parallel within parallel.

In parallel, since each node has the same upstream node, they all need to align with the upstream node's output type. For example, if the upstream node in the figure outputs `*schema.Message`, each node must be able to receive this type. The receiving methods are the same as in graph, typically using `same type`, `interface definition`, `any`, or `input key option`.

The output of a parallel node is always a `map[string]any`, where the key is the output_key specified in `parallel.AddXXX(output_key, xxx, opts...)`, and value is the actual output of the internal node.

An example of building a parallel is as follows:

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

A parallel's perspective within a chain is as follows:

> The figure simulates the same question answered by different large models, with results available for comparing effects

<a href="/img/eino/graph_as_chain_node.png" target="_blank"><img src="/img/eino/graph_as_chain_node.png" width="100%" /></a>

> Note that this structure is only a logical perspective. Since chain itself is implemented using graph, parallel will be flattened into the graph at the underlying level.

#### Branch

Chain branch is similar to branch in graph. All nodes in the branch must align with the upstream node's type, so no further elaboration here. The special thing about chain branch is that all possible branch nodes will connect to the same node in the chain, or all will connect to END.

### Type Alignment in Workflow

The dimension of type alignment in Workflow changes from overall Input & Output to field level. Specifically:

- The entire upstream output aligns to a specific field of downstream.
- A specific upstream output field aligns to the entire downstream.
- A specific upstream output field aligns to a specific downstream input field.

The principles and rules are the same as overall type alignment.

### Type Alignment of StateHandler

StatePreHandler: Input type needs to align with the corresponding node's non-streaming input type.

```go
// input type is []*schema.Message, aligning with ChatModel's non-streaming input type
preHandler := func(ctx context.Context, input []*schema.Message, state *state) ([]*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePreHandler(preHandler))
```

StatePostHandler: Input type needs to align with the corresponding node's non-streaming output type.

```go
// input type is *schema.Message, aligning with ChatModel's non-streaming output type
postHandler := func(ctx context.Context, input *schema.Message, state *state) (*schema.Message, error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStatePostHandler(postHandler))
```

StreamStatePreHandler: Input type needs to align with the corresponding node's streaming input type.

```go
// input type is *schema.StreamReader[[]*schema.Message], aligning with ChatModel's streaming input type
preHandler := func(ctx context.Context, input *schema.StreamReader[[]*schema.Message], state *state) (*schema.StreamReader[[]*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePreHandler(preHandler))
```

StreamStatePostHandler: Input type needs to align with the corresponding node's streaming output type.

```go
// input type is *schema.StreamReader[*schema.Message], aligning with ChatModel's streaming output type
postHandler := func(ctx context.Context, input *schema.StreamReader[*schema.Message], state *state) (*schema.StreamReader[*schema.Message], error) {
    // your handler logic
}

AddChatModelNode("xxx", model, WithStreamStatePostHandler(postHandler))
```

### Type Alignment Methods Under Invoke and Stream

In Eino, orchestration results are graph or chain. To run, you need to use `Compile()` to generate a `Runnable` interface.

An important function of Runnable is providing four calling methods: "Invoke", "Stream", "Collect", and "Transform".

> For introduction of the above calling methods and detailed Runnable introduction, see: [Eino Stream Programming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

Suppose we have a `Graph[[]*schema.Message, []*schema.Message]` with a ChatModel node and a Lambda node. After Compile, it's a `Runnable[[]*schema.Message, []*schema.Message]`.

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

When we call the compiled Runnable with Stream, the model node outputs `*schema.StreamReader[*Message]`, but the lambda node is an InvokableLambda that only accepts non-streaming `*schema.Message` as input. This also conforms to type alignment rules because the Eino framework automatically concatenates streaming Messages into complete Messages.

In stream mode, concatenating frames is a very common operation. When concatenating, all elements in `*StreamReader[T]` are first extracted and converted to `[]T`, then attempt to concatenate `[]T` into a complete `T`. The framework has built-in support for concatenating the following types:

- `*schema.Message`: Details in `schema.ConcatMessages()`
- `string`: Implementation logic equivalent to `+=`
- `[]*schema.Message`: Details in `compose.concatMessageArray()`
- `Map`: Merge values of the same key, merge logic same as above. If there are types that cannot be merged, it fails (ps: not overwrite)
- Other slices: Can only be merged when only one element in the slice is non-zero value.

For other scenarios, or when users want to override the default behavior above with custom logic, developers can implement their own concat method and register it to the global concatenation function using `compose.RegisterStreamChunkConcatFunc()`.

Example as follows:

```go
// Suppose our own struct is as follows
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
    // Register to global concatenation method
    compose.RegisterStreamChunkConcatFunc(concatTStreamForTest)
}
```

### Scenarios Where Type Alignment is Checked at Runtime

Eino's Graph type alignment check occurs at `err = graph.AddEdge("node1", "node2")` when checking whether the two nodes' types match. This allows discovering type mismatch errors during `graph building` or `Compile process`, applicable to rules ① ② ③ listed in [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles).

When the upstream node's output is `interface`, if the downstream node type implements that `interface`, upstream may be convertible to downstream type (type assertion), but can only be determined during `runtime`. At this point, if it's determined that upstream cannot be assigned to downstream, an error will be thrown.

The structure is shown in the figure below:

<a href="/img/eino/input_type_output_type_in_edge.png" target="_blank"><img src="/img/eino/input_type_output_type_in_edge.png" width="100%" /></a>

This scenario is suitable for cases where developers can handle upstream-downstream type alignment themselves, selecting downstream execution nodes based on different types.

## Design Choices with Clear Preferences

### Read-Only Principle for External Variables

When data flows between Nodes, Branches, and Handlers in Eino's Graph, it's all variable assignment, not Copy. When Input is a reference type, such as Struct pointer, map, slice, modifications to Input inside Node, Branch, or Handler will have side effects externally, potentially causing concurrency issues. Therefore, Eino follows the read-only principle for external variables: Node, Branch, and Handler should not modify Input internally. If modification is needed, first Copy it yourself.

This principle also applies to Chunks in StreamReader.

### Fan-In and Merge

**Fan-In**: Data from multiple upstreams flows into downstream, together serving as downstream input. Need to clearly define how outputs from multiple upstreams are **merged**.

By default, first, the **actual types** of multiple upstream outputs must be the same and be Map, and keys must not overlap between them. Then:

- In non-streaming scenarios, after merging becomes one Map, containing all key-value pairs from all upstreams.
- In streaming scenarios, multiple upstream StreamReaders of the same type are merged into one StreamReader. The actual Recv effect is fair reading from multiple upstream StreamReaders.

When AddNode, you can convert node output to Map by adding the WithOutputKey Option:

```go
// This node's output will change from string to map[string]any,
// and the map has only one element, key is your_output_key, value is the actual string output by the node
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

You can also implement merge of any type by registering a Merge method:

```go
// eino/compose/values_merge.go
func RegisterValuesMergeFunc[T any](fn func([]T) (T, error))
```

Workflow can map multiple output fields from multiple upstreams to different fields of the downstream node. This doesn't belong to merge scenarios, but point-to-point field mapping. In fact, eino workflow currently doesn't support "multiple upstream fields mapping to the same downstream field at the same time".

### Stream Processing

Eino believes that components should only need to implement streaming paradigms that are real in business scenarios, for example, ChatModel doesn't need to implement Collect. Therefore, in orchestration scenarios, Eino automatically helps all nodes **complete missing streaming paradigms**.

Running Graph with Invoke, internal nodes all run with Invoke paradigm. Running Graph with Stream, Collect or Transform, internal nodes all run with Transform paradigm.

**Auto Concatenate**: For scenarios where Stream chunks are concatenated into complete content, first use user-registered custom concatenation functions, then execute framework-provided default behavior, including Message, Message array, String, Map, and Struct and Struct pointers.

**Auto Box**: For scenarios where non-streaming T needs to become StreamReader[T], the framework automatically executes.

**Auto Merge**: See "Fan-In and Merge" section above.

**Auto Copy**: Automatic stream copying in scenarios requiring stream copying, including one stream fanning out to multiple downstream nodes, one stream entering one or more callback handlers.

Finally, Eino requires all orchestration elements to be able to sense and process streams. Including branch, state handler, callback handler, passthrough, lambda, etc.

For detailed Eino stream handling capabilities, see [Eino Stream Programming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### Global State

**State**: Pass the State creation method through `compose.WithGenLocalState` when NewGraph. This request-level global state can be read and written throughout various stages of a request.

Eino recommends using `StatePreHandler` and `StatePostHandler`, with functionality positioned as:

- StatePreHandler: Read and write State before each node executes, and replace node Input as needed. Input needs to align with node's non-streaming input type.
- StatePostHandler: Read and write State after each node executes, and replace node Output as needed. Input needs to align with node's non-streaming output type.

For streaming scenarios, use the corresponding `StreamStatePreHandler` and `StreamStatePostHandler`, with input needing to align with node's streaming input and streaming output types respectively.

These state handlers are located outside the node, affecting the node through modifications to Input or Output, thus ensuring the node's "state-agnostic" characteristic.

If State needs to be read and written inside the node, Eino provides the `ProcessState[S any](ctx context.Context, handler func(context.Context, S) error) error` function.

Eino framework will lock at all positions where State is read or written.

### Callback Injection

The Eino orchestration framework believes that components entering orchestration may or may not have Callback aspects embedded internally. This information is determined by whether the component implements the `Checker` interface and the return value of the `IsCallbacksEnabled` method in the interface.

- When `IsCallbacksEnabled` returns true, the Eino orchestration framework uses the Callback aspects inside the component implementation.
- Otherwise, automatically wrap Callback aspects outside the component implementation, (can only) report input and output.

Either way, RunInfo will be automatically inferred.

Also, for the Graph as a whole, Callback aspects will definitely be injected, with RunInfo being the Graph itself.

For complete description of Eino's Callback capability, see [Eino: Callback User Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).

### Option Distribution

Eino supports various dimensions of Call Option distribution:

- Default global, i.e., distributed to all nodes, including nested internal graphs.
- Can add Options for a specific component type, which by default distributes to all nodes of that type, such as AddChatModelOption. Lambda with defined unique Option types can also specify Options to itself this way.
- Can specify any specific nodes using `DesignateNode(key ...string)`.
- Can specify nested graphs of any depth, or any specific nodes within them, using `DesignateNodeWithPath(path ...*NodePath)`.

For complete description of Eino's Call Option capability, see [Eino: CallOption Capabilities and Specifications](/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities).

### Graph Nesting

Graph orchestration product `Runnable` has a very similar interface form to Lambda. Therefore, a compiled graph can be simply wrapped as Lambda and nested into other graphs as a Lambda node.

Another way, before compilation, Graph, Chain, Workflow, etc. can all be directly nested into other graphs through AddGraph. The differences between the two methods are:

- Lambda method, there will be an extra Lambda node level in trace. Other Callback handler perspectives will also see an extra layer.
- Lambda method, needs to use Lambda's Option to accept CallOption, cannot use DesignateNodeWithPath.
- Lambda method, internal graph needs to be compiled first. AddGraph directly, internal graph compiles together with parent graph.

## Internal Mechanisms

### Execution Sequence

Taking an InvokableLambda (input is string, output is int) with StatePreHandler, StatePostHandler, InputKey, OutputKey added, and no Callback aspects implemented internally as an example, the complete streaming execution sequence in the graph is as follows:

<a href="/img/eino/graph_node_run_wrapper.png" target="_blank"><img src="/img/eino/graph_node_run_wrapper.png" width="100%" /></a>

In workflow scenarios, field mapping occurs at two positions:

- After StatePostHandler and "stream copy" step after node execution, fields needed by each downstream are extracted separately.
- After "merge" step before node execution, before StatePreHandler, extracted upstream field values are converted to current node's input.

### Execution Engine

When `NodeTriggerMode == AnyPredecessor`, graph executes with pregel engine, corresponding topological structure is directed cyclic graph. Characteristics are:

- All successor nodes of currently executing one or more nodes, as a SuperStep, execute together. At this point, these new nodes become "current" nodes.
- Supports Branch, supports cycles in graph, but may need to manually add passthrough nodes to ensure nodes in SuperStep meet expectations, as shown:

<a href="/img/eino/graph_steps_in_graph2.png" target="_blank"><img src="/img/eino/graph_steps_in_graph2.png" width="100%" /></a>

In the figure above, Node 4 and Node 5 are placed together for execution by rule, which probably doesn't meet expectations. Need to change to:

<a href="/img/eino/graph_steps_in_graph.png" target="_blank"><img src="/img/eino/graph_steps_in_graph.png" width="100%" /></a>

When `NodeTriggerMode == AllPredecessor`, graph executes with dag engine, corresponding topological structure is directed acyclic graph. Characteristics are:

- Each node has definite predecessor nodes. Only when all predecessor nodes complete does this node have running conditions.
- Doesn't support cycles in graph, because it would break the assumption that "each node has definite predecessor nodes".
- Supports Branch. At runtime, nodes not selected by Branch are marked as skipped, not affecting AllPredecessor semantics.

> 💡
> After setting NodeTriggerMode = AllPredecessor, nodes execute after all predecessors are ready, but not immediately. They still follow SuperStep—running new runnable nodes after a batch of nodes all complete execution.
>
> If you pass compose.WithEagerExecution() during Compile, ready nodes will run immediately.
>
> In Eino v0.4.0 and later versions, setting NodeTriggerMode = AllPredecessor will enable EagerExecution by default.

In summary, pregel mode is flexible and powerful but has additional cognitive burden, dag mode is clear and simple but limited in scenarios. In the Eino framework, Chain is pregel mode, Workflow is dag mode, Graph supports both, allowing users to choose from pregel and dag.
