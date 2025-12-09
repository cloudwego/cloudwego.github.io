---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Core Modules'
weight: 3
---

Eino’s core modules include the following parts:

- **Components**: [Eino: Components](/en/docs/eino/core_modules/components)

  Eino abstracts commonly used components in LLM applications, such as `ChatModel`, `Embedding`, `Retriever`. These are the building blocks for application capabilities and the atomic objects in complex orchestration.

- **Chain/Graph Orchestration**: [Eino: Chain/Graph Orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/chain_graph_introduction)

  Multiple components are combined to implement business logic. Eino provides Chain/Graph orchestration that encapsulates the complexity inside Eino, exposing easy-to-understand interfaces for logic composition and unified cross-cutting governance.

- **Flow Integration (agents)**: [Eino: Flow Integration Components](/en/docs/eino/core_modules/flow_integration_components)

  Eino wraps common LLM application patterns into simple and easy-to-use tools to greatly simplify development for general scenarios. Currently available: `ReAct Agent` and `Host Multi Agent`.
