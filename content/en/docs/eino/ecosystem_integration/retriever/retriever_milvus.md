---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - Milvus v1 (Legacy)
weight: 0
---

> **Module Note:** This module (`EINO-ext/milvus`) is based on `milvus-sdk-go`. Since the underlying SDK has been discontinued and only supports up to Milvus 2.4, this module is retained only for backward compatibility.
>
> **Recommendation:** New users should use [Retriever - Milvus 2 (v2.5+)](/docs/eino/ecosystem_integration/retriever/retriever_milvusv2) for continued support.

## **Milvus Search**

Vector search implementation based on Milvus 2.x that provides a `Retriever` interface implementation for [Eino](https://github.com/cloudwego/eino). This component seamlessly integrates with Eino's vector storage and retrieval system to enhance semantic search capabilities.

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
        
        // Create a retriever
        retriever, err := milvus.NewRetriever(ctx, &milvus.RetrieverConfig{
                Client:      cli,
                Collection:  "",
                Partition:   nil,
                VectorField: "",
                OutputFields: []string{
                        "id",
                        "content",
                        "metadata",
                },
                DocumentConverter: nil,
                MetricType:        "",
                TopK:              0,
                ScoreThreshold:    5,
                Sp:                nil,
                Embedding:         emb,
        })
        if err != nil {
                log.Fatalf("Failed to create retriever: %v", err)
                return
        }
        
        // Retrieve documents
        documents, err := retriever.Retrieve(ctx, "milvus")
        if err != nil {
                log.Fatalf("Failed to retrieve: %v", err)
                return
        }
        
        // Print the documents
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
    // Client is the milvus client to call
    // Required
    Client client.Client

    // Retriever common configuration
    // Collection is the collection name in milvus database
    // Optional, default value is "eino_collection"
    Collection string
    // Partition is the partition name of the collection
    // Optional, default value is empty
    Partition []string
    // VectorField is the vector field name in the collection
    // Optional, default value is "vector"
    VectorField string
    // OutputFields are the fields to return
    // Optional, default value is empty
    OutputFields []string
    // DocumentConverter is the function to convert search result to s.Document
    // Optional, default value is defaultDocumentConverter
    DocumentConverter func(ctx context.Context, doc client.SearchResult) ([]*s.Document, error)
    // MetricType is the metric type of the vector
    // Optional, default value is "HAMMING"
    MetricType entity.MetricType
    // TopK is the top k results to return
    // Optional, default value is 5
    TopK int
    // ScoreThreshold is the threshold of the search result
    // Optional, default value is 0
    ScoreThreshold float64
    // SearchParams
    // Optional, default value is entity.IndexAUTOINDEXSearchParam, level 1
    Sp entity.SearchParam

    // Embedding is the method to embed values from s.Document content that need to be embedded
    // Required
    Embedding embedding.Embedder
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

### External References

- [Milvus Documentation](https://milvus.io/docs)
- [Milvus Index Types](https://milvus.io/docs/index.md)
- [Milvus Metric Types](https://milvus.io/docs/metric.md)
- [milvus-sdk-go Reference](https://milvus.io/api-reference/go/v2.4.x/About.md)

### Related Documentation

- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
