---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Quick Start'
weight: 2
---

## Overview

Eino offers component abstractions tailored for common AI application scenarios, with multiple implementations available. Getting a simple application up and running with Eino is **very straightforward**. This section presents a few of the most typical AI application examples to help you get productive quickly.

These small examples are meant for quick onboarding. For deeper dives into specific capabilities and extended samples, see [Components](/docs/eino/core_modules/components) and [Orchestration](/docs/eino/core_modules/chain_and_graph_orchestration/chain_graph_introduction).

## Quick Start Examples

### Example: Minimal LLM Application

The most basic pattern in LLM applications is a `prompt + chat model`, which is also the primary capability offered by many AI platforms. You can define a `System Prompt` to constrain the model’s behavior (for example, “You are acting as role XXX”). In this example, you can combine Eino’s `PromptTemplate` and `ChatModel` components to build a role-playing application.

- [Implement a minimal LLM application — ChatModel](/docs/eino/quick_start/simple_llm_application)

### Example: Build an Agent

The LLM is the brain of an AI application: it understands natural language and produces responses. A text-only LLM accepts text and returns text. When you want the model to fetch information or perform actions, you introduce `Tools`. With tools, the model gains “hands” that can interact with existing IT infrastructure. For example, “call an HTTP API to check the weather, then suggest what to wear” requires the model to call a “search tool”.

We call the overall system that decides when to call specific tools based on model outputs an “agent”.

In Eino, you can implement an agent with `ChatModel + ToolsNode`, or use the built-in `react agent` and `multi agent` packages.

In this example, we’ll use the ReAct agent to build an agent that interacts with the real world.

- [Agent — Give your LLM hands](/docs/eino/quick_start/agent_llm_with_tools)

## Next Steps

- Understand Eino’s core modules and concepts: [Eino: Core Modules](/docs/eino/core_modules). This is the key knowledge to fluently develop applications with Eino.
- Eino embraces an open ecosystem and provides numerous integration components: [Eino: Ecosystem Integration](/docs/eino/ecosystem_integration). Use these components to quickly assemble your business applications.

