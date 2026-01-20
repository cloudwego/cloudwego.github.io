---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Indexer - Elasticsearch 7 '
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides ElasticSearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatiotemporal search capabilities.

An Elasticsearch 7.x indexer implementation for [Eino](https://github.com/cloudwego/eino), implementing the `Indexer` interface. This component seamlessly integrates with Eino's document indexing system, providing powerful vector storage and retrieval capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/indexer.Indexer`
- Easy integration with Eino indexing system
- Configurable Elasticsearch parameters
- Supports vector similarity search
- Supports batch indexing operations
- Supports custom field mapping
- Flexible document vectorization support

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/es7@latest
```

## Quick Start

Here is a simple example of using the indexer:

```go
import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/components/embedding"
        "github.com/cloudwego/eino/schema"
        elasticsearch "github.com/elastic/go-elasticsearch/v7"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/indexer/es7"
)

const (
        indexName          = "eino_example"
        fieldContent       = "content"
        fieldContentVector = "content_vector"
        fieldExtraLocation = "location"
        docExtraLocation   = "location"
)

func main() {
        ctx := context.Background()

        // ES supports multiple connection methods
        username := os.Getenv("ES_USERNAME")
        password := os.Getenv("ES_PASSWORD")

        client, _ := elasticsearch.NewClient(elasticsearch.Config{
                Addresses: []string{"http://localhost:9200"},
                Username:  username,
                Password:  password,
        })

        // Create embedding component using Volcengine ARK
        emb, _ := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Region: os.Getenv("ARK_REGION"),
                Model:  os.Getenv("ARK_MODEL"),
        })

        // Load documents
        docs := []*schema.Document{
                {
                        ID:      "1",
                        Content: "Eiffel Tower: Located in Paris, France.",
                        MetaData: map[string]any{
                                docExtraLocation: "France",
                        },
                },
                {
                        ID:      "2",
                        Content: "The Great Wall: Located in China.",
                        MetaData: map[string]any{
                                docExtraLocation: "China",
                        },
                },
        }

        // Create ES indexer component
        indexer, _ := es7.NewIndexer(ctx, &es7.IndexerConfig{
                Client:    client,
                Index:     indexName,
                BatchSize: 10,
                DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es7.FieldValue, err error) {
                        return map[string]es7.FieldValue{
                                fieldContent: {
                                        Value:    doc.Content,
                                        EmbedKey: fieldContentVector, // Vectorize document content and save to "content_vector" field
                                },
                                fieldExtraLocation: {
                                        Value: doc.MetaData[docExtraLocation],
                                },
                        }, nil
                },
                Embedding: emb,
        })

        ids, err := indexer.Store(ctx, docs)
        if err != nil {
                fmt.Printf("index error: %v\n", err)
                return
        }
        fmt.Println("indexed ids:", ids)
}
```

## Configuration

The indexer can be configured using the `IndexerConfig` struct:

```go
type IndexerConfig struct {
    Client *elasticsearch.Client // Required: Elasticsearch client instance
    Index  string                // Required: Index name for storing documents
    BatchSize int                // Optional: Maximum text embedding batch size (default: 5)

    // Required: Function to map Document fields to Elasticsearch fields
    DocumentToFields func(ctx context.Context, doc *schema.Document) (map[string]FieldValue, error)

    // Optional: Required only when vectorization is needed
    Embedding embedding.Embedder
}

// FieldValue defines how a field should be stored and vectorized
type FieldValue struct {
    Value     any    // Original value to store
    EmbedKey  string // If set, Value will be vectorized and saved
    Stringify func(val any) (string, error) // Optional: Custom string conversion
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to join the oncall group.

- [Eino Documentation](https://www.cloudwego.io/docs/eino/)
- [Elasticsearch Go Client Documentation](https://github.com/elastic/go-elasticsearch)
