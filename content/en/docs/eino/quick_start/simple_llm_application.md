---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Building a Simple LLM Application
weight: 1
---

This guide will help you quickly get started using Eino framework's ChatModel to build a simple LLM application. We will demonstrate how to use ChatModel through implementing a "Programmer Encouragement Assistant" example.

> 💡
> Code snippets from the examples in this article can be found at: [eino-examples/quickstart/chat](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat)

## **ChatModel Introduction**

ChatModel is Eino framework's abstraction for conversational large models, providing a unified interface to interact with different large model services (such as OpenAI, Ollama, etc.).

> For more detailed component introduction, see: [Eino: ChatModel Guide](/docs/eino/core_modules/components/chat_model_guide)

## **Message Structure and Usage**

In Eino, conversations are represented through `schema.Message`, which is Eino's abstract definition of a conversation message. Each Message contains the following important fields:

- `Role`: The role of the message, which can be:
  - `system`: System instruction, used to set the model's behavior and role
  - `user`: User input
  - `assistant`: Model's reply
  - `tool`: Tool call result
- `Content`: The specific content of the message

## **Implementing the Programmer Encouragement Assistant**

Let's learn how to use ChatModel by implementing a Programmer Encouragement Assistant. This assistant can not only provide technical advice but also offer psychological support when programmers feel discouraged.

### Creating Conversation Templates and Generating Messages

Eino provides powerful templating functionality for building messages to input to the large model:

1. Template rendering, supporting three template formats:

   - FString: Python-style simple string formatting (e.g., "Hello, {name}!")
   - Jinja2: Jinja2-style templates supporting rich expressions (e.g., "Hello, {{name}}!")
   - GoTemplate: Go's built-in text/template format (e.g., "Hello, {{.name}}!")
2. Message placeholders: Support inserting a group of messages (such as conversation history)

```go
// optional=false means required message list, will error if corresponding variable not found in template input
schema.MessagesPlaceholder("chat_history", false)
```

> For more detailed component introduction, see: [Eino: ChatTemplate Guide](/docs/eino/core_modules/components/chat_template_guide)

Below is the complete code for creating and using conversation templates with FString format + message placeholders:

```go
// eino-examples/quickstart/chat/template.go

import (
    "context"

    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create template using FString format
template := prompt.FromMessages(schema.FString,
   // System message template
   schema.SystemMessage("You are a {role}. You need to respond in a {style} tone. Your goal is to help programmers maintain a positive and optimistic mindset, providing technical advice while also caring about their mental health."),

   // Insert needed conversation history (leave empty for new conversations)
   schema.MessagesPlaceholder("chat_history", true),

   // User message template
   schema.UserMessage("Question: {question}"),
)

// Use template to generate messages
messages, err := template.Format(context.Background(), map[string]any{
   "role":     "Programmer Encouragement Assistant",
   "style":    "positive, warm, and professional",
   "question": "My code keeps throwing errors, I feel so frustrated, what should I do?",
   // Conversation history (simulating two rounds of conversation history in this example)
   "chat_history": []*schema.Message{
      schema.UserMessage("Hello"),
      schema.AssistantMessage("Hey! I'm your Programmer Encouragement Assistant! Remember, every excellent programmer grows through debugging. How can I help you?", nil),
      schema.UserMessage("I feel like the code I write is terrible"),
      schema.AssistantMessage("Every programmer goes through this stage! What's important is that you're constantly learning and improving. Let's look at the code together, I believe through refactoring and optimization, it will get better. Remember, Rome wasn't built in a day, code quality improves through continuous improvement.", nil),
   },
})
```

### Creating a ChatModel

ChatModel is one of the most core components in the Eino framework, providing a unified interface for interacting with various large language models. Eino currently supports the following large language model implementations:

- OpenAI: Supports GPT-3.5/GPT-4 and other models (also supports Azure-provided OpenAI services)
- Ollama: Supports locally deployed open-source models
- Ark: Model services on Volcano Engine (e.g., ByteDance's Doubao model)
- More models are being added

> For supported models, see: [Eino: Ecosystem Integration](/docs/eino/ecosystem_integration)

Below we demonstrate how to create and use ChatModel using OpenAI and Ollama as examples:

#### **OpenAI (choose either this or Ollama below)**

```go
// eino-examples/quickstart/chat/openai.go

import (
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
)

chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
   Model:  "gpt-4o",                         // Model version to use
   APIKey: os.Getenv("OPENAI_API_KEY"),      // OpenAI API key
})
```

> For detailed information about OpenAI ChatModel, see: [ChatModel - OpenAI](https://bytedance.larkoffice.com/wiki/NguEw85n6iJjShkVtdQcHpydnld)

#### **Ollama (choose either this or OpenAI above)**

Ollama supports running open-source models locally, suitable for scenarios with data privacy requirements or offline usage needs.

```go
// eino-examples/quickstart/chat/ollama.go

import (
    "github.com/cloudwego/eino-ext/components/model/ollama"
)


chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    BaseURL: "http://localhost:11434", // Ollama service address
    Model:   "llama2",                 // Model name
})
```

> For Ollama related information, see: [ChatModel - Ollama](https://bytedance.larkoffice.com/wiki/WWngw1XMViwgyYkNuZgcjZnxnke)

Eino provides a unified ChatModel abstraction for large models and offers ready-to-use implementations of various LLMs. Therefore, business code can focus on writing business logic without worrying about model implementation details. When model implementations are updated, they won't affect core business logic, meaning developers can easily switch between different models without modifying large amounts of code.

### Running the ChatModel

After obtaining the ChatModel input messages and the initialized ChatModel instance through the previous two steps, you can start trying to run the ChatModel. Eino ChatModel provides two running modes: output complete message (generate) and output message stream (stream):

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

In practical applications, there are many scenarios that need streaming responses. The main scenario is "improving user experience": the stream running mode allows ChatModel to provide typewriter-like output, giving users model responses earlier.

Here's how Eino handles streaming output:

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
       if err == io.EOF { // Streaming output ended
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

For the complete implementation, see: [eino-examples/quickstart/chat/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat/main.go)

## **Summary**

This example demonstrated how to build an LLM application using the Eino framework through a Programmer Encouragement Assistant case. From creating a ChatModel to using message templates to actual conversation implementation, you should now have a basic understanding of the Eino framework. Whether you choose OpenAI, Ollama, or other model implementations, Eino provides a unified and simple way to use them. We hope this example helps you quickly start building your own LLM applications.

## **Related Reading**

- Quick Start
  - [Agent - Give LLMs Hands](/docs/eino/quick_start/agent_llm_with_tools)
