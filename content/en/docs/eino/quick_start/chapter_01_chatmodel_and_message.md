---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 1: ChatModel and Message (Console)"
weight: 1
---

## Introduction to the Eino framework

**What is Eino?**

Eino is an AI application development framework in Go (Agent Development Kit) designed to help developers quickly build scalable and maintainable AI applications.

**What problems does Eino solve?**

1. **Model abstraction**: unify interfaces across different LLM providers (OpenAI, Ark, Claude, etc.), so switching models does not require changing business code
2. **Capability composition**: provide replaceable, composable capability units through the Component interfaces (chat, tools, retrieval, etc.)
3. **Orchestration framework**: offer orchestration abstractions such as Agent, Graph, and Chain to support complex multi-step AI workflows
4. **Runtime support**: built-in streaming output, interrupt/resume, state management, and Callback-based observability

**Main repositories of Eino:**

- **eino** (this repo): the core library, defining interfaces, orchestration abstractions, and ADK
- **eino-ext**: the extension library, providing concrete implementations of Components (OpenAI, Ark, Milvus, etc.)
- **eino-examples**: the examples repo, including this Quickstart series

---

## ChatWithEino: an assistant that talks with Eino docs

**What is ChatWithEino?**

ChatWithEino is an intelligent assistant built with Eino. It helps developers learn Eino and write Eino code by accessing the Eino repository’s source code, comments, and examples, so it can provide accurate and up-to-date technical help.

**Core capabilities:**

- **Conversational interaction**: understand questions about Eino and respond clearly
- **Code access**: read Eino source code/comments/examples and answer based on real implementations
- **Persistent sessions**: support multi-turn conversations, remember context, and restore sessions across processes
- **Tool calling**: perform operations such as file reading and code search

**Architecture overview:**

- **ChatModel**: communicate with LLM providers (OpenAI, Ark, Claude, etc.)
- **Tool**: extend capabilities such as file system access and code search
- **Memory**: persist conversation history
- **Agent**: a unified execution framework that coordinates components

## Quickstart series: build ChatWithEino from scratch

This series walks you step by step: starting from the most basic ChatModel call, and progressively building a fully functional ChatWithEino Agent.

**Learning path:**

<table>
<tr><td>Chapter</td><td>Topic</td><td>Core content</td><td>Capability gain</td></tr>
<tr><td><strong>Chapter 1</strong></td><td>ChatModel and Message</td><td>Understand the Component abstraction and implement a single-turn chat</td><td>Basic conversation</td></tr>
<tr><td><strong>Chapter 2</strong></td><td>Agent and Runner</td><td>Introduce execution abstractions and implement multi-turn chat</td><td>Session management</td></tr>
<tr><td><strong>Chapter 3</strong></td><td>Memory and Session</td><td>Persist chat history and support session recovery</td><td>Persistence</td></tr>
<tr><td><strong>Chapter 4</strong></td><td>Tools and file system</td><td>Add file access to read source code</td><td>Tool calling</td></tr>
<tr><td><strong>Chapter 5</strong></td><td>Middleware</td><td>Middleware mechanism and unified cross-cutting concerns</td><td>Extensibility</td></tr>
<tr><td><strong>Chapter 6</strong></td><td>Callback</td><td>Callbacks to observe the Agent execution process</td><td>Observability</td></tr>
<tr><td><strong>Chapter 7</strong></td><td>Interrupt and Resume</td><td>Interrupt and resume to support long-running tasks</td><td>Reliability</td></tr>
<tr><td><strong>Chapter 8</strong></td><td>Graph and Tool</td><td>Use Graph to orchestrate complex workflows</td><td>Complex orchestration</td></tr>
<tr><td><strong>Chapter 9</strong></td><td>A2UI</td><td>Integration from Agent to UI</td><td>Production-grade delivery</td></tr>
</table>

**Why design it this way?**

Each chapter adds one core capability on top of the previous chapter, so you can:

1. **Understand the role of each component**: features are introduced progressively instead of all at once
2. **See the architecture evolve**: from simple to complex, and why each abstraction exists
3. **Build practical skills**: every chapter comes with runnable code you can try hands-on

---

Goal of this chapter: understand Eino’s Component abstraction, call a ChatModel once with minimal code (with streaming output), and learn the basics of `schema.Message`.

## Code location

- Entry code: [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)

## Why we need the Component interfaces

Eino defines a set of Component interfaces (`ChatModel`, `Tool`, `Retriever`, `Loader`, etc.). Each interface describes one replaceable capability category:

```go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
        *schema.StreamReader[*schema.Message], error)
}
```

**Benefits of interfaces:**

1. **Replaceable implementations**: `eino-ext` provides implementations for OpenAI, Ark, Claude, Ollama, and more. Business code depends only on the interface, so switching models only changes construction logic.
2. **Composable orchestration**: orchestration layers such as Agent, Graph, and Chain depend only on Component interfaces, not concrete implementations. You can swap OpenAI for Ark without changing orchestration code.
3. **Mockable in tests**: interfaces make mocking natural; unit tests do not need real model calls.

This chapter focuses on `ChatModel`. Later chapters will introduce Components such as `Tool` and `Retriever`.

## schema.Message: the basic unit of conversation

`Message` is the basic structure for conversation data in Eino:

```go
type Message struct {
    Role      RoleType    // system / user / assistant / tool
    Content   string      // text content
    ToolCalls []ToolCall  // only assistant messages may have this
    // ...
}
```

Common constructors:

```go
schema.SystemMessage("You are a helpful assistant.")
schema.UserMessage("What is the weather today?")
schema.AssistantMessage("I don't know.", nil)  // second arg is ToolCalls
schema.ToolMessage("tool result", "call_id")
```

**Role semantics:**

- `system`: system instructions, typically placed at the beginning of messages
- `user`: user input
- `assistant`: model response
- `tool`: tool call result (covered in later chapters)

## Prerequisites

### Get the code

```bash
git clone https://github.com/cloudwego/eino-examples.git
cd eino-examples/quickstart/chatwitheino
```

- Go version: Go 1.21+ (see `go.mod`)
- A callable ChatModel (OpenAI by default; Ark is also supported)

### Option A: OpenAI (default)

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4.1-mini"  # OpenAI 2025 new model; gpt-4o / gpt-4o-mini also work
# Optional:
# OPENAI_BASE_URL (proxy or compatible service)
# OPENAI_BY_AZURE=true (use Azure OpenAI)
```

### Option B: Ark

```bash
export MODEL_TYPE="ark"
export ARK_API_KEY="..."
export ARK_MODEL="..."
# Optional: ARK_BASE_URL
```

## Run

In `eino-examples/quickstart/chatwitheino`, run:

```bash
go run ./cmd/ch01 -- "Explain in one sentence what problem Eino’s Component design solves."
```

Example output (printed incrementally as the stream arrives):

```
[assistant] Eino’s Component design defines unified interfaces...
```

## What the entry code does

In execution order:

1. **Create a ChatModel**: choose OpenAI or Ark based on the `MODEL_TYPE` environment variable
2. **Build input messages**: `SystemMessage(instruction)` + `UserMessage(query)`
3. **Call Stream**: all ChatModel implementations must support `Stream()`, returning a `StreamReader[*Message]`
4. **Print the result**: iterate `StreamReader` and print the assistant reply chunk by chunk

Key code snippet (**note: simplified and not directly runnable; for the full code see** [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)):

```go
// Build input
messages := []*schema.Message{
    schema.SystemMessage(instruction),
    schema.UserMessage(query),
}

// Call Stream (all ChatModels must implement this)
stream, err := cm.Stream(ctx, messages)
if err != nil {
    log.Fatal(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    fmt.Print(chunk.Content)
}
```

## Summary

- **Component interfaces**: define boundaries for replaceable, composable, and testable capabilities
- **Message**: the basic unit of conversation data, with semantics defined by roles
- **ChatModel**: the most fundamental Component, providing `Generate` and `Stream`
- **Implementation choice**: switch between OpenAI/Ark implementations via env/config without changing business code
