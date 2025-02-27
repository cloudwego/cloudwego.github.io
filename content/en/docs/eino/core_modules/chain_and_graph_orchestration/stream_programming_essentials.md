---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Eino Points of Streaming Orchestration
weight: 0
---

> 💡
> It is recommended to read: [Eino: Overview](/en/docs/eino/overview) [Eino: The design concept of orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

## **Overview of Streaming Orchestration**

<a href="/img/eino/en_eino_structure.png" target="_blank"><img src="/img/eino/en_eino_structure.png" width="100%" /></a>

When orchestrating a streaming Graph, several key elements need to be considered:

- Which types of Lambda operators are included in the components/Lambda: Choose from Invoke, Stream, Collect, Transform
- In orchestration topology, whether the input and output of upstream and downstream nodes are both streams or both non-streams.
- If the stream types of upstream and downstream nodes do not match, the operations of Streaming and Concat are needed
  - Streaming: Converts T into a Stream[T] with a single Chunk
  - Concat: Merges Stream[T] into a complete T. Each "frame" of Stream[T] is a part of the complete T.

## **Implications of Eino's Streaming Programming**

- Some components naturally support frame-by-frame output, where each output is a part of a complete output parameter, i.e., "streaming" output. After the streaming output is complete, the downstream will need to concatenate (concat) these "frames" into a complete output parameter. A typical example is ChatModel.
- Some components naturally support frame-by-frame input, allowing meaningful business processing to start even with incomplete input parameters, or to complete the business processing cycle. For example, in the react agent used to determine whether to call a tool or end the operation, it can make decisions from the first frame of the LLM's streaming output by checking if the message contains a tool call.
- Therefore, a component can have "non-streaming" input and "streaming" input from the input perspective, and "non-streaming" output and "streaming" output from the output perspective.
- Combining these, there are four possible streaming programming paradigms.

<table>
<tr><td>Function Name</td><td>Pattern Description</td><td>Interactive Mode Name</td><td>Lambda Construction Method</td><td>Description</td></tr>
<tr><td>Invoke</td><td>Non-streaming input, non-streaming output</td><td>Ping-Pong Mode</td><td>compose.InvokableLambda()</td><td></td></tr>
<tr><td>Stream</td><td>Non-streaming input, streaming output</td><td>Server-Streaming Mode</td><td>compose.StreamableLambda()</td><td></td></tr>
<tr><td>Collect</td><td>Streaming input, non-streaming output</td><td>Client-Streaming</td><td>compose.CollectableLambda()</td><td></td></tr>
<tr><td>Transform</td><td>Streaming input, streaming output</td><td>Bidirectional-Streaming</td><td>compose.TransformableLambda()</td><td></td></tr>
</table>

## **Streamlining from the Perspective of Individual Components**

Eino is a "component first" framework, where components can be used independently. When defining component interfaces, should we consider streaming programming? The simple answer is no. The complex answer is "it depends on the real business scenario."

### **Business Paradigm of the Component Itself**

A typical component, such as Chat Model, Retriever, etc., defines interfaces based on the actual business semantics. If it supports a certain streaming paradigm in practice, that paradigm is implemented. If a certain streaming paradigm has no real business scenario, then it does not need to be implemented. For example:

- Chat Model, in addition to the non-streaming paradigm like Invoke, naturally supports the streaming paradigm like Stream. Therefore, within the Chat Model interface, both Generate and Stream interfaces are implemented. However, Collect and Transform do not correspond to a real business scenario, so the corresponding interfaces are not implemented:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
    // other methods omitted...
}
```

- Retriever, in addition to the non-streaming paradigm like Invoke, does not have business scenarios for the other three streaming paradigms, hence only the Retrieve interface is implemented:

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

### **Specific Paradigms Supported by Components**

<table>
<tr><td>Component Name</td><td>Whether Invoke is Implemented</td><td>Whether Stream is Implemented</td><td>Whether Collect is Implemented</td><td>Whether Transform is Implemented</td></tr>
<tr><td>Chat model</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
<tr><td>Chat template</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Retriever</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Indexer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Embedder</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Loader</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Document Transformer</td><td>yes</td><td>no</td><td>no</td><td>no</td></tr>
<tr><td>Tool</td><td>yes</td><td>yes</td><td>no</td><td>no</td></tr>
</table>

In the official Eino components, except for the Chat Model and Tool that additionally support the stream, all other components only support Invoke. For specific component introductions, refer to: [Eino: Components](/en/docs/eino/core_modules/components)

The streaming paradigms Collect and Transform are currently only used in orchestration scenarios.

## **Streamlined Perspective from Multiple Component Orchestration**

### **Stream Paradigm of Components in Orchestration**

A component, when used alone, has a defined stream paradigm for its input and output, which cannot exceed the boundaries of the component’s defined interface.

- For example, a Chat Model can only have non-streaming []Message as input, and the output can be either non-streaming Message or streaming StreamReader[Message], because the Chat Model only implements the Invoke and Stream paradigms.

However, once a component is used in an "orchestration" scenario with multiple components, its input and output become less fixed and rely on the "upstream output" and "downstream input" within the orchestration context. Take the typical orchestration diagram of the React Agent as an example:

<a href="/img/eino/chatmodel_to_tool.png" target="_blank"><img src="/img/eino/chatmodel_to_tool.png" width="100%" /></a>

In the diagram above, if the Tool is a StreamableTool, i.e., the output is StreamReader[Message], then Tool -> ChatModel could have a streaming output. However, the Chat Model does not have a business scenario for receiving streaming input nor a corresponding interface. In this case, the Eino framework will automatically help the ChatModel gain the capability to receive streaming input:

<a href="/img/eino/en_eino_react_model_tool.png" target="_blank"><img src="/img/eino/en_eino_react_model_tool.png" width="100%" /></a>

The Concat message stream above is a capability automatically provided by the Eino framework. Even if it's not a message and is arbitrary T, as long as certain conditions are met, the Eino framework will automatically convert StreamReader[T] to T. These conditions are: **In orchestration, when the upstream output of a component is StreamReader[T], but the component only provides T as the input business interface, the framework will automatically concatenate StreamReader[T] into T before inputting it to this component.**

> 💡
> The process of concatenating StreamReader[T] into T by the framework may require the user to provide a Concat function. Refer to the chapter on "**Fan-In and Merging**" in [Eino: The design concept of orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles).

On the other hand, consider an opposite example. Again, let's look at a more complete orchestration diagram of the React Agent:

<a href="/img/eino/tool_model_react.png" target="_blank"><img src="/img/eino/tool_model_react.png" width="100%" /></a>

In the above diagram, the branch receives the message output from the chat model and decides whether to end the agent's current run and output the message, or to call a Tool and send the result back to the Chat Model for further processing based on whether the message contains a tool call. Since this Branch can complete the logic determination with the first frame of the message stream, we define this Branch with the Collect interface, which means it has streaming input and non-streaming output:

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

ReactAgent has two interfaces, Generate and Stream, which implement the Invoke and Stream programming paradigms respectively. When a ReactAgent is called in the Stream way, the output of the Chat Model is StreamReader[Message], thus the input to the Branch is StreamReader[Message], which matches the Branch condition's function signature and can run without any conversion.

However, when a ReactAgent is called in the Generate way, the output of the Chat Model is Message, so the Branch's input will also be Message, which does not match the Branch Condition's StreamReader[Message] function signature. At this point, the Eino framework will automatically box the Message into a StreamReader[Message] and pass it to the Branch, where this StreamReader will contain only one frame.

> 💡
> This kind of stream with only one frame is commonly known as a "pseudo-stream" because it does not bring the actual benefit of streaming, which is "low first packet latency." It merely packages the message to satisfy the requirements of the stream input-output interface signature.

In summary: ** In arrangement, when a component's upstream output is T, but the component only provides StreamReader[T] as the input business interface, the framework will automatically box T into a single-frame StreamReader[T] and then input it to this component.**

### **Stream Paradigm for Orchestrating Auxiliary Elements**

As mentioned above, the Branch is not a standalone component, but rather an "orchestrating auxiliary element" that only makes sense in orchestrating scenarios. There are similar "components" that are meaningful only in orchestration scenarios, as detailed in the table below:

<table>
<tr><td>Component</td><td>Usage Scenario</td><td>Whether Invoke is Implemented</td><td>Whether Stream is Implemented</td><td>Whether Collect is Implemented</td><td>Whether Transform is Implemented</td></tr>
<tr><td>Branch</td><td>Dynamically select one from a group of downstream Nodes based on upstream output - Invoke is implemented when the complete input parameters can be judged only after receiving them - Collect is implemented when the judgment can be made after receiving some frames - Only one of the two can be implemented</td><td>yes</td><td>no</td><td>yes</td><td>no</td></tr>
<tr><td>StatePreHandler</td><td>In the Graph, modify the State or/and Input before entering the Node. Stream is supported.</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>StatePostHandler</td><td>In the Graph, modify the State or/and Output after the Node is completed. Stream is supported</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Passthrough</td><td>In parallel situations, in order to flatten the number of nodes in each parallel branch, Passthrough nodes can be added to the branch with fewer nodes. The input and output of the Passthrough node are the same, following the output of the upstream node or the input of the downstream node (expected to be the same).</td><td>yes</td><td>no</td><td>no</td><td>yes</td></tr>
<tr><td>Lambda</td><td>Encapsulate business logic not defined in official components. Which paradigm the business logic belongs to, choose the corresponding streaming paradigm to implement.</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr>
</table>

Additionally, there is another "component" that only makes sense in orchestrating scenarios, which is to treat the orchestration product as a whole, such as the orchestrated Chain and Graph. These overall orchestration products can be called as "components" independently, or they can be added to higher-level orchestration products as nodes.

## **Overall Orchestration Flow**

### **"Business" Paradigm of Orchestrated Products**

Since the overall orchestrated product can be considered a "component," we can pose the question from a component perspective: Does the orchestrated product "component" have an interface paradigm that fits "business scenarios" like components such as Chat Model? The answer is both "yes" and "no."

- "No": Overall, the orchestrated products such as Graphs and Chains themselves do not have business attributes; they only serve abstract orchestration and, therefore, do not have an interface paradigm that fits business scenarios. Furthermore, orchestration needs to support various paradigms of business scenarios. Hence, the Runnable[I, O] interface representing orchestrated products in Eino does not make choices nor can it; it provides methods for all streaming paradigms:

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

- "Yes": Specifically, a particular Graph or Chain definitely carries specific business logic and thus has a streaming paradigm suitable for that particular business scenario. For instance, a Graph similar to React Agent matches business scenarios such as Invoke and Stream, so the logical way to call this Graph is through Invoke and Stream. Although the Runnable[I, O] interface for orchestrated products includes methods like Collect and Transform, they are generally not needed in normal business scenarios.

### **Paradigm of Orchestrating Internal Components at Runtime**

From another perspective, since the entire orchestration product can be considered a "component," each "component" must have its own internal implementation. For example, the internal implementation logic of ChatModel might involve transforming the input []Message into respective model's API requests, then calling the model's API, and finally transforming the response into output Message. By analogy, what is the internal implementation of the "component" Graph? It is the data flowing within the Graph's components according to the user-specified flow direction and streaming paradigm. Here, "flow direction" is out of the current discussion scope, and the runtime streaming paradigm of each component within the Graph is determined by the overall triggering method of the Graph, specifically:

If the user calls the Graph via **Invoke**, then all components within the Graph are called using the Invoke paradigm. If a component does not implement the Invoke paradigm, the Eino framework automatically wraps the component's implemented streaming paradigm into the Invoke calling paradigm, with the following priority:

- If the component implements Stream, then wrap the Invoke with Stream, i.e., automatically concat the output stream.

<a href="/img/eino/en_eino_internal_stream_outter_invoke.png" target="_blank"><img src="/img/eino/en_eino_internal_stream_outter_invoke.png" width="100%" /></a>

- Otherwise, if the component implements Collect, then wrap the Invoke with Collect, i.e., transform non-streamed input to single-frame stream.

<a href="/img/eino/en_internal_collect_outter_invoke.png" target="_blank"><img src="/img/eino/en_internal_collect_outter_invoke.png" width="100%" /></a>

- If neither is implemented, then Transform must be implemented, wrapping the Invoke with Transform, i.e., transforming input to single-frame stream and concatenating output.

<a href="/img/eino/en_eino_internal_transform_outter_invoke.png" target="_blank"><img src="/img/eino/en_eino_internal_transform_outter_invoke.png" width="100%" /></a>

If the user calls the Graph via **Stream/Collect/Transform**, then all components within the Graph are called using the Transform paradigm. If a component does not implement the Transform paradigm, the Eino framework automatically wraps the component's implemented streaming paradigm into the Transform calling paradigm, with the following priority:

- If the component implements Stream, then wrap the Transform with Stream, i.e., automatically concat the input stream.

<a href="/img/eino/en_internal_stream_outter_transform.png" target="_blank"><img src="/img/eino/en_internal_stream_outter_transform.png" width="100%" /></a>

- Otherwise, if the component implements Collect, then wrap the Transform with Collect, i.e., transform non-streamed output to single-frame stream.

<a href="/img/eino/en_internal_collect_outter_transform.png" target="_blank"><img src="/img/eino/en_internal_collect_outter_transform.png" width="100%" /></a>

- If neither is implemented, then Invoke must be implemented, wrapping the Transform with Invoke, i.e., concatenating input stream and transforming output to single-frame stream

<a href="/img/eino/en_eino_internal_invoke_outter_transform.png" target="_blank"><img src="/img/eino/en_eino_internal_invoke_outter_transform.png" width="100%" /></a>

Combining the various cases enumerated above, Eino framework's automatic conversion between T and Stream[T] can be summarized as:

- **T -> Stream[T]: Encapsulate the complete T into a single-frame Stream[T]. Non-streaming becomes pseudo-streaming.**
- **Stream[T] -> T: Concat Stream[T] into a complete T. When Stream[T] is not a single-frame stream, a Concat method for T might need to be provided.**

After reading the above implementation principles, you may have questions: Why is it required that all internal components be invoked using Invoke for a graph's Invoke? And why is it required that all internal components be invoked using Transform for a graph's Stream/Collect/Transform? After all, counterexamples can be given:

- Components A and B are orchestrated as a Chain and called using Invoke. A's business interface implements Stream, and B's business interface implements Collect. At this point, there are two choices for the invocation paradigm of the internal components of the graph:
  - A is called using stream, and B is called using collect. The overall Chain still has Invoke semantics while retaining true stream semantics internally. That is, the output stream of A does not need to be concatenated and can be fed into B in real time.
  - In Eino's current implementation, both A and B are called using Invoke, requiring the output stream of A to be concatenated and making B's input pseudo-streaming, losing the true streaming semantics internally.
- Components A and B are orchestrated as a Chain and called using Collect. A implements both Transform and Collect, and B implements Invoke. Two choices:
  - A is called using Collect, and B using Invoke: The overall semantics remain Collect without requiring any automatic conversion and boxing operations by the framework.
  - In Eino's current implementation, both A and B are called using Transform. Since A's business interface implements Transform, A's output and B's input may be truly streaming. However, B's business interface only implements Invoke. Based on the above analysis, B's input parameters need to be concatenated from true streaming to non-streaming. At this point, users need to provide an additional concatenation function for B's input parameters, which could have been avoided.

In the two examples above, it is possible to find a clear, different approach from Eino's conventions but with a more optimal streaming invocation path. However, when generalized to any orchestration scenario, it is difficult to find a clearly defined, different rule from Eino's conventions that is universally better. For example, for A->B->C with Collect semantics, should Collect be used between A->B or B->C? Potential factors include the specific implementation of A, B, and C's business interfaces, possible considerations like "maximizing the use of true streaming," and whether specific parameters implement concatenation. If it is a more complex graph, the factors to consider will quickly increase. In such a case, even if the framework can define a clear, better, universally applicable rule, it can be challenging to explain, and the cost of understanding and usage will be high, likely exceeding the actual benefits of this new rule.

To conclude, we can say that the runtime invocation paradigms of the internal components in Eino's orchestration products are **By Design**, clearly defined as follows:

- **When the overall invocation is Invoke, all internal components are invoked using Invoke, with no internal streaming process.**
- **When the overall invocation is Stream/Collect/Transform, all internal components are invoked using Transform. When a Stream[T] -> T concatenation process occurs, an additional concatenation function for T may be needed.**
