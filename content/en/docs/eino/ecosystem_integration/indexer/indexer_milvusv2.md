---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - Milvus v2 (Recommended)
weight: 0
---

> **Milvus Vector Database Introduction**
>
> Milvus Vector Retrieval Service is a fully managed database service built on open-source Milvus, providing efficient unstructured data retrieval capabilities suitable for diverse AI scenarios. Customers no longer need to worry about underlying hardware resources, reducing usage costs and improving overall efficiency.
>
> Since the company's **internal** Milvus service uses the standard SDK, the **EINO-ext community version** is applicable.

This package provides a Milvus 2.x (V2 SDK) indexer implementation for the EINO framework, supporting document storage and vector indexing.

> **Note**: This package requires **Milvus 2.5+** to support server-side functions (such as BM25), basic functionality is compatible with lower versions.

## Features

- **Milvus V2 SDK**: Uses the latest `milvus-io/milvus/client/v2` SDK
- **Flexible Index Types**: Supports multiple index builders including Auto, HNSW, IVF series, SCANN, DiskANN, GPU indexes, and RaBitQ (Milvus 2.6+)
- **Hybrid Search Ready**: Native support for hybrid storage of sparse vectors (BM25/SPLADE) and dense vectors
- **Server-side Vector Generation**: Automatic sparse vector generation using Milvus Functions (BM25)
- **Automated Management**: Automatic handling of collection schema creation, index building, and loading
- **Field Analysis**: Configurable text analyzers (supporting Chinese Jieba, English, Standard, etc.)
- **Custom Document Conversion**: Flexible mapping from Eino documents to Milvus columns

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/milvus2
```

## Quick Start

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino/schema"
        "github.com/milvus-io/milvus/client/v2/milvusclient"

        milvus2 "github.com/cloudwego/eino-ext/components/indexer/milvus2"
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

        // Create indexer
        indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
                ClientConfig: &milvusclient.ClientConfig{
                        Address:  addr,
                        Username: username,
                        Password: password,
                },
                Collection:   "my_collection",

                Vector: &milvus2.VectorConfig{
                        Dimension:  1024, // Match embedding model dimension
                        MetricType: milvus2.COSINE,
                        IndexBuilder: milvus2.NewHNSWIndexBuilder().WithM(16).WithEfConstruction(200),
                },
                Embedding:    emb,
        })
        if err != nil {
                log.Fatalf("Failed to create indexer: %v", err)
                return
        }
        log.Printf("Indexer created successfully")

        // Store documents
        docs := []*schema.Document{
                {
                        ID:      "doc1",
                        Content: "Milvus is an open-source vector database",
                        MetaData: map[string]any{
                                "category": "database",
                                "year":     2021,
                        },
                },
                {
                        ID:      "doc2",
                        Content: "EINO is a framework for building AI applications",
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

## Configuration Options

<table>
<tr><td>Field</td><td>Type</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Client</pre></td><td><pre>*milvusclient.Client</pre></td><td>-</td><td>Pre-configured Milvus client (optional)</td></tr>
<tr><td><pre>ClientConfig</pre></td><td><pre>*milvusclient.ClientConfig</pre></td><td>-</td><td>Client configuration (required when Client is empty)</td></tr>
<tr><td><pre>Collection</pre></td><td><pre>string</pre></td><td><pre>"eino_collection"</pre></td><td>Collection name</td></tr>
<tr><td><pre>Vector</pre></td><td><pre>*VectorConfig</pre></td><td>-</td><td>Dense vector configuration (Dimension, MetricType, field name)</td></tr>
<tr><td><pre>Sparse</pre></td><td><pre>*SparseVectorConfig</pre></td><td>-</td><td>Sparse vector configuration (MetricType, field name)</td></tr>
<tr><td><pre>IndexBuilder</pre></td><td><pre>IndexBuilder</pre></td><td><pre>AutoIndexBuilder</pre></td><td>Index type builder</td></tr>
<tr><td><pre>Embedding</pre></td><td><pre>embedding.Embedder</pre></td><td>-</td><td>Embedder for vectorization (optional). If empty, documents must contain vectors (BYOV).</td></tr>
<tr><td><pre>ConsistencyLevel</pre></td><td><pre>ConsistencyLevel</pre></td><td><pre>ConsistencyLevelDefault</pre></td><td>Consistency level (<pre>ConsistencyLevelDefault</pre> uses Milvus default: Bounded; if not explicitly set, maintains collection-level setting)</td></tr>
<tr><td><pre>PartitionName</pre></td><td><pre>string</pre></td><td>-</td><td>Default partition for inserting data</td></tr>
<tr><td><pre>EnableDynamicSchema</pre></td><td><pre>bool</pre></td><td><pre>false</pre></td><td>Enable dynamic field support</td></tr>
<tr><td><pre>Functions</pre></td><td><pre>[]*entity.Function</pre></td><td>-</td><td>Schema function definitions (e.g., BM25) for server-side processing</td></tr>
<tr><td><pre>FieldParams</pre></td><td><pre>map[string]map[string]string</pre></td><td>-</td><td>Field parameter configuration (e.g., enable_analyzer)</td></tr>
</table>

### Dense Vector Configuration (`VectorConfig`)

<table>
<tr><td>Field</td><td>Type</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Dimension</pre></td><td><pre>int64</pre></td><td>-</td><td>Vector dimension (required)</td></tr>
<tr><td><pre>MetricType</pre></td><td><pre>MetricType</pre></td><td><pre>L2</pre></td><td>Similarity metric type (L2, IP, COSINE, etc.)</td></tr>
<tr><td><pre>VectorField</pre></td><td><pre>string</pre></td><td><pre>"vector"</pre></td><td>Dense vector field name</td></tr>
</table>

### Sparse Vector Configuration (`SparseVectorConfig`)

<table>
<tr><td>Field</td><td>Type</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>VectorField</pre></td><td><pre>string</pre></td><td><pre>"sparse_vector"</pre></td><td>Sparse vector field name</td></tr>
<tr><td><pre>MetricType</pre></td><td><pre>MetricType</pre></td><td><pre>BM25</pre></td><td>Similarity metric type</td></tr>
<tr><td><pre>Method</pre></td><td><pre>SparseMethod</pre></td><td><pre>SparseMethodAuto</pre></td><td>Generation method (<pre>SparseMethodAuto</pre> or <pre>SparseMethodPrecomputed</pre>)</td></tr>
</table>

> **Note**: Only when `MetricType` is `BM25`, `Method` defaults to `Auto`. `Auto` means using Milvus server-side functions (remote functions). For other metric types (such as `IP`), the default is `Precomputed`.

## Index Builders

### Dense Index Builders

<table>
<tr><td>Builder</td><td>Description</td><td>Key Parameters</td></tr>
<tr><td><pre>NewAutoIndexBuilder()</pre></td><td>Milvus automatically selects optimal index</td><td>-</td></tr>
<tr><td><pre>NewHNSWIndexBuilder()</pre></td><td>Graph-based high-performance index</td><td><pre>M</pre>, <pre>EfConstruction</pre></td></tr>
<tr><td><pre>NewIVFFlatIndexBuilder()</pre></td><td>Clustering-based search</td><td><pre>NList</pre></td></tr>
<tr><td><pre>NewIVFPQIndexBuilder()</pre></td><td>Product quantization, memory efficient</td><td><pre>NList</pre>, <pre>M</pre>, <pre>NBits</pre></td></tr>
<tr><td><pre>NewIVFSQ8IndexBuilder()</pre></td><td>Scalar quantization</td><td><pre>NList</pre></td></tr>
<tr><td><pre>NewIVFRabitQIndexBuilder()</pre></td><td>IVF + RaBitQ binary quantization (Milvus 2.6+)</td><td><pre>NList</pre></td></tr>
<tr><td><pre>NewFlatIndexBuilder()</pre></td><td>Brute-force exact search</td><td>-</td></tr>
<tr><td><pre>NewDiskANNIndexBuilder()</pre></td><td>Disk index for large datasets</td><td>-</td></tr>
<tr><td><pre>NewSCANNIndexBuilder()</pre></td><td>Fast search with high recall</td><td><pre>NList</pre>, <pre>WithRawDataEnabled</pre></td></tr>
<tr><td><pre>NewBinFlatIndexBuilder()</pre></td><td>Brute-force search for binary vectors</td><td>-</td></tr>
<tr><td><pre>NewBinIVFFlatIndexBuilder()</pre></td><td>Clustering search for binary vectors</td><td><pre>NList</pre></td></tr>
<tr><td><pre>NewGPUBruteForceIndexBuilder()</pre></td><td>GPU-accelerated brute-force search</td><td>-</td></tr>
<tr><td><pre>NewGPUIVFFlatIndexBuilder()</pre></td><td>GPU-accelerated IVF_FLAT</td><td>-</td></tr>
<tr><td><pre>NewGPUIVFPQIndexBuilder()</pre></td><td>GPU-accelerated IVF_PQ</td><td>-</td></tr>
<tr><td><pre>NewGPUCagraIndexBuilder()</pre></td><td>GPU-accelerated graph index (CAGRA)</td><td><pre>IntermediateGraphDegree</pre>, <pre>GraphDegree</pre></td></tr>
</table>

### Sparse Index Builders

<table>
<tr><td>Builder</td><td>Description</td><td>Key Parameters</td></tr>
<tr><td><pre>NewSparseInvertedIndexBuilder()</pre></td><td>Inverted index for sparse vectors</td><td><pre>DropRatioBuild</pre></td></tr>
<tr><td><pre>NewSparseWANDIndexBuilder()</pre></td><td>WAND algorithm for sparse vectors</td><td><pre>DropRatioBuild</pre></td></tr>
</table>

### Example: HNSW Index

```go
indexBuilder := milvus2.NewHNSWIndexBuilder().
        WithM(16).              // Maximum connections per node (4-64)
        WithEfConstruction(200) // Search width during index construction (8-512)
```

### Example: IVF_FLAT Index

```go
indexBuilder := milvus2.NewIVFFlatIndexBuilder().
        WithNList(256) // Number of cluster units (1-65536)
```

### Example: IVF_PQ Index (Memory Efficient)

```go
indexBuilder := milvus2.NewIVFPQIndexBuilder().
        WithNList(256). // Number of cluster units
        WithM(16).      // Number of sub-quantizers
        WithNBits(8)    // Bits per sub-quantizer (1-16)
```

### Example: SCANN Index (Fast Search with High Recall)

```go
indexBuilder := milvus2.NewSCANNIndexBuilder().
        WithNList(256).           // Number of cluster units
        WithRawDataEnabled(true)  // Enable raw data for reranking
```

### Example: DiskANN Index (Large Datasets)

```go
indexBuilder := milvus2.NewDiskANNIndexBuilder() // Disk-based, no additional parameters
```

### Example: Sparse Inverted Index

```go
indexBuilder := milvus2.NewSparseInvertedIndexBuilder().
        WithDropRatioBuild(0.2) // Ratio of small values to ignore during build (0.0-1.0)
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
<tr><td><pre>BM25</pre></td><td>Okapi BM25 (<pre>SparseMethodAuto</pre> required)</td></tr>
<tr><td><pre>IP</pre></td><td>Inner product (for precomputed sparse vectors)</td></tr>
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

## Sparse Vector Support

The indexer supports two sparse vector modes: **Auto-Generation** and **Precomputed**.

### Auto-Generation (BM25)

Automatically generates sparse vectors from content fields using Milvus server-side functions.

- **Requirements**: Milvus 2.5+
- **Configuration**: Set `MetricType: milvus2.BM25`.

```go
indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
    // ... basic configuration ...
    Collection:        "hybrid_collection",
    
    Sparse: &milvus2.SparseVectorConfig{
        VectorField: "sparse_vector",
        MetricType:  milvus2.BM25, 
        // Method defaults to SparseMethodAuto when using BM25
    },
    
    // Analyzer configuration for BM25
    FieldParams: map[string]map[string]string{
        "content": {
            "enable_analyzer": "true",
            "analyzer_params": `{"type": "standard"}`, // Use {"type": "chinese"} for Chinese
        },
    },
})
```

### Precomputed (SPLADE, BGE-M3, etc.)

Allows storing sparse vectors generated by external models (such as SPLADE, BGE-M3) or custom logic.

- **Configuration**: Set `MetricType` (usually `IP`) and `Method: milvus2.SparseMethodPrecomputed`.
- **Usage**: Pass sparse vectors via `doc.WithSparseVector()`.

```go
indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
    Collection: "sparse_collection",
    
    Sparse: &milvus2.SparseVectorConfig{
        VectorField: "sparse_vector",
        MetricType:  milvus2.IP,
        Method:      milvus2.SparseMethodPrecomputed,
    },
})

// Store documents with sparse vectors
doc := &schema.Document{ID: "1", Content: "..."}
doc.WithSparseVector(map[int]float64{
    1024: 0.5,
    2048: 0.3,
})
indexer.Store(ctx, []*schema.Document{doc})
```

## Bring Your Own Vectors (BYOV)

If your documents already contain vectors, you can use the Indexer without configuring an Embedder.

```go
// Create indexer without embedding
indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
    ClientConfig: &milvusclient.ClientConfig{
        Address: "localhost:19530",
    },
    Collection:   "my_collection",
    Vector: &milvus2.VectorConfig{
        Dimension:  128,
        MetricType: milvus2.L2,
    },
    // Embedding: nil, // Leave empty
})

// Store documents with precomputed vectors
docs := []*schema.Document{
    {
        ID:      "doc1",
        Content: "Document with existing vector",
    },
}

// Attach dense vector to document
// Vector dimension must match collection dimension
vector := []float64{0.1, 0.2, ...} 
docs[0].WithDenseVector(vector)

// Attach sparse vector (optional, if Sparse is configured)
// Sparse vector is a mapping of index -> weight
sparseVector := map[int]float64{
    10: 0.5,
    25: 0.8,
}
docs[0].WithSparseVector(sparseVector)

ids, err := indexer.Store(ctx, docs)
```

For sparse vectors in BYOV mode, refer to the **Precomputed** section above for configuration.

## Examples

See the [https://github.com/cloudwego/eino-ext/tree/main/components/indexer/milvus2/examples](https://github.com/cloudwego/eino-ext/tree/main/components/indexer/milvus2/examples) directory for complete example code:

- [demo](./examples/demo) - Basic collection setup using HNSW index
- [hnsw](./examples/hnsw) - HNSW index example
- [ivf_flat](./examples/ivf_flat) - IVF_FLAT index example
- [rabitq](./examples/rabitq) - IVF_RABITQ index example (Milvus 2.6+)
- [auto](./examples/auto) - AutoIndex example
- [diskann](./examples/diskann) - DISKANN index example
- [hybrid](./examples/hybrid) - Hybrid search setup (dense + BM25 sparse) (Milvus 2.5+)
- [hybrid_chinese](./examples/hybrid_chinese) - Chinese hybrid search example (Milvus 2.5+)
- [sparse](./examples/sparse) - Pure sparse index example (BM25)
- [byov](./examples/byov) - Bring Your Own Vectors example

## Getting Help

- [[Internal] Milvus Quick Start](https://bytedance.larkoffice.com/wiki/P3JBw4PtKiLGPhkUCQZcXbHFnkf)

If you have any questions or feature suggestions, feel free to join the oncall group.

### External References

- [Milvus Documentation](https://milvus.io/docs)
- [Milvus Index Types](https://milvus.io/docs/index.md)
- [Milvus Metric Types](https://milvus.io/docs/metric.md)
- [Milvus Go SDK Reference](https://milvus.io/api-reference/go/v2.6.x/About.md)

### Related Documentation

- [Eino: Indexer User Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever User Guide](/docs/eino/core_modules/components/retriever_guide)
