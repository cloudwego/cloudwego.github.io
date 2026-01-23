---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Eino Streaming Essentials
weight: 4
---

> 💡
> Recommended reading first: [Eino: Overview](/docs/eino/overview) and [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

## Streaming in Orchestration: Overview

<a href="/img/eino/eino_component_runnable.png" target="_blank"><img src="/img/eino/eino_component_runnable.png" width="100%" /></a>

Key factors when orchestrating streaming graphs:

- Which Lambda operators does the component/Lambda offer: choose among Invoke, Stream, Collect, Transform.
- In the topology, do upstream outputs and downstream inputs match (both streaming or both non-streaming)?
- If they don’t match, use streaming helpers:
  - Streaming: wrap `T` into a single-chunk `Stream[T]`.
  - Concat: merge `Stream[T]` into a complete `T`. Each frame in `Stream[T]` is a piece of the final `T`.

## Semantics of Streaming in Eino

- Some components naturally emit frames — partial outputs of the final result — i.e., streaming output. Downstream must concat frames into a complete output. A typical example is an LLM.
- Some components naturally accept frames and can begin meaningful processing before receiving the full input. For example, in a ReAct agent, a branch may decide to call a tool or end execution by inspecting the first frame of the ChatModel’s output.
- Thus, each component may accept non-streaming or streaming input, and produce non-streaming or streaming output.
- Combined, there are four streaming paradigms:

<table>
<tr><td>Function</td><td>Pattern</td><td>Interaction</td><td>Lambda Constructor</td><td>Notes</td></tr>
<tr><td>Invoke</td><td>Non-streaming in, non-streaming out</td><td>Ping-Pong</td><td>compose.InvokableLambda()</td><td></td></tr>
<tr><td>Stream</td><td>Non-streaming in, streaming out</td><td>Server-Streaming</td><td>compose.StreamableLambda()</td><td></td></tr>
<tr><td>Collect</td><td>Streaming in, non-streaming out</td><td>Client-Streaming</td><td>compose.CollectableLambda()</td><td></td></tr>
<tr><td>Transform</td><td>Streaming in, streaming out</td><td>Bidirectional-Streaming</td><td>compose.TransformableLambda()</td><td></td></tr>
</table>

## Streaming at the Single-Component Level

Eino is a "component-first" framework; components can be used independently. Do you need to consider streaming when defining component interfaces? The simple answer is no. The complex answer is "follow real business scenarios".

### Business Semantics of Components

A typical component, such as ChatModel or Retriever, should define its interface according to actual business semantics. If it actually supports a certain streaming paradigm, implement that paradigm. If a certain streaming paradigm has no real business scenario, there's no need to implement it. For example:

- ChatModel: besides `Invoke` (non-streaming), it naturally supports `Stream` (streaming). It therefore implements `Generate` and `Stream`, but `Collect` and `Transform` have no corresponding real business scenarios, so they are not implemented:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
    // other methods omitted...
}
```

- Retriever: besides `Invoke` (non-streaming), the other three streaming paradigms have no real business scenarios, so it only implements `Retrieve`:

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

### Paradigms Supported by Components

<table>
<tr><td>Component</td><td>Invoke</td><td>Stream</td><td>Collect</td><td>Transform</td></tr>
<tr><td>ChatModel</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
<tr><td>ChatTemplate</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Retriever</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Indexer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Embedder</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Loader</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Transformer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Tool</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
</table>

Among official Eino components, only ChatModel and Tool additionally support `Stream`; all other components only support `Invoke`. For component details, see: [[Updating] Eino: Components Abstraction & Implementation](/docs/eino/core_modules/components)

`Collect` and `Transform` paradigms are currently only used in orchestration scenarios.

## Streaming Across Multiple Components (Orchestration)

### Component Streaming Paradigms in Orchestration

When a component is used standalone, its input and output streaming paradigms are fixed and cannot exceed the scope defined by the component interface.

- For example, ChatModel's input can only be non-streaming `[]Message`, and its output can be either non-streaming `Message` or streaming `StreamReader[Message]`, because ChatModel only implements the `Invoke` and `Stream` paradigms.

However, once a component is in an "orchestration" scenario where multiple components are combined, its input and output are no longer fixed, but depend on the "upstream output" and "downstream input" in the orchestration context. Consider a typical ReAct Agent orchestration diagram:

<a href="/img/eino/chatmodel_to_tool.png" target="_blank"><img src="/img/eino/chatmodel_to_tool.png" width="100%" /></a>

In the diagram above, if Tool is a StreamableTool (i.e., output is `StreamReader[Message]`), then Tool → ChatModel could have streaming output. However, ChatModel has no business scenario for accepting streaming input, nor does it have a corresponding interface. At this point, Eino framework automatically provides ChatModel with the ability to accept streaming input:

<a href="/img/eino/chatmodel_tool_loop.png" target="_blank"><img src="/img/eino/chatmodel_tool_loop.png" width="100%" /></a>

The "Concat message stream" above is a capability automatically provided by the Eino framework. Even if it's not a message but any arbitrary `T`, as long as certain conditions are met, Eino framework will automatically perform this `StreamReader[T]` to `T` conversion. The condition is: **In orchestration, when a component's upstream output is `StreamReader[T]`, but the component only provides a business interface with `T` as input, the framework will automatically concat `StreamReader[T]` into `T` before inputting it to the component.**

> 💡
> The process of the framework automatically concatenating `StreamReader[T]` into `T` may require the user to provide a concat function. See [Eino: Orchestration Design Principles](/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles) for the section on "merge frames".

On the other hand, consider an opposite example. Still the ReAct Agent, this time with a more complete orchestration diagram:

<a href="/img/eino/tool_model_react.png" target="_blank"><img src="/img/eino/tool_model_react.png" width="100%" /></a>

In the diagram above, the branch receives the message output from the ChatModel and decides whether to end the agent's current run and output the message directly, or call the Tool and pass the result back to the ChatModel for cyclic processing, based on whether the message contains a tool call. Since this Branch can complete its logic judgment from the first frame of the message stream, we define this Branch with the `Collect` interface, i.e., streaming input, non-streaming output:

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
})
```

ReactAgent has two interfaces, `Generate` and `Stream`, which implement the `Invoke` and `Stream` streaming programming paradigms respectively. When a ReactAgent is called via `Stream`, the ChatModel's output is `StreamReader[Message]`, so the Branch's input is `StreamReader[Message]`, which matches the function signature definition of this Branch condition, and can run without any conversion.

However, when this ReactAgent is called via `Generate`, the ChatModel's output is `Message`, so the Branch's input would also be `Message`, which does not match the `StreamReader[Message]` function signature definition of the Branch Condition. At this point, the Eino framework will automatically box `Message` into `StreamReader[Message]` and pass it to the Branch, and this StreamReader will only have one frame.

> 💡
> This kind of stream with only one frame is colloquially called a "pseudo-stream", because it doesn't bring the actual benefit of streaming, which is "low first-packet latency", but is simply boxed to meet the streaming input/output interface signature requirements.

In summary: **In orchestration, when a component's upstream output is `T`, but the component only provides a business interface with `StreamReader[T]` as input, the framework will automatically box `T` into a single-frame `StreamReader[T]` before inputting it to the component.**

### Streaming Paradigms of Orchestration Aids

The Branch mentioned above is not a component that can be used standalone, but an "orchestration aid" that only makes sense in orchestration scenarios. Similar "components" that are only meaningful in orchestration scenarios include:

<table>
<tr><td>Element</td><td>Use Case</td><td>Invoke</td><td>Stream</td><td>Collect</td><td>Transform</td></tr>
<tr><td>Branch</td><td>Dynamically select one from a set of downstream Nodes based on upstream output<li>If decision can only be made after receiving complete input → implement Invoke</li><li>If decision can be made after receiving partial frames → implement Collect</li><li>Only one can be implemented</li></td><td>yes</td><td>no</td><td>yes</td><td>no</td></tr>
<tr><td>StatePreHandler</td><td>Modify State and/or Input before entering a Node in Graph. Supports streaming.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>StatePostHandler</td><td>Modify State and/or Output after a Node completes in Graph. Supports streaming.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Passthrough</td><td>In parallel scenarios, to balance the number of Nodes in each parallel branch, Passthrough nodes can be added to branches with fewer Nodes. Passthrough node's input and output are the same, following the upstream node's output or downstream node's input (expected to be the same).</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Lambda</td><td>Encapsulate business logic not defined by official components. Choose the corresponding streaming paradigm based on which paradigm the business logic is.</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr>
</table>

Additionally, there's another type of "component" that only makes sense in orchestration scenarios: treating orchestration artifacts as a whole, such as compiled Chain, Graph. These overall orchestration artifacts can be called as "components" standalone, or added as nodes to higher-level orchestration artifacts.

## Streaming at Orchestration Level (Whole Graph)

### "Business" Paradigms of Orchestration Artifacts

Since overall orchestration artifacts can be viewed as "components", from a component perspective we can ask: do orchestration artifact "components" have interface paradigms that match "business scenarios" like ChatModel and other components? The answer is both "yes" and "no".

- "No": Overall, Graph, Chain and other orchestration artifacts have no business attributes themselves, they only serve abstract orchestration, so there are no interface paradigms that match business scenarios. At the same time, orchestration needs to support various paradigm business scenarios. Therefore, the `Runnable[I, O]` interface representing orchestration artifacts in Eino makes no choice and cannot choose, providing methods for all streaming paradigms:

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

- "Yes": Specifically, a particular Graph or Chain must carry specific business logic, so there must be streaming paradigms suitable for that specific business scenario. For example, a Graph similar to ReactAgent matches the business scenarios of `Invoke` and `Stream`, so the logical calling methods for this Graph are `Invoke` and `Stream`. Although the orchestration artifact interface `Runnable[I, O]` itself has `Collect` and `Transform` methods, normal business scenarios don't need to use them.

### Runtime Paradigms of Components Inside Orchestration Artifacts

From another perspective, since orchestration artifacts as a whole can be viewed as "components", "components" must have their own internal implementation. For example, the internal implementation logic of ChatModel might be to convert the input `[]Message` into API requests for various models, then call the model's API, and convert the response into the output `Message`. By analogy, what is the internal implementation of the Graph "component"? It's data flowing among the various components inside the Graph in the user-specified flow direction and streaming paradigms. "Flow direction" is not within the current discussion scope, while the streaming paradigms of each component at runtime are determined by the overall triggering method of the Graph. Specifically:

If the user calls the Graph via **Invoke**, all internal components are called with the `Invoke` paradigm. If a component does not implement the `Invoke` paradigm, the Eino framework automatically wraps the `Invoke` calling paradigm based on the streaming paradigms the component has implemented, with the following priority:

- If the component implements `Stream`, wrap `Stream` as `Invoke`, i.e., automatically concat the output stream.

<a href="/img/eino/invoke_outside_stream_inside.png" target="_blank"><img src="/img/eino/invoke_outside_stream_inside.png" width="100%" /></a>

- Otherwise, if the component implements `Collect`, wrap `Collect` as `Invoke`, i.e., convert non-streaming input to single-frame stream.

<a href="/img/eino/invoke_outside_collect_inside.png" target="_blank"><img src="/img/eino/invoke_outside_collect_inside.png" width="100%" /></a>

- If neither is implemented, the component must implement `Transform`, wrap `Transform` as `Invoke`, i.e., convert input to single-frame stream and concat output.

<a href="/img/eino/invoke_outside_transform_inside.png" target="_blank"><img src="/img/eino/invoke_outside_transform_inside.png" width="100%" /></a>

If the user calls the Graph via **Stream/Collect/Transform**, all internal components are called with the `Transform` paradigm. If a component does not implement the `Transform` paradigm, the Eino framework automatically wraps the `Transform` calling paradigm based on the streaming paradigms the component has implemented, with the following priority:

- If the component implements `Stream`, wrap `Stream` as `Transform`, i.e., automatically concat the input stream.

<a href="/img/eino/transform_inside_stream_inside.png" target="_blank"><img src="/img/eino/transform_inside_stream_inside.png" width="100%" /></a>

- Otherwise, if the component implements `Collect`, wrap `Collect` as `Transform`, i.e., convert non-streaming output to single-frame stream.

<a href="/img/eino/transform_outside_stream_inside.png" target="_blank"><img src="/img/eino/transform_outside_stream_inside.png" width="100%" /></a>

- If neither is implemented, the component must implement `Invoke`, wrap `Invoke` as `Transform`, i.e., concat input stream and convert output to single-frame stream.

<a href="/img/eino/transform_outside_invoke_inside.png" target="_blank"><img src="/img/eino/transform_outside_invoke_inside.png" width="100%" /></a>

Combining the various cases enumerated above, Eino framework's automatic conversion between `T` and `Stream[T]` can be summarized as:

- **T -> Stream[T]: Box the complete `T` into a single-frame `Stream[T]`. Non-streaming becomes pseudo-streaming.**
- **Stream[T] -> T: Concat `Stream[T]` into a complete `T`. When `Stream[T]` is not a single-frame stream, a concat method for `T` may need to be provided.**

After seeing the implementation principles above, you might have questions: why does calling `Invoke` on a graph require all internal components to be called with `Invoke`? And why does calling `Stream/Collect/Transform` on a graph require all internal components to be called with `Transform`? After all, some counterexamples can be given:

- Components A and B are orchestrated into a Chain, called with `Invoke`. A's business interface implements `Stream`, B's business interface implements `Collect`. At this point, there are two choices for the calling paradigm of internal components in the graph:
  - A is called with `Stream`, B is called with `Collect`, the overall Chain still has `Invoke` semantics, while preserving true streaming internal semantics. That is, A's output stream doesn't need to be concatenated and can be input to B in real-time.
  - Current Eino implementation: A and B are both called with `Invoke`, requiring A's output stream to be concatenated and B's input to be made into a pseudo-stream. True streaming internal semantics are lost.
- Components A and B are orchestrated into a Chain, called with `Collect`. A implements `Transform` and `Collect`, B implements `Invoke`. Two choices:
  - A is called with `Collect`, B is called with `Invoke`: the overall still has `Collect` semantics, no automatic conversion or boxing operations are needed by the framework.
  - Current Eino implementation: A and B are both called with `Transform`. Since A's business interface implements `Transform`, both A's output and B's input could be true streaming, but B's business interface only implements `Invoke`. According to the analysis above, B's input will need to be concatenated from true streaming to non-streaming. At this point, the user needs to additionally provide a concat function for B's input, which could have been avoided.

The two examples above can both find a clear, different from Eino's convention, but better streaming call path. However, when generalized to arbitrary orchestration scenarios, it's difficult to find a clearly defined, different from Eino's convention, yet always better universal rule. For example, A->B->C, called with `Collect` semantics, should `Collect` happen at A->B or B->C? Potential factors include the business interfaces specifically implemented by A, B, C, possibly the judgment of "use true streaming as much as possible", and maybe which parameters implement `Concat` and which don't. If it's a more complex Graph, the factors to consider will increase rapidly. In this situation, even if the framework can define a clear, better universal rule, it would be hard to explain clearly, and the understanding and usage cost would be high, likely already exceeding the actual benefit brought by this new rule.

In summary, we can say that the runtime paradigms of components inside Eino orchestration artifacts are **By Design**, clearly as follows:

- **Called with `Invoke` overall, all internal components are called with `Invoke`, there is no streaming process.**
- **Called with `Stream/Collect/Transform` overall, all internal components are called with `Transform`. When `Stream[T] -> T` concat process occurs, a concat function for `T` may need to be additionally provided.**
