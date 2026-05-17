---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 2: ChatModelAgent, Runner, AgentEvent (Console Multi-turn)"
weight: 2
---

Goal of this chapter: introduce Runner to implement multi-turn conversation, and understand Agent event streams and conversation history management.

## Code Location

- Entry code: [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)

## Prerequisites

Same as Chapter 1: you need to configure an available ChatModel (OpenAI or Ark).

## Run

In the `examples/quickstart/chatwitheino` directory:

```bash
go run ./cmd/ch02
```

Example output:

```
you> Hello
[assistant] Hello! How can I help you?
you> What did I just say?
[assistant] You just said "Hello".
```

## From Single-Turn to Multi-Turn: Why Runner Is Needed

In Chapter 1 we implemented a single-turn conversation, but there are two problems:

1. **No history memory**: Each call is independent; the Agent doesn't know what was said before
2. **Manual streaming output management**: You need to handle the `stream.Recv()` loop yourself

**Runner's role:**

- **Runner is the runtime container for Agents**: It manages Agent invocation and the event stream
- **Runner does not manage conversation history**: History is maintained and passed in externally
- **Runner provides a unified event stream**: It abstracts the Agent's execution process into a series of events

**Simple analogy:**

- **Agent** = "actor" (knows how to perform)
- **Runner** = "director" (manages the show's flow)
- **Conversation history** = "script" (maintained by an external screenwriter)

## Key Concepts

### Agent Interface

```go
type Agent interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
}
```

### Runner

`Runner` is the runtime container for Agents:

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
})
```

Runner's core method `Run` receives conversation history and returns an event iterator:

```go
events := runner.Run(ctx, history)
```

### AgentEvent

The `AsyncIterator[*AgentEvent]` returned by Runner contains the following event types:

```go
type AgentEvent struct {
    Output     *AgentOutput     // Agent's output
    ToolCall   *ToolCallEvent   // Tool call event
    ToolResult *ToolResultEvent // Tool execution result
    Interrupt  *InterruptEvent  // Interrupt event (covered in later chapters)
}
```

### Event Consumption Pattern

```go
events := runner.Run(ctx, history)
for {
    event, ok := events.Next()
    if !ok {
        break
    }
    if event.Output != nil && event.Output.MessageOutput != nil {
        // Handle message output (complete or streaming)
    }
}
```

## Conversation History Management

### Simple In-Memory Management

Chapter 2 uses the simplest approach to manage conversation history: a `[]*schema.Message` slice.

```
Conversation flow:
1. history = []
2. User input → history = append(history, userMsg)
3. Agent reply → history = append(history, assistantMsg)
4. Next user input → repeat 2-3
```

**Key code snippet** (note: this is a simplified snippet that cannot be run directly; for the full code see [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)):

```go
history := make([]*schema.Message, 0, 16)

for {
    // Read user input
    line := readUserInput()
    
    // Append to history
    history = append(history, schema.UserMessage(line))
    
    // Run Agent
    events := runner.Run(ctx, history)
    
    // Collect assistant reply
    content := printAndCollectAssistantFromEvents(events)
    
    // Append to history
    history = append(history, schema.AssistantMessage(content, nil))
}
```

## Chapter Summary

- **Runner**: The runtime container for Agents, managing the invocation flow and event stream
- **AgentEvent**: A unified event type containing output, Tool calls, interrupts, etc.
- **Conversation history**: Maintained externally, with user and assistant messages appended each turn
- **Multi-turn conversation**: Achieved by passing in the complete history for context continuity

## Further Thoughts

**Problems with in-memory management:**

- History grows indefinitely → trimming strategy needed
- Process restart causes loss → persistence needed
- Multiple sessions mixed up → Session management needed

These problems will be addressed in Chapter 3 by introducing the Session/Store mechanism.
