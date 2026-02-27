---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - Elasticsearch 9
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides Elasticsearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatio-temporal search capabilities.

An Elasticsearch 9.x retriever implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Retriever` interface. This enables seamless integration with Eino's vector retrieval system to enhance semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino's retrieval system
- Configurable Elasticsearch parameters
- Support for vector similarity search
- Multiple search modes (including approximate search)
- Custom result parsing support
- Flexible document filtering

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/retriever/es9@latest
```

## Quick Start

Here is a quick example using approximate search mode. For more details, see components/retriever/es9/examples/approximate/approximate.go:

```go
import (
        "context"
        "encoding/json"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino/components/embedding"
        "github.com/cloudwego/eino/schema"
        "github.com/elastic/go-elasticsearch/v9"
        "github.com/elastic/go-elasticsearch/v9/typedapi/types"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/retriever/es9"
        "github.com/cloudwego/eino-ext/components/retriever/es9/search_mode"
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

        // Create retriever component
        retriever, _ := es9.NewRetriever(ctx, &es9.RetrieverConfig{
                Client: client,
                Index:  indexName,
                TopK:   5,
                SearchMode: search_mode.SearchModeApproximate(&search_mode.ApproximateConfig{
                        QueryFieldName:  fieldContent,
                        VectorFieldName: fieldContentVector,
                        Hybrid:          true,
                        // RRF is only available under certain licenses
                        // See: https://www.elastic.co/subscriptions
                        RRF:             false,
                        RRFRankConstant: nil,
                        RRFWindowSize:   nil,
                }),
                ResultParser: func(ctx context.Context, hit types.Hit) (doc *schema.Document, err error) {
                        doc = &schema.Document{
                                ID:       *hit.Id_,
                                Content:  "",
                                MetaData: map[string]any{},
                        }

                        var src map[string]any
                        if err = json.Unmarshal(hit.Source_, &src); err != nil {
                                return nil, err
                        }

                        for field, val := range src {
                                switch field {
                                case fieldContent:
                                        doc.Content = val.(string)
                                case fieldContentVector:
                                        var v []float64
                                        for _, item := range val.([]interface{}) {
                                                v = append(v, item.(float64))
                                        }
                                        doc.WithDenseVector(v)
                                case fieldExtraLocation:
                                        doc.MetaData[docExtraLocation] = val.(string)
                                }
                        }

                        if hit.Score_ != nil {
                                doc.WithScore(float64(*hit.Score_))
                        }

                        return doc, nil
                },
                Embedding: emb,
        })

        // Search without filters
        docs, _ := retriever.Retrieve(ctx, "tourist attraction")

        // Search with filters
        docs, _ = retriever.Retrieve(ctx, "tourist attraction",
                es9.WithFilters([]types.Query{{
                        Term: map[string]types.TermQuery{
                                fieldExtraLocation: {
                                        CaseInsensitive: of(true),
                                        Value:           "China",
                                },
                        },
                }}),
        )

        fmt.Printf("retrieved docs: %+v\n", docs)
}

func of[T any](v T) *T {
        return &v
}
```

## Configuration

The retriever can be configured using the `RetrieverConfig` struct:

```go
type RetrieverConfig struct {
    Client *elasticsearch.Client // Required: Elasticsearch client instance
    Index  string               // Required: Index name for retrieving documents
    TopK   int                  // Required: Number of results to return

    // Required: Search mode configuration
    SearchMode search_mode.SearchMode

    // Optional: Function to parse Elasticsearch hits into Documents
    // If not provided, a default parser will be used:
    // 1. Extract "content" field from source as Document.Content
    // 2. Use other source fields as Document.MetaData
    ResultParser func(ctx context.Context, hit types.Hit) (*schema.Document, error)

    // Optional: Required only when query vectorization is needed
    Embedding embedding.Embedder
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

- [Eino Documentation](https://www.cloudwego.io/docs/eino/)
- [Elasticsearch Go Client Documentation](https://github.com/elastic/go-elasticsearch)
