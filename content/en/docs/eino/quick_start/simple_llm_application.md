---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: Build a Minimal LLM Application
weight: 1
---

This guide helps you quickly get started building a simple LLM application with Eino’s `ChatModel`. We’ll implement a “Programmer Encouragement Assistant” to demonstrate how to use `ChatModel` effectively.

> 💡
> Code snippets in this guide: [eino-examples/quickstart/chat](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat)

## ChatModel Overview

`ChatModel` is Eino’s abstraction over chat-oriented LLMs. It provides a unified interface to interact with various model providers such as OpenAI and Ollama.

> For a detailed component guide, see: [Eino: ChatModel Guide](/en/docs/eino/core_modules/components/chat_model_guide)

## Message Structure and Usage

In Eino, conversations are represented by `schema.Message`, an abstraction for a single chat message. Each message includes:

- `Role`: one of
  - `system`: a system directive defining behavior and role
  - `user`: user input
  - `assistant`: model response
  - `tool`: tool call result
- `Content`: the message content

## Implementing the Encouragement Assistant

We’ll build a Programmer Encouragement Assistant that offers technical suggestions and supportive messaging when the developer is feeling down.

### Create a Template and Generate Messages

Eino provides versatile templating for constructing messages sent to the model:

1. Template rendering with three formats:
   - `FString`: Python-style string interpolation (e.g., "Hello, {name}!")
   - `Jinja2`: Jinja2-style templating with rich expressions (e.g., "Hello, {{name}}!")
   - `GoTemplate`: Go’s `text/template` (e.g., "Hello, {{.name}}!")
2. Message placeholders: insert a list of messages (e.g., conversation history)

```go
// optional=false means the message list is required;
// an absent variable in template input causes an error
schema.MessagesPlaceholder("chat_history", false)
```

> For details, see: [Eino: ChatTemplate Guide](/en/docs/eino/core_modules/components/chat_template_guide)

Complete example using `FString` format and a messages placeholder:

```go
// eino-examples/quickstart/chat/template.go

import (
    "context"

    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create a template using FString
template := prompt.FromMessages(schema.FString,
   // System message template
   schema.SystemMessage("You are a {role}. Please respond in a {style} tone. Your goal is to keep developers positive and optimistic while offering technical advice and caring about their mental well-being."),

   // Insert conversation history (omit for a new conversation)
   schema.MessagesPlaceholder("chat_history", true),

   // User message template
   schema.UserMessage("Question: {question}"),
)

// Render messages from the template
messages, err := template.Format(context.Background(), map[string]any{
   "role":     "Programmer Encouragement Assistant",
   "style":    "positive, warm, and professional",
   "question": "My code keeps throwing errors and I feel frustrated. What should I do?",
   // Dialogue history (simulate two rounds)
   "chat_history": []*schema.Message{
      schema.UserMessage("Hi"),
      schema.AssistantMessage("Hey! I’m your encouragement assistant! Remember, every great engineer grows through debugging. How can I help?", nil),
      schema.UserMessage("I think my code is terrible"),
      schema.AssistantMessage("Every developer feels that way at times! What matters is continuous learning and improvement. Let’s review the code together — I’m confident with refactoring and optimization it’ll get better. Remember, Rome wasn’t built in a day; code quality improves with continuous effort.", nil),
   },
})
```

### Create a ChatModel

`ChatModel` is one of Eino’s core components, providing a unified interface across LLM providers. Eino currently supports:

- OpenAI: GPT-3.5 / GPT-4 family (including Azure OpenAI)
- Ollama: locally hosted open-source models
- Ark: models on Volcano Engine (e.g., ByteDance’s Doubao)
- More providers are coming

> Supported models: [Eino: Ecosystem Integration](/en/docs/eino/ecosystem_integration)

Examples using OpenAI and Ollama:

#### OpenAI (use either this or Ollama below)

```go
// eino-examples/quickstart/chat/openai.go

import (
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
)

chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
   Model:  "gpt-4o",                         // model version
   APIKey: os.Getenv("OPENAI_API_KEY"),      // OpenAI API key
})
```

> Details: [ChatModel — OpenAI](/en/docs/eino/ecosystem_integration/chat_model/chat_model_openai)

#### Ollama (use either this or OpenAI above)

Ollama supports running open-source models locally — ideal for privacy-sensitive or offline scenarios.

```go
// eino-examples/quickstart/chat/ollama.go

import (
    "github.com/cloudwego/eino-ext/components/model/ollama"
)


chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    BaseURL: "http://localhost:11434", // Ollama server
    Model:   "llama2",                 // model name
})
```

> Details: [ChatModel — Ollama](/en/docs/eino/ecosystem_integration/chat_model/chat_model_ollama)

Thanks to Eino’s unified `ChatModel` abstraction and ready-to-use implementations, your business logic remains focused and insulated from provider specifics. You can swap models without broad code changes.

### Run the ChatModel

With messages and a configured model, you can now run the `ChatModel`. Eino exposes two modes: generate a full message at once (`Generate`) or stream the message incrementally (`Stream`).

```go
// eino-examples/quickstart/chat/generate.go

/*** create messages
* messages, err := xxx
*/

/*** create chat model
* chatModel, err := xxx
*/ 

result, err := chatModel.Generate(ctx, messages)
streamResult, err := chatModel.Stream(ctx, messages)
```

Streaming is essential for user experience: `Stream` allows the model to emit tokens progressively like a typewriter, giving users timely feedback.

Eino’s streaming consumption looks like this:

```go
// eino-examples/quickstart/chat/stream.go

import (
    "io"
    "log"

    "github.com/cloudwego/eino/schema"
)

func reportStream(sr *schema.StreamReader[*schema.Message]) {
    defer sr.Close()

    i := 0
    for {
       message, err := sr.Recv()
       if err == io.EOF { // end of stream
          return
       }
       if err != nil {
          log.Fatalf("recv failed: %v", err)
       }
       log.Printf("message[%d]: %+v\n", i, message)
       i++
    }
}
```

Complete implementation: [eino-examples/quickstart/chat/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat/main.go)

## Summary

This example shows how to build an LLM-powered application in Eino via `ChatModel`, from templating to conversation handling. Whether you choose OpenAI, Ollama, or another provider, Eino offers a unified, straightforward workflow. Hopefully this helps you quickly start building your own LLM applications.

## Related Reading

- Quick Start
  - [Agent — Give your LLM hands](/en/docs/eino/quick_start/agent_llm_with_tools)
