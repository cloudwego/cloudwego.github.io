---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: Embedding - OpenAI
weight: 0
---

## **Basic Introduction**

The OpenAI Vector Embedder is an implementation of the Eino Embedding interface used to convert text into vector representations. This component implements [Eino: Embedding guide](/docs/eino/core_modules/components/embedding_guide) and is primarily used in the following scenarios:

- When text needs to be converted into high-dimensional vector representations
- Using OpenAI's embedding models
- Using Azure OpenAI Service's embedding models

## **Usage Instructions**

### **Component Initialization**

The OpenAI Vector Embedder is initialized through the `NewEmbedder` function, with the main configuration parameters as follows:

```go
import "github.com/cloudwego/eino-ext/components/embedding/openai"

embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
    // OpenAI API Configuration
    APIKey:  "your-api-key",
    Model:   "text-embedding-ada-002",
    Timeout: 30 * time.Second,
    
    // Optional: Azure OpenAI Service Configuration
    ByAzure:    true,
    BaseURL:    "https://your-resource.openai.azure.com",
    APIVersion: "2023-05-15",

    EncodingFormat: &format,    // Encoding format
    Dimensions:     &dimension, // Vector dimensions
    User:          &user,      // User identification
})
```

### **Generating Vector Embeddings**

Text vectorization is achieved through the `EmbedStrings` method:

```go
embeddings, err := embedder.EmbedStrings(ctx, []string{
    "First text",
    "Second text",
})
```

### **Complete Usage Example**

#### **Basic Usage**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/embedding/openai"
)

func main() {
    ctx := context.Background()
    
    // Initializing the embedder
    embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "text-embedding-ada-002",
        Timeout: 30 * time.Second,
    })
    if err != nil {
        panic(err)
    }
    
    // Generating text vectors
    texts := []string{
        "This is the first sample text",
        "This is the second sample text",
    }
    
    embeddings, err := embedder.EmbedStrings(ctx, texts)
    if err != nil {
        panic(err)
    }
    
    // Using the generated vectors
    for i, embedding := range embeddings {
        println("Text", i+1, "vector dimensions:", len(embedding))
    }
}
```

## **Related Documentation**

- [Eino: Embedding guide](/docs/eino/core_modules/components/embedding_guide)
- [Embedding - ARK](/docs/eino/ecosystem_integration/embedding/embedding_ark)
- __OpenAI Embedding API Documentation__
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/azure/cognitive-services/openai/)
