---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Chain & Graph & Workflow Orchestration'
weight: 2
---

In LLM applications, `Components` provide atomic capabilities such as:

- `ChatModel`: chat-oriented LLM interaction
- `Embedding`: semantic vectorization for text
- `Retriever`: retrieving relevant content
- `ToolsNode`: invoking external tools

> For component details: [Eino: Components](/en/docs/eino/core_modules/components)

Beyond atomic capabilities, applications must combine and chain them according to business scenarios. This is **orchestration**.

LLM application development has a typical character: custom business logic is rarely complex; most of the work is composing and chaining atomic capabilities.

If you simply call components manually and pass outputs downstream by hand, you end up with code that is messy, hard to reuse, and lacks cross-cutting aspects.

To keep code elegant and clean, Eino makes LLM app development simple, intuitive, and robust.

Eino’s perspective on orchestration:

- Orchestration should be a clear layer above business logic — **do not blend business logic into orchestration**.
- LLM applications center on composing components; **components are first-class citizens of orchestration**.
- Abstractly, orchestration builds a network through which data flows. Each node imposes requirements on the data’s format/content. A smooth network hinges on **type alignment between upstream and downstream nodes**.
- Real-world complexity appears in orchestration artifacts; only **horizontal governance** keeps complexity controlled.
- LLMs and applications evolve quickly; only **extensible applications** remain viable.

Therefore, Eino offers a graph-based model (`node + edge`) where **components** are atomic nodes and **type alignment** underpins orchestration.

Specifically:

- Everything centers on components. Clear encapsulation yields clear responsibilities and natural reuse.
  - See: [Eino: Components](/en/docs/eino/core_modules/components)
- Push business complexity into component implementations; the orchestration layer maintains global clarity.
- Provide aspect capabilities via callbacks, enabling **unified governance** at the node level.
  - See: [Eino: Callback Manual](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)
- Provide call options for **extensibility** during rapid iteration.
  - See: [Eino: Call Option Capabilities](/en/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities)
- Reinforce **type alignment** to reduce cognitive load and leverage Go’s type safety.
  - See: [Eino: Orchestration Design Principles](/en/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)
- Provide **automatic stream conversion**, removing “stream handling” from the list of orchestration complexity sources.
  - See: [Eino: Streaming Essentials](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

Graphs are powerful and semantically complete; you can express branches, parallelism, and loops. The tradeoff is using `graph.AddXXXNode()` and `graph.AddEdge()` — powerful, but a bit verbose.

Most real scenarios only need sequential chaining. Eino exposes `Chain`, a simpler interface that wraps `Graph`. Except for cycles, `Chain` surfaces nearly all `Graph` capabilities.

