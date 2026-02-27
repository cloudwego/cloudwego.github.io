---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Retriever - Milvus v2 (Recommended) '
weight: 0
---

> **Milvus Vector Database Introduction**
>
> Milvus Vector Retrieval Service is a fully managed database service built on open-source Milvus, providing efficient unstructured data retrieval capabilities suitable for diverse AI scenarios. Users no longer need to worry about underlying hardware resources, reducing costs and improving overall efficiency.
>
> Since the **internal** Milvus service uses the standard SDK, the **EINO-ext community version** is applicable.

This package provides a Milvus 2.x (V2 SDK) retriever implementation for the EINO framework, supporting vector similarity search with multiple search modes.

> **Note**: This package requires **Milvus 2.5+** for server-side functions (like BM25). Basic functionality is compatible with lower versions.

## Features

- **Milvus V2 SDK**: Uses the latest `milvus-io/milvus/client/v2` SDK
- **Multiple Search Modes**: Supports approximate search, range search, hybrid search, iterator search, and scalar search
- **Dense + Sparse Hybrid Search**: Combines dense vectors and sparse vectors with RRF reranking
- **Custom Result Conversion**: Configurable result-to-document conversion

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/retriever/milvus2
```

## Quick Start

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/milvus-io/milvus/client/v2/milvusclient"

        milvus2 "github.com/cloudwego/eino-ext/components/retriever/milvus2"
        "github.com/cloudwego/eino-ext/components/retriever/milvus2/search_mode"
)

func main() {
        // Get environment variables
        addr := os.Getenv("MILVUS_ADDR")
        username := os.Getenv("MILVUS_USERNAME")
        password := os.Getenv("MILVUS_PASSWORD")
        arkApiKey := os.Getenv("ARK_API_KEY")
        arkModel := os.Getenv("ARK_MODEL")

        ctx := context.Background()

        // Create embedding model
        emb, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: arkApiKey,
                Model:  arkModel,
        })
        if err != nil {
                log.Fatalf("Failed to create embedding: %v", err)
                return
        }

        // Create retriever
        retriever, err := milvus2.NewRetriever(ctx, &milvus2.RetrieverConfig{
                ClientConfig: &milvusclient.ClientConfig{
                        Address:  addr,
                        Username: username,
                        Password: password,
                },
                Collection: "my_collection",
                TopK:       10,
                SearchMode: search_mode.NewApproximate(milvus2.COSINE),
                Embedding:  emb,
        })
        if err != nil {
                log.Fatalf("Failed to create retriever: %v", err)
                return
        }
        log.Printf("Retriever created successfully")

        // Retrieve documents
        documents, err := retriever.Retrieve(ctx, "search query")
        if err != nil {
                log.Fatalf("Failed to retrieve: %v", err)
                return
        }

        // Print documents
        for i, doc := range documents {
                fmt.Printf("Document %d:\n", i)
                fmt.Printf("  ID: %s\n", doc.ID)
                fmt.Printf("  Content: %s\n", doc.Content)
                fmt.Printf("  Score: %v\n", doc.Score())
        }
}
```

## Configuration Options

<table>
<tr><td>Field</td><td>Type</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Client</pre></td><td><pre>*milvusclient.Client</pre></td><td>-</td><td>Pre-configured Milvus client (optional)</td></tr>
<tr><td><pre>ClientConfig</pre></td><td><pre>*milvusclient.ClientConfig</pre></td><td>-</td><td>Client configuration (required when Client is nil)</td></tr>
<tr><td><pre>Collection</pre></td><td><pre>string</pre></td><td><pre>"eino_collection"</pre></td><td>Collection name</td></tr>
<tr><td><pre>TopK</pre></td><td><pre>int</pre></td><td><pre>5</pre></td><td>Number of results to return</td></tr>
<tr><td><pre>VectorField</pre></td><td><pre>string</pre></td><td><pre>"vector"</pre></td><td>Dense vector field name</td></tr>
<tr><td><pre>SparseVectorField</pre></td><td><pre>string</pre></td><td><pre>"sparse_vector"</pre></td><td>Sparse vector field name</td></tr>
<tr><td><pre>OutputFields</pre></td><td><pre>[]string</pre></td><td>All fields</td><td>Fields to return in results</td></tr>
<tr><td><pre>SearchMode</pre></td><td><pre>SearchMode</pre></td><td>-</td><td>Search strategy (required)</td></tr>
<tr><td><pre>Embedding</pre></td><td><pre>embedding.Embedder</pre></td><td>-</td><td>Embedder for query vectorization (required)</td></tr>
<tr><td><pre>DocumentConverter</pre></td><td><pre>func</pre></td><td>Default converter</td><td>Custom result-to-document conversion</td></tr>
<tr><td><pre>ConsistencyLevel</pre></td><td><pre>ConsistencyLevel</pre></td><td><pre>ConsistencyLevelDefault</pre></td><td>Consistency level (<pre>ConsistencyLevelDefault</pre> uses collection's level; no per-request override applied)</td></tr>
<tr><td><pre>Partitions</pre></td><td><pre>[]string</pre></td><td>-</td><td>Partitions to search</td></tr>
</table>

## Search Modes

Import search modes from `github.com/cloudwego/eino-ext/components/retriever/milvus2/search_mode`.

### Approximate Search

Standard approximate nearest neighbor (ANN) search.

```go
mode := search_mode.NewApproximate(milvus2.COSINE)
```

### Range Search

Search within a specified distance range (vectors within `Radius`).

```go
// L2: distance <= Radius
// IP/Cosine: score >= Radius
mode := search_mode.NewRange(milvus2.L2, 0.5).
    WithRangeFilter(0.1) // Optional: inner boundary for ring search
```

### Sparse Search (BM25)

Pure sparse vector search using BM25. Requires Milvus 2.5+ with sparse vector field and Functions enabled.

```go
// Pure sparse search (BM25) requires specifying OutputFields to get content
// MetricType: BM25 (default) or IP
mode := search_mode.NewSparse(milvus2.BM25)

// In configuration, use "*" or specific fields to ensure content is returned:
// OutputFields: []string{"*"}
```

### Hybrid Search (Dense + Sparse)

Multi-vector search combining dense and sparse vectors with result reranking. Requires a collection with both dense and sparse vector fields (see indexer sparse example).

```go
import (
    "github.com/milvus-io/milvus/client/v2/milvusclient"
    milvus2 "github.com/cloudwego/eino-ext/components/retriever/milvus2"
    "github.com/cloudwego/eino-ext/components/retriever/milvus2/search_mode"
)

// Define hybrid search with dense + sparse sub-requests
hybridMode := search_mode.NewHybrid(
    milvusclient.NewRRFReranker().WithK(60), // RRF reranker
    &search_mode.SubRequest{
        VectorField: "vector",             // Dense vector field
        VectorType:  milvus2.DenseVector,  // Default value, can be omitted
        TopK:        10,
        MetricType:  milvus2.L2,
    },
    // Sparse SubRequest
    &search_mode.SubRequest{
        VectorField: "sparse_vector",       // Sparse vector field
        VectorType:  milvus2.SparseVector,  // Specify sparse type
        TopK:        10,
        MetricType:  milvus2.BM25,          // Use BM25 or IP
    },
)

// Create retriever (sparse vector generation handled server-side by Milvus Function)
retriever, err := milvus2.NewRetriever(ctx, &milvus2.RetrieverConfig{
    ClientConfig:      &milvusclient.ClientConfig{Address: "localhost:19530"},
    Collection:        "hybrid_collection",
    VectorField:       "vector",             // Default dense field
    SparseVectorField: "sparse_vector",      // Default sparse field
    TopK:              5,
    SearchMode:        hybridMode,
    Embedding:         denseEmbedder,        // Standard Embedder for dense vectors
})
```

### Iterator Search

Batch-based traversal suitable for large result sets.

> [!WARNING]
>
> The `Retrieve` method in `Iterator` mode fetches **all** results until reaching the total limit (`TopK`) or end of collection. This may consume significant memory for extremely large datasets.

```go
// 100 is the batch size (entries per network call)
mode := search_mode.NewIterator(milvus2.COSINE, 100).
    WithSearchParams(map[string]string{"nprobe": "10"})

// Use RetrieverConfig.TopK to set the total limit (IteratorLimit).
```

### Scalar Search

Metadata-only filtering without vector similarity (uses filter expression as query).

```go
mode := search_mode.NewScalar()

// Query with filter expression
docs, err := retriever.Retrieve(ctx, `category == "electronics" AND year >= 2023`)
```

### Dense Vector Metrics

<table>
<tr><td>Metric Type</td><td>Description</td></tr>
<tr><td><pre>L2</pre></td><td>Euclidean distance</td></tr>
<tr><td><pre>IP</pre></td><td>Inner product</td></tr>
<tr><td><pre>COSINE</pre></td><td>Cosine similarity</td></tr>
</table>

### Sparse Vector Metrics

<table>
<tr><td>Metric Type</td><td>Description</td></tr>
<tr><td><pre>BM25</pre></td><td>Okapi BM25 (required for BM25 search)</td></tr>
<tr><td><pre>IP</pre></td><td>Inner product (for pre-computed sparse vectors)</td></tr>
</table>

### Binary Vector Metrics

<table>
<tr><td>Metric Type</td><td>Description</td></tr>
<tr><td><pre>HAMMING</pre></td><td>Hamming distance</td></tr>
<tr><td><pre>JACCARD</pre></td><td>Jaccard distance</td></tr>
<tr><td><pre>TANIMOTO</pre></td><td>Tanimoto distance</td></tr>
<tr><td><pre>SUBSTRUCTURE</pre></td><td>Substructure search</td></tr>
<tr><td><pre>SUPERSTRUCTURE</pre></td><td>Superstructure search</td></tr>
</table>

> **Important**: The metric type in SearchMode must match the index metric type used when creating the collection.

## Examples

See [https://github.com/cloudwego/eino-ext/tree/main/components/retriever/milvus2/examples](https://github.com/cloudwego/eino-ext/tree/main/components/retriever/milvus2/examples) for complete example code:

- [approximate](./examples/approximate) - Basic ANN search
- [range](./examples/range) - Range search example
- [hybrid](./examples/hybrid) - Hybrid multi-vector search (dense + BM25)
- [hybrid_chinese](./examples/hybrid_chinese) - Chinese hybrid search example
- [iterator](./examples/iterator) - Batch iterator search
- [scalar](./examples/scalar) - Scalar/metadata filtering
- [grouping](./examples/grouping) - Grouped search results
- [filtered](./examples/filtered) - Vector search with filters
- [sparse](./examples/sparse) - Pure sparse search example (BM25)

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

### External References

- [Milvus Documentation](https://milvus.io/docs)
- [Milvus Index Types](https://milvus.io/docs/index.md)
- [Milvus Metric Types](https://milvus.io/docs/metric.md)
- [Milvus Go SDK Reference](https://milvus.io/api-reference/go/v2.6.x/About.md)

### Related Documentation

- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
