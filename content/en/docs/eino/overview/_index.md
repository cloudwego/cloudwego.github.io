---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: 'Eino: Overview'
weight: 1
---

## Introduction

**Eino['aino]** (pronounced similarly to "I know, hoping that the framework can achieve the vision of "I know") aims to be the ultimate LLM application development framework in Golang. Drawing inspiration from many excellent LLM application development frameworks in the open-source community such as LangChain & LlamaIndex, etc., as well as learning from cutting-edge research and real world applications, Eino offers an LLM application development framework that emphasizes simplicity, scalability, reliability and effectiveness that better aligns with Golang programming conventions.

What Eino provides are:

- a carefully curated list of **component** abstractions and implementations that can be easily reused and combined to build LLM applications
- a powerful **composition** framework that does the heavy lifting of strong type checking, stream processing, concurrency management, aspect injection, option assignment, etc. for the user.
- a set of meticulously designed **API** that obsesses on simplicity and clarity.
- an ever-growing collection of best practices in the form of bundled **flows** and **examples**.
- a useful set of tools that covers the entire development cycle, from visualized development and debugging to online tracing and evaluation.

With the above capabilities and tools, Eino can standardize, simplify operations and improve efficiency at different stages of the artificial intelligence application development lifecycle:

<a href="/img/eino/en_eino_repo_structure.png" target="_blank"><img src="/img/eino/en_eino_repo_structure.png" width="100%" /></a>

[Eino Github Repo](https://github.com/cloudwego/eino)

## **A quick walkthrough**

Use a component directly:

```go
model, _ := openai.NewChatModel(ctx, config) // create an invokable LLM instance
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")}
```

Of course, you can do that. Eino provides lots of useful components to use out of the box. But you can do more by using orchestration, for three reasons:

- orchestration encapsulates common patterns of LLM application.
- orchestration solves the difficult problem of processing stream response by the LLM.
- orchestration handles type safety, concurrency management, aspect injection and option assignment for you.

Eino provides three sets of APIs for orchestration

<table>
<tr><td>API</td><td>Characteristics and usage</td></tr>
<tr><td>Chain</td><td>Simple chained directed graph that can only go forward.</td></tr>
<tr><td>Graph</td><td>Cyclic or Acyclic directed graph. Powerful and flexible.</td></tr>
<tr><td>Workflow</td><td>Acyclic graph that supports data mapping at struct field level.</td></tr>
</table>

Let's create a simple chain: a ChatTemplate followed by a ChatModel.

<a href="/img/eino/en_eino_chat.png" target="_blank"><img src="/img/eino/en_eino_chat.png" width="100%" /></a>

```go
chain, err := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
if err != nil {
    return err
}
out, err := chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

Now let's create a graph that uses a ChatModel to generate tool calls, then uses a ToolsNode to execute those tools, .

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
out, err := r.Invoke(ctx, map[string]any{"query":"Beijing's weather this weekend"})
```

Now let's create a workflow that flexibly maps input & output at the field level:

<a href="/img/eino/graph_node_type1.png" target="_blank"><img src="/img/eino/graph_node_type1.png" width="100%" /></a>

```go
wf := NewWorkflow[[]*Message, *Message]()
wf.AddChatModelNode("model", model).AddInput(START)
wf.AddLambdaNode("l1", lambda1).AddInput(NewMapping("model").From("Content").To("Input"))
wf.AddLambdaNode("l2", lambda2).AddInput(NewMapping("model").From("Role").To("Role"))
wf.AddLambdaNode("l3", lambda3).AddInput(
    NewMapping("l1").From("Output").To("Query"),
    NewMapping("l2").From("Output").To("MetaData"),
)
wf.AddEnd([]*Mapping{NewMapping("node_l3")}
runnable, _ := wf.Compile(ctx)
runnable.Invoke(ctx, []*Message{UserMessage("kick start this workflow!")})
```

Now let's create a 'ReAct' agent: A ChatModel binds to Tools. It receives input `Messages` and decides independently whether to call the `Tool` or output the final result. The execution result of the Tool will again become the input Message for the ChatModel and serve as the context for the next round of independent judgment.

We provide a complete implementation of the ReAct agent out of the box in Eino's `flow` package. See the code at: [flow/agent/react](https://github.com/cloudwego/eino/blob/main/flow/agent/react/react.go)

Eino automatically does important stuff behind the above code:

- **Type checking**: it makes sure the two nodes' input and output types match at compile time.
- **Stream processing**: concatenates message stream before passing to chatModel and toolsNode if needed, and copies the stream into callback handlers.
- **State management**: Ensure that shared state can be read and written safely.
- **Aspect injection**: injects callback aspects before and after the execution of ChatModel if the specified ChatModel implementation hasn't injected itself.
- **Option assignment**: call options are assigned either globally, to specific component type or to specific node.

For example, you could easily extend the compiled graph with callbacks:

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

or you could easily assign options to different nodes:

```go
// assign to All nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// assign only to ChatModel nodes
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5))

// assign only to node_1
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

## **Key Features**

### **Rich Components**

- Encapsulates common building blocks into **component abstractions**, each having multiple **component implementations** that are ready to be used out of the box.
  - component abstractions such as ChatModel, Tool, PromptTemplate, Retriever, Document Loader, Lambda, etc.
  - Each component type has an interface of its own: defined Input & Output Type, defined Option type, and streaming paradigms that make sense.
  - implementations are transparent. Abstractions are all you care about when orchestrating components together.
- Implementations can be nested and captures complex business logic.
  - React Agent, MultiQueryRetriever, Host MultiAgent, etc. They consist of multiple components and non-trivial business logic.
  - They are still transparent from the outside. A MultiQueryRetriever can be used anywhere that accepts a Retriever.

### **Powerful Orchestration (Graph/Chain/Workflow)**

- Data flows from Retriever / Document Loaders / Prompt Template to ChatModel, then flows to Tools and parsed as Final Answer. This directed, controlled flow of data through multiple components can be implemented through **graph orchestration**.
- Component instances are graph nodes, and edges are data flow channels.
- Graph orchestration is powerful and flexible enough to implement complex business logic:
  - Type checking, stream processing, concurrency management, aspect injection and option assignment are handled by the framework.
  - branch out execution at runtime, read and write global state, or do field level data mapping using workflow.

### **Complete Stream Processing**

- Stream processing is important because ChatModel outputs chunks of the complete message in real-time when generating messages. This is particularly crucial in orchestration scenarios as more components need to process the chunked message data.
- For downstream nodes that only accept non-streaming input (such as the ToolsNode), Eino automatically **concatenates** the streams.
- During the execution of the graph, when a stream is required, Eino automatically **converts** non-streaming data into a stream.
- When multiple streams converge at a downstream node, Eino automatically **merges** these streams.
- When a stream is sent to multiple different downstream nodes or passed to a callback handler, Eino automatically **copies** these streams.
- Orchestration elements such as **branching** or the **StateHandler** can also detect and process streams.
- Thanks to the above stream data processing capabilities, whether a component can handle streams and whether it will output streams becomes transparent to the user.
- The compiled Graph can be run in four different stream input-output paradigms:

<table>
<tr><td><strong>Streaming Paradigm</strong></td><td><strong>Explanation</strong></td></tr>
<tr><td>Invoke</td><td>Accepts non-stream type I and returns non-stream type O</td></tr>
<tr><td>Stream</td><td>Accepts non-stream type I and returns stream type StreamReader[O]</td></tr>
<tr><td>Collect</td><td>Accepts stream type StreamReader[I] and returns non-stream type O</td></tr>
<tr><td>Transform</td><td>Accepts stream type StreamReader[I] and returns stream type StreamReader[O]</td></tr>
</table>

### **Highly Extensible Aspects (Callbacks)**

- Aspects handle cross-cutting concerns such as logging, tracing, metrics, etc., as well as exposing internal details of component implementations.
- Five aspects are supported: **OnStart, OnEnd, OnError, OnStartWithStreamInput, OnEndWithStreamOutput**.
- Developers can easily create custom callback handlers, add them during graph run via options, and they will be invoked during graph run.
- Graphs can also inject aspects to those component implementations that do not support callbacks on their own.

## Eino framework structure

<a href="/img/eino/eino_projects_and_structure.png" target="_blank"><img src="/img/eino/eino_projects_and_structure.png" width="100%" /></a>

The Eino framework consists of several parts:

- [Eino](https://github.com/cloudwego/eino): It includes type definitions, streaming data processing mechanisms, component abstraction definitions, orchestration functions, aspect-oriented mechanisms, etc.
- [EinoExt](https://github.com/cloudwego/eino-ext): Component implementations, callback handler implementations, component usage examples, and various tools such as evaluators, hint optimizers, etc.
- [Eino Devops](https://github.com/cloudwego/eino-ext/tree/main/devops): Visual development, visual debugging, etc.
- [EinoExamples](https://github.com/cloudwego/eino-examples): It is a code repository containing sample applications and best practices.

For details, see: [The structure of the Eino Framework](/en/docs/eino/overview/eino_framework_structure)

## Detailed Documentation

For learning and using Eino, we provide a comprehensive Eino User Manual to help you quickly understand the concepts in Eino and master the skills of developing AI applications based on Eino. Start exploring through the [Eino User Manual](https://www.cloudwego.io/zh/docs/eino/) now!

For a quick introduction to building AI applications with Eino, we recommend starting with [Eino: Quick Start](https://www.cloudwego.io/zh/docs/eino/quick_start/)

Full API Reference：[https://pkg.go.dev/github.com/cloudwego/eino](https://pkg.go.dev/github.com/cloudwego/eino)

## Dependencies

- Go 1.18 and above.
- Eino relies on [kin-openapi](https://github.com/getkin/kin-openapi) 's OpenAPI JSONSchema implementation. In order to remain compatible with Go 1.18, we have fixed kin-openapi's version to be v0.118.0.

## Security

If you discover a potential security issue in this project, or think you may have discovered a security issue, we ask that you notify Bytedance Security via our [security center](https://security.bytedance.com/src) or [vulnerability reporting email](mailto:sec@bytedance.com).

Please do **not** create a public GitHub issue.

## Contact US

- How to become a member: [COMMUNITY MEMBERSHIP](https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md)
- Issues: [Issues](https://github.com/cloudwego/eino/issues)
- Lark: Scan the QR code below with [Register](https://www.feishu.cn/en/) Lark to join our CloudWeGo/eino user group.

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>

## License

This project is licensed under the [[Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0.txt)].
