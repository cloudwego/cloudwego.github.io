---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: ChatModel - OpenAI
weight: 0
---

## **Basic Introduction**

The OpenAI model is an implementation of the ChatModel interface, used for interacting with OpenAI's GPT series models. This component implements the [Eino: ChatModel guide](/docs/eino/core_modules/components/chat_model_guide), primarily for the following scenarios:

- Need to use OpenAI's GPT series models
- Need to use Azure OpenAI Service
- Use other models compatible with OpenAI interfaces

## **Usage Instructions**

### **Component Initialization**

The OpenAI model is initialized via the `NewChatModel` function. The main configuration parameters are as follows:

```go
import "github.com/cloudwego/eino-ext/components/model/openai"

func main() {
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        // Azure OpenAI Service configuration (optional)
        ByAzure:    false,           // Whether to use Azure OpenAI
        BaseURL:    "your-url",      // Azure API base URL
        APIVersion: "2023-05-15",    // Azure API version
        
        // Basic configuration
        APIKey:  "your-key",         // API key
        Timeout: 30 * time.Second,   // Timeout duration
        
        // Model parameters
        Model:            "gpt-4",   // Model name
        MaxTokens:        &maxTokens,// Maximum generation length
        Temperature:      &temp,     // Temperature
        TopP:             &topP,     // Top-P sampling
        N:                &n,        // Number of outputs
        Stop:             []string{},// Stop words
        PresencePenalty:  &pp,      // Presence penalty
        FrequencyPenalty: &fp,      // Frequency penalty
        
        // Advanced parameters
        ResponseFormat:   &format,   // Response format
        Seed:            &seed,      // Random seed
        LogitBias:       map[string]int{}, // Token bias
        LogProbs:        &logProbs,  // Whether to return probabilities
        TopLogProbs:     &topLp,    // Number of Top K probabilities
        User:            &user,      // User identifier
    })
}
```

> - For detailed parameter meanings, refer to: [https://platform.openai.com/docs/api-reference/chat/create](https://platform.openai.com/docs/api-reference/chat/create)
> - For Azure related services, refer to: [https://learn.microsoft.com/en-us/azure/ai-services/openai/](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

### **Generating Dialogues**

Dialogue generation supports both regular mode and streaming mode:

```go
func main() {
    // invoke mode
    response, err := model.Generate(ctx, messages)
    
    // streaming mode
    stream, err := model.Stream(ctx, messages)
}
```

Example of message format:

```go
messages := []*schema.Message{
    // System message
    schema.SystemMessage("You are an assistant"),
    
    // Text message
    schema.UserMessage("Hello"),
    
    // Multi-modal message (containing an image)
    {
        Role: schema.User,
        MultiContent: []schema.ChatMessagePart{
            {
                Type: schema.ChatMessagePartTypeImageURL,
                ImageURL: &schema.ChatMessageImageURL{
                    URL:    "https://example.com/image.jpg",
                    Detail: "high",
                },
            },
            {
                Type: schema.ChatMessagePartTypeText,
                Text: "What is in this image?",
            },
        },
    },
}
```

### **Tool Invocation**

Supports binding tools and forced tool invocation:

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
                    Desc:     "Search keywords",
                    Required: true,
                },
            }),
        },
    }
    
    // Bind optional tools
    err := model.BindTools(tools)
    
    // Bind forced tools
    err := model.BindForcedTools(tools)
}
```

> For tool-related information, refer to [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)

### **Complete Usage Example**

#### **Direct Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key", // required
        Timeout: 30 * time.Second,
        Model:   "gpt-4", // required
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Introduce eino"),
    }
    
    // Generate response
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
    
    // Handle response
    println(response.Content)
}
```

#### **Streaming Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey:  "your-api-key",
        Timeout: 30 * time.Second,
        Model:   "gpt-4",
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Write a story"),
    }
    
    // Get streaming response
    reader, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer reader.Close() // Remember to close
    
    // Handle streaming content
    for {
        chunk, err := reader.Recv()
        if err != nil {
            break
        }
        print(chunk.Content)
    }
}
```

## **Related Documents**

- [Eino: ChatModel guide](/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - ARK](/docs/eino/ecosystem/chat_model/chat_model_ark)
- [ChatModel - Ollama](/docs/eino/ecosystem/chat_model/chat_model_ollama)
