---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Retriever - volc VikingDB
weight: 0
---

## **Overview**

Volcengine VikingDB retriever is an implementation of the Retriever interface. Volcengine VikingDB is a vector database service provided by Volcengine that offers high-performance vector retrieval capabilities. This component interacts with the service via the Volcengine VikingDB Go SDK. It implements [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide).

## **Usage**

### **Initialization**

Initialize the Volcengine VikingDB retriever via `NewRetriever` with the following main configuration parameters:

```go
import "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"

retriever, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
    // Service configuration
    Host:              "api-vikingdb.volces.com", // Service address
    Region:            "cn-beijing",            // Region
    AK:                "your-ak",               // Access Key ID
    SK:                "your-sk",               // Access Key Secret
    Scheme:            "https",                 // Protocol
    ConnectionTimeout: 30,                      // Connection timeout (seconds)
    
    // Data configuration
    Collection: "collection-name",  // Collection name
    Index:      "index-name",      // Index name
    
    // Embedding configuration
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin:   true,        // Use built-in embedding
        ModelName:    "model-name",// Model name
        UseSparse:    true,        // Use sparse vector
        DenseWeight:  0.5,         // Dense vector weight
        Embedding:    embedder,    // Custom embedder
    },
    
    // Retrieval configuration
    Partition:      "partition",   // Partition name
    TopK:           ptrOf(100),   // Number of results to return
    ScoreThreshold: ptrOf(0.7),   // Similarity threshold
    
    // Filter configuration
    FilterDSL: map[string]any{    // DSL filter conditions
        "term": map[string]any{
            "field": "value",
        },
    },
})
```

### **Retrieve Documents**

Document retrieval is implemented via the `Retrieve` method:

```go
docs, err := retriever.Retrieve(ctx, "query text", retriever.WithTopK(5))
```

### **Complete Examples**

#### **Basic Retrieval**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
)

func main() {
    ctx := context.Background()
    
    // Initialize retriever
    r, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
        Host:       "api-vikingdb.volces.com",
        Region:     "cn-beijing",
        AK:         "your-ak",
        SK:         "your-sk",
        Collection: "your-collection",
        Index:      "your-index",
        EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
            UseBuiltin: true,
            ModelName:  "model-name",
            UseSparse:  true,
            DenseWeight: 0.5,
        },
        TopK: ptrOf(5),
    })
    if err != nil {
        panic(err)
    }
    
    // Execute retrieval
    docs, err := r.Retrieve(ctx, "How to use VikingDB?")
    if err != nil {
        panic(err)
    }
    
    // Handle results
    for _, doc := range docs {
        println("Document ID:", doc.ID)
        println("Content:", doc.Content)
        println("Score:", doc.MetaData["_score"])
    }
}
```

#### **Custom Embedding**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
    "github.com/cloudwego/eino/components/embedding"
)

func main() {
    ctx := context.Background()
    
    // Initialize embedder (using openai as example)
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil {
        panic(err)
    }
    
    // Initialize retriever
    r, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
        Host:       "api-vikingdb.volces.com",
        Region:     "cn-beijing",
        AK:         "your-ak",
        SK:         "your-sk",
        Collection: "your-collection",
        Index:      "your-index",
        EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
            UseBuiltin: false,
            Embedding:  embedder,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // Execute retrieval
    docs, err := r.Retrieve(ctx, "query text")
    if err != nil {
        panic(err)
    }
    
    // Handle results
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

## **Related Documentation**

- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
- [Volcengine VikingDB Documentation](https://www.volcengine.com/docs/84313)
