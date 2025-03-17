---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: Implement an easy LLM application
weight: 1
---

This guide will help you get started quickly with building a simple LLM application using the ChatModel in the Eino framework. We will demonstrate how to use ChatModel through an example of creating a "programmer encourager".

> 💡
> Code snippets from the examples in this article can be found here: [flow/eino-examples/quickstart/chat](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat)

## **Introduction to ChatModel**

ChatModel is an abstraction of the conversational large model within the Eino framework. It provides a unified interface to interact with different large model services (such as OpenAI, Ollama, etc.).

> For a more detailed introduction to the component, refer to: [Eino: ChatModel guide](/docs/eino/core_modules/components/chat_model_guide)

## **Structure and Usage of Messages**

In Eino, a conversation is represented through `schema.Message`, which is an abstract definition of a conversation message by Eino. Each message includes the following important fields:

- `Role`: The role of the message, which can be:
  - `system`: System instructions used to set the model's behavior and role
  - `user`: User's input
  - `assistant`: The model's reply
  - `tool`: The result of tool invocation
- `Content`: The specific content of the message

## **Implementing a Programmer Encourager**

Let's learn how to use ChatModel by implementing a Programmer Encourager. This assistant can not only provide technical advice but also offer psychological support when programmers feel down.

### **Creating Dialogue Templates and Generating Messages**

Eino provides powerful templating functions to construct messages to be input into the LLM:

1. Template Rendering, supporting three template formats:
   - FString: Python-style simple string formatting (e.g., "Hello, {name}!")
   - Jinja2: Jinja2-style templates supporting rich expressions (e.g., "Hello, {{name}}!")
   - GoTemplate: Go language built-in text/template format (e.g., "Hello, {{.name}}!")
2. Message Placeholder: Supports inserting a set of messages (such as conversation history)

```go
// optional=false indicates a required message list. An error will occur if the corresponding variable is not found in the template input
schema.MessagesPlaceholder("chat_history", false)
```

> For a more detailed component introduction, refer to: [Eino: ChatTemplate guide](/docs/eino/core_modules/components/chat_template_guide)

Below is the complete code for creating and using a dialogue template with FString format + message placeholder:

```go
// eino-examples/quickstart/chat/template.go

import (
    "context"

    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Creating a template using FString format
template := prompt.FromMessages(schema.FString,
   // System message template
   schema.SystemMessage("You are a {role}. You need to answer questions in a {style} manner. Your goal is to help programmers maintain a positive and optimistic attitude, providing technical advice while also caring about their mental health."),

   // Insert required conversation history (leave this empty for new conversations)
   schema.MessagesPlaceholder("chat_history", true),

   // User message template
   schema.UserMessage("Question: {question}"),
)

// Generating messages using the template
messages, err := template.Format(context.Background(), map[string]any{
   "role":     "Programmer Encourager",
   "style":    "positive, warm, and professional",
   "question": "My code keeps throwing errors, I feel so frustrated. What should I do?",
   // Conversation history (this example simulates two rounds of conversation history)
   "chat_history": []*schema.Message{
      schema.UserMessage("Hello"),
      schema.AssistantMessage("Hey! I'm your Programmer Encourager! Remember, every great programmer grows through debugging. How can I assist you today?", nil),
      schema.UserMessage("I feel like the code I write is terrible"),
      schema.AssistantMessage("Every programmer has gone through this stage! The important thing is that you are constantly learning and improving. Let's take a look at the code together; I'm sure that through refactoring and optimization, it will get better. Remember, Rome wasn't built in a day, and code quality is improved through continuous refinement.", nil),
   },
})
```

### Creating ChatModel

ChatModel is one of the core components in the Eino framework, providing a unified interface to interact with various LLMs. Eino currently supports implementations of the following LLMs:

- OpenAI: Support for models such as GPT-3.5/GPT-4 (also supports OpenAI services provided by Azure)
- Ollama: Support for locally deployed open-source models
- Ark: Model services on the Volcano Engine (e.g., ByteDance's Doubao LLM)
- More models are being supported

> For supported models, refer to: [Eino: Ecosystem](/docs/eino/ecosystem)

Below, we demonstrate how to create and use ChatModel with OpenAI and Ollama as examples:

#### **OpenAI (select either this or Ollama below)**

```go
// eino-examples/quickstart/chat/openai.go

import (
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
)

chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
   Model:  "gpt-4o",                         // Model version used
   APIKey: os.Getenv("OPENAI_API_KEY"),      // OpenAI API key
})
```

> For detailed information on OpenAI ChatModel, refer to: [ChatModel - OpenAI](/docs/eino/ecosystem/chat_model/chat_model_openai)

#### **Ollama (select either this or OpenAI above)**

Ollama supports running open-source models locally, making it suitable for scenarios requiring data privacy or offline usage.

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

> For information on OpenAI, refer to: [ChatModel - Ollama](/docs/eino/ecosystem/chat_model/chat_model_ollama)

Regardless of the implementation used, ChatModel provides a consistent interface, allowing you to easily switch between different models without modifying a large amount of code.

### **Running ChatModel**

After obtaining the input messages and initializing the ChatModel instance in the previous steps, you can start running the ChatModel. Eino ChatModel provides two running modes: generating full messages (generate) and streaming messages (stream):

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

In practical applications, many scenarios require using streaming responses, especially to "enhance user experience": the stream running mode lets the ChatModel provide typewriter-like output effects, allowing users to receive model responses earlier.

The handling of streaming output in Eino is as follows:

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
       if err == io.EOF { // End of stream output
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

For a complete implementation, refer to: [eino-examples/quickstart/chat/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chat/main.go)

## **Summary**

This example demonstrates how to use the Eino framework to build an LLM application through the case of a programmer encourager. From the creation of the ChatModel to the use of message templates, and then to the actual conversation implementation, we believe you have gained a basic understanding of the Eino framework. Whether you choose OpenAI, Ollama, or other model implementations, Eino provides a unified and simple way to use them. We hope this example helps you quickly start building your own LLM application.

## **Related Reading**

- Quick Start
  - [Agent-Enable LLM to have hands](/docs/eino/quick_start/agent_llm_with_tools)
