---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: 'Eino: The design concept of orchestration'
weight: 0
---

In the LLM application orchestration solutions, the most popular ones are langchain and langgraph, which officially provide SDKs for Python and TypeScript. These two languages are known for their flexibility, which brings great convenience to SDK development but also causes significant confusion and cognitive burden for SDK users.

As an extremely simple programming language, Golang's defined `static types` are one of the key reasons why it remains straightforward, and Eino maintains this critical characteristic: `defined types` + `compile-time type checking`.

## Basic Principle of `Type Alignment` in Upstream and Downstream

The most fundamental orchestration method in eino is the graph, along with the simplified wrapped chain. Regardless of the orchestration method, it essentially consists of `logical nodes` + `upstream and downstream relationships`. At runtime, the product of the orchestration starts from one logical node and then proceeds to run the next node that is connected to the current node.

This entails a basic assumption: **the output value of the previous node can serve as the input value for the next node.**

In Golang, there are two basic approaches to achieving this assumption:

1. Convert the input and output of different nodes into a more generalized type, such as `any` or `map[string]any`.
   1. Adopting the approach to generalize into any, but the corresponding cost is that developers need to explicitly convert it into a specific type when writing code to use it. This significantly increases the mental burden on developers, hence this approach was ultimately abandoned.
   2. The langchain approach can be seen as passing `map[string]any` throughout the process, where each logical node retrieves the corresponding value with the corresponding key based on its needs. In langchaingo's implementation, this approach is adopted. However, in Golang, they still need to be used with `type assertions`. This approach still imposes a significant mental burden on the developer.
2. Keep the input and output types of each node as expected by the developer, ensuring type consistency between upstream and downstream during the Compile phase.

Approach 2 is the final approach selected by eino. This approach is the easiest to understand during orchestration. The whole process is like `building blocks`, where the protruding and recessed parts of each block have their own specifications, and only matching specifications can form upstream and downstream relationships.

As shown in the diagram below:

<a href="/img/eino/en_eino_parallel_type.png" target="_blank"><img src="/img/eino/en_eino_parallel_type.png" width="100%" /></a>

For orchestration, it can only run properly if the downstream can recognize and process the upstream output. This basic assumption is clearly expressed in eino, allowing developers to be confident and clear about how orchestration logic operates and flows when using eino, rather than guessing whether the passed values are correct from a series of any.

### **Type Alignment in Graph**

#### **Edge**

In a graph, the output of a node will flow to the next node along an `edge`, so the nodes connected by an edge must have type alignment.

As shown in the figure below:

> This is a scenario simulating ① Direct conversation with a LLM ② Using RAG mode, and the final results can be used to compare the effects of the two modes

<a href="/img/eino/en_eino_graph_node_type.png" target="_blank"><img src="/img/eino/en_eino_graph_node_type.png" width="100%" /></a>

The green part in the figure represents the ordinary edge connection, which requires that the upstream output must be able to be `assigned` downstream, and the types that can be accepted are:

① The same type for both upstream and downstream: For example, the upstream output is *schema.Message, and the downstream input is also *schema.Message.

② The downstream accepts an interface, and the upstream implements that interface: For example, the upstream structure implements the Format() interface, and the downstream accepts an interface{ Format() }. A special situation is when the downstream is any (empty interface), the upstream definitely implements any, so they can certainly connect.

③ The upstream is an interface, and the downstream is a specific type: When the downstream specific type implements the upstream's interface type, it may or may not work, which cannot be determined at compile time, only at runtime when the explicit type of upstream is determined. For detailed description, see: [Eino: The design concept of orchestration](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

The yellow part in the figure represents another type conversion mechanism provided by eino, that is: if downstream receives a type `map[string]any`, but the upstream output type is not map[string]any, you can use `graph.AddXXXNode(node_key, xxx, compose.WithOutputKey("outkey")` to convert the upstream output type to map[string]any, where the key of the map is the OutputKey specified in the option. This mechanism is generally convenient to use when multiple edges converge to a single node.

#### **Branch**

If a node is connected to multiple edges, the downstream nodes of each edge will run once. Branch is another mechanism: a branch followed by n nodes will only run the node corresponding to the key returned by the condition. The nodes following the same branch must also be type aligned.

As shown in the figure below:

> This is a scenario simulating the running logic of a react agent

<a href="/img/eino/en_eino_react_agent_graph.png" target="_blank"><img src="/img/eino/en_eino_react_agent_graph.png" width="100%" /></a>

You can see that a branch itself has a `condition`, the input of this function must be type aligned with the upstream. At the same time, the nodes following the branch must also be able to receive the upstream's output just like the condition.

### Type Alignment in Chains

#### **Chain**

From an abstract perspective, a chain is a `sequence`, as shown below:

<a href="/img/eino/en_chain_abstract_perspective.png" target="_blank"><img src="/img/eino/en_chain_abstract_perspective.png" width="100%" /></a>

The types of logical nodes can be divided into three categories:

- Orchestrable components (e.g., chat model, chat template, retriever, lambda, graph, etc.)
- Branch nodes
- Parallel nodes

As can be seen, from the perspective of a chain, whether it is a simple node (e.g., chat model) or a complex node (e.g., graph, branch, parallel), they are treated the same. During execution, each step corresponds to the execution of a node.

Therefore, the types of upstream and downstream nodes in a chain must be aligned, as shown below:

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

The logic above can be represented by the following diagram:

<a href="/img/eino/nodes_type_validate.png" target="_blank"><img src="/img/eino/nodes_type_validate.png" width="100%" /></a>

If the types of upstream and downstream nodes are not aligned, the chain will return an error during chain.Compile(). In contrast, the graph will report an error when calling graph.AddXXXNode().

#### parallel

Parallel is a special type of node within a chain. From the perspective of the chain, a parallel node is no different from other nodes. Internally, the basic topology of a parallel node is as follows:

<a href="/img/eino/en_eino_type_in_parallel.png" target="_blank"><img src="/img/eino/en_eino_type_in_parallel.png" width="100%" /></a>

One structure formed by multiple edges in the graph is illustrated here. The basic assumption is that there is exactly one node on each edge of a parallel node. Of course, that one node can also be a graph. However, note that the current framework does not directly provide the capability to nest branch or parallel within a parallel node.

Each node within a parallel node has the same upstream node, and thus they must align with the output type of the upstream node. For example, if the upstream node outputs `*schema.Message` as shown in the diagram, then each node must be able to receive this type. The receiving method is consistent with that in the graph, typically using `same type`, `interface definition`, `any`, or `input key option`.

The output of a parallel node is always a `map[string]any`, where the key is specified as output_key when calling `parallel.AddXXX(output_key, xxx, opts...)`, and the value is the actual output of the node.

An example of constructing a parallel node is as follows:

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

A parallel node from the perspective of a chain looks like this:

> The diagram simulates the same question being answered by different LLMs. The results can be used for comparison.

<a href="/img/eino/en_chain_inner_nodes.png" target="_blank"><img src="/img/eino/en_chain_inner_nodes.png" width="100%" /></a>

> It is important to note that this structure is only a logical perspective. Since the chain itself is also implemented using a graph, the parallel node will be spread out in the underlying graph.

#### branch

The branch in a chain is similar to the branch in a graph; all nodes in the branch must be aligned with the type of upstream nodes. This will not be elaborated further here. The special nature of a chain branch is that all possible branch nodes in the branch will either connect to the same node in the chain or all connect to END.

### Type Alignment in Workflow

The dimensions of type alignment in Workflow have been changed from the overall Input & Output to the field level. Specifically, it can be divided into:

- The overall output of the upstream is type-aligned to a specific field downstream.
- A specific field of upstream output is type-aligned to the overall downstream.
- A specific field of upstream output is type-aligned to a specific field of downstream input.

The principles and rules are the same as for overall type alignment.

### **Alignment of Types under invoke and stream**

In Eino, the result of orchestration is either a graph or a chain. To execute it, you need to use `Compile()` to generate a `Runnable` interface.

One important function of Runnable is to provide four calling methods: "Invoke", "Stream", "Collect", and "Transform".

> You can check the introduction of the above calling methods and detailed runnable introduction in: [Eino: Overview](/docs/eino/overview)

Suppose we have a `Graph[[]*schema.Message, []*schema.Message]`, which contains a ChatModel node and a Lambda node. After compiling, it becomes a `Runnable[[]*schema.Message, []*schema.Message]`.

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

When we call the compiled Runnable in Stream mode, the model node outputs `*schema.StreamReader[*Message]`, but the lambda node is an InvokableLambda that only accepts non-streaming `*schema.Message` as input. This complies with the type alignment rule because the Eino framework automatically concatenates streaming Messages into a complete Message.

In stream mode, concatenating frames is a very common operation. During concatenation, all elements from `*StreamReader[T]` are first extracted and converted into `[]T`, and then an attempt is made to concatenate `[]T` into a complete `T`. The framework has built-in support for concatenating the following types:

- `*schema.Message`: See `schema.ConcatMessages()` for details
- `string`: The implementation logic is equivalent to `+=`
- `[]*schema.Message`: See `compose.concatMessageArray()` for details
- `Map`: Merge values with the same key; the merging logic is the same as above. If there is an un-combinable type, it fails (ps: it is not overwritten)
- `Struct` or `Struct pointer`: First converted into `[]map[string]any`, then merged according to the map logic. The struct must not contain unexported fields.
- Other slices: Can only be merged if there is exactly one non-zero value element in the slice.

For other scenarios, or when users want to override the default behavior with custom logic, developers can implement their own concat method and register it to the global concatenation function using `compose.RegisterStreamChunkConcatFunc()`.

Here is an example:

```go
// Suppose our own structure is as follows
type tStreamConcatItemForTest struct {
    s string
}

// Implement a splicing method
func concatTStreamForTest(items []*tStreamConcatItemForTest) (*tStreamConcatItemForTest, error) {
    var s string
    for _, item := range items {
        s += item.s
    }

    return &tStreamConcatItemForTest{s: s}, nil
}

func Init() {
    // Register in the global splicing method
    compose.RegisterStreamChunkConcatFunc(concatTStreamForTest)
}
```

### **Runtime Type Alignment Check Scenarios**

Eino's Graph type alignment check will verify if the types of the two nodes match during `err = graph.AddEdge("node1", "node2")`. This allows for type mismatch errors to be identified either during the `graph construction process` or the `Compile process`, adhering to rules ①②③ as listed in [Eino: The design concept of orchestration](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles).

When the upstream node's output is an `interface`, and the downstream node type implements that `interface`, it is likely that upstream can be converted to downstream type (type assertion). However, whether the conversion succeeds can only be determined during the `runtime process`, so type checks in this scenario are deferred to runtime.

The structure is shown in the diagram below:

<a href="/img/eino/en_eino_graph_parallel_node_type.png" target="_blank"><img src="/img/eino/en_eino_graph_parallel_node_type.png" width="100%" /></a>

This scenario is suitable for developers who can handle upstream and downstream type alignment on their own and choose the appropriate downstream execution nodes based on different types.# User Manual for Eino

## Opinionated **Design Choices**

### Principle of Read-Only External Variables

When data in Eino's Graph flows among Nodes, Branches, and Handlers, it is always variable assignment, not copying. When the Input is of a reference type, such as a Struct pointer, map, or slice, modifying the Input inside Nodes, Branches, or Handlers will have side effects on the outside and may lead to concurrency issues. Therefore, Eino follows the principle of read-only external variables: do not modify the Input inside Nodes, Branches, or Handlers. If modification is required, make a copy first.

This principle also applies to Chunks in the StreamReader.

### **Fan-In and Merging**

**Fan-in**: Outputs from multiple predecessor nodes converge to a successor node and together serve as the input for the successor node. It is necessary to clearly define how the outputs of multiple predecessor nodes are **merged**. Eino's choice is as follows. First, it requires that the **actual types** of the outputs of multiple predecessor nodes must be the same Map type, and the keys among them must not be repeated. Second:

- In non-streaming scenarios, after merging, it becomes a single map that contains all key-value pairs from all upstream sources.
- In streaming scenarios, multiple upstream StreamReaders of the same type are merged into one StreamReader. When actually receiving data from the merged StreamReader, the effect is to read fairly from multiple upstream StreamReaders.

Workflow can map the output fields of multiple predecessor nodes to different input fields of the successor node. Eino converts the Struct output from each predecessor to a Map before any merge process, still conforming to the above rules.

### **Streaming Processing**

Eino believes that components should only need to implement genuine streaming paradigms from the business scenario. For example, a ChatModel does not need to implement Collect. Therefore, in orchestration scenarios, Eino automatically completes the **missing streaming paradigms** for all nodes.

When running a Graph via Invoke, all internal nodes operate in Invoke mode. When running a Graph via Stream, Collect, or Transform, all internal nodes operate in Transform mode.

**Auto Concatenate**: In scenarios where Stream chunks are concatenated into complete content, the user-defined concatenation function registered by the user is preferred. Otherwise, default behaviors provided by the framework are performed, including Message, Message arrays, String, Map, and Struct/Struct pointers.

**Auto Boxing**: In scenarios requiring the conversion of non-stream type T to StreamReader[T], the framework automates the process.

**Auto Merge**: See the above section on "Fan-In and Merging."

**Auto Copy**: In scenarios requiring the replication of streams, the framework automatically handles stream copying, including instances where a single stream fans out to multiple downstream nodes, or a single stream enters one or more callback handlers.

Finally, Eino requires all orchestration elements to be aware of and capable of handling streams. This includes branches, state handlers, callback handlers, passthroughs, lambdas, etc.

For more details on Eino's streaming capabilities, refer to [Eino Points of Streaming Orchestration](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### **Global State**

**State**: In NewGraph, pass in the creation method of State through `compose.WithGenLocalState`. This globally scoped state at the request level can be read from and written to during various stages of a single request.

Eino recommends using `StatePreHandler` and `StatePostHandler`:

- StatePreHandler: Before the execution of each node, read from and write to State. Replace the node's input as needed.
- StatePostHandler: After the execution of each node, read from and write to State. Replace the node's output as needed.

For streaming scenarios, use the corresponding `StreamStatePreHandler` and `StreamStatePostHandler`.

These state handlers are located outside the nodes and affect the nodes by modifying the Input or Output, thus ensuring the "stateless" property of the nodes.

If you need to read from and write to State inside the nodes, Eino provides the `ProcessState[S any](ctx context.Context, handler func(context.Context, S) error) error` function.

The Eino framework will add locks at all positions where the State is read from or written to.

### **Callback Injection**

Eino's orchestration framework considers that components entering the orchestration might have internally embedded Callback aspects or might not. This information is determined by whether the component implements the `Checker` interface and the return value of the `IsCallbacksEnabled` method in the interface.

- When `IsCallbacksEnabled` returns true, Eino's orchestration framework uses the component's internally implemented Callback aspects.
- Otherwise, it automatically wraps the component implementation with external Callback aspects, (only) reporting input and output.

In either case, RunInfo will be automatically inferred.

Additionally, for the Graph as a whole, Callback aspects will always be injected, with RunInfo being the Graph itself.

For a complete explanation of Eino's Callback capabilities, see [Eino: Callback Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).

### **Option Allocation**

Eino supports various dimensions of Call Option allocation methods:

- Default global allocation, i.e., allocated to all nodes, including nested internal graphs.
- An option can be added to a specific component type, in which case it is by default allocated to all nodes of that type, such as AddChatModelOption. Lambdas that have defined unique Option types can also specify the Option for themselves in this way.
- Any specific nodes can be designated using `DesignateNode(key ...string)`.
- Any depth of nested graphs, or any specific nodes within them, can be designated using `DesignateNodeWithPath(path ...*NodePath)`.

For a complete explanation of Eino's Call Option capabilities, see [Eino: CallOption capabilities and specification](/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities).

### **Graph Nesting**

The outcome of graph orchestration, `Runnable`, is very similar in interface form to Lambda. Therefore, a compiled graph can be simply encapsulated as a Lambda and nested into other graphs as a Lambda node.

Another way is that, before compilation, Graph, Chain, Workflow, etc., can be nested directly into other graphs using AddGraph. The differences between the two methods are:

- The Lambda method adds an additional Lambda node in the trace. From the perspective of other Callback handlers, there will also be an additional layer.
- The Lambda method requires using the Lambda's Option to inherit CallOption and cannot use DesignateNodeWithPath.
- The Lambda method requires the internal graph to be precompiled. Directly using AddGraph allows the internal graph to be compiled together with the parent graph.

## **Internal Mechanism**

### **Execution Sequence**

Taking an InvokableLambda (input as string, output as int) with StatePreHandler, StatePostHandler, InputKey, OutputKey added, and no Callback aspect implemented internally as an example, the complete flow execution sequence in the diagram is as follows:

<a href="/img/eino/en_eino_callbacks.png" target="_blank"><img src="/img/eino/en_eino_callbacks.png" width="100%" /></a>

In the workflow scenario, field mapping occurs in two places:

- After the node execution's StatePostHandler and the "stream replication" step, each downstream-required field will be separately extracted.
- After the "merge" step before node execution, and before StatePreHandler, the extracted upstream field values will be converted to the current node's input.

### **Runtime Engine**

When `NodeTriggerMode == AnyPredecessor`, the graph executes using the pregel engine, corresponding to a directed graph with cycles. Characteristics include:

- One or more currently executing nodes' all subsequent nodes collectively execute as a SuperStep. At this time, these new nodes become the "current" nodes.
- Supports Branch, supports loops in the graph, but it may require manually adding passthrough nodes to ensure SuperStep nodes meet expectations, as illustrated below:

<a href="/img/eino/en_eino_run_steps.png" target="_blank"><img src="/img/eino/en_eino_run_steps.png" width="100%" /></a>

In the above image, Node 4 and Node 5 are executed together as per rules, which likely does not meet expectations. It needs to be changed to:

<a href="/img/eino/graph_steps_in_graph.png" target="_blank"><img src="/img/eino/graph_steps_in_graph.png" width="100%" /></a>

When `NodeTriggerMode == AllPredecessor`, the graph executes using the dag engine, corresponding to a directed acyclic graph. Characteristics include:

- Each node has a specific predecessor node, and this node is only executable once all predecessor nodes are complete.
- An eager mode can be selected, where there is no SuperStep concept. Each node, upon completion, immediately checks which subsequent nodes can be run and executes them at the earliest time.
- Does not support Branch, does not support cycles in the graph, as it breaks the "each node has a specific predecessor node" assumption.
- No need for manual SuperStep alignment.

In summary, the pregel mode is flexible and powerful but comes with additional mental overhead, while the dag mode is clear and simple but limited in application scenarios. In the Eino framework, Chain uses the pregel mode, Workflow uses the dag mode, and Graph supports both; users can choose between pregel and dag.
