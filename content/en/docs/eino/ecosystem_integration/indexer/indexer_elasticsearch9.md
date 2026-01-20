---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - Elasticsearch 9
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides ElasticSearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatiotemporal search capabilities.

An Elasticsearch 9.x indexer implementation for [Eino](https://github.com/cloudwego/eino), implementing the `Indexer` interface. This enables seamless integration with Eino's vector storage and retrieval system, enhancing semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/indexer.Indexer`
- Easy integration with Eino's indexing system
- Configurable Elasticsearch parameters
- Supports vector similarity search
- Batch indexing operations
- Custom field mapping support
- Flexible document vectorization

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/es9@latest
```

## Quick Start

Here is a quick example of using the indexer, for more details please read components/indexer/es9/examples/indexer/add_documents.go:

```go
import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/components/embedding"
        "github.com/cloudwego/eino/schema"
        "github.com/elastic/go-elasticsearch/v9"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/indexer/es9"
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
        httpCACertPath := os.Getenv("ES_HTTP_CA_CERT_PATH")

        var cert []byte
        var err error
        if httpCACertPath != "" {
                cert, err = os.ReadFile(httpCACertPath)
                if err != nil {
                        log.Fatalf("read file failed, err=%v", err)
                }
        }

        client, _ := elasticsearch.NewClient(elasticsearch.Config{
                Addresses: []string{"https://localhost:9200"},
                Username:  username,
                Password:  password,
                CACert:    cert,
        })

        // 2. Create embedding component (using Ark)
        // Replace "ARK_API_KEY", "ARK_REGION", "ARK_MODEL" with actual configuration
        emb, _ := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Region: os.Getenv("ARK_REGION"),
                Model:  os.Getenv("ARK_MODEL"),
        })

        // 3. Prepare documents
        // Documents typically contain ID and Content
        // Can also include additional Metadata for filtering or other purposes
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

        // 4. Create ES indexer component
        indexer, _ := es9.NewIndexer(ctx, &es9.IndexerConfig{
                Client:    client,
                Index:     indexName,
                BatchSize: 10,
                // DocumentToFields specifies how to map document fields to ES fields
                DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es9.FieldValue, err error) {
                        return map[string]es9.FieldValue{
                                fieldContent: {
                                        Value:    doc.Content,
                                        EmbedKey: fieldContentVector, // Vectorize document content and save to "content_vector" field
                                },
                                fieldExtraLocation: {
                                        // Additional metadata field
                                        Value: doc.MetaData[docExtraLocation],
                                },
                        }, nil
                },
                // Provide embedding component for vectorization
                Embedding: emb,
        })

        // 5. Index documents
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
    BatchSize int                // Optional: Maximum text count for embedding (default: 5)

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
