---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Large Language Model Application Development Framework — Eino is Now Open Source!
weight: 0
---

Today, after more than six months of internal use and iteration at ByteDance, the Golang-based comprehensive LLM application development framework — Eino, has been officially open-sourced on CloudWeGo!

Based on clear "component" definitions, Eino provides powerful process "orchestration" covering the entire development lifecycle, aiming to help developers create the most sophisticated LLM applications in the shortest time possible.

Have you ever felt this way: wanting to add LLM capabilities to your application but not knowing where to start in this relatively new field; wanting to stay at the forefront of research and apply the latest industry achievements, but using an application development framework that hasn't been updated for months; trying to understand Python code in your project, needing to repeatedly check context to confirm a variable or parameter type; unsure whether the model-generated results are good enough and hesitant to use them; needing to explore and learn additional tools for necessary aspects beyond development like debugging, tracing, and evaluation. If so, welcome to Eino! As a LLM application development framework aimed at covering the entire devops process, Eino has the following characteristics:

- Stable core, simple and understandable API, clear onboarding path, and smooth learning curve.
- Ultimate extensibility, highly active development work, long-term sustainability.
- Based on strongly-typed Golang, readable code, easy maintenance, high reliability.
- Backed by extensive practical experience from ByteDance's core business lines.
- Provides out-of-the-box supporting tools.

Eino has become the preferred full-code development framework for LLM applications within ByteDance, with hundreds of services across multiple business lines including Doubao, Douyin, Coze and more already using it.

Project repositories: [https://github.com/cloudwego/eino](https://github.com/cloudwego/eino), [https://github.com/cloudwego/eino-ext](https://github.com/cloudwego/eino-ext)

Going forward, we will maintain Eino's open-source repository as the core codebase, adhering to the principle of **using the same code internally and externally**, working with the community to build the best LLM application development framework.

## Quick Introduction to Eino

Eino is a LLM application development framework covering the entire devops process, from best practice examples in Eino Examples to toolchains for various stages:

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

So what exactly can Eino do? First, Eino consists of "**components**" from the LLM domain, with the core being the Chat Model for interacting with large language models:

```go
model, _ := ark.NewChatModel(ctx, config) // create a doubao chat model
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")}
```

Using individual components directly like above is certainly fine, and Eino provides many useful component implementations to choose from. However, LLM applications have their own characteristics and patterns, such as:

- The core is the large language model, with business logic centered around "how to provide sufficient and effective context to the model" and "how to reliably let the model's output affect the environment". The core component types, data types, and interaction patterns are enumerable, and the whole can be described by a directed graph.
- LLM output is characterized by streaming output, meaning that all downstream components need to effectively handle streaming data, including real-time stream processing, stream copying, merging multiple streams, concatenating multiple items within a single stream, etc.
- Based on directed graphs, a series of sub-problems arise, including concurrent processing, fan-in/fan-out, general cross-cutting aspects, option allocation, etc.

Eino's orchestration capabilities provide a comprehensive solution to these common problems.

Taking ReAct Agent as an example: a ChatModel (large language model) is "bound" to Tools, receives input Messages, and autonomously decides whether to call Tools or output final results. The Tool execution results become Messages fed back to the ChatModel, serving as context for the next round of autonomous decision-making.

<a href="/img/eino/eino_graph_nodes_of_react_agent.png" target="_blank"><img src="/img/eino/eino_graph_nodes_of_react_agent.png" width="100%" /></a>

The above ReAct Agent, which makes autonomous decisions and route selections based on ChatModel, is implemented using Eino's Components and Graph orchestration, with clear and concise code that directly corresponds to the flowchart.

- For code implementation details, see: [flow/agent/react](https://github.com/cloudwego/eino/blob/main/flow/agent/react/react.go)
- For ReAct Agent user manual, see: [react_agent_manual](https://www.cloudwego.io/docs/eino/core_modules/flow_integration_components/react_agent_manual/)

In Eino, this is a graph orchestration of just dozens of lines of code:

```go
// create a ReAct Agent，compile it into a Runnable, with []*Message as input and *Message as output

// create a Graph with state. The state is used for storing message context
graph = NewGraph[[]*Message, *Message](
   WithGenLocalState(func(ctx context.Context) *state {
      return &state{Messages: make([]*Message, 0, config.MaxStep+1)}
   }))

// store the context and response per round into Graph's local state
modelPreHandle = func(ctx context.Context, input []*Message, state *state) ([]*Message, error) {
    state.Messages = append(state.Messages, input...)
    return state.Messages, nil
}

_ = graph.AddChatModelNode(nodeKeyModel, chatModel, WithStatePreHandler(modelPreHandle))

_ = graph.AddEdge(START, nodeKeyModel)

_ = graph.AddToolsNode(nodeKeyTools, toolsNode)

// chatModel may output a stream of multiple chunks
// this StreamGraphBranch could potentially decide only use the first chunk, reducing latency
modelPostBranch = NewStreamGraphBranch(
   func(_ context.Context, sr *schema.StreamReader[*Message]) (endNode string, err error) {
      defer sr.Close()

      if msg, err := sr.Recv(); err != nil {
         return "", err
      } else if len(msg.ToolCalls) == 0 {
         return END, nil
      }

      return nodeKeyTools, nil
   }, map[string]bool{nodeKeyTools: true, END: true})

_ =  graph.AddBranch(nodeKeyModel, modelPostBranch)

// toolsNode feeds back to chatModel
_ = graph.AddEdge(nodeKeyTools, nodeKeyModel)

// compile the Graph: type checking、callback injection、stream conversion、generate runner
agent, _ := graph.Compile(ctx, WithMaxRunSteps(config.MaxStep))
```

Behind these dozens of lines of code, Eino automatically handles several things:

- Type checking, ensuring type alignment between adjacent nodes at compile time.
- Stream encapsulation, the compiled Runnable can be called via both Invoke and Stream, regardless of whether the internal Tool supports streaming.
- Concurrency management, ensuring thread-safe read/write operations on the shared state.
- Cross-cutting aspect injection, automatically injecting callbacks if a component (like a tool) hasn't implemented them.
- Option allocation, the compiled Runnable can flexibly receive and distribute options to specified nodes.

## Eino's Unique Advantages

LLM-based software applications are in a rapid development phase, with new technologies, ideas, and practices constantly emerging. As application developers, we need to efficiently and reliably implement industry-consensus best practices while continuously learning and improving our understanding to comprehend the possibilities in this new field. Therefore, an excellent LLM application development framework needs to both **encapsulate the "unchanging" universal core elements** in the domain and **enable agile horizontal and vertical expansion** based on latest developments.

On the other hand, current mainstream frameworks like LangChain and LlamaIndex are Python-based. While they can quickly implement diverse functionalities by leveraging Python's rich ecosystem, they also inherit issues like "weak type checking" and "high long-term maintenance costs" that come with Python being a dynamic language. As LLM applications rapidly enter large-scale online operation phase, the **high reliability** and **high maintainability** achieved through Golang as a strongly-typed language are becoming increasingly valuable.

LLM-based application development is a relatively new field, sometimes requiring exploration and validation through practice. Leveraging ByteDance's high-frequency applications like Doubao and Douyin with their diverse scenarios, rapid iteration, and massive feedback, Eino has unique advantages in **practice-driven design**.

Finally, production-grade frameworks need to handle real, complex business scenarios. Therefore, besides intuitive and easy-to-use API design, providing purposefully designed development **tools** can effectively help developers understand and handle complexity while accelerating the development process.

### Stable Core

We believe there exists a common component list that collectively forms the common parts of LLM applications. Each component type, as an interface, has a complete and stable definition: specific input/output types, clear runtime options, and explicit stream processing paradigms.

Based on clear component definitions, we believe LLM application development has universal foundational capabilities, including but not limited to: stream programming capabilities for handling model output; Callback capabilities supporting cross-cutting functionality and exposing component internal states; and option extension capabilities for component implementations beyond the component interface definition.

Building on component definitions and universal foundational capabilities, we believe LLM application development has relatively fixed data flow and process orchestration paradigms: centered around ChatModel (LLM), injecting user input and system prompts through ChatTemplate, injecting context through Retriever, Document Loader & Transformer, etc., generating through ChatModel, outputting Tool Calls for execution or producing final results. Based on this, Eino provides different orchestration paradigms for these components: Chain, a chain-like directed acyclic graph; Graph, a directed graph or directed acyclic graph; Workflow, a directed acyclic graph with field mapping capabilities.

These designs and functionalities together form Eino's stable core:

<a href="/img/eino/eino_features_and_design.png" target="_blank"><img src="/img/eino/eino_features_and_design.png" width="100%" /></a>

### Agile Extension

Each component type can be horizontally extended with different implementations. For example, the ChatModel component can have different implementations like OpenAI, Gemini, Claude, etc. These specific implementations, while implementing the component interface to participate in orchestration, can implement and continuously extend their special functionalities.

When actual business scenarios require functionality that needs to be orchestrated but doesn't correspond to any component definition, Eino supports declaring custom functions as Lambda types. Lambda has user-declared input/output and option types, supports all stream processing paradigms, has complete Callback capabilities, and is equivalent to official components from an orchestration perspective.

In the LLM application development field, there are and will continue to emerge specific orchestration paradigms for multiple components. These paradigms encapsulate validated research results or practical experiences, such as ReAct Agent, Host Multi-Agent, etc. These out-of-the-box encapsulations, which distill the best practices in LLM application development, will continue to expand vertically as our understanding improves.

During component and graph execution, developers can embed custom callback logic at fixed timings to inject cross-cutting functionalities.

In summary, the Eino framework possesses comprehensive extensibility:

<a href="/img/eino/eino_modules_types.png" target="_blank"><img src="/img/eino/eino_modules_types.png" width="100%" /></a>

### High Reliability and Maintainability

When writing Eino code in Golang, developers can fully utilize Golang's strong typing features to declare specific types for all components, Lambdas, and orchestration products. This is like drawing a precise map for the code, allowing developers to maintain and extend along clear paths. Even as the project scale grows and functionality continues to iterate, high maintainability can still be preserved.

At the same time, Eino's orchestration capabilities also fully utilize the compile-time verification capabilities of the strong type system, exposing type matching issues at graph compilation time rather than runtime whenever possible. Early and clear exposure of type matching issues helps developers quickly locate and fix problems, reducing hard-to-diagnose failures and performance issues caused by type errors at runtime.

Additionally, Eino follows a modular design, with the core library and various component implementations as separate go modules, each go module achieving minimal dependencies. Meanwhile, the API design follows principles of "simplicity", "intuitiveness", and "isomorphism", supplemented by comprehensive documentation that progresses from basic to advanced, making the learning curve as smooth as possible. Most importantly, Eino adopts a clear layered design, with each layer having clear responsibilities and cohesive functionality, improving maintainability while better ensuring stability.

Eino Framework Structure Diagram:

<a href="/img/eino/eino_structure.png" target="_blank"><img src="/img/eino/eino_structure.png" width="100%" /></a>

### Practice-Driven

The design and development process of the Eino framework is rooted in two cornerstones: "meeting real needs" and "practice-driven design". The evolution of functionality is closely integrated with the adoption process across ByteDance's business lines, always listening to developers' voices and validating design rationality through practical usage. For example, we received a requirement from Douyin "hoping to map and transmit data at field granularity within the graph", based on which we designed Workflow; listening to pain points from Doubao, we enhanced the Message struct that serves as model input/output types. In the future process of building an open-source ecosystem, we will continue to adhere to these principles, meeting the real needs of a broader user and developer base, and practicing and refining diligently on a larger scale.

<a href="/img/eino/en_eino_listen_apply_act.png" target="_blank"><img src="/img/eino/en_eino_listen_apply_act.png" width="100%" /></a>

### Tool Ecosystem

Link tracing, debugging, and visualization are three important auxiliary tools for orchestration engines. Eino has built-in tracing callbacks and integrates with the APMPlus and Langfuse platform. It also provides IDE plugins that allow real-time visualization of orchestrated graphs while coding, debugging execution, and even quickly building graphs through UI drag-and-drop, which can be exported as Eino code.

## Quick Start

For learning and using Eino, we provide a comprehensive Eino user manual to help everyone quickly understand the concepts in Eino and master the skills of developing AI applications based on Eino. Start trying it out through "[Eino: Quick Start](https://www.cloudwego.io/docs/eino/quick_start/)"!

If you have any questions, you can communicate and provide feedback through the Lark group below or [Eino Issues](https://github.com/cloudwego/eino/issues)

## Related Links

Project repositories: [https://github.com/cloudwego/eino](https://github.com/cloudwego/eino), [https://github.com/cloudwego/eino-ext](https://github.com/cloudwego/eino-ext)

Project website: [https://www.cloudwego.io](https://www.cloudwego.io)

Scan the QR code to join the Lark community:

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>
