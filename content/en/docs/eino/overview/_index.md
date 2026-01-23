---
Description: ""
date: "2026-01-22"
lastmod: ""
tags: []
title: 'Eino: Overview'
weight: 1
---

## Introduction

**Eino ['aino]** (pronounced like “I know”, reflecting the vision we aim for) is a Golang-based framework for building modern applications powered by large language models (LLMs). Inspired by leading open-source frameworks such as LangChain and LlamaIndex, and informed by cutting-edge research and production practice, Eino emphasizes simplicity, extensibility, reliability, and effectiveness — all aligned with idiomatic Go design.

Eino provides value through:

- A carefully curated set of reusable **components** (abstractions and implementations) that you can compose to build LLM applications.
- A powerful **orchestration** layer that takes on heavy lifting like type checking, streaming data handling, concurrency management, aspect injection, and option configuration.
- A concise and thoughtfully designed **API**.
- A growing collection of integrated **flows** and **examples** that capture best practices.
- Practical **DevOps tools** supporting the full development lifecycle, from visual development and debugging to online tracing and evaluation.

With these capabilities and tools, Eino standardizes, simplifies, and accelerates work across the AI application lifecycle:

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

[Eino on GitHub](https://github.com/cloudwego/eino)

## Quick Start

Use components directly:

```go
model, _ := openai.NewChatModel(ctx, config) // create an invokable LLM instance
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")})
```

This works out of the box thanks to Eino’s ready-to-use components. However, you can achieve much more with orchestration — for three key reasons:

- Orchestration encapsulates common patterns in LLM applications.
- Orchestration addresses the complexities of handling streaming responses from LLMs.
- Orchestration takes care of type safety, concurrency management, aspect injection, and option assignment for you.

Eino offers three orchestration APIs:

<table>
<tr><td>API</td><td>Features & Use Cases</td></tr>
<tr><td>Chain</td><td>A simple forward-only directed chain.</td></tr>
<tr><td>Graph</td><td>A directed graph (cyclic or acyclic). Powerful and flexible.</td></tr>
<tr><td>Workflow</td><td>An acyclic directed graph with field-level data mapping in structs.</td></tr>
</table>

Let’s build a simple chain: a **ChatTemplate** followed by a **ChatModel**.

<a href="/img/eino/chain_simple_llm.png" target="_blank"><img src="/img/eino/chain_simple_llm.png" width="100%" /></a>

```go
chain, _ := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

Now, let’s create a **Graph** where a **ChatModel** either returns a result directly or makes at most one tool call.

<a href="/img/eino/eino_take_first_toolcall_output.png" target="_blank"><img src="/img/eino/eino_take_first_toolcall_output.png" width="100%" /></a>

```go
graph := NewGraph[map[string]any, *schema.Message]()

_ = graph.AddChatTemplateNode("node_template", chatTpl)
_ = graph.AddChatModelNode("node_model", chatModel)
_ = graph.AddToolsNode("node_tools", toolsNode)
_ = graph.AddLambdaNode("node_converter", takeOne)

_ = graph.AddEdge(START, "node_template")
_ = graph.AddEdge("node_template", "node_model")
_ = graph.AddBranch("node_model", branch)
_ = graph.AddEdge("node_tools", "node_converter")
_ = graph.AddEdge("node_converter", END)

compiledGraph, err := graph.Compile(ctx)
if err != nil {
    return err
}
out, err := compiledGraph.Invoke(ctx, map[string]any{
    "query":"Beijing's weather this weekend"})
```

Next, let’s build a **Workflow** to flexibly map inputs and outputs at the field level:

<a href="/img/eino/graph_node_type1.png" target="_blank"><img src="/img/eino/graph_node_type1.png" width="100%" /></a>

```go
wf := NewWorkflow[[]*schema.Message, *schema.Message]()
wf.AddChatModelNode("model", model).AddInput(START)
wf.AddLambdaNode("lambda1", lambda1).AddInput("model", MapFields("Content", "Input"))
wf.AddLambdaNode("lambda2", lambda2).AddInput("model", MapFields("Role", "Role"))
wf.AddLambdaNode("lambda3", lambda3).
        AddInput("lambda1", MapFields("Output", "Query")).
        AddInput("lambda2", MapFields("Output", "MetaData"))
wf.End().AddInput("lambda3")
runnable, err := wf.Compile(ctx)
if err != nil {
    return err
}
our, err := runnable.Invoke(ctx, []*schema.Message{schema.UserMessage("kick start this workflow!")})
```

Now, let’s create a **ReAct** agent: a ChatModel bound to a set of Tools. It ingests an input message and autonomously decides whether to call a tool or to produce a final answer. Tool outputs are fed back into the chat model as input messages and used as context for subsequent reasoning.

Eino provides a full, ready-to-use implementation of a ReAct agent in the `flow` package. See: [flow/agent/react](https://github.com/cloudwego/eino/blob/main/flow/agent/react/react.go)

Behind the scenes, Eino automatically handles several critical responsibilities:

- **Type checking**: Ensures input/output types between nodes match at compile time.
- **Stream handling**: Concatenates message streams before passing them to ChatModel or ToolsNode, and duplicates the stream for callback handlers when needed.
- **State management**: Ensures shared state is safely readable and writable.
- **Aspect injection**: Injects callbacks before/after ChatModel execution if the implementation does not manage its own callbacks.
- **Option assignment**: Runtime options can be set globally, per component type, or per node.

For example, it’s easy to extend a compiled graph with callbacks:

```go
handler := NewHandlerBuilder().
  OnStartFn(
    func(ctx context.Context, info *RunInfo, input CallbackInput) context.Context) {
        log.Infof("onStart, runInfo: %v, input: %v", info, input)
    }).
  OnEndFn(
    func(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context) {
        log.Infof("onEnd, runInfo: %v, out: %v", info, output)
    }).
  Build()
  
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))
```

And similarly, you can assign options to different nodes with precision:

```go
// assign to All nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// assign only to ChatModel nodes
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5))

// assign only to node_1
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

## Key Features

### Rich Components

- Common building blocks are abstracted as **components**, each with multiple ready-to-use **implementations**.
  - Abstractions include ChatModel, Tool, PromptTemplate, Retriever, Document Loader, Lambda, and more.
  - Each component defines its own interface, input/output types, option types, and sensible stream processing paradigms.
  - Implementation details are transparent; when orchestrating components, you focus on abstractions.
- Implementations can be nested and encapsulate complex business logic.
  - Examples include ReAct Agent, MultiQueryRetriever, and Host MultiAgent. These are composed from multiple components with sophisticated logic.
  - From the outside, details remain transparent. For instance, you can use MultiQueryRetriever anywhere a Retriever is accepted.

### Powerful Orchestration (Graph/Chain/Workflow)

- Data flows from Retriever / Document Loader / ChatTemplate to ChatModel, then to Tool, and ultimately becomes the final answer. This controllable, directed flow across components is realized through **graph orchestration**.
- Component instances become **nodes**, and **edges** are the data channels between them.
- Graph orchestration is powerful and flexible enough to encode complex business logic:
  - The framework handles **type checking, stream management, concurrency, aspect injection, and option distribution**.
  - At runtime, you can **branch**, read/write global **state**, or use workflows for field-level data mapping.

### Robust Streaming

- Stream processing is crucial because ChatModel emits fragments of the final message in real time. This matters even more under orchestration, where downstream components need to handle fragments.
- For downstream nodes that only accept non-streaming input (e.g., ToolsNode), Eino automatically **concatenates** the stream.
- During graph execution, Eino will automatically **convert** non-streaming to streaming when needed.
- When multiple streams converge to a single downstream node, Eino **merges** them.
- When a stream fans out to multiple downstream nodes or is passed to callback handlers, Eino **copies** it.
- Orchestration elements such as **Branch** and **StateHandler** are stream-aware.
- Compiled graphs can run in four input/output paradigms:

<table>
<tr><td>Paradigm</td><td>Description</td></tr>
<tr><td>Invoke</td><td>Accepts non-streaming I, returns non-streaming O</td></tr>
<tr><td>Stream</td><td>Accepts non-streaming I, returns StreamReader[O]</td></tr>
<tr><td>Collect</td><td>Accepts StreamReader[I], returns non-streaming O</td></tr>
<tr><td>Transform</td><td>Accepts StreamReader[I], returns StreamReader[O]</td></tr>
</table>

### Extensible Callbacks

- Callbacks address cross-cutting concerns like logging, tracing, metrics, and they can expose internal details of component implementations.
- Five callback types are supported: **OnStart, OnEnd, OnError, OnStartWithStreamInput, OnEndWithStreamOutput**.
- Developers can create custom handlers and inject them at runtime via options; the graph will invoke them during execution.
- Graphs can even inject callbacks into component implementations that do not natively support them.

## Eino Architecture

<a href="/img/eino/eino_architecture_overview.png" target="_blank"><img src="/img/eino/eino_architecture_overview.png" width="100%" /></a>

The Eino framework consists of several parts:

- [Eino](https://github.com/cloudwego/eino): Type definitions, streaming mechanisms, component abstractions, orchestration, and callbacks.
- [EinoExt](https://github.com/cloudwego/eino-ext): Component implementations, callback handlers, usage examples, and tooling such as evaluators and prompt optimizers.

> 💡
> For ByteDance-internal components, there is a corresponding internal repository:
>
> EinoBytedExt: [https://code.byted.org/search/flow/eino-byted-ext](https://code.byted.org/search/flow/eino-byted-ext)
>
> It includes components currently intended for internal use, such as llmgateway, bytedgpt, fornax tracing, bytees, etc.

- [Eino DevOps](https://github.com/cloudwego/eino-ext/tree/main/devops): Visual development and debugging.
- [EinoExamples](https://github.com/cloudwego/eino-examples): Example applications and best practices.

See also: [Eino Architecture Overview](/docs/eino/overview/eino_arch/)

## Documentation

For learning and using Eino, we provide a comprehensive user manual to help you grasp Eino’s concepts and build AI applications with Eino effectively. Try it here: [Eino User Manual](https://www.cloudwego.io/docs/eino/)

If you want to get hands-on quickly, start with: [Eino: Quick Start](https://www.cloudwego.io/docs/eino/quick_start/)

Complete API reference: [https://pkg.go.dev/github.com/cloudwego/eino](https://pkg.go.dev/github.com/cloudwego/eino)

## Dependencies

- Go 1.18 or higher
- Eino depends on [kin-openapi](https://github.com/getkin/kin-openapi) for OpenAPI JSONSchema. To remain compatible with Go 1.18, we pin kin-openapi at `v0.118.0`. This dependency has been removed after V0.6.0.

## Security

If you discover or suspect a potential security issue in this project, please report it to ByteDance’s security team via our [Security Center](https://security.bytedance.com/src) or by email at [sec@bytedance.com](mailto:sec@bytedance.com).

Please **do not** create a public GitHub issue.

## Contact

- How to become a member: [COMMUNITY MEMBERSHIP](https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md)
- Issues: [Issues](https://github.com/cloudwego/eino/issues)
- Lark user group ([register for Lark](https://www.feishu.cn/) and scan the QR code to join)

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>

- ByteDance internal OnCall group

## License

This project is licensed under the [[Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0.txt)].
