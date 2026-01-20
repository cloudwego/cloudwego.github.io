---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Embedding - ARK
weight: 0
---

## **Overview**

Ark Embedding is an implementation of Eino’s Embedding interface that converts text to vectors. Volcengine Ark provides model inference services, including text embedding. This component follows [[🚧]Eino: Embedding Guide](/docs/eino/core_modules/components/embedding_guide).

## **Usage**

### **Initialization**

Initialize via `NewEmbedder` with key configuration options:

```go
import "github.com/cloudwego/eino-ext/components/embedding/ark"

embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
    // authentication (choose one)
    APIKey: "your-api-key",  // API Key auth
    // or AK/SK auth
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",

    // service config
    Model:   "ep-xxxxxxx-xxxxx",                // Ark endpoint ID
    BaseURL: "https://ark.cn-beijing.volces.com/api/v3", // optional, defaults to Beijing
    Region:  "cn-beijing",                      // optional, defaults to Beijing

    // advanced
    Timeout:    &timeout,    // request timeout
    RetryTimes: &retryTimes, // retry times
    Dimensions: &dimensions, // output vector dimension
    User:       &user,       // user identifier
})
```

### **Generate Embeddings**

Text vectorization is done via `EmbedStrings`:

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

    "github.com/cloudwego/eino-ext/components/embedding/ark"
)

func main() {
    ctx := context.Background()

    // init embedder
    timeout := 30 * time.Second
    embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "ep-20xxxxxxx-xxxxx",
        Timeout: &timeout,
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

    // use generated vectors
    for i, embedding := range embeddings {
        println("text", i+1, "vector dim:", len(embedding))
    }
}
```

## **References**

- [Eino: Embedding Guide](/docs/eino/core_modules/components/embedding_guide)
- [Embedding - OpenAI](/docs/eino/ecosystem_integration/embedding/embedding_openai)
- Volcengine Ark: https://www.volcengine.com/product/ark
