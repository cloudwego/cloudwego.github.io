---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: ChatModel - Ollama
weight: 0
---

## **Basic Introduction**

The Ollama model is an implementation of the ChatModel interface, designed for interacting with the Ollama local LLM service. Ollama is an open-source local LLM runtime framework that supports various open-source models (such as Llama, Mistral, etc.), providing simple API interfaces and comprehensive performance monitoring. This component implements the [Eino: ChatModel Usage Instructions]([Eino: ChatModel guide](/en/docs/eino/core_modules/components/chat_model_guide))

## **Usage**

### **Component Initialization**

The Ollama model is initialized through the `NewChatModel` function. The main configuration parameters are as follows:

```go
import "github.com/cloudwego/eino-ext/components/model/ollama"

model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
    // Basic Configuration
    BaseURL:  "http://localhost:11434", // Ollama service address
    Timeout:  30 * time.Second,         // Request timeout
    
    // Model Configuration
    Model:     "llama2",                // Model name
    Format:    "json",                  // Output format (optional)
    KeepAlive: &keepAlive,              // Keep-alive time
    
    // Model Parameters
    Options: &api.Options{
        Temperature:     0.7,           // Temperature
        TopP:           0.9,           // Top-P sampling
        TopK:           40,            // Top-K sampling
        Seed:           42,            // Random seed
        NumPredict:     100,           // Maximum generation length
        Stop:           []string{},    // Stop words
        RepeatPenalty:  1.1,            // Repeat penalty
        NumCtx:         4096,          // Context window size
        NumGPU:         1,             // Number of GPUs
        NumThread:      4,             // Number of CPU threads
    },
})
```

### **Generating Conversations**

Conversation generation supports both normal mode and streaming mode:

```go
func main() {
    // Normal mode
    response, err := model.Generate(ctx, messages)
    
    // Streaming mode
    stream, err := model.Stream(ctx, messages)
}
```

Example of message formats:

```go
func main() {
    messages := []*schema.Message{
        // System message
        schema.SystemMessage("You are an assistant"),
        
        // User message
        schema.UserMessage("Hello")
    }
}
```

### **Tool Invocation**

Supports binding tools:

> Note: Only models that support function call can use this capability

```go
func main() {
    // Define tools
    tools := []*schema.ToolInfo{
        {
            Name: "search",
            Desc: "Search information",
            ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
                "query": {
                    Type:     schema.String,
                    Desc:     "Search keyword",
                    Required: true,
                },
            }),
        },
    }
    
    // Bind tools
    err := model.BindTools(tools)
}
```

### **Complete Usage Example**

#### **Basic Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ollama"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
        BaseURL:  "http://localhost:11434",
        Timeout:  30 * time.Second,
        Model:    "llama2",
        Options: &api.Options{
            Temperature: 0.7,
            NumPredict: 100,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Introduce Ollama"),
    }
    
    // Generate response
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
    
    // Handle response
    println(response.Content)
    
    // Get performance metrics
    if metrics, ok := response.ResponseMeta.Extra["ollama_metrics"].(api.Metrics); ok {
        println("Evaluation time:", metrics.EvalDuration)
        println("Total time:", metrics.TotalDuration)
    }
}
```

#### **Streaming Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ollama"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
        BaseURL:  "http://localhost:11434",
        Timeout:  30 * time.Second,
        Model:    "llama2",
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Tell a joke"),
    }
    
    // Get streaming response
    stream, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer stream.Close() // Remember to close the reader
    
    // Handle streaming content
    for {
        chunk, err := stream.Recv()
        if err != nil {
            break
        }
        print(chunk.Content)
    }
}
```

## **Related Documents**

- [Eino: ChatModel guide](/en/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode guide](/en/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - OpenAI](/en/docs/eino/ecosystem/chat_model/chat_model_openai)
- [ChatModel - ARK](/en/docs/eino/ecosystem/chat_model/chat_model_ark)
- [Ollama Model Library](https://ollama.ai/library)
