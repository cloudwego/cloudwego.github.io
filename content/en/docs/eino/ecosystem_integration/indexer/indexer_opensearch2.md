---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - OpenSearch 2
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides ElasticSearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatiotemporal search capabilities.

An OpenSearch 2 indexer implementation for [Eino](https://github.com/cloudwego/eino), implementing the `Indexer` interface. This enables seamless integration of OpenSearch into Eino's vector storage and retrieval system, enhancing semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/indexer.Indexer`
- Easy integration with Eino's indexing system
- Configurable OpenSearch parameters
- Supports vector similarity search
- Supports batch indexing operations
- Supports custom field mapping
- Flexible document vectorization support

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/opensearch2@latest
```

## Quick Start

Here is a simple example of how to use the indexer, for more details refer to components/indexer/opensearch2/examples/indexer/main.go:

```go
package main

import (
        "context"
        "fmt"
        "log"
        
        "github.com/cloudwego/eino/schema"
        opensearch "github.com/opensearch-project/opensearch-go/v2"

        "github.com/cloudwego/eino-ext/components/indexer/opensearch2"
)

func main() {
        ctx := context.Background()

        client, err := opensearch.NewClient(opensearch.Config{
                Addresses: []string{"http://localhost:9200"},
                Username:  username,
                Password:  password,
        })
        if err != nil {
                log.Fatal(err)
        }

        // Create embedding component
        emb := createYourEmbedding()

        // Create opensearch indexer component
        indexer, _ := opensearch2.NewIndexer(ctx, &opensearch2.IndexerConfig{
                Client:    client,
                Index:     "your_index_name",
                BatchSize: 10,
                DocumentToFields: func(ctx context.Context, doc *schema.Document) (map[string]opensearch2.FieldValue, error) {
                        return map[string]opensearch2.FieldValue{
                                "content": {
                                        Value:    doc.Content,
                                        EmbedKey: "content_vector",
                                },
                        }, nil
                },
                Embedding: emb,
        })

        docs := []*schema.Document{
                {ID: "1", Content: "example content"},
        }

        ids, _ := indexer.Store(ctx, docs)
        fmt.Println(ids)
}
```

## Configuration

The indexer can be configured using the `IndexerConfig` struct:

```go
type IndexerConfig struct {
    Client *opensearch.Client // Required: OpenSearch client instance
    Index  string             // Required: Index name for storing documents
    BatchSize int             // Optional: Maximum text embedding batch size (default: 5)

    // Required: Function to map Document fields to OpenSearch fields
    DocumentToFields func(ctx context.Context, doc *schema.Document) (map[string]FieldValue, error)

    // Optional: Required only when vectorization is needed
    Embedding embedding.Embedder
}

// FieldValue defines how a field should be stored and vectorized
type FieldValue struct {
    Value     any    // Original value to store
    EmbedKey  string // If set, Value will be vectorized and saved along with its vector value
    Stringify func(val any) (string, error) // Optional: Custom string conversion function
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to join the oncall group.

- [Eino Documentation](https://www.cloudwego.io/docs/eino/)
- [OpenSearch Go Client Documentation](https://github.com/opensearch-project/opensearch-go)
