---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Core Modules'
weight: 3
---

The core modules in Eino include the following parts:

- **Components**: [Eino: Components](/en/docs/eino/core_modules/components)

Eino abstracts commonly used components in LLM applications, such as `ChatModel`, `Embedding`, `Retriever`, etc. These are the building blocks for constructing an LLM application, forming the foundation of application capabilities and serving as atomic objects for complex logic orchestration.

- **Chain/Graph Orchestration**: [Eino: Chain & Graph Orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration)

Using multiple components in combination to implement the chain of business logic, Eino provides orchestration methods through Chains/Graphs, encapsulating the complexity of linking business logic within Eino itself. It offers easy-to-understand business logic orchestration interfaces and provides a unified cross-sectional governance capability.

- **Flow Integration Tools (Agents)**: [Eino: Flow integration components](/en/docs/eino/core_modules/flow_integration_components)

Eino packages the most commonly used LLM application modes into simple and easy-to-use tools, ultra-simplifying the development of LLM applications for generic scenarios. Currently, it provides `ReAct Agent` and `Host Multi Agent`.

- **EinoDev Development Assistant Tool**: [EinoDev: Devops tools](/en/docs/eino/core_modules/devops)

Eino is dedicated to making the development of large-scale model applications with full-code very simple, and EinoDev provides a `visual` and `interactive` development and debugging solution for Eino orchestration, which allows developers to see the results immediately, releasing their energy from the `debugging hell` and focusing on the scene logic.
