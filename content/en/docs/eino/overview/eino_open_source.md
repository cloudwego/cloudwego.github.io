---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: LLM Application Development Framework — Eino Open Source Release!
weight: 1
---

Today, after over half a year of internal use and iteration at ByteDance, the Go-based comprehensive LLM application development framework — Eino — is officially open-sourced under CloudWeGo.

Eino defines clear “components” and provides powerful “orchestration”, covering the full development lifecycle, helping developers build deep LLM applications quickly.

If you’ve felt any of these pains — wanting to add LLM capabilities but unsure where to start; your framework falls behind industry progress; weak typing makes code hard to reason about; model outputs feel risky without strong tracing/observability/tooling — Eino is built to address exactly these concerns with a devops-spanning framework:

- Stable core, simple APIs, clear onboarding path, smooth learning curve
- Extreme extensibility, highly active development, long-term sustainability
- Strong typing with Go, readable code, maintainable and reliable
- Backed by extensive ByteDance practices (Doubao, TikTok, etc.)
- Out-of-the-box tooling ecosystem

Eino is ByteDance’s preferred full-code framework for LLM applications, adopted across multiple business lines and hundreds of services.

Project: `https://github.com/cloudwego/eino`, `https://github.com/cloudwego/eino-ext`

We will build around the open-source Eino repository, keeping one unified codebase for both internal and external usage.

## Quick Look at Eino

Eino is a devops-spanning framework — from best-practice samples (Eino Examples) to tooling for each stage:

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

Eino organizes LLM applications around reusable “components”. For example, the core `ChatModel`:

```go
model, _ := ark.NewChatModel(ctx, config)
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")})
```

Direct component usage is fine — Eino provides many implementations. But LLM apps share patterns:

- The model is central; logic focuses on providing rich context to the model and reliably affecting the environment with outputs. Components, data, and interactions are enumerable and describable as directed graphs.
- Model output is streaming; downstream components must handle streams: real-time processing, copying, merging, and concatenation.
- Graphs involve concurrency, fan-in/out, cross-cutting callbacks, and option dispatch.

Eino’s orchestration addresses these general problems.

Example: a ReAct Agent — a `ChatModel` “binds” tools, receives `Message` input, reasons whether to call a tool or produce a final answer; tool results are fed back as `Message` for the next decision.

<a href="/img/eino/eino_graph_nodes_of_react_agent.png" target="_blank"><img src="/img/eino/eino_graph_nodes_of_react_agent.png" width="100%" /></a>

Implemented via components plus graph orchestration; concise code cleanly maps to the diagram.

- Implementation: `flow/agent/react` in the repo
- User manual: `/en/docs/eino/core_modules/flow_integration_components/react_agent_manual/`

This orchestration is just a few dozen lines:

```go
graph = NewGraph[[]*Message, *Message](
   WithGenLocalState(func(ctx context.Context) *state {
      return &state{Messages: make([]*Message, 0, config.MaxStep+1)}
   }))

modelPreHandle = func(ctx context.Context, input []*Message, state *state) ([]*Message, error) {
    state.Messages = append(state.Messages, input...)
    return state.Messages, nil
}

_ = graph.AddChatModelNode(nodeKeyModel, chatModel, WithStatePreHandler(modelPreHandle))
_ = graph.AddEdge(START, nodeKeyModel)
_ = graph.AddToolsNode(nodeKeyTools, toolsNode)

modelPostBranch = NewStreamGraphBranch(
   func(_ context.Context, sr *schema.StreamReader[*Message]) (endNode string, err error) {
      defer sr.Close()
      if msg, err := sr.Recv(); err != nil { return "", err }
      if len(msg.ToolCalls) == 0 { return END, nil }
      return nodeKeyTools, nil
   }, map[string]bool{nodeKeyTools: true, END: true})

_ = graph.AddBranch(nodeKeyModel, modelPostBranch)
_ = graph.AddEdge(nodeKeyTools, nodeKeyModel)

agent, _ := graph.Compile(ctx, WithMaxRunSteps(config.MaxStep))
```

Behind these lines, Eino automatically:

- Performs type checking at compile-time to ensure neighbor node compatibility
- Boxes streams so the compiled runnable supports `Invoke` and `Stream`, regardless of internal streaming support
- Manages concurrency; `state` reads/writes are safe
- Injects callbacks when components lack them
- Dispatches call options across nodes

## Eino’s Unique Advantages

LLM applications evolve rapidly; a great framework must encapsulate “stable” domain abstractions while expanding horizontally and vertically as research progresses.

Python-first stacks like LangChain/LlamaIndex move quickly but inherit dynamic-typing maintenance challenges. As LLM apps reach production scale, Go’s strong types bring reliability and maintainability.

Eino is practice-driven — built with feedback and iteration across Doubao/TikTok and other high-frequency, diverse scenarios.

Beyond APIs, production frameworks need tooling for real complex scenarios.

### Stable Core

- Common component interfaces with clear IO types, options, and streaming paradigms
- Base capabilities: streaming, callbacks, option extensions beyond interface boundaries
- Orchestration paradigms: Chain (DAG), Graph (directed), Workflow (DAG with field mapping)

<a href="/img/eino/eino_features_and_design.png" target="_blank"><img src="/img/eino/eino_features_and_design.png" width="100%" /></a>

### Agile Extensibility

- Horizontal expansion: multiple implementations per component (OpenAI, Gemini, Claude, etc.) with special features
- `Lambda`: declare custom functions as first-class nodes with full streaming paradigms and callbacks
- Prebuilt paradigms: ReAct Agent, Host Multi-Agent, and more — encapsulating proven practice

<a href="/img/eino/eino_modules_types.png" target="_blank"><img src="/img/eino/eino_modules_types.png" width="100%" /></a>

### Reliable and Maintainable

- Strong typing provides a “map” for maintainers; explicit types for components/lambdas/orchestrations
- Compile-time graph type checks surface issues early, avoiding runtime surprises
- Modular design, minimal dependencies per module; APIs are simple, intuitive, and consistent; layered architecture for stability and maintainability

<a href="/img/eino/eino_structure.png" target="_blank"><img src="/img/eino/eino_structure.png" width="100%" /></a>

### Practice-Driven

Design evolves from real needs and usage. Examples: Workflow designed for field-granularity mapping; `Message` structure enhanced based on Doubao feedback.

<a href="/img/eino/eino_practice_cognition_loop.png" target="_blank"><img src="/img/eino/eino_practice_cognition_loop.png" width="100%" /></a>

### Tooling Ecosystem

Tracing, debugging, and visualization are first-class. Eino ships tracing callbacks and integrates with APMPlus and Langfuse. IDE plugins visualize graphs from code, enable debugging, and even generate Eino code from drag-and-drop orchestration.

## Quick Start

Explore the Eino User Manual to learn concepts and build AI apps with Eino:

- Quick Start: `/en/docs/eino/quick_start/`

For questions, reach us via the community or [Eino Issues](https://github.com/cloudwego/eino/issues).

## Links

- Project: https://github.com/cloudwego/eino, https://github.com/cloudwego/eino-ext
- Website: https://www.cloudwego.io

Join the community:

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>
