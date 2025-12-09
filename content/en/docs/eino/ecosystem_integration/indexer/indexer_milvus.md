---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Indexer - milvus
weight: 0
---

## Milvus Storage

Vector storage based on Milvus 2.x that provides an `Indexer` implementation for [Eino](https://github.com/cloudwego/eino). Integrates with Eino’s vector storage and retrieval for semantic search.

## Quick Start

### Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/milvus
```

### Create Milvus Storage

```go
package main

import (
    "context"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/embedding/ark"
    "github.com/cloudwego/eino/schema"
    "github.com/milvus-io/milvus-sdk-go/v2/client"

    "github.com/cloudwego/eino-ext/components/indexer/milvus"
)

func main() {
    addr := os.Getenv("MILVUS_ADDR")
    username := os.Getenv("MILVUS_USERNAME")
    password := os.Getenv("MILVUS_PASSWORD")
    arkApiKey := os.Getenv("ARK_API_KEY")
    arkModel := os.Getenv("ARK_MODEL")

    ctx := context.Background()
    cli, err := client.NewClient(ctx, client.Config{ Address: addr, Username: username, Password: password })
    if err != nil { log.Fatalf("Failed to create client: %v", err) }
    defer cli.Close()

    emb, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{ APIKey: arkApiKey, Model: arkModel })
    if err != nil { log.Fatalf("Failed to create embedding: %v", err) }

    indexer, err := milvus.NewIndexer(ctx, &milvus.IndexerConfig{ Client: cli, Embedding: emb })
    if err != nil { log.Fatalf("Failed to create indexer: %v", err) }
    log.Printf("Indexer created success")

    docs := []*schema.Document{
        { ID: "milvus-1", Content: "milvus is an open-source vector database", MetaData: map[string]any{ "h1": "milvus", "h2": "open-source", "h3": "vector database" } },
        { ID: "milvus-2", Content: "milvus is a distributed vector database" },
    }
    ids, err := indexer.Store(ctx, docs)
    if err != nil { log.Fatalf("Failed to store: %v", err) }
    log.Printf("Store success, ids: %v", ids)
}
```

## Configuration

```go
type IndexerConfig struct {
    Client client.Client // required
    
    // Default collection config
    Collection string
    Description string
    PartitionNum int64
    Fields []*entity.Field
    SharedNum int32
    ConsistencyLevel ConsistencyLevel
    EnableDynamicSchema bool
    
    // Convert schema.Document to row data
    DocumentConverter func(ctx context.Context, docs []*schema.Document, vectors [][]float64) ([]interface{}, error)
    
    // Vector index config
    MetricType MetricType
    
    // Embedding method to vectorize content (required)
    Embedding embedding.Embedder
}
```

## Default Schema

| field    | type            | column type   | index type                     | desc        | note         |
|----------|-----------------|---------------|--------------------------------|-------------|--------------|
| id       | string          | varchar       |                                | unique id   | max len: 255 |
| content  | string          | varchar       |                                | content     | max len: 1024|
| vector   | []byte          | binary array  | HAMMING(default) / JACCARD     | content vec | dim: 81920   |
| metadata | map[string]any  | json          |                                | metadata    |              |
