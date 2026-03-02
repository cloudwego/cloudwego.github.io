---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: Eino Stream Programming Essentials
weight: 4
---

> 💡
> Recommended reading first: [Eino: Basic Concepts Introduction](/docs/eino/overview) [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

## Overview of Orchestration Streaming

<a href="/img/eino/eino_component_runnable.png" target="_blank"><img src="/img/eino/eino_component_runnable.png" width="100%" /></a>

When orchestrating streaming Graphs, there are several key elements to consider:

- What Lambda operators are included in components/Lambda: Choose from Invoke, Stream, Collect, Transform
- In the orchestration topology, whether upstream and downstream nodes' inputs and outputs are both streams or both non-streams.
- If upstream and downstream nodes' stream types cannot match, two operations are needed:
  - Streaming: Convert T into a single-Chunk Stream[T]
  - Concat: Merge Stream[T] into a complete T. Each "frame" in Stream[T] is part of this complete T.

## The Meaning of Eino Stream Programming

- Some components naturally support outputting in "frames", outputting part of a complete output each time, i.e., "streaming" output. After streaming output is complete, downstream needs to concatenate these "frames" into complete output. A typical example is LLM.
- Some components naturally support inputting in "frames", starting meaningful business processing or even completing business processing when receiving incomplete input. For example, in a react agent, the branch used to determine whether to call a tool or end the run can make a decision from the first frame of the LLM's streaming output by checking whether the message contains a tool call.
- Therefore, a component, from the input perspective, has "non-streaming" input and "streaming" input two types. From the output perspective, has "non-streaming" output and "streaming" output two types.
- Combined, there are four possible streaming programming paradigms

<table>
<tr><td>Function Name</td><td>Mode Description</td><td>Interaction Mode Name</td><td>Lambda Constructor</td><td>Notes</td></tr>
<tr><td>Invoke</td><td>Non-streaming input, non-streaming output</td><td>Ping-Pong Mode</td><td>compose.InvokableLambda()</td><td></td></tr>
<tr><td>Stream</td><td>Non-streaming input, streaming output</td><td>Server-Streaming Mode</td><td>compose.StreamableLambda()</td><td></td></tr>
<tr><td>Collect</td><td>Streaming input, non-streaming output</td><td>Client-Streaming</td><td>compose.CollectableLambda()</td><td></td></tr>
<tr><td>Transform</td><td>Streaming input, streaming output</td><td>Bidirectional-Streaming</td><td>compose.TransformableLambda()</td><td></td></tr>
</table>

## Streaming from Single Component Perspective

Eino is a "component first" framework where components can be used independently. When defining component interfaces, do you need to consider streaming programming issues? The simple answer is no. The complex answer is "based on real business scenarios".

### Component's Own Business Paradigm

A typical component, like Chat Model or Retriever, just needs to define interfaces based on actual business semantics. If it actually supports a certain streaming paradigm, implement that streaming paradigm. If a certain streaming paradigm has no real business scenario, then no need to implement it. For example:

- Chat Model, besides the non-streaming Invoke paradigm, also naturally supports the Stream streaming paradigm, so Chat Model's interface implements both Generate and Stream interfaces. But Collect and Transform have no corresponding real business scenarios, so corresponding interfaces are not implemented:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
    // other methods omitted...
}
```

- Retriever, besides the non-streaming Invoke paradigm, none of the other three streaming paradigms have real business scenarios, so only the Retrieve interface is implemented:

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

### Specific Paradigms Supported by Components

<table>
<tr><td>Component Name</td><td>Implements Invoke</td><td>Implements Stream</td><td>Implements Collect</td><td>Implements Transform</td></tr>
<tr><td>Chat model</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
<tr><td>Chat template</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Retriever</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Indexer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Embedder</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Loader</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Transformer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Tool</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
</table>

Among Eino official components, besides Chat Model and Tool which additionally support stream, all other components only support invoke. For specific component introduction, see: [[Updating] Eino: Components Abstraction & Implementation](/docs/eino/core_modules/components)

Collect and Transform two streaming paradigms are currently only used in orchestration scenarios.

## Streaming from Multiple Component Orchestration Perspective

### Component Streaming Paradigm in Orchestration

A component, when used standalone, has fixed input and output streaming paradigms that cannot exceed the range defined by the component's interface.

- For example, Chat Model's input can only be non-streaming []Message, output can be either non-streaming Message or streaming StreamReader[Message], because Chat Model only implements Invoke and Stream paradigms.

However, once a component is in an "orchestration" scenario where multiple components are used together, its input and output are no longer so fixed, but depend on the "upstream output" and "downstream input" of this component in the orchestration scenario. For example, the typical orchestration diagram of React Agent:

<a href="/img/eino/chatmodel_to_tool.png" target="_blank"><img src="/img/eino/chatmodel_to_tool.png" width="100%" /></a>

In the figure above, if Tool is a StreamableTool, i.e., output is StreamReader[Message], then Tool -> ChatModel could be streaming output. But Chat Model doesn't have a business scenario for receiving streaming input, nor a corresponding interface. At this point, the Eino framework automatically helps ChatModel complete the ability to receive streaming input:

<a href="/img/eino/chatmodel_tool_loop.png" target="_blank"><img src="/img/eino/chatmodel_tool_loop.png" width="100%" /></a>

The Concat message stream above is automatically provided by the Eino framework. Even if it's not message, but any T, as long as specific conditions are met, the Eino framework will automatically do this StreamReader[T] to T conversion. The condition is: **In orchestration, when a component's upstream output is StreamReader[T], but the component only provides a business interface with T as input, the framework will automatically concat StreamReader[T] into T, then input to this component.**

> 💡
> The process of framework automatically concatenating StreamReader[T] into T may require users to provide a Concat function. See the chapter on "merging frames" in [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles#share-FaVnd9E2foy4fAxtbTqcsgq3n5f).

On the other hand, consider an opposite example. Still React Agent, this time a more complete orchestration diagram:

<a href="/img/eino/tool_model_react.png" target="_blank"><img src="/img/eino/tool_model_react.png" width="100%" /></a>

In the figure above, branch receives message output by chat model and, based on whether the message contains tool calls, chooses whether to directly end the agent's current run and output the message, or call Tool and give the call result to Chat Model for loop processing. Since this Branch can complete logic judgment from the first frame of the message stream, we define this Branch with a Collect interface, i.e., streaming input, non-streaming output:

```go
compose.NewStreamGraphBranch(func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (endNode string, err error) {
    msg, err := sr.Recv()
    if err != nil {
       return "", err
    }
    defer sr.Close()

    if len(msg.ToolCalls) == 0 {
       return compose._END_, nil
    }

    return nodeKeyTools, nil
}
```

ReactAgent has two interfaces, Generate and Stream, implementing Invoke and Stream streaming programming paradigms respectively. When a ReactAgent is called with Stream, Chat Model's output is StreamReader[Message], so Branch's input is StreamReader[Message], matching this Branch condition's function signature definition, can run without any conversion.

However, when this ReactAgent is called with Generate, Chat Model's output is Message, so Branch's input will also be Message, not matching Branch Condition's StreamReader[Message] function signature definition. At this point, the Eino framework will automatically box Message into StreamReader[Message], then pass to Branch, and this StreamReader will only have one frame.

> 💡
> This kind of stream with only one frame is commonly called "fake stream", because it doesn't bring the actual benefit of streaming, i.e., "low first packet latency", but is just simple boxing to meet the streaming input/output interface signature requirements.

In summary: **In orchestration, when a component's upstream output is T, but the component only provides a business interface with StreamReader[T] as input, the framework will automatically box T into a single-frame StreamReader[T], then input to this component.**

### Streaming Paradigms of Orchestration Helper Elements

The Branch mentioned above is not a standalone component, but an "orchestration helper element" that only makes sense in orchestration scenarios. There are some similar "components" that only make sense in orchestration scenarios, see the figure below:

<table>
<tr><td>Component Name</td><td>Usage Scenario</td><td>Implements Invoke</td><td>Implements Stream</td><td>Implements Collect</td><td>Implements Transform</td></tr>
<tr><td>Branch</td><td>Dynamically select one from a group of downstream Nodes based on upstream output<li>For cases that can only judge after receiving complete input, implement Invoke</li><li>For cases that can judge after receiving partial frames, implement Collect</li><li>Only one can be implemented</li></td><td>yes</td><td>no</td><td>yes</td><td>no</td></tr>
<tr><td>StatePreHandler</td><td>In Graph, modify State or/and Input before entering Node. Can support streaming.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>StatePostHandler</td><td>In Graph, modify State or/and Output after Node completes. Can support streaming</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Passthrough</td><td>In parallel situations, to flatten the number of Nodes in each parallel branch, can add Passthrough nodes to branches with fewer Nodes. Passthrough node's input and output are the same, following upstream node's output or following downstream node's input (expected to be the same).</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Lambda</td><td>Encapsulate business logic not defined by official components. Whatever paradigm the business logic is, choose the corresponding streaming paradigm to implement.</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr>
</table>

There's another type of "component" that only makes sense in orchestration scenarios, which is viewing orchestration products as a whole, like orchestrated Chain, Graph. These overall orchestration products can be called as "components" standalone, or can be added as nodes to higher-level orchestration products.

## Streaming from Overall Orchestration Perspective

### Orchestration Product's "Business" Paradigm

Since overall orchestration products can be viewed as a "component", from the component perspective we can ask: Does the orchestration product as a "component" have interface paradigms that fit "business scenarios" like Chat Model and other components? The answer is both "yes" and "no".

- "No": Overall, orchestration products like Graph, Chain have no business attributes themselves, only serving abstract orchestration, so there's no interface paradigm matching business scenarios. Also, orchestration needs to support various business scenario paradigms. So, Eino's Runnable[I, O] interface representing orchestration products, without making choices and unable to choose, provides all streaming paradigm methods:

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

- "Yes": Specifically, a specific Graph or Chain must carry specific business logic, so there must be a streaming paradigm suitable for that specific business scenario. For example, a Graph similar to React Agent, matching business scenarios are Invoke and Stream, so the logical calling methods for this Graph are Invoke and Stream. Although the orchestration product's interface Runnable[I, O] has Collect and Transform methods, normal business scenarios don't need to use them.

### Paradigm of Internal Components at Runtime in Orchestration Products

From another perspective, since orchestration products as a whole can be viewed as "components", then "components" must have their own internal implementation. For example, ChatModel's internal implementation logic might be converting input []Message to various model API requests, then calling the model API, and converting the response to output Message. So by analogy, what is Graph as a "component"'s internal implementation? It's data flowing between Graph's internal components in user-specified flow directions and streaming paradigms. Among them, "flow direction" is not within current discussion scope, while each component's streaming paradigm at runtime is determined by Graph's overall trigger method, specifically:

If user calls Graph through **Invoke**, all internal Graph components are called with Invoke paradigm. If a component hasn't implemented Invoke paradigm, Eino framework automatically wraps Invoke calling paradigm based on the streaming paradigm the component has implemented, with priority order as follows:

- If component implements Stream, wrap Stream into Invoke, i.e., automatically concat output stream.

<a href="/img/eino/invoke_outside_stream_inside.png" target="_blank"><img src="/img/eino/invoke_outside_stream_inside.png" width="100%" /></a>

- Otherwise, if component implements Collect, wrap Collect into Invoke, i.e., non-streaming input converts to single-frame stream.

<a href="/img/eino/invoke_outside_collect_inside.png" target="_blank"><img src="/img/eino/invoke_outside_collect_inside.png" width="100%" /></a>

- If neither is implemented, must implement Transform, wrap Transform into Invoke, i.e., input converts to single-frame stream, output concats.

<a href="/img/eino/invoke_outside_transform_inside.png" target="_blank"><img src="/img/eino/invoke_outside_transform_inside.png" width="100%" /></a>

If user calls Graph through **Stream/Collect/Transform**, all internal Graph components are called with Transform paradigm. If a component hasn't implemented Transform paradigm, Eino framework automatically wraps Transform calling paradigm based on the streaming paradigm the component has implemented, with priority order as follows:

- If component implements Stream, wrap Stream into Transform, i.e., automatically concat input stream.

<a href="/img/eino/transform_inside_stream_inside.png" target="_blank"><img src="/img/eino/transform_inside_stream_inside.png" width="100%" /></a>

- Otherwise, if component implements Collect, wrap Collect into Transform, i.e., non-streaming output converts to single-frame stream.

<a href="/img/eino/transform_outside_stream_inside.png" target="_blank"><img src="/img/eino/transform_outside_stream_inside.png" width="100%" /></a>

- If neither is implemented, must implement Invoke, wrap Invoke into Transform, i.e., input stream concats, output converts to single-frame stream

<a href="/img/eino/transform_outside_invoke_inside.png" target="_blank"><img src="/img/eino/transform_outside_invoke_inside.png" width="100%" /></a>

Combining the various cases exhaustively listed above, Eino framework's automatic conversion of T and Stream[T] can be summarized as:

- **T -> Stream[T]: Box complete T into single-frame Stream[T]. Non-streaming becomes fake streaming.**
- **Stream[T] -> T: Concat Stream[T] into complete T. When Stream[T] is not single-frame stream, may need to provide Concat method for T.**

After seeing the above implementation principles, there might be questions about why Invoke on graph requires all internal components to be called with Invoke? And why Stream/Collect/Transform on graph requires all internal components to be called with Transform? After all, counterexamples can be given:

- Two components A, B orchestrated into a Chain, called with Invoke. A's business interface implements Stream, B's business interface implements Collect. At this point, there are two choices for graph internal component calling paradigms:
  - A is called with stream, B is called with collect, the overall Chain still has Invoke semantics, while preserving true streaming internal semantics. I.e., A's output stream doesn't need Concat, can be input to B in real-time.
  - Current Eino implementation, both A and B are called with Invoke, need to Concat A's output stream, and make B's input fake streaming. Loses true streaming internal semantics.
- Two components A, B orchestrated into a Chain, called with Collect. A implements Transform and Collect, B implements Invoke. Two choices:
  - A is called with Collect, B is called with Invoke: overall still has Collect semantics, no need for framework to do any automatic conversion or boxing operations.
  - Current Eino implementation, both A and B are called with Transform. Since A's business interface implements Transform, both A's output and B's input may be true streaming. But B's business interface only implements Invoke, based on above analysis, B's input needs to be concatenated from true streaming to non-streaming. At this point, users need to additionally provide B's input concat function, which could have been avoided.

Both examples above can find a clear, different from Eino's convention, but better streaming calling path. However, when generalized to arbitrary orchestration scenarios, it's hard to find a clearly defined, different from Eino's convention, yet always better universal rule. For example, A->B->C, called with Collect semantics, is it A->B that does Collect, or B->C? Potential factors include specific business interfaces implemented by A, B, C, possibly also "use as much true streaming as possible" judgment, maybe also which parameter implements Concat and which doesn't. For more complex Graphs, factors to consider increase rapidly. In this situation, even if the framework can define a set of clear, better universal rules, it would be hard to explain clearly, understanding and usage costs would be high, likely already exceeding the actual benefits brought by this new rule.

In summary, we can say the paradigm of each component at runtime within Eino orchestration products is **By Design**, specifically:

- **Called overall with Invoke, internal components all called with Invoke, no streaming process exists.**
- **Called overall with Stream/Collect/Transform, internal components all called with Transform. When Stream[T] -> T concat process occurs, may need to additionally provide T's concat function.**
