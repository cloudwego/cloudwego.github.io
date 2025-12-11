---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Retriever - Milvus
weight: 0
---

## **Milvus Search**

Vector search based on Milvus 2.x that provides a `Retriever` implementation for [Eino](https://github.com/cloudwego/eino). Integrates with Eino’s vector storage and retrieval for semantic search.

## **Quick Start**

### **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/retriever/milvus
```

### **Create Milvus Search**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/embedding/ark"
    "github.com/milvus-io/milvus-sdk-go/v2/client"

    "github.com/cloudwego/eino-ext/components/retriever/milvus"
)

func main() {
    // env vars
    addr := os.Getenv("MILVUS_ADDR")
    username := os.Getenv("MILVUS_USERNAME")
    password := os.Getenv("MILVUS_PASSWORD")
    arkApiKey := os.Getenv("ARK_API_KEY")
    arkModel := os.Getenv("ARK_MODEL")

    // client
    ctx := context.Background()
    cli, err := client.NewClient(ctx, client.Config{ Address: addr, Username: username, Password: password })
    if err != nil { log.Fatalf("Failed to create client: %v", err); return }
    defer cli.Close()

    // embedder
    emb, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{ APIKey: arkApiKey, Model: arkModel })

    // retriever
    retriever, err := milvus.NewRetriever(ctx, &milvus.RetrieverConfig{
        Client:       cli,
        Collection:   "",
        Partition:    nil,
        VectorField:  "",
        OutputFields: []string{ "id", "content", "metadata" },
        DocumentConverter: nil,
        MetricType:        "",
        TopK:              0,
        ScoreThreshold:    5,
        Sp:                nil,
        Embedding:         emb,
    })
    if err != nil { log.Fatalf("Failed to create retriever: %v", err); return }

    // retrieve
    documents, err := retriever.Retrieve(ctx, "milvus")
    if err != nil { log.Fatalf("Failed to retrieve: %v", err); return }

    // print
    for i, doc := range documents {
        fmt.Printf("Document %d:\n", i)
        fmt.Printf("title: %s\n", doc.ID)
        fmt.Printf("content: %s\n", doc.Content)
        fmt.Printf("metadata: %v\n", doc.MetaData)
    }
}
```

## **Configuration**

```go
type RetrieverConfig struct {
    // Milvus client (required)
    Client client.Client

    // Collection name (optional, default "eino_collection")
    Collection string
    // Partition names (optional)
    Partition []string
    // Vector field name (optional, default "vector")
    VectorField string
    // Fields to return (optional)
    OutputFields []string
    // Convert search result to schema.Document (optional, default converter)
    DocumentConverter func(ctx context.Context, doc client.SearchResult) ([]*s.Document, error)
    // Vector metric type (optional, default "HAMMING")
    MetricType entity.MetricType
    // Number of results (optional, default 5)
    TopK int
    // Score threshold (optional, default 0)
    ScoreThreshold float64
    // Search params (optional, default entity.IndexAUTOINDEXSearchParam, level 1)
    Sp entity.SearchParam

    // Embedding for query/content (required)
    Embedding embedding.Embedder
}
```
