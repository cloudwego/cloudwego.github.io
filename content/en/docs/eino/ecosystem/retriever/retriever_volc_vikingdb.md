---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Retriever - volc VikingDB
weight: 0
---

## **Basic Introduction**

The Volcano Engine VikingDB Retriever is an implementation of the Retriever interface. The Volcano Engine VikingDB is a vector database service provided by Volcano Engine, offering high-performance vector retrieval capabilities. This component interacts with the service through the Volcano Engine VikingDB Go SDK. The component implements the [Eino: Retriever guide](/en/docs/eino/core_modules/components/retriever_guide)

## **Usage**

### **Component Initialization**

The Volcengine VikingDB Retriever is initialized using the `NewRetriever` function, with the main configuration parameters as follows:

```go
import  "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"

retriever, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
    // Service Configuration
    Host:              "api-vikingdb.volces.com", // Service address
    Region:            "cn-beijing",            // Region
    AK:                "your-ak",               // Access key ID
    SK:                "your-sk",               // Access key secret
    Scheme:            "https",                 // Protocol
    ConnectionTimeout: 30,                      // Connection timeout (seconds)
    
    // Data Configuration
    Collection: "collection-name",  // Collection name
    Index:      "index-name",      // Index name
    
    // Embedding Configuration
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin:   true,        // Use built-in embedding
        ModelName:    "model-name",// Model name
        UseSparse:    true,        // Use sparse vectors
        DenseWeight:  0.5,         // Dense vector weight
        Embedding:    embedder,    // Custom embedder
    },
    
    // Retrieval Configuration
    Partition:      "partition",   // Partition name
    TopK:           ptrOf(100),   // Number of results to return
    ScoreThreshold: ptrOf(0.7),   // Similarity threshold
    
    // Filter Configuration
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

### **Complete Usage Example**

#### **Basic Retrieval**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
)

func main() {
    ctx := context.Background()
    
    // Initialize the retriever
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
    
    // Process results
    for _, doc := range docs {
        println("Document ID:", doc.ID)
        println("Content:", doc.Content)
        println("Similarity:", doc.MetaData["_score"])
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
    
    // Initialize embedder (using openai as an example)
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil {
        panic(err)
    }
    
    // Initialize the retriever
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
    
    // Process results
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

## **Related Documents**

- [Eino: Retriever guide](/en/docs/eino/core_modules/components/retriever_guide)
- [Volcano Engine VikingDB Documentation](https://www.volcengine.com/docs/84313)
