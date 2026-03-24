---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: "Chapter 10: A2UI Protocol (Streaming UI Components)"
weight: 10
---

Goal of this chapter: implement the A2UI protocol and render agent output as streaming UI components.

## Important: A2UI’s boundary

A2UI is not part of the Eino framework itself. It is a business-layer UI protocol/rendering approach. This chapter integrates A2UI into the agent built in earlier chapters to provide an end-to-end, production-ready example: model calls, tool calls, workflow orchestration, and finally presenting results in a more user-friendly UI.

In real-world products, you can choose different UI forms depending on your product:

- Web/App: custom components, tables, cards, charts
- IM/office suite: message cards, interactive forms
- CLI: plain text or TUI (terminal UI)

Eino focuses on “composable intelligent execution and orchestration.” “How to present to users” is a business-layer concern you can extend freely.

## Code location

- Entry: [main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/main.go)
- Agent construction: [agent.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/agent.go)
- Server routes: [server/server.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/server/server.go)
- A2UI subset types: [a2ui/types.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/types.go)
- A2UI event streamer: [a2ui/streamer.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/streamer.go)
- Frontend page: [static/index.html](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/static/index.html)

## Prerequisites

Same as Chapter 1: configure a ChatModel (OpenAI or Ark).

## Run

In `quickstart/chatwitheino`, run:

```bash
go run .
```

Output example:

```
starting server on http://localhost:8080
```

### (Optional) Enable ch09 skills

The final web agent aligns with Chapter 9 logic: when `EINO_EXT_SKILLS_DIR` points to a valid skills directory, it registers the `skill` middleware so the model can load `eino-guide` / `eino-component` / `eino-compose` / `eino-agent` on demand.

```bash
go run ./scripts/sync_eino_ext_skills.go -src /path/to/eino-ext -dest ./skills/eino-ext -clean
EINO_EXT_SKILLS_DIR="$(pwd)/skills/eino-ext" go run .
```

## From text to UI: why A2UI

The agents we built in the first eight chapters only output text, but modern AI applications need richer interaction.

**Limitations of pure text:**

- Cannot display structured data (tables, lists, cards)
- Cannot update in real time (progress, status changes)
- Cannot embed interactive elements (buttons, forms, links)
- Cannot support multimedia (images, video, audio)

**A2UI’s positioning:**

- **A2UI is a protocol from agent to UI**: defines how agent outputs map to UI components
- **A2UI supports streaming rendering**: components update in real time without waiting for the full response
- **A2UI is declarative**: the agent declares “what to show” and the UI handles rendering

**Simple analogy:**

- **Plain text output** = “terminal CLI” (text only)
- **A2UI** = “web app” (can render any UI components)

## Key concepts

### A2UI v0.8 subset (scope of this example)

This quickstart does not implement a “full A2UI standard library.” Instead, it implements a **subset of A2UI v0.8**: the goal is to push the agent event stream to the browser as a stable, incrementally renderable UI component tree.

The current supported A2UI message types and component types are defined in [a2ui/types.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/types.go).

### A2UI messages: BeginRendering / SurfaceUpdate / DataModelUpdate / InterruptRequest

Each SSE line (`data: {...}`) carries one A2UI Message. The Message is an “envelope” that contains exactly one field:

**Key snippet (simplified; see a2ui/types.go for the full code):**

```go
type Message struct {
    BeginRendering   *BeginRenderingMsg
    SurfaceUpdate    *SurfaceUpdateMsg
    DataModelUpdate  *DataModelUpdateMsg
    DeleteSurface    *DeleteSurfaceMsg
    InterruptRequest *InterruptRequestMsg
}
```

Where:

- `BeginRendering`: tells the frontend “start rendering a surface (session)” and provides the root node ID
- `SurfaceUpdate`: adds/updates a batch of components (components form a tree and reference each other by id)
- `DataModelUpdate`: updates data bindings (for streaming incremental text into a Text component)
- `InterruptRequest`: when the agent triggers an interrupt (e.g. approval), asks the frontend to render approve/reject entry points

### A2UI components: Text / Column / Card / Row

This example implements only 4 UI components (see [a2ui/types.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/types.go)):

- `Text`: text rendering (supports `usageHint` to distinguish caption/body/title); when `dataKey` exists, text comes from `DataModelUpdate`
- `Column` / `Row`: layout (children is a list of component IDs)
- `Card`: card container (children is a list of component IDs)

## A2UI implementation: converting AgentEvent to A2UI SSE

The core web pipeline is:

- Run the agent to get `*adk.AsyncIterator[*adk.AgentEvent]`
- Convert the event stream to A2UI JSONL/SSE for the browser (see [a2ui/streamer.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/streamer.go))
- Frontend parses SSE `data:` lines and renders the component tree (see [static/index.html](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/static/index.html))

### Server routes (high level)

Key endpoints related to A2UI (see [server/server.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/server/server.go)):

- `GET /`: serves the frontend page `static/index.html`
- `POST /sessions/:id/chat`: returns SSE stream (A2UI messages), renders the agent output as it runs
- `GET /sessions/:id/render`: returns JSONL (A2UI messages) for replaying history
- `POST /sessions/:id/approve`: handles interrupt approval/rejection and continues streaming

### Event streaming (high level)

The server passes `Runner.Run(...)` events to `a2ui.StreamToWriter(...)`, which:

- splits user/assistant/tool outputs
- renders tool call / tool result as “chip cards”
- turns assistant streaming tokens into `DataModelUpdate` for incremental rendering
- sends `InterruptRequest` when an interrupt happens, and waits for human approval

## Frontend integration: fetch + SSE (not WebSocket)

- The frontend calls `fetch('/sessions/:id/chat')`, then reads `res.body` as a stream, splits by lines, and parses `data: {...}` JSON (see [static/index.html](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/static/index.html)).

**Key snippet (simplified; see static/index.html for full code):**

```javascript
const res = await fetch(`/sessions/${id}/chat`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({message}),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, {stream: true});
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const jsonStr = trimmed.slice(5).trimStart();
      processA2UIMessage(JSON.parse(jsonStr));
    }
  }
}
```

## A2UI streaming flow (overview)

```
┌─────────────────────────────────────────┐
│  User: Analyze this file                │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent starts        │
        │  A2UI: AddText       │
        │  "Analyzing..."      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool call           │
        │  A2UI: AddProgress   │
        │  Progress: 0%        │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool running        │
        │  A2UI: UpdateProgress│
        │  Progress: 50%       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool finished       │
        │  A2UI: tool result   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Show result         │
        │  A2UI: DataModelUpdate│
        │  (stream assistant)  │
        └──────────────────────┘
```

## Chapter summary

- **A2UI**: a protocol from agent to UI defining how agent output maps to UI components
- **Subset implementation**: this example only implements Text/Column/Card/Row plus data binding
- **Streaming output**: the backend streams A2UI JSONL over SSE, the frontend renders incrementally
- **Events to UI**: convert `AgentEvent` into visual outputs for tool calls, tool results, and assistant streams

## Series wrap-up: the full vision of this Quickstart Agent

By the end of this chapter, we have an agent that ties together Eino’s core capabilities. Think of it as an extensible “end-to-end agent application skeleton”:

- Runtime: Runner-driven execution with streaming output and event model
- Tooling: filesystem/shell tools with safe error handling
- Middleware: pluggable middleware/handlers for errors, retries, approvals, and more
- Observability: callbacks/trace to connect key pipelines for debugging and production monitoring
- Human-in-the-loop: interrupt/resume + checkpoint for approvals, parameter requests, branch choices
- Deterministic orchestration: compose (graph/chain/workflow) organizes complex business flows
- Delivery: UI integration like A2UI is business-layer — pick what fits your product

You can gradually replace/extend any part: models, tools, storage, workflows, frontend protocol — without starting over.

## Further exploration

**Other component types:**

- Chart components (line, bar, pie)
- Map components
- Timeline components
- Tree components
- Tabs components

**Advanced features:**

- Component interactions (click, drag, input)
- Conditional rendering
- Component animations
- Responsive layout
