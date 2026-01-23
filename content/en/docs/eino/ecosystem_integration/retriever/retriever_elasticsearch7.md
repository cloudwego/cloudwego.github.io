---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - Elasticsearch 7
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides Elasticsearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatio-temporal search capabilities.

An Elasticsearch 7.x retriever implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Retriever` interface. This component seamlessly integrates with Eino's retrieval system to provide enhanced semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino retrieval system
- Configurable Elasticsearch parameters
- Multiple search modes:
  - Exact Match (text search)
  - Dense Vector Similarity (semantic search)
  - Raw String (custom queries)
- Support for default result parser and custom parsers
- Filter support for fine-grained queries

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/retriever/es7@latest
```

## Quick Start

Here is a simple example of using the retriever:

```go
import (
        "context"
        "fmt"
        "os"

        "github.com/cloudwego/eino/schema"
        elasticsearch "github.com/elastic/go-elasticsearch/v7"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/retriever/es7"
        "github.com/cloudwego/eino-ext/components/retriever/es7/search_mode"
)

func main() {
        ctx := context.Background()

        // Connect to Elasticsearch
        username := os.Getenv("ES_USERNAME")
        password := os.Getenv("ES_PASSWORD")

        client, _ := elasticsearch.NewClient(elasticsearch.Config{
                Addresses: []string{"http://localhost:9200"},
                Username:  username,
                Password:  password,
        })

        // Create embedding component using Volcengine ARK for vector search
        emb, _ := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Region: os.Getenv("ARK_REGION"),
                Model:  os.Getenv("ARK_MODEL"),
        })

        // Create retriever with dense vector similarity search
        retriever, _ := es7.NewRetriever(ctx, &es7.RetrieverConfig{
                Client:     client,
                Index:      "my_index",
                TopK:       10,
                SearchMode: search_mode.DenseVectorSimilarity(search_mode.DenseVectorSimilarityTypeCosineSimilarity, "content_vector"),
                Embedding:  emb,
        })

        // Retrieve documents
        docs, _ := retriever.Retrieve(ctx, "search query")

        for _, doc := range docs {
                fmt.Printf("ID: %s, Content: %s, Score: %v\n", doc.ID, doc.Content, doc.Score())
        }
}
```

## Search Modes

### Exact Match

Uses Elasticsearch match query for simple text search:

```go
searchMode := search_mode.ExactMatch("content")
```

### Dense Vector Similarity

Uses script_score with dense vectors for semantic search:

```go
// Cosine similarity
searchMode := search_mode.DenseVectorSimilarity(
    search_mode.DenseVectorSimilarityTypeCosineSimilarity,
    "content_vector",
)

// Other similarity types:
// - DenseVectorSimilarityTypeDotProduct
// - DenseVectorSimilarityTypeL1Norm
// - DenseVectorSimilarityTypeL2Norm
```

### Raw String Request

Pass custom JSON queries directly:

```go
searchMode := search_mode.RawStringRequest()

// Then use a JSON query string as the search query
query := `{"query": {"bool": {"must": [{"match": {"content": "search term"}}]}}}`
docs, _ := retriever.Retrieve(ctx, query)
```

## Configuration

```go
type RetrieverConfig struct {
    Client         *elasticsearch.Client  // Required: Elasticsearch client
    Index          string                 // Required: Index name
    TopK           int                    // Optional: Number of results (default: 10)
    ScoreThreshold *float64               // Optional: Minimum score threshold
    SearchMode     SearchMode             // Required: Search strategy
    ResultParser   func(ctx context.Context, hit map[string]interface{}) (*schema.Document, error) // Optional: Custom parser
    Embedding      embedding.Embedder     // Required for vector search modes
}
```

## Using Filters

Add query filters using the `WithFilters` option:

```go
filters := []interface{}{
    map[string]interface{}{
        "term": map[string]interface{}{
            "category": "news",
        },
    },
}

docs, _ := retriever.Retrieve(ctx, "query", es7.WithFilters(filters))
```

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

- [Eino Documentation](https://www.cloudwego.io/docs/eino/)
- [Elasticsearch Go Client Documentation](https://github.com/elastic/go-elasticsearch)
- [Elasticsearch 7.10 Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/7.10/query-dsl.html)
