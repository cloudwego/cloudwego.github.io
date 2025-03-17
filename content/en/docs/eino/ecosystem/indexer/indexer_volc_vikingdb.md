---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Indexer - volc VikingDB
weight: 0
---

## **Basic Introduction**

Volcano Engine VikingDB Vector Indexer is an implementation of the Indexer interface, used to store document content into Volcano Engine's VikingDB vector database. This component implements the instructions detailed in [Eino: Indexer guide](/docs/eino/core_modules/components/indexer_guide).

### **Volcano Engine VikingDB Service Introduction**

Volcano Engine VikingDB is a high-performance vector database service that provides vector storage, retrieval, and vectorization functionalities. This component interacts with the service via the Volcano Engine SDK and supports two vectorization methods:

- Using VikingDB's built-in vectorization method (Embedding V2)
- Using custom vector embedding models

## **Usage**

### **Component Initialization**

The Volcengine VikingDB indexer is initialized via the `NewIndexer` function. The main configuration parameters are as follows:

```go
import "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"

indexer, err := volc_vikingdb.NewIndexer(ctx, &volc_vikingdb.IndexerConfig{
    Host:              "api-vikingdb.volces.com", // Service address
    Region:            "cn-beijing",             // Region
    AK:                "your-ak",                // Access Key
    SK:                "your-sk",                // Secret Key
    Scheme:            "https",                  // Protocol
    ConnectionTimeout: 30,                       // Connection timeout (seconds)
    
    Collection: "your-collection",               // Collection name
    
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin: true,                        // Whether to use built-in vectorization
        ModelName:  "text2vec-base",             // Model name
        UseSparse:  true,                        // Whether to use sparse vectors
        Embedding:  embedder,                    // Custom vector embedder
    },
    
    AddBatchSize: 5,                             // Batch add size
})
```

### **Complete Usage Example**

#### **Using Built-In Vectorization**

```go
package main

import (
    "context"
    
    volcvikingdb "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize the indexer
    idx, err := volcvikingdb.NewIndexer(ctx, &volcvikingdb.IndexerConfig{
        Host:     "api-vikingdb.volces.com",
        Region:   "cn-beijing",
        AK:       "your-ak",
        SK:       "your-sk",
        Scheme:   "https",
        
        Collection: "test-collection",
        
        EmbeddingConfig: volcvikingdb.EmbeddingConfig{
            UseBuiltin: true,
            ModelName:  "text2vec-base",
            UseSparse:  true,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare documents
    docs := []*schema.Document{
        {
            Content: "This is the content of the first document",
        },
        {
            Content: "This is the content of the second document",
        },
    }
    
    // Store documents
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // Handle returned IDs
    for i, id := range ids {
        println("Document", i+1, "storage ID:", id)
    }
}
```

#### **Using Custom Vector Embedding**

```go
package main

import (
    "context"
    
    volcvikingdb "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize vector embedder (openai example)
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil {
        panic(err)
    }
    
    // Initialize the indexer
    idx, err := volcvikingdb.NewIndexer(ctx, &volcvikingdb.IndexerConfig{
        Host:     "api-vikingdb.volces.com",
        Region:   "cn-beijing",
        AK:       "your-ak",
        SK:       "your-sk",
        Scheme:   "https",
        
        Collection: "test-collection",
        
        EmbeddingConfig: volcvikingdb.EmbeddingConfig{
            UseBuiltin: false,
            Embedding:  embedder,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare documents
    docs := []*schema.Document{
        {
            Content: "Document content one",
        },
        {
            Content: "Document content two",
        },
    }
    
    // Store documents
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // Handle returned IDs
    for i, id := range ids {
        println("Document", i+1, "storage ID:", id)
    }
}
```

## **Related Documents**

- [Eino: Indexer guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever guide](/docs/eino/core_modules/components/retriever_guide)
- [Volcano Engine VikingDB User Guide](https://www.volcengine.com/docs/84313/1254617)
