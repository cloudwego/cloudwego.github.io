---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - volc VikingDB
weight: 0
---

## **Overview**

Volcengine VikingDB vector indexer is an implementation of the Indexer interface. It stores document content into Volcengine's VikingDB vector database. This component follows the guide [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide).

### **VikingDB Service Overview**

VikingDB is a high-performance vector database service that provides vector storage, retrieval, and embedding. This component interacts with the service via the Volcengine SDK and supports two embedding approaches:

- Use VikingDB's built-in embedding (Embedding V2)
- Use a custom embedding model

## **Usage**

### **Initialization**

Initialize the VikingDB indexer via `NewIndexer` with key configuration options:

```go
import "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"

indexer, err := volc_vikingdb.NewIndexer(ctx, &volc_vikingdb.IndexerConfig{
    Host:              "api-vikingdb.volces.com", // service host
    Region:            "cn-beijing",              // region
    AK:                "your-ak",                 // Access Key
    SK:                "your-sk",                 // Secret Key
    Scheme:            "https",                   // protocol
    ConnectionTimeout: 30,                        // connection timeout (seconds)

    Collection: "your-collection",                // collection name

    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin: true,                         // use built-in embedding
        ModelName:  "text2vec-base",              // model name
        UseSparse:  true,                         // use sparse vectors
        Embedding:  embedder,                     // custom embedder
    },

    AddBatchSize: 5,                              // batch add size
})
```

### **Complete Examples**

#### **Using Built-in Embedding**

```go
package main

import (
    "context"
    
    volcvikingdb "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // init indexer
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
    
    // documents
    docs := []*schema.Document{
        {
            Content: "This is the first document content",
        },
        {
            Content: "This is the second document content",
        },
    }
    
    // store
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // handle returned IDs
    for i, id := range ids {
        println("doc", i+1, "stored ID:", id)
    }
}
```

#### **Using Custom Embedding**

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
    
    // init embedder (openai example)
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil {
        panic(err)
    }
    
    // init indexer
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
    
    // documents
    docs := []*schema.Document{
        {
            Content: "Document content one",
        },
        {
            Content: "Document content two",
        },
    }
    
    // store
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // handle returned IDs
    for i, id := range ids {
        println("doc", i+1, "stored ID:", id)
    }
}
```

## **References**

- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
- [Volcengine VikingDB Guide](https://www.volcengine.com/docs/84313/1254617)
