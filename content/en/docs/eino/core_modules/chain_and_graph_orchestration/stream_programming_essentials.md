---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Eino Streaming Essentials
weight: 4
---

> 💡
> Recommended reading first: [Eino: Overview](/en/docs/eino/overview) and [Eino: Orchestration Design Principles](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

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

Eino is a “component-first” framework; components can be used independently. When defining component interfaces, streaming is guided by real business semantics.

### Business Semantics of Components

- ChatModel: besides `Invoke` (non-streaming), it naturally supports `Stream` (streaming). It therefore implements `Generate` and `Stream`, but not `Collect` or `Transform`:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
    // other methods omitted...
}
```

- Retriever: only `Invoke` has real use; the other paradigms don’t fit typical scenarios, so it exposes just `Retrieve`:

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

### Which Paradigms Components Implement

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

Official Eino components: only `ChatModel` and `Tool` also support `Stream`; all others support `Invoke` only. See: [Eino: Components](/en/docs/eino/core_modules/components)

`Collect` and `Transform` are generally useful only within orchestration.

## Streaming Across Multiple Components (Orchestration)

### Component Paradigms in Orchestration

Standalone, a component’s input/output are fixed by its interface. For example:

- ChatModel inputs non-streaming `[]Message` and outputs either non-streaming `Message` or streaming `StreamReader[Message]`.

In orchestration, inputs/outputs depend on upstream/downstream. Consider a typical ReAct agent:

<a href="/img/eino/chatmodel_to_tool.png" target="_blank"><img src="/img/eino/chatmodel_to_tool.png" width="100%" /></a>

If the Tool is `StreamableTool` (output is `StreamReader[Message]`), then Tool → ChatModel may be streaming. However, ChatModel does not accept streaming input. Eino automatically bridges this by concatenating streams into non-streaming input:

<a href="/img/eino/chatmodel_tool_loop.png" target="_blank"><img src="/img/eino/chatmodel_tool_loop.png" width="100%" /></a>

Eino’s automatic `StreamReader[T] → T` conversion applies whenever a component expects `T` but upstream produces `StreamReader[T]`. You may need to provide a custom concat function for `T`.

> 💡
> The `StreamReader[T] → T` conversion may require a user-provided concat function. See [Orchestration Design Principles](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles) under “merge frames”.

Conversely, consider another ReAct diagram:

<a href="/img/eino/tool_model_react.png" target="_blank"><img src="/img/eino/tool_model_react.png" width="100%" /></a>

Here, `branch` reads the ChatModel’s output and decides whether to end or call a tool. Since `branch` can decide from the first frame, define it with `Collect` (streaming in, non-streaming out):

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

If the agent is invoked via `Stream`, ChatModel outputs `StreamReader[Message]`, matching the branch’s input.

If the agent is invoked via `Generate`, ChatModel outputs `Message`. Eino automatically wraps `Message` into a single-frame `StreamReader[Message]` (pseudo-stream) to match the branch.

Summary: **When upstream outputs `T` but downstream expects `StreamReader[T]`, Eino wraps `T` into a single-frame `StreamReader[T]`.**

### Streaming Paradigms of Orchestration Aids

`Branch` is an orchestration-only aid, not a standalone component. Others include:

<table>
<tr><td>Element</td><td>Use Case</td><td>Invoke</td><td>Stream</td><td>Collect</td><td>Transform</td></tr>
<tr><td>Branch</td><td>Select a downstream node dynamically based on upstream output<li>If decision requires full input → Invoke</li><li>If decision can be made from early frames → Collect</li><li>Implement exactly one</li></td><td>yes</td><td>no</td><td>yes</td><td>no</td></tr>
<tr><td>StatePreHandler</td><td>Modify State/Input before entering a node. Streaming-friendly.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>StatePostHandler</td><td>Modify State/Output after a node. Streaming-friendly.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Passthrough</td><td>Balance node counts across parallel branches by inserting passthroughs. Input equals output.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Lambda</td><td>Encapsulate custom business logic; implement the paradigm that matches your logic.</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr>
</table>

Orchestration artifacts (compiled Chain/Graph) can be treated as components themselves — used standalone or as nodes within higher-level orchestration.

## Streaming at Orchestration Level (Whole Graph)

### “Business” Paradigms of Orchestration Artifacts

As a component, a compiled artifact has no business semantics — it serves orchestration. It must support all paradigms:

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

For a specific compiled graph, the correct paradigm depends on its business scenario. A ReAct-like graph typically fits `Invoke` and `Stream`.

### Runtime Paradigms of Components Inside a Compiled Graph

Viewed as a “component”, a compiled Graph’s internal implementation is data flowing among its nodes according to your specified flow direction and streaming paradigms. Flow direction is out of scope here; runtime paradigms are determined by how the Graph is triggered.

When you call a compiled graph via **Invoke**, all internal components run in the `Invoke` paradigm. If a component does not implement `Invoke`, Eino wraps it using the first available option:

- If `Stream` exists, wrap `Stream` as `Invoke` by concatenating the output stream.

<a href="/img/eino/invoke_outside_stream_inside.png" target="_blank"><img src="/img/eino/invoke_outside_stream_inside.png" width="100%" /></a>

- Else if `Collect` exists, wrap `Collect` as `Invoke` by boxing non-streaming input into a single-frame stream.

<a href="/img/eino/invoke_outside_collect_inside.png" target="_blank"><img src="/img/eino/invoke_outside_collect_inside.png" width="100%" /></a>

- Else use `Transform`, wrapping it as `Invoke` by boxing input into a single-frame stream and concatenating the output stream.

<a href="/img/eino/invoke_outside_transform_inside.png" target="_blank"><img src="/img/eino/invoke_outside_transform_inside.png" width="100%" /></a>

When you call via **Stream / Collect / Transform**, all internal components run in the `Transform` paradigm. If a component does not implement `Transform`, Eino wraps using the first available option:

- If `Stream` exists, wrap `Stream` as `Transform` by concatenating the input stream.

<a href="/img/eino/transform_inside_stream_inside.png" target="_blank"><img src="/img/eino/transform_inside_stream_inside.png" width="100%" /></a>

- Else if `Collect` exists, wrap `Collect` as `Transform` by boxing non-streaming output into a single-frame stream.

<a href="/img/eino/transform_outside_stream_inside.png" target="_blank"><img src="/img/eino/transform_outside_stream_inside.png" width="100%" /></a>

- Else wrap `Invoke` as `Transform` by concatenating input streams and boxing outputs into single-frame streams.

<a href="/img/eino/transform_outside_invoke_inside.png" target="_blank"><img src="/img/eino/transform_outside_invoke_inside.png" width="100%" /></a>

In summary, Eino’s automatic conversions between `T` and `Stream[T]` are:

- **T → Stream[T]**: box `T` into a single-frame stream (pseudo-stream).
- **Stream[T] → T**: concat the stream into a complete `T`. For non-single-frame streams, you may need to provide a concat function.

You might wonder why a graph-level `Invoke` enforces `Invoke` internally, and `Stream/Collect/Transform` enforces `Transform` internally. Consider these counterexamples:

- Two components A and B composed into a Chain, called via `Invoke`. Suppose A implements `Stream`, B implements `Collect`.
  - Choice 1: A runs as `Stream`, B runs as `Collect`. The overall Chain remains `Invoke` to the caller while preserving true streaming semantics inside (no concat; A’s output stream feeds B in real time).
  - Current Eino behavior: both A and B run as `Invoke`. A’s output stream is concatenated to a full value; B’s input is boxed into a pseudo-stream. True streaming semantics inside are lost.
- Two components A and B composed into a Chain, called via `Collect`. Suppose A implements `Transform` and `Collect`, B implements `Invoke`.
  - Choice 1: A runs as `Collect`, B runs as `Invoke`. The overall remains `Collect` with no automatic conversions or boxing.
  - Current Eino behavior: both A and B run as `Transform`. Since B only implements `Invoke`, its input may require concat from a real stream, potentially needing a user-provided concat function — which could have been avoided.

Generalizing across arbitrary graphs, it’s difficult to define a universal rule that is always better and remains clear. Influencing factors include which paradigms components implement, aiming to maximize true streaming, and whether concat functions exist. For complex graphs, the number of factors grows quickly. Even if a more optimal universal rule exists, it would be hard to explain and use without exceeding the benefit it provides. Eino’s design therefore favors clarity and predictability.

By design:

- **Invoke outside → Invoke inside**: no streaming inside.
- **Stream/Collect/Transform outside → Transform inside**: streaming inside; `Stream[T] → T` may require a concat function.
