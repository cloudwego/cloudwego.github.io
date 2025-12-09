---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino ADK: Quickstart'
weight: 1
---

# Installation

Eino provides ADK from `v0.5.0`. Upgrade your project:

```go
// stable >= eino@v0.5.0
go get github.com/cloudwego/eino@latest
```

# Agent

### What is Eino ADK

Eino ADK, inspired by [Google‑ADK](https://google.github.io/adk-docs/agents/), is a Go framework for building Agent and Multi‑Agent applications. It standardizes context passing, event streaming, task transfer, interrupts/resume, and cross‑cutting features.

### What is an Agent

An Agent represents an executable, intelligent task unit with a clear name and description so other agents can discover and transfer tasks to it. Typical use cases:

- Query weather information
- Book meetings
- Answer domain‑specific questions

### Agent in ADK

All ADK features build on the `Agent` abstraction:

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput) *AsyncIterator[*AgentEvent]
}
```

ADK provides three base categories:

- `ChatModel Agent` — the “thinking” part powered by LLMs; understand, reason, plan, respond, and call tools
- `Workflow Agents` — coordination layer with preset logic (sequential/parallel/loop). Deterministic, predictable flows.
  - Sequential — execute subagents in order
  - Loop — repeat subagents until a condition
  - Parallel — run subagents concurrently
- `Custom Agent` — implement the interface for bespoke logic

Combine these to compose Multi‑Agent systems. Eino also offers built‑in best‑practice paradigms:

- Supervisor — centralized coordinator controlling communications and delegation
- Plan‑Execute — planner generates steps; executor carries them out; replanner decides finish or replan

<a href="/img/eino/eino_adk_quick_start_agent_types.png" target="_blank"><img src="/img/eino/eino_adk_quick_start_agent_types.png" width="100%" /></a>

<table>
<tr><td>Category</td><td>ChatModel Agent</td><td>Workflow Agents</td><td>Custom Logic</td><td>EinoBuiltInAgent (supervisor, plan‑execute)</td></tr>
<tr><td>Function</td><td>Thinking, generation, tool calls</td><td>Control execution flow among agents</td><td>Run custom logic</td><td>Out‑of‑the‑box multi‑agent patterns</td></tr>
<tr><td>Core</td><td>LLM</td><td>Predetermined flows (sequential/parallel/loop)</td><td>Custom code</td><td>High‑level encapsulation based on Eino practice</td></tr>
<tr><td>Purpose</td><td>Generation, dynamic decisions</td><td>Structured orchestration</td><td>Specific customization</td><td>Turnkey solutions for common scenarios</td></tr>
</table>

# ADK Examples

Explore examples in [Eino‑examples](https://github.com/cloudwego/eino-examples/tree/main/adk). The table summarizes project paths, key points, and diagrams:

<table>
<tr><td>Project Path</td><td>Intro</td><td>Diagram</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/sequential">Sequential workflow</a></td><td>This example shows a sequential multi‑agent workflow built with Eino ADK’s Workflow paradigm.<li>Sequential construction: create a ResearchAgent via adk.NewSequentialAgent with two subagents — PlanAgent (planning) and WriterAgent (writing).</li><li>Clear responsibilities: PlanAgent outputs a detailed plan; WriterAgent writes a structured report based on the plan.</li><li>Chained IO: PlanAgent’s output feeds WriterAgent’s input, illustrating ordered dependency.</li></td><td><a href="/img/eino/eino_adk_sequential_quickstart.png" target="_blank"><img src="/img/eino/eino_adk_sequential_quickstart.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/loop">Loop workflow</a></td><td>Built with LoopAgent to form a reflection‑iteration framework.<li>Iterative reflection: ReflectionAgent combines MainAgent (solve) and CritiqueAgent (review), up to 5 iterations.</li><li>MainAgent: produces an initial solution.</li><li>CritiqueAgent: audits quality, suggests improvements; terminates when satisfactory.</li><li>Loop mechanism: repeatedly improves outputs across iterations.</li></td><td><a href="/img/eino/eino_adk_loop_agent.png" target="_blank"><img src="/img/eino/eino_adk_loop_agent.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/parallel">Parallel workflow</a></td><td>Built with ParallelAgent for concurrent data collection.<li>Concurrent framework: DataCollectionAgent launches multiple info collectors.</li><li>Responsibility split: each subagent handles one channel independently.</li><li>Parallel execution: starts tasks simultaneously to improve throughput.</li></td><td><a href="/img/eino/eino_adk_parallel_use_case.png" target="_blank"><img src="/img/eino/eino_adk_parallel_use_case.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/supervisor">supervisor</a></td><td>Single‑layer Supervisor manages two composite subagents: Research Agent (retrieval) and Math Agent (math operations: add/multiply/divide). All math ops are handled by one Math Agent rather than splitting into many; suitable for focused tasks and quick deployment.</td><td><a href="/img/eino/eino_adk_supervisor.png" target="_blank"><img src="/img/eino/eino_adk_supervisor.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/layered-supervisor">layered‑supervisor</a></td><td>Multi‑tier supervision: top Supervisor manages Research Agent and Math Agent; Math Agent further manages Subtract/Multiply/Divide subagents.<li>Top Supervisor delegates research/math tasks.</li><li>Mid‑tier Math Agent delegates specific operations.</li>Good for fine‑grained decomposition and multi‑level delegation.</td><td><a href="/img/eino/eino_adk_supervisor_example.png" target="_blank"><img src="/img/eino/eino_adk_supervisor_example.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/plan-execute-replan">plan‑execute example</a></td><td>Implements a plan‑execute‑replan travel planner: Planner generates stepwise plan; Executor calls mock tools (get_weather/search_flights/search_hotels/search_attractions/ask_for_clarification); Replanner decides replan or finish. Two layers:<li>Layer 2: loop of execute + replan.</li><li>Layer 1: sequential of plan + layer‑2 loop.</td><td><a href="/img/eino/eino_adk_plan_execute_replan.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/chatmodel">book recommendation agent</a> (interrupt/resume)</td><td>Demonstrates a ChatModel agent with tools and checkpointing.<li>Agent: BookRecommender via adk.NewChatModelAgent.</li><li>Tools: BookSearch and AskForClarification.</li><li>State: in‑memory checkpoint storage.</li><li>Events: iterate runner.Query and runner.Resume.</li><li>Custom input: drive flow via options.</li></td><td><a href="/img/eino/eino_adk_sequence_diagram.png" target="_blank"><img src="/img/eino/eino_adk_sequence_diagram.png" width="100%" /></a></td></tr>
</table>

# What's Next

After this quickstart, you should have a basic understanding of Eino ADK and Agents.

The next articles dive into ADK core concepts to help you understand its internals and use it effectively:

<a href="/img/eino/eino_adk_directory_structure.png" target="_blank"><img src="/img/eino/eino_adk_directory_structure.png" width="100%" /></a>
