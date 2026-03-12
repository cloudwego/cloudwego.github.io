---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 9: A2UI Protocol (Streaming UI Components)"
weight: 9
---

Goal of this chapter: implement the A2UI protocol and render Agent outputs as streaming UI components.

## Important Note: The Scope of A2UI

A2UI is not part of the Eino framework itself. It is an application-layer UI protocol/rendering approach. This chapter integrates A2UI into the Agent we built in previous chapters to provide an end-to-end, runnable example: model calls, tool calls, workflow orchestration, and finally presenting results with a more user-friendly UI.

In real products, you can choose different UI forms depending on your needs, for example:

- Web / App: custom components, tables, cards, charts, etc.
- IM / office suite: message cards, interactive forms
- CLI: plain text or TUI (terminal UI)

Eino focuses on “composable execution and orchestration”. “How to present results to users” is an application-layer extension point.

## Code Location

- Entry code: [main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/main.go)
- A2UI implementation: [a2ui/streamer.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/a2ui/streamer.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark).

## Run

From `examples/quickstart/chatwitheino`:

```bash
go run .
```

Example output:

```
starting server on http://localhost:8080
```

## From Text to UI: Why A2UI

In the first eight chapters, our Agent output only text, but modern AI applications often require richer interactions.

**Limitations of pure text:**

- cannot display structured data (tables, lists, cards, etc.)
- cannot update in real time (progress bars, status changes, etc.)
- cannot embed interactive elements (buttons, forms, links, etc.)
- cannot support multimedia (images, video, audio, etc.)

**What A2UI is for:**

- **A2UI is a protocol from Agent to UI**: defines how Agent outputs map to UI components
- **A2UI supports streaming rendering**: components can update in real time
- **A2UI is declarative**: the Agent declares “what to display”, and the UI renders it

**Analogy:**

- **text output** = “terminal CLI” (text only)
- **A2UI** = “web app UI” (can display arbitrary components)

## Key Concepts

### A2UI Components

A2UI defines a series of UI component types:

```go
type ComponentType string

const (
    ComponentText      ComponentType = "text"       // text
    ComponentMarkdown  ComponentType = "markdown"   // Markdown
    ComponentCode      ComponentType = "code"       // code block
    ComponentImage     ComponentType = "image"      // image
    ComponentTable     ComponentType = "table"      // table
    ComponentCard      ComponentType = "card"       // card
    ComponentButton    ComponentType = "button"     // button
    ComponentForm      ComponentType = "form"       // form
    ComponentProgress  ComponentType = "progress"   // progress
    ComponentDivider   ComponentType = "divider"    // divider
)
```

### A2UI Message

Each A2UI message contains:

```go
type Message struct {
    ID        string        // message ID
    Role      string        // user / assistant
    Components []Component  // UI component list
    Timestamp time.Time     // timestamp
}
```

### A2UI Streaming Output

A2UI supports streaming component updates:

```go
type StreamMessage struct {
    Type      string      // add / update / delete
    Index     int         // component index
    Component Component   // component payload
}
```

**Streaming update types:**

- `add`: add a new component
- `update`: update an existing component
- `delete`: delete a component

## Implementing A2UI

### 1. Create an A2UI Streamer

```go
streamer := a2ui.NewStreamer()
```

### 2. Add Components

```go
// Add a text component.
streamer.AddText("Processing your request...")

// Add a progress bar.
streamer.AddProgress(0, 100, "Loading")

// Update progress.
streamer.UpdateProgress(0, 50, "Working")

// Add a code block.
streamer.AddCode("go", `fmt.Println("Hello, World!")`)

// Add a table.
streamer.AddTable([][]string{
    {"Name", "Age", "City"},
    {"Alice", "30", "New York"},
    {"Bob", "25", "London"},
})
```

### 3. Stream Output

```go
// Get the stream.
stream := streamer.Stream()

for {
    msg, ok := stream.Next()
    if !ok {
        break
    }
    // Send to frontend.
    sendToClient(msg)
}
```

Key snippet (note: this is a simplified excerpt and not directly runnable; see [cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)):

```go
// Create an A2UI Streamer.
streamer := a2ui.NewStreamer()

// Add components during Agent execution.
streamer.AddText("Let me analyze this file for you...")

// Call a Tool.
streamer.AddProgress(0, 0, "Reading file")
result, err := tool.Run(ctx, args)
streamer.UpdateProgress(0, 100, "Done")

// Show result.
streamer.AddCode("json", result)

// Stream output.
stream := streamer.Stream()
for {
    msg, ok := stream.Next()
    if !ok {
        break
    }
    wsConn.WriteJSON(msg)
}
```

## Integrating A2UI with the Agent

### Use A2UI in the Agent

```go
func buildAgent(ctx context.Context) (adk.Agent, error) {
    return deep.New(ctx, &deep.Config{
        Name:        "A2UIAgent",
        Description: "Agent with A2UI streaming output",
        ChatModel:   cm,
        Backend:     backend,
        StreamingShell: backend,
    })
}
```

### Use A2UI in the Runner

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
})

// Execute Agent.
events := runner.Run(ctx, history)

// Convert events into A2UI components.
streamer := a2ui.NewStreamer()
for {
    event, ok := events.Next()
    if !ok {
        break
    }
    if event.Output != nil && event.Output.MessageOutput != nil {
        // Add a text component.
        streamer.AddText(event.Output.MessageOutput.Message.Content)
    }
}
```

## A2UI Streaming Rendering Flow

```
┌─────────────────────────────────────────┐
│  user: analyze this file                 │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent starts         │
        │  A2UI: AddText        │
        │  "analyzing..."       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  call Tool            │
        │  A2UI: AddProgress    │
        │  progress: 0%         │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool running         │
        │  A2UI: UpdateProgress │
        │  progress: 50%        │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Tool done            │
        │  A2UI: UpdateProgress │
        │  progress: 100%       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  show result          │
        │  A2UI: AddCode        │
        │  code block           │
        └──────────────────────┘
```

## Frontend Integration

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    renderComponent(msg);
};

function renderComponent(msg) {
    const { type, index, component } = msg;
    
    switch (component.type) {
        case 'text':
            renderText(component.content);
            break;
        case 'code':
            renderCode(component.language, component.content);
            break;
        case 'progress':
            renderProgress(component.value, component.max, component.label);
            break;
        // ...
    }
}
```

## Summary

- **A2UI**: Agent-to-UI protocol that maps Agent output to UI components
- **Component types**: text, Markdown, code, images, tables, cards, buttons, forms, progress bars, etc.
- **Streaming output**: add/update/delete components in real time
- **Declarative**: the Agent declares “what to show”; the UI renders it
- **Frontend integration**: real-time communication via WebSocket

## Series Wrap-Up: The End-to-End Quickstart Agent

By this chapter, we have connected Eino’s core capabilities into a runnable Agent. You can view it as an extensible “end-to-end agent application skeleton”:

- runtime: Runner-driven execution, streaming output and event model
- tools: filesystem/shell tools integrated, tool errors handled safely
- middleware: pluggable handlers for error handling, retries, approvals, etc.
- observability: callbacks/trace to connect key paths for debugging and production monitoring
- human-in-the-loop: interrupt/resume + checkpoint for approvals, parameter completion, branch selection, etc.
- deterministic orchestration: compose (graph/chain/workflow) organizes complex business processes as maintainable, reusable execution graphs
- delivery: UI integration like A2UI is application-layer, letting you present agent capabilities in the right product form

You can gradually replace/extend any part—model, tools, storage, workflows, UI protocol—without rebuilding from scratch.

## Further Thoughts

**Other component types:**

- chart components (line, bar, pie, etc.)
- map components
- timeline components
- tree components
- tab components

**Advanced features:**

- component interactions (click, drag, input)
- conditional rendering
- component animations
- responsive layouts
