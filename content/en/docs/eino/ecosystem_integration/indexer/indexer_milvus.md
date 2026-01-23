---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - Milvus v1 (Legacy)
weight: 0
---

> **Module Note:** This module (`EINO-ext/milvus`) is based on `milvus-sdk-go`. Since the underlying SDK has been deprecated and only supports up to Milvus 2.4, this module is retained only for backward compatibility.
>
> **Recommendation:** New users should use [Indexer - Milvus 2 (v2.5+)](/docs/eino/ecosystem_integration/indexer/indexer_milvusv2) for continued support.

## **Milvus Storage**

Vector storage based on Milvus 2.x that provides an `Indexer` implementation for [Eino](https://github.com/cloudwego/eino). This component integrates seamlessly with Eino's vector storage and retrieval system for semantic search.

## **Quick Start**

### **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/indexer/milvus
```

### **Create Milvus Storage**

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
        // Get the environment variables
        addr := os.Getenv("MILVUS_ADDR")
        username := os.Getenv("MILVUS_USERNAME")
        password := os.Getenv("MILVUS_PASSWORD")
        arkApiKey := os.Getenv("ARK_API_KEY")
        arkModel := os.Getenv("ARK_MODEL")
        
        // Create a client
        ctx := context.Background()
        cli, err := client.NewClient(ctx, client.Config{
                Address:  addr,
                Username: username,
                Password: password,
        })
        if err != nil {
                log.Fatalf("Failed to create client: %v", err)
                return
        }
        defer cli.Close()
        
        // Create an embedding model
        emb, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: arkApiKey,
                Model:  arkModel,
        })
        if err != nil {
                log.Fatalf("Failed to create embedding: %v", err)
                return
        }
        
        // Create an indexer
        indexer, err := milvus.NewIndexer(ctx, &milvus.IndexerConfig{
                Client:    cli,
                Embedding: emb,
        })
        if err != nil {
                log.Fatalf("Failed to create indexer: %v", err)
                return
        }
        log.Printf("Indexer created success")
        
        // Store documents
        docs := []*schema.Document{
                {
                        ID:      "milvus-1",
                        Content: "milvus is an open-source vector database",
                        MetaData: map[string]any{
                                "h1": "milvus",
                                "h2": "open-source",
                                "h3": "vector database",
                        },
                },
                {
                        ID:      "milvus-2",
                        Content: "milvus is a distributed vector database",
                },
        }
        ids, err := indexer.Store(ctx, docs)
        if err != nil {
                log.Fatalf("Failed to store: %v", err)
                return
        }
        log.Printf("Store success, ids: %v", ids)
}
```

## **Configuration**

```go
type IndexerConfig struct {
        // Client is the milvus client to call
        // Required
        Client client.Client
        
        // Default collection configuration
        // Collection is the collection name in milvus database
        // Optional, default value is "eino_collection"
        // If you want to use this configuration, you must add Field configuration, otherwise it will not work properly
        Collection string
        // Description is the description of the collection
        // Optional, default value is "the collection for eino"
        Description string
        // PartitionNum is the number of collection partitions
        // Optional, default value is 1 (disabled)
        // If partition number is greater than 1, it means partitioning is enabled, and there must be a partition key in Fields
        PartitionNum int64
        // Fields are the collection fields
        // Optional, default value is the default fields
        Fields       []*entity.Field
        // SharedNum is the milvus parameter required for creating a collection
        // Optional, default value is 1
        SharedNum int32
        // ConsistencyLevel is the milvus collection consistency policy
        // Optional, default level is ClBounded (bounded consistency level, default tolerance is 5 seconds)
        ConsistencyLevel ConsistencyLevel
        // EnableDynamicSchema indicates whether the collection enables dynamic schema
        // Optional, default value is false
        // Enabling dynamic schema may affect milvus performance
        EnableDynamicSchema bool
        
        // DocumentConverter is the function to convert schema.Document to row data
        // Optional, default value is defaultDocumentConverter
        DocumentConverter func(ctx context.Context, docs []*schema.Document, vectors [][]float64) ([]interface{}, error)
        
        // Index configuration for vector column
        // MetricType is the metric type for vectors
        // Optional, default type is HAMMING
        MetricType MetricType
        
        // Embedding is the vectorization method required to embed values from schema.Document content
        // Required
        Embedding embedding.Embedder
}
```

## **Default Data Model**

## Getting Help

If you have any questions or feature suggestions, feel free to join the oncall group.

### External References

- [Milvus Documentation](https://milvus.io/docs)
- [Milvus Index Types](https://milvus.io/docs/index.md)
- [Milvus Metric Types](https://milvus.io/docs/metric.md)
- [milvus-sdk-go Reference](https://milvus.io/api-reference/go/v2.4.x/About.md)

### Related Documentation

- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
