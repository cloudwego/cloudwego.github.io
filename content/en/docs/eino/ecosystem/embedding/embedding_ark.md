---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Embedding - ARK
weight: 0
---

## **Introduction**

Ark Embedding is an implementation of the Eino Embedding interface used to convert text into vector representations. Volcengine Ark is a platform that provides machine learning model inference services, including text vectorization services. This component implements the [Eino: Embedding guide](/en/docs/eino/core_modules/components/embedding_guide).

## **Usage**

### **Component Initialization**

The Ark vector embedder is initialized using the `NewEmbedder` function with the main configuration parameters as follows:

```go
import "github.com/cloudwego/eino-ext/components/embedding/ark"

embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
    // Authentication configuration (choose one)
    APIKey: "your-api-key",  // Use API Key for authentication
    // Or use AK/SK authentication
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    
    // Service configuration
    Model:   "ep-xxxxxxx-xxxxx", // Endpoint ID for the Ark platform
    BaseURL: "https://ark.cn-beijing.volces.com/api/v3", // Optional, default is the Beijing region
    Region:  "cn-beijing",         // Optional, default is the Beijing region
    
    // Advanced configuration
    Timeout:    &timeout,    // Request timeout
    RetryTimes: &retryTimes, // Number of retries
    Dimensions: &dimensions, // Output vector dimensions
    User:       &user,      // User identifier
})
```

### **Generate Vector Embeddings**

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
    
    "github.com/cloudwego/eino-ext/components/embedding/ark"
)

func main() {
    ctx := context.Background()
    
    // Initialize embedder
    timeout := 30 * time.Second
    embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "ep-20xxxxxxx-xxxxx",
        Timeout: &timeout,
    })
    if err != nil {
        panic(err)
    }
    
    // Generate text vectors
    texts := []string{
        "This is an example text segment one",
        "This is an example text segment two",
    }
    
    embeddings, err := embedder.EmbedStrings(ctx, texts)
    if err != nil {
        panic(err)
    }
    
    // Use generated vectors
    for i, embedding := range embeddings {
        println("Text", i+1, "vector dimension:", len(embedding))
    }
}
```

## **Related Documentation**

- [Eino: Embedding guide](/en/docs/eino/core_modules/components/embedding_guide)
- [Embedding - OpenAI](/en/docs/eino/ecosystem/embedding/embedding_openai)
- [Volcengine Ark Services](https://www.volcengine.com/product/ark)
