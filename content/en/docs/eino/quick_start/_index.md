---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Quick Start
weight: 2
---

This document serves as the unified entry point for the ChatWithEino Quickstart: a clear path to get you up and running, along with an explanation of what this series ultimately delivers (an extensible end-to-end Agent application skeleton).

## What Is This

ChatWithEino is a learning-oriented Agent built with Eino: it can read source code/docs/examples and help developers understand Eino and write Eino code through conversation.

This Quickstart series follows a "progressive build-up" approach:

- Start with a Console app, progressively introducing ChatModel, Agent/Runner, Memory, Tool, Middleware, Callback, Interrupt/Resume, Graph Tool, and Skill
- Ultimately deliver the same Agent as a Web app, using the A2UI protocol to render the event stream into an incrementally updating UI

## The Shortest Path: Run It First

In the repository root:

```bash
git clone https://github.com/cloudwego/eino-examples.git
cd eino-examples/quickstart/chatwitheino
```

### 1) Minimal Console (Chapter 1)

Prepare model configuration (using OpenAI as an example):

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4.1-mini"
```

Run:

```bash
go run ./cmd/ch01 -- "Explain in one sentence what problem Eino's Component design solves."
```

### 2) Final Web (A2UI)

```bash
go run .
```

After it starts, open the address printed in the output (default `http://localhost:8080`).

### 3) (Optional) Enable Skills (Chapter 9 Capability Reuse)

Skills inject a stable set of "knowledge/instruction packs" (`SKILL.md` + `reference/*.md`) into the Agent, so the model can load and call them on demand when needed.

```bash
go run ./scripts/sync_eino_ext_skills.go -src /path/to/eino-ext -dest ./skills/eino-ext -clean
EINO_EXT_SKILLS_DIR="$(pwd)/skills/eino-ext" go run .
```

Notes:

- The `./skills/` directory is ignored by `.gitignore` by default, to avoid accidentally committing synced skills
- To verify Skills take effect, run the Chapter 9 entry code:
  - [https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)

## Learning Path (Chapter Navigation)

<table>
<tr><td>Chapter</td><td>Topic</td><td>Entry</td></tr>
<tr><td>Chapter 1</td><td>ChatModel and Message (Console)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch01_chatmodel_agent_console.md</td></tr>
<tr><td>Chapter 2</td><td>Agent and Runner (Console Multi-turn)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch02_chatmodel_agent_runner_console.md</td></tr>
<tr><td>Chapter 3</td><td>Memory and Session (Persistent Conversation)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch03_memory_session_jsonl.md</td></tr>
<tr><td>Chapter 4</td><td>Tool and File System Access</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch04_tool_backend_filesystem.md</td></tr>
<tr><td>Chapter 5</td><td>Middleware (Middleware Pattern)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch05_middleware.md</td></tr>
<tr><td>Chapter 6</td><td>Callback and Trace (Observability)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch06_callback.md</td></tr>
<tr><td>Chapter 7</td><td>Interrupt/Resume</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch07_interrupt_resume.md</td></tr>
<tr><td>Chapter 8</td><td>Graph Tool (Complex Workflows)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch08_graph_tool.md</td></tr>
<tr><td>Chapter 9</td><td>Skill (Console)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch09_skill.md</td></tr>
<tr><td>Final Chapter</td><td>A2UI (Web)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch10_a2ui.md</td></tr>
</table>

## Final Deliverable: An Extensible End-to-End Agent Application Skeleton

You can think of the final output of this Quickstart as a "pluggable application skeleton" that connects Eino's key capabilities into a full loop:

- Runtime: Runner drives execution, supporting streaming output and the event model
- Tools: integrate file system/retrieval/workflows via Tool
- Middleware: carry cross-cutting concerns like retries, approvals, and error handling via handler/middleware
- Human-in-the-loop: interrupt/resume + checkpoint enable interactive flows like approval, missing-arg filling, and branch selection
- Deterministic orchestration: compose (graph/chain/workflow) organizes complex business flows into maintainable, reusable execution graphs
- UI delivery: map the Agent event stream to an incrementally renderable UI component tree with A2UI (SSE push)

The boundary of A2UI is important to clarify: it is not part of the Eino framework itself; it is a business-layer UI protocol/rendering solution. This Quickstart uses it to demonstrate "how Agent capabilities can be delivered as a product to users". The specific implementation and protocol details are defined by the final chapter.

## Next Explorations (From Quickstart to Real Business)

- To systematically understand Eino's component abstractions and usage: start from Chapter 1's Component introduction, then progressively fill in Tool/Graph/Callback/Interrupt and other capabilities chapter by chapter
- To reuse larger-scale knowledge and instructions: integrate `eino-ext` skills and load them on demand via Skill middleware
- To build an Agent into a business product: follow the final chapter (A2UI/Web) to connect event stream, state, and interaction, then replace with your own UI form and protocol
