---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Embedding - openai
weight: 0
---

## **Overview**

OpenAI embedder is an implementation of Eino’s Embedding interface that converts text into vector representations. It follows [Eino: Embedding Guide](/en/docs/eino/core_modules/components/embedding_guide) and is typically used for:

- Converting text into high‑dimensional vectors
- Using OpenAI’s embedding models
- Using Azure OpenAI Service embedding models

## **Usage**

### **Initialization**

Initialize via `NewEmbedder` with key configuration options:

```go
import "github.com/cloudwego/eino-ext/components/embedding/openai"

embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
    // OpenAI API config
    APIKey:  "your-api-key",
    Model:   "text-embedding-ada-002",
    Timeout: 30 * time.Second,

    // Optional: Azure OpenAI Service config
    ByAzure:    true,
    BaseURL:    "https://your-resource.openai.azure.com",
    APIVersion: "2023-05-15",

    EncodingFormat: &format,    // encoding format
    Dimensions:     &dimension, // vector dimension
    User:           &user,      // user identifier
})
```

### **Generate Embeddings**

Vectorization is done via `EmbedStrings`:

```go
embeddings, err := embedder.EmbedStrings(ctx, []string{
    "First text",
    "Second text",
})
```

### **Complete Example**

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

    // init embedder
    embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "text-embedding-ada-002",
        Timeout: 30 * time.Second,
    })
    if err != nil {
        panic(err)
    }

    // generate embeddings
    texts := []string{
        "This is the first sample text",
        "This is the second sample text",
    }

    embeddings, err := embedder.EmbedStrings(ctx, texts)
    if err != nil {
        panic(err)
    }

    // use vectors
    for i, embedding := range embeddings {
        println("text", i+1, "vector dim:", len(embedding))
    }
}
```

## **References**

- [Eino: Embedding Guide](/en/docs/eino/core_modules/components/embedding_guide)
- [Embedding — Ark](/en/docs/eino/ecosystem_integration/embedding/embedding_ark)
- OpenAI Embedding API: https://platform.openai.com/docs/guides/embeddings
- Azure OpenAI Service: https://learn.microsoft.com/azure/cognitive-services/openai/
