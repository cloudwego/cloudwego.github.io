---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 1: ChatModel and Message (Console)"
weight: 1
---

Goal of this chapter: create the most basic AI chat program and understand the core concepts of ChatModel and Agent.

## Code Location

- Entry code: [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)

## Prerequisites

You need to configure an available ChatModel. Eino supports multiple model backends; this tutorial uses OpenAI or Ark as examples:

**Option A: Using OpenAI**

```bash
export OPENAI_API_KEY=sk-xxx
export OPENAI_MODEL=gpt-4.1-mini  # Optional, defaults to gpt-4.1-mini
export OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
```

**Option B: Using Ark (ByteDance Volcano Engine)**

```bash
export ARK_API_KEY=xxx
export ARK_MODEL=ep-xxx  # Ark model's Endpoint ID
export ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3  # Optional
```

## Run

In the `examples/quickstart/chatwitheino` directory:

```bash
go run ./cmd/ch01 -- "Hello, please introduce yourself"
```

Example output (streaming, displayed character by character):

```
Hello! I am an AI assistant developed based on large language model technology...
```

## Core Concepts

### ChatModel: The Standard LLM Interface

`ChatModel` is Eino's unified abstraction for large language models:

```go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
}
```

Regardless of whether the underlying model is OpenAI, Anthropic, or another provider, they all implement the same interface.

### Message: The Basic Unit of Conversation

```go
type Message struct {
    Role     string      // system / user / assistant / tool
    Content  string      // message content
    // ...other fields
}
```

Common constructors:

```go
schema.SystemMessage("You are a helpful assistant")
schema.UserMessage("Hello")
schema.AssistantMessage("Hello! How can I help you?", nil)
```

## From API Calls to Single-Turn Conversation

### Calling ChatModel Directly

The most straightforward approach is to call ChatModel's `Stream` method directly:

```
messages := []*schema.Message{
    schema.SystemMessage("You are a helpful assistant"),
    schema.UserMessage("Hello"),
}
stream, err := chatModel.Stream(ctx, messages)
```

This is the most basic LLM call.

### Using ChatModelAgent

`ChatModelAgent` is the most basic Agent wrapper in Eino. It wraps a ChatModel and provides:

- **System Prompt management**: configured via the `Instruction` field
- **Tool integration**: covered in later chapters
- **Middleware support**: covered in later chapters

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "MyChatAgent",
    Description: "A helpful assistant",
    Instruction: "You are a helpful assistant",
    Model:       chatModel,
})
```

### Simplified Flow for This Chapter

```
User input → ChatModelAgent.Stream() → Streaming output
```

**Key code snippet** (note: this is a simplified snippet that cannot be run directly; for the full code see [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)):

```go
// Create Agent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "MyChatAgent",
    Instruction: instruction,
    Model:       chatModel,
})

// Streaming call
stream, err := agent.Stream(ctx, messages)

// Output chunk by chunk
for {
    frame, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    fmt.Print(frame.Content)
}
```

## Chapter Summary

- **ChatModel**: The unified LLM interface, supporting `Generate` (complete response) and `Stream` (streaming response)
- **Message**: The basic unit of conversation, containing Role and Content
- **ChatModelAgent**: The most basic Agent, wrapping ChatModel and providing extensibility
- **Streaming output**: Achieved through `Stream` + `Recv` for character-by-character output

## Further Thoughts

**Why use an Agent instead of calling ChatModel directly?**

- Agent provides standardized management of Instructions (system prompts)
- Agent can later integrate Tool, Middleware, and other capabilities
- Agent is the unified entry point of Eino ADK
