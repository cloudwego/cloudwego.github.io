---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: 'Eino: Overview'
weight: 1
---

## Introduction

**Eino ['aino]** (pronounced like "I know", reflecting the vision we aim for) is designed to be the ultimate LLM application development framework based on Go. Drawing inspiration from excellent open-source LLM application development frameworks such as LangChain and LlamaIndex, while incorporating cutting-edge research and practical applications, Eino provides an LLM application development framework that emphasizes simplicity, extensibility, reliability, and effectiveness, aligned with Go programming conventions.

Eino provides value through:

- A carefully curated set of **component** abstractions and implementations that can be easily reused and composed to build LLM applications.
- **Agent Development Kit (ADK)**, providing high-level abstractions for building AI agents, supporting multi-agent orchestration, human-in-the-loop interrupt mechanisms, and preset agent patterns.
- A powerful **orchestration** framework that handles heavy lifting like type checking, streaming data handling, concurrency management, aspect injection, and option assignment for you.
- A concise and thoughtfully designed **API**.
- A growing collection of best practices in the form of integrated **flows** and **examples**.
- Practical **DevOps tools** covering the entire development lifecycle from visual development and debugging to online tracing and evaluation.

With these capabilities and tools, Eino standardizes, simplifies, and accelerates work across different stages of the AI application development lifecycle:

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

[Eino GitHub Repository](https://github.com/cloudwego/eino)

## Quick Start

Use components directly:

```go
model, _ := openai.NewChatModel(ctx, config) // create an invokable LLM instance
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")})
```

Of course, you can use it this way, Eino provides many useful components out of the box. But by using orchestration, you can achieve more, for three reasons:

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

Let's build a simple chain: a **ChatTemplate** followed by a **ChatModel**.

<a href="/img/eino/chain_simple_llm.png" target="_blank"><img src="/img/eino/chain_simple_llm.png" width="100%" /></a>

```go
chain, _ := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

Now, let's create a **Graph** where a **ChatModel** either returns a result directly or makes at most one tool call.

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
out, err := compiledGraph.Invoke(ctx, map[string]any{"query":"Beijing's weather this weekend"})
```

Next, let's build a **Workflow** to flexibly map inputs and outputs at the field level:

<a href="/img/eino/graph_node_type1.png" target="_blank"><img src="/img/eino/graph_node_type1.png" width="100%" /></a>

```go
type Input1 struct {
    Input string
}

type Output1 struct {
    Output string
}

type Input2 struct {
    Role schema.RoleType
}

type Output2 struct {
    Output string
}

type Input3 struct {
    Query string
    MetaData string
}

var (
    ctx context.Context
    m model.BaseChatModel
    lambda1 func(context.Context, Input1) (Output1, error)
    lambda2 func(context.Context, Input2) (Output2, error)
    lambda3 func(context.Context, Input3) (*schema.Message, error)
)

wf := NewWorkflow[[]*schema.Message, *schema.Message]()
wf.AddChatModelNode("model", m).AddInput(START)
wf.AddLambdaNode("lambda1", InvokableLambda(lambda1)).
    AddInput("model", MapFields("Content", "Input"))
wf.AddLambdaNode("lambda2", InvokableLambda(lambda2)).
    AddInput("model", MapFields("Role", "Role"))
wf.AddLambdaNode("lambda3", InvokableLambda(lambda3)).
    AddInput("lambda1", MapFields("Output", "Query")).
    AddInput("lambda2", MapFields("Output", "MetaData"))
wf.End().AddInput("lambda3")
runnable, err := wf.Compile(ctx)
if err != nil {
    return err
}
our, err := runnable.Invoke(ctx, []*schema.Message{
    schema.UserMessage("kick start this workflow!"),
})
```

Eino's **graph orchestration** provides the following capabilities out of the box:

- **Type checking**: Ensures input/output types between two nodes match at compile time.
- **Stream handling**: Concatenates message streams before passing them to ChatModel and ToolsNode nodes when needed, and duplicates the stream for callback handlers.
- **Concurrency management**: Since StatePreHandler is thread-safe, shared state can be safely read and written.
- **Aspect injection**: Injects callback aspects before and after ChatModel execution if the specified ChatModel implementation does not inject them itself.
- **Option assignment**: Options can be set globally, per component type, or per specific node.

For example, it's easy to extend a compiled graph with callbacks:

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

And you can easily assign options to different nodes:

```go
// assign to All nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// assign only to ChatModel nodes
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5))

// assign only to node_1
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

Now, let's create a **ReAct** agent: a ChatModel bound to a set of Tools. It ingests an input message and autonomously decides whether to call a tool or to produce a final answer. Tool outputs are fed back into the chat model as input messages and used as context for subsequent reasoning.

<a href="/img/eino/eino_adk_react_illustration.png" target="_blank"><img src="/img/eino/eino_adk_react_illustration.png" width="100%" /></a>

Eino's **Agent Development Kit (ADK)** provides a ready-to-use `ChatModelAgent` to implement this pattern:

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "assistant",
    Description: "A helpful assistant that can use tools",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{weatherTool, calculatorTool},
        },
    },
})

runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent})
iter := runner.Query(ctx, "What's the weather in Beijing this weekend?")
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // process agent events (model outputs, tool calls, etc.)
}
```

ADK handles the ReAct loop internally, emitting events for each step of the agent reasoning process.

Beyond the basic ReAct pattern, ADK provides powerful capabilities for building production-grade agent systems:

**Multi-Agent and Context Management**: Agents can transfer control to sub-agents or be wrapped as tools. The framework automatically manages conversation context across agent boundaries:

```go
// Set up agent hierarchy - mainAgent can now transfer to sub-agents
mainAgentWithSubs, _ := adk.SetSubAgents(ctx, mainAgent, []adk.Agent{researchAgent, codeAgent})
```

When `mainAgent` transfers to `researchAgent`, conversation history is automatically rewritten to provide appropriate context for the sub-agent.

Agents can also be wrapped as tools, allowing one agent to call another agent within its tool-calling workflow:

```go
// Wrap an agent as a tool that can be called by other agents
researchTool := adk.NewAgentTool(ctx, researchAgent)
```

**Interrupt Anywhere, Resume Directly**: Any agent can pause execution to wait for human approval or external input, and resume precisely from where it was interrupted:

```go
// Inside a tool or agent, trigger an interrupt
return adk.Interrupt(ctx, "Please confirm this action")

// Later, resume from checkpoint
iter, _ := runner.Resume(ctx, checkpointID)
```

**Preset Agent Patterns**: Out-of-the-box implementations for common architectures:

```go
// Deep Agent: A battle-tested complex task orchestration pattern,
// with built-in task management, sub-agent delegation, and progress tracking
deepAgent, _ := deep.New(ctx, &deep.Config{
    Name:        "deep_agent",
    Description: "An agent that breaks down and executes complex tasks",
    ChatModel:   chatModel,
    SubAgents:   []adk.Agent{researchAgent, codeAgent},
    ToolsConfig: adk.ToolsConfig{...},
})

// Supervisor pattern: One agent coordinates multiple experts
supervisorAgent, _ := supervisor.New(ctx, &supervisor.Config{
    Supervisor: coordinatorAgent,
    SubAgents:  []adk.Agent{writerAgent, reviewerAgent},
})

// Sequential execution: Agents run in sequence
seqAgent, _ := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
    SubAgents: []adk.Agent{plannerAgent, executorAgent, summarizerAgent},
})
```

**Extensible Middleware System**: Add capabilities to agents without modifying core logic:

```go
fsMiddleware, _ := filesystem.NewMiddleware(ctx, &filesystem.Config{
    Backend: myFileSystem,
})

agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.AgentMiddleware{fsMiddleware},
})
```

## Key Features

### Rich Components

- Common building blocks are abstracted as **components**, each with multiple ready-to-use **component implementations**.
  - Abstractions include ChatModel, Tool, PromptTemplate, Retriever, Document Loader, Lambda, and more.
  - Each component type has its own interface: defining input and output types, option types, and sensible stream processing paradigms.
  - Implementation details are transparent. When orchestrating components, you only need to focus on the abstraction level.
- Implementations can be nested and encapsulate complex business logic.
  - Examples include ReAct Agent, MultiQueryRetriever, and Host MultiAgent. These are composed from multiple components with sophisticated logic.
  - From the outside, implementation details remain transparent. For instance, you can use MultiQueryRetriever anywhere a Retriever is accepted.

## **Agent Development Kit (ADK)**

The **ADK** package provides high-level abstractions optimized for building AI agents:

- **ChatModelAgent**: ReAct-style agent that automatically handles tool calling, conversation state, and reasoning loops.
- **Multi-Agent and Context Engineering**: Build hierarchical agent systems where conversation history is automatically managed during agent transfers and agent-as-tool calls, enabling seamless context sharing between specialized agents.
- **Workflow Agents**: Compose agents using `SequentialAgent`, `ParallelAgent`, and `LoopAgent` for complex execution flows.
- **Human-in-the-Loop**: `Interrupt` and `Resume` mechanisms with checkpoint persistence for workflows requiring human approval or input.
- **Preset Patterns**: Out-of-the-box implementations including Deep Agent (task orchestration), Supervisor (hierarchical coordination), and Plan-Execute-Replan.
- **Agent Middleware**: Extensible middleware system for adding tools (filesystem operations) and managing context (token reduction).

### Powerful Orchestration (Graph/Chain/Workflow)

For fine-grained control, Eino provides **graph orchestration** capabilities where data flows from Retriever / Document Loader / ChatTemplate to ChatModel, then to Tool, and is parsed into the final answer.

- Component instances are **nodes** of the graph, and **edges** are the data flow channels.
- Graph orchestration is powerful and flexible enough to implement complex business logic:
  - **Type checking, stream handling, concurrency management, aspect injection, and option distribution** are all handled by the framework.
  - At runtime, you can perform **branch** execution, read/write global **state**, or use workflows for field-level data mapping.

## **Callbacks**

**Callbacks** handle cross-cutting concerns like logging, tracing, and metrics. Callbacks can be applied directly to components, orchestration graphs, or ADK agents.

- Five callback types are supported: OnStart, OnEnd, OnError, OnStartWithStreamInput, OnEndWithStreamOutput.
- Custom callback handlers can be added at runtime via Options.

### Robust Streaming

- Stream processing is crucial because ChatModel emits fragments of the final message in real time. This matters even more under orchestration, where more components need to handle fragmented message data.
- For downstream nodes that only accept non-streaming input (e.g., ToolsNode), Eino automatically **concatenates** the stream.
- During graph execution, Eino will automatically **convert** non-streaming to streaming when needed.
- When multiple streams converge to a single downstream node, Eino **merges** them.
- When a stream fans out to multiple downstream nodes or is passed to callback handlers, Eino **copies** it.
- Orchestration elements such as **Branch** and **StateHandler** are stream-aware.
- With these stream processing capabilities, whether a component can handle streams or outputs streams becomes transparent to users.
- Compiled graphs can run in four different input/output paradigms:

<table>
<tr><td>Paradigm</td><td>Description</td></tr>
<tr><td>Invoke</td><td>Accepts non-streaming I, returns non-streaming O</td></tr>
<tr><td>Stream</td><td>Accepts non-streaming I, returns StreamReader[O]</td></tr>
<tr><td>Collect</td><td>Accepts StreamReader[I], returns non-streaming O</td></tr>
<tr><td>Transform</td><td>Accepts StreamReader[I], returns StreamReader[O]</td></tr>
</table>

## Eino Architecture

<a href="/img/eino/eino_architecture_overview.png" target="_blank"><img src="/img/eino/eino_architecture_overview.png" width="100%" /></a>

The Eino framework consists of several parts:

- [Eino](https://github.com/cloudwego/eino): Contains type definitions, streaming data handling mechanisms, component abstraction definitions, orchestration functionality, callback mechanisms, etc.
- [EinoExt](https://github.com/cloudwego/eino-ext): Component implementations, callback handler implementations, component usage examples, and various tools such as evaluators, prompt optimizers, etc.

> 💡
> For ByteDance-internal components, there is a corresponding internal repository:
>
> EinoBytedExt: [https://code.byted.org/search/flow/eino-byted-ext](https://code.byted.org/search/flow/eino-byted-ext)
>
> It includes components currently intended for internal use, such as llmgateway, bytedgpt, fornax tracing, bytees, etc.

- [Eino DevOps](https://github.com/cloudwego/eino-ext/tree/main/devops): Visual development, visual debugging, etc.
- [EinoExamples](https://github.com/cloudwego/eino-examples): A repository containing example applications and best practices.

See also: [Eino Architecture Overview](/docs/eino/overview/eino_arch/)

## Documentation

For learning and using Eino, we provide a comprehensive Eino user manual to help you quickly understand concepts in Eino and master the skills of developing and designing AI applications based on Eino. Try it here: [Eino User Manual](https://www.cloudwego.io/docs/eino/)

If you want to get hands-on quickly and understand the process of building AI applications with Eino, we recommend starting with: [Eino: Quick Start](https://www.cloudwego.io/docs/eino/quick_start/)

Complete API reference: [https://pkg.go.dev/github.com/cloudwego/eino](https://pkg.go.dev/github.com/cloudwego/eino)

## Dependencies

- Go 1.18 or higher

## **Code Standards**

This repository has `golangci-lint` checks enabled to enforce basic code standards. You can check locally with the following command:

```bash
golangci-lint run ./...
```

Main rules include:

- Exported functions, interfaces, packages, etc. need comments that conform to GoDoc standards.
- Code format must conform to `gofmt -s` standards.
- Import order must conform to `goimports` standards (std -> third party -> local).

## Security

If you discover or suspect a potential security issue in this project, please report it to ByteDance's security team via our [Security Center](https://security.bytedance.com/src) or by email at [sec@bytedance.com](mailto:sec@bytedance.com).

Please **do not** create a public GitHub issue.

## Contact

- How to become a member: [COMMUNITY MEMBERSHIP](https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md)
- Issues: [Issues](https://github.com/cloudwego/eino/issues)
- Lark user group ([register for Lark](https://www.feishu.cn/) and scan the QR code to join)

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>

- ByteDance internal OnCall group

## License

This project is licensed under the [[Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0.txt)].
