---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - OpenSearch 2
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides Elasticsearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatio-temporal search capabilities.

An OpenSearch 2 retriever implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Retriever` interface. This enables OpenSearch to seamlessly integrate into Eino's vector retrieval system, enhancing semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino's retrieval system
- Configurable OpenSearch parameters
- Support for vector similarity search and keyword search
- Multiple search modes:
  - KNN (Approximate Nearest Neighbor)
  - Exact Match (keyword search)
  - Raw String (native JSON request body)
  - Dense Vector Similarity (script score, dense vectors)
  - Neural Sparse (sparse vectors)
- Custom result parsing support

## Search Mode Compatibility

<table>
<tr><td>Search Mode</td><td>Minimum OpenSearch Version</td><td>Description</td></tr>
<tr><td><pre>ExactMatch</pre></td><td>1.0+</td><td>Standard Query DSL</td></tr>
<tr><td><pre>RawString</pre></td><td>1.0+</td><td>Standard Query DSL</td></tr>
<tr><td><pre>DenseVectorSimilarity</pre></td><td>1.0+</td><td>Uses <pre>script_score</pre> and painless vector functions</td></tr>
<tr><td><pre>Approximate</pre> (KNN)</td><td>1.0+</td><td>Basic KNN supported since 1.0. Efficient filtering (Post-filtering) requires 2.4+ (Lucene HNSW) or 2.9+ (Faiss).</td></tr>
<tr><td><pre>Approximate</pre> (Hybrid)</td><td>2.10+</td><td>Generates <pre>bool</pre> query. Requires 2.10+ <pre>normalization-processor</pre> for advanced score normalization (Convex Combination). Basic <pre>bool</pre> queries work in earlier versions (1.0+).</td></tr>
<tr><td><pre>Approximate</pre> (RRF)</td><td>2.19+</td><td>Requires <pre>score-ranker-processor</pre> (2.19+) and <pre>neural-search</pre> plugin.</td></tr>
<tr><td><pre>NeuralSparse</pre> (Query Text)</td><td>2.11+</td><td>Requires <pre>neural-search</pre> plugin and deployed model.</td></tr>
<tr><td><pre>NeuralSparse</pre> (TokenWeights)</td><td>2.11+</td><td>Requires <pre>neural-search</pre> plugin.</td></tr>
</table>

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/retriever/opensearch2@latest
```

## Quick Start

Here is a simple example of how to use the retriever:

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"
        
        "github.com/cloudwego/eino/schema"
        opensearch "github.com/opensearch-project/opensearch-go/v2"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/retriever/opensearch2"
        "github.com/cloudwego/eino-ext/components/retriever/opensearch2/search_mode"
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

        // Create embedding component using Volcengine ARK
        emb, _ := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Region: os.Getenv("ARK_REGION"),
                Model:  os.Getenv("ARK_MODEL"),
        })

        // Create retriever component
        retriever, _ := opensearch2.NewRetriever(ctx, &opensearch2.RetrieverConfig{
                Client: client,
                Index:  "your_index_name",
                TopK:   5,
                // Choose search mode
                SearchMode: search_mode.Approximate(&search_mode.ApproximateConfig{
                        VectorField: "content_vector",
                        K:           5,
                }),
                ResultParser: func(ctx context.Context, hit map[string]interface{}) (*schema.Document, error) {
                        // Parse hit map to Document
                        id, _ := hit["_id"].(string)
                        source := hit["_source"].(map[string]interface{})
                        content, _ := source["content"].(string)
                        return &schema.Document{ID: id, Content: content}, nil
                },
                Embedding: emb,
        })

        docs, err := retriever.Retrieve(ctx, "search query")
        if err != nil {
                fmt.Printf("retrieve error: %v\n", err)
                return
        }
        for _, doc := range docs {
                fmt.Printf("ID: %s, Content: %s\n", doc.ID, doc.Content)
        }
}
```

## Configuration

The retriever can be configured using the `RetrieverConfig` struct:

```go
type RetrieverConfig struct {
    Client *opensearch.Client // Required: OpenSearch client instance
    Index  string             // Required: Index name for retrieving documents
    TopK   int                // Required: Number of results to return

    // Required: Search mode configuration
    // Pre-built implementations are provided in the search_mode package:
    // - search_mode.Approximate(&ApproximateConfig{...})
    // - search_mode.ExactMatch(field)
    // - search_mode.RawStringRequest()
    // - search_mode.DenseVectorSimilarity(type, vectorField)
    // - search_mode.NeuralSparse(vectorField, &NeuralSparseConfig{...})
    SearchMode SearchMode

    // Optional: Function to parse OpenSearch hits (map[string]interface{}) to Document
    // If not provided, a default parser will be used.
    ResultParser func(ctx context.Context, hit map[string]interface{}) (doc *schema.Document, err error)

    // Optional: Required only when query vectorization is needed
    Embedding embedding.Embedder
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

- [Eino Documentation](https://www.cloudwego.io/docs/eino/)
- [OpenSearch Go Client Documentation](https://github.com/opensearch-project/opensearch-go)
