---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: 'Quick Start'
weight: 2
---

This page is the unified entrypoint for the ChatWithEino Quickstart series: it provides a clear path to get you running and explains what you will build by the end (an extensible end-to-end Agent application skeleton).

## What is this

ChatWithEino is a learning-oriented Agent built with Eino: it can read source code/docs/examples and help developers understand Eino and write Eino code through conversation.

This Quickstart series follows a “progressive build-up” approach:

- Start with a Console app, then progressively introduce ChatModel, Agent/Runner, Memory, Tools, Middleware, Callback, Interrupt/Resume, Graph Tool, and Skill
- Deliver the same Agent as a Web app in the end, and use the A2UI protocol to render the event stream into an incrementally updating UI

## The shortest path: run it first

In the repository root:

```bash
git clone https://github.com/cloudwego/eino-examples.git
cd eino-examples/quickstart/chatwitheino
```

### 1) Minimal Console (Chapter 1)

Prepare model config (OpenAI as an example):

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4.1-mini"
```

Run:

```bash
go run ./cmd/ch01 -- "Explain in one sentence what problem Eino’s Component design solves."
```

### 2) Final Web (A2UI)

```bash
go run .
```

After it starts, open the address printed in the output (default `http://localhost:8080`).

### 3) (Optional) Enable skills (Chapter 9 capability reuse)

Skills inject a stable set of “knowledge/instruction packs” (`SKILL.md` + `reference/*.md`) into the Agent, so the model can load and call them on demand when needed.

```bash
go run ./scripts/sync_eino_ext_skills.go -src /path/to/eino-ext -dest ./skills/eino-ext -clean
EINO_EXT_SKILLS_DIR="$(pwd)/skills/eino-ext" go run .
```

Notes:

- The `./skills/` directory is ignored by `.gitignore` by default, to avoid accidentally committing synced skills
- To verify Skills take effect, run the Chapter 9 entry code:
  - [https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)

## Learning path (chapter navigation)

<table>
<tr><td>Chapter</td><td>Topic</td><td>Entry</td></tr>
<tr><td>Chapter 1</td><td>ChatModel and Message (Console)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch01_chatmodel_agent_console.md</td></tr>
<tr><td>Chapter 2</td><td>Agent and Runner (Console multi-turn)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch02_chatmodel_agent_runner_console.md</td></tr>
<tr><td>Chapter 3</td><td>Memory and Session (persistent conversation)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch03_memory_session_jsonl.md</td></tr>
<tr><td>Chapter 4</td><td>Tools and file system access</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch04_tool_backend_filesystem.md</td></tr>
<tr><td>Chapter 5</td><td>Middleware pattern</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch05_middleware.md</td></tr>
<tr><td>Chapter 6</td><td>Callback and Trace (observability)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch06_callback.md</td></tr>
<tr><td>Chapter 7</td><td>Interrupt/Resume</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch07_interrupt_resume.md</td></tr>
<tr><td>Chapter 8</td><td>Graph Tool (complex workflows)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch08_graph_tool.md</td></tr>
<tr><td>Chapter 9</td><td>Skill (Console)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch09_skill.md</td></tr>
<tr><td>Final</td><td>A2UI (Web)</td><td>https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch10_a2ui.md</td></tr>
</table>

## Final deliverable: an extensible end-to-end Agent application skeleton

You can think of the final output of this Quickstart as a “pluggable application skeleton” that connects Eino’s key capabilities into a full loop:

- Runtime: Runner drives execution, supporting streaming output and the event model
- Tools: integrate file system/retrieval/workflows via Tool
- Middleware: carry cross-cutting concerns like retries, approvals, and error handling via handler/middleware
- Human-in-the-loop: interrupt/resume + checkpoint enable interactive flows like approval, missing-arg filling, and branch selection
- Deterministic orchestration: compose (graph/chain/workflow) organizes complex business flows into maintainable, reusable execution graphs
- UI delivery: map the Agent event stream to an incrementally renderable UI component tree with A2UI (SSE push)

The boundary of A2UI is important: it is not part of the Eino framework itself; it is a business-layer UI protocol/rendering solution. This Quickstart uses it to demonstrate “how Agent capabilities can be delivered as a product”, and the details are defined by the final chapter.

## Next explorations (from Quickstart to real business)

- To systematically understand Eino’s component abstractions and usage: start from Chapter 1 and then fill in Tools/Graph/Callback/Interrupt step by step
- To reuse larger-scale knowledge and instruction packs: integrate `eino-ext` skills and load them on demand via Skill middleware
- To build an Agent into a business product: follow the final chapter (A2UI/Web) to connect event stream, state, and interaction, then replace it with your own UI form/protocol
