---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: ChatModel - ARK
weight: 0
---

## **Basic Introduction**

Ark is an implementation of the ChatModel interface, used for interacting with the Volcano Engine Ark Runtime service. Ark Runtime is a LLM runtime service provided by Volcano Engine, offering a wide range of model options and complete API functionalities. This component interacts with the service through the Ark Runtime Go SDK, allowing the invocation of models deployed on the Volcano Engine, such as the Doubao LLM and the Shadow Moon LLM. This component implements the [Eino: ChatModel guide](/docs/eino/core_modules/components/chat_model_guide).

## **Usage**

### **Component Initialization**

The Ark model is initialized through the `NewChatModel` function with the following key configuration parameters:

```go
model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
    // Service Configuration
    BaseURL:    "https://ark.cn-beijing.volces.com/api/v3", // Service Address
    Region:     "cn-beijing",                               // Region
    HTTPClient: httpClient,                                 // Custom HTTP Client
    Timeout:    &timeout,                                   // Timeout Duration
    RetryTimes: &retries,                                   // Retry Attempts
    
    // Authentication Configuration (Choose one of the two)
    APIKey:    "your-api-key",     // API Key Authentication
    AccessKey: "your-ak",          // AK/SK Authentication
    SecretKey: "your-sk",
    
    // Model Configuration
    Model:     "endpoint-id",      // Model Endpoint ID
    
    // Generation Parameters
    MaxTokens:         &maxTokens, // Maximum Generation Length
    Temperature:       &temp,      // Temperature
    TopP:              &topP,      // Top-P Sampling
    Stop:              []string{}, // Stop Words
    FrequencyPenalty:  &fp,        // Frequency Penalty
    PresencePenalty:   &pp,        // Presence Penalty
    RepetitionPenalty: &rp,        // Repetition Penalty
    N:                 &n,         // Number of Generations
    
    // Advanced Parameters
    ResponseFormat:    &format,    // Response Format
    LogitBias:         map[string]int{}, // Token Bias
    LogProbs:          &logProbs,  // Return Log Probabilities
    TopLogProbs:       &topLp,     // Number of Top K Probabilities
    User:              &user,      // User Identifier
})
```

### **Generating Conversations**

Conversation generation supports both normal mode and streaming mode:

```go
func main() {
    // Normal Mode
    response, err := model.Generate(ctx, messages)
    
    // Streaming Mode
    stream, err := model.Stream(ctx, messages)
}
```

Sample message format:

> Note: Whether images in multimodal are supported depends on the specific model

```go
func main() {
    messages := []*schema.Message{
        // System Message
        schema.SystemMessage("You are an assistant"),
        
        // Text Message
        schema.UserMessage("Hello"),
        
        // Multimodal Message (including images)
        {
            Role: schema.User,
            MultiContent: []schema.ChatMessagePart{
                {
                    Type: schema.ChatMessagePartTypeText,
                    Text: "What is in this picture?",
                },
                {
                    Type: schema.ChatMessagePartTypeImageURL,
                    ImageURL: &schema.ChatMessageImageURL{
                        URL:    "https://example.com/image.jpg",
                        Detail: schema.ImageURLDetailAuto,
                    },
                },
            },
        },
    }
}
```### **Tool Invocation**

Supported tools binding:

```go
// Define tool
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
```

> For information related to tools, please refer to [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)

### **Complete Usage Example**

#### **Direct Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        APIKey:  "your-api-key",
        Region:  "cn-beijing",
        Model:   "endpoint-id",
        Timeout: ptrOf(30 * time.Second),
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Introduce Volcano Engine"),
    }
    
    // Generate response
    response, err := model.Generate(ctx, messages)
    if err != nil {
        panic(err)
    }
    
    // Handle response
    println(response.Content)
    
    // Get token usage information
    if usage := response.ResponseMeta.Usage; usage != nil {
        println("Prompt Tokens:", usage.PromptTokens)
        println("Completion Tokens:", usage.CompletionTokens)
        println("Total Tokens:", usage.TotalTokens)
    }
}
```

#### **Streaming Conversation**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/model/ark"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize model
    model, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
        APIKey:  "your-api-key",
        Model:   "ep-xxx",
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare messages
    messages := []*schema.Message{
        schema.SystemMessage("You are an assistant"),
        schema.UserMessage("Introduce Eino"),
    }
    
    // Get streaming response
    reader, err := model.Stream(ctx, messages)
    if err != nil {
        panic(err)
    }
    defer reader.Close() // Be sure to close
    
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

## **Related Documentation**

- [Eino: ChatModel guide](/docs/eino/core_modules/components/chat_model_guide)
- [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)
- [ChatModel - OpenAI](/docs/eino/ecosystem/chat_model/chat_model_openai)
- [ChatModel - Ollama](/docs/eino/ecosystem/chat_model/chat_model_ollama)
- [Volcano Engine Official Website](https://www.volcengine.com/product/doubao)
