---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Retriever - volc vikingdb
weight: 0
---

## **Overview**

Volcengine VikingDB retriever is an implementation of the Retriever interface. VikingDB is a high‑performance vector database service that provides vector retrieval capabilities. This component interacts with the service via the Volcengine VikingDB Go SDK. It follows [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide).

## **Usage**

### **Initialization**

Initialize the VikingDB retriever via `NewRetriever` with key configuration options:

```go
import "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"

retriever, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
    // service config
    Host:              "api-vikingdb.volces.com", // service host
    Region:            "cn-beijing",              // region
    AK:                "your-ak",                 // Access Key
    SK:                "your-sk",                 // Secret Key
    Scheme:            "https",                   // protocol
    ConnectionTimeout: 30,                        // connection timeout (seconds)

    // data config
    Collection: "collection-name",  // collection name
    Index:      "index-name",       // index name

    // embedding config
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin:  true,             // use built-in embedding
        ModelName:   "model-name",    // model name
        UseSparse:   true,             // use sparse vector
        DenseWeight: 0.5,              // dense vector weight
        Embedding:   embedder,         // custom embedder
    },

    // retrieval config
    Partition:      "partition",      // partition name
    TopK:           ptrOf(100),        // number of results
    ScoreThreshold: ptrOf(0.7),        // similarity threshold

    // filter config
    FilterDSL: map[string]any{         // DSL filter conditions
        "term": map[string]any{ "field": "value" },
    },
})
```

### **Retrieve Documents**

Retrieve documents via `Retrieve`:

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

    // init retriever
    r, err := volc_vikingdb.NewRetriever(ctx, &volc_vikingdb.RetrieverConfig{
        Host:       "api-vikingdb.volces.com",
        Region:     "cn-beijing",
        AK:         "your-ak",
        SK:         "your-sk",
        Collection: "your-collection",
        Index:      "your-index",
        EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
            UseBuiltin:  true,
            ModelName:   "model-name",
            UseSparse:   true,
            DenseWeight: 0.5,
        },
        TopK: ptrOf(5),
    })
    if err != nil { panic(err) }

    // retrieve
    docs, err := r.Retrieve(ctx, "How to use VikingDB?")
    if err != nil { panic(err) }

    // handle results
    for _, doc := range docs {
        println("docID:", doc.ID)
        println("content:", doc.Content)
        println("score:", doc.MetaData["_score"])
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

    // init embedder (openai example)
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil { panic(err) }

    // init retriever
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
    if err != nil { panic(err) }

    // retrieve
    docs, err := r.Retrieve(ctx, "query text")
    if err != nil { panic(err) }

    for _, doc := range docs { println(doc.Content) }
}
```

## **References**

- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
- VikingDB: https://www.volcengine.com/docs/84313
