---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Chain & Graph Orchestration'
weight: 0
---

In LLM applications, `Components` are the smallest units that provide "atomic capabilities," such as:

- `ChatModel` provides the conversation capability of LLM
- `Embedding` provides semantic-based text vectorization capabilities
- `Retriever` provides relevant content retrieval capabilities
- `ToolsNode` provides the capability to execute external tools

> For detailed information on components, refer to: [Eino: Components](/en/docs/eino/core_modules/components)

An LLM application, in addition to needing these atomic capabilities, also needs to **combine and sequence** these atomic capabilities based on contextual business logic. This is called **Orchestration**.

Developing LLM applications has its own typical characteristics: The custom business logic itself is usually not very complex, primarily involving the combination and sequencing of "atomic capabilities."

In traditional code development, business logic is expressed through "code execution logic." When transitioning to LLM application development, the most straightforward approach is "to call components manually and use the results as inputs for subsequent component calls." Such an approach results in `messy code`, `difficulty in reuse`, and `lack of aspect-oriented capabilities`...

When developers pursue code that is '**elegant**' and follows the '**clean code principles**,' they find a significant gap when applying traditional code organization methods to LLM applications.

Eino's initial goal was to make LLM application development extremely simple, ensuring that the application code logic is "simple," "intuitive," "elegant," and "robust."

Eino has the following insights into "Orchestration":

- Orchestration should become a clear layer on top of business logic, **without embedding business logic into orchestration**.
- The core of the LLM application is "sequencing and combining components that provide atomic capabilities," **with components being the "first citizens" of orchestration**.
- From an abstract perspective, orchestration builds a network where data flows through. Each node within the network has specific format/content requirements for the flowing data. The key to a seamlessly flowing data network is "**whether the data formats between upstream and downstream nodes are aligned**?".
- The complexity of business scenarios will be reflected in the complexity of orchestration artifacts. Only **horizontal governance capabilities** can keep complex scenarios under control.
- LLMs will continue to develop rapidly, and so will LLM applications. Only applications with **expansion capabilities** will have vitality.

Therefore, Eino provides a solution for "orchestration based on the Graph model (node + edge), with **components** as atomic nodes and **upstream-downstream type alignment** as the foundation."

Specifically, the following features are implemented:

- Everything is centered around "components," standardizing the encapsulation of business functionalities, making **division of responsibilities clear** and **reuse** natural.
  - For more details, refer to: [Eino: Components](/en/docs/eino/core_modules/components)
- The complexity of business logic is encapsulated within the components, giving the orchestration layer a more global perspective, making **logic layers very clear**.
- Provides aspect capabilities and a callback mechanism that supports node-based **unified governance capabilities**.
  - For more details, refer to: [Eino: Callback Mannual](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)
- Provides a call option mechanism, **extensibility** is the most fundamental requirement of the system in rapid iterations.
  - For more details, refer to: [Eino: CallOption capabilities and specification](/en/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities)
- Provides an enhanced "type alignment" development method, reducing the mental burden on developers and leveraging Golang's **type safety** features.
  - For more details, refer to: [Eino: The design concept of orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)
- Provides an **"automated stream conversion"** capability, removing "stream" from the "source of complexity ranking" in the orchestration system.
  - For more details, refer to: [Eino Points of Streaming Orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

Graph itself is powerful and semantically complete, capable of rendering almost any "data flow network," such as "branching," "parallel," and "loop."

However, Graph is not without its drawbacks. Based on the "node" and "edge" model, Graph requires developers to use the `graph.AddXXXNode()` and `graph.AddEdge()` interfaces to create a data channel, which is powerful but somewhat complex.

In most real-world business scenarios, simply "connecting in sequence" is often sufficient. Therefore, Eino encapsulates an easier-to-use interface called `Chain`. Chain is a wrapper around Graph, exposing almost all of Graph's capabilities except for "loops."
