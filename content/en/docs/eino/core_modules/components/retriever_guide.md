---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: 'Eino: Retriever Guide'
weight: 4
---

## Introduction

The `Retriever` component fetches relevant documents based on a query from underlying indexes or stores. It’s useful for:

- Vector-similarity retrieval
- Keyword-based search
- Knowledge-base QA (RAG)

## Component Definition

### Interface

> Code: `eino/components/retriever/interface.go`

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

#### Retrieve

- Purpose: retrieve documents for a query
- Params:
  - `ctx`: context and callback manager
  - `query`: the query string
  - `opts`: retriever options
- Returns:
  - `[]*schema.Document`: matching documents
  - `error`

### Document

```go
type Document struct {
    ID string
    Content string
    MetaData map[string]any
}
```

### Common Options

Implementations should handle these common options, plus any impl-specific ones via `WrapRetrieverImplSpecificOptFn`:

```go
type Options struct {
    Index *string
    SubIndex *string
    TopK *int
    ScoreThreshold *float64
    Embedding embedding.Embedder
    DSLInfo map[string]interface{}
}
```

Helpers:

```go
WithIndex(index string) Option
WithSubIndex(subIndex string) Option
WithTopK(topK int) Option
WithScoreThreshold(threshold float64) Option
WithEmbedding(emb embedding.Embedder) Option
WithDSLInfo(dsl map[string]any) Option
```

## Usage

### Standalone

> Code: `eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding`

```go
import (
    "github.com/cloudwego/eino/components/retriever"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"

    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
)

collectionName := "eino_test"
indexName := "test_index_1"

/*
 * In the following example, a dataset (collection) named "eino_test" is pre-created,
 * and an hnsw-hybrid index named "test_index_1" is built on this dataset.
 * Dataset field configuration:
 * Field Name       Field Type      Vector Dim
 * ID               string
 * vector           vector          1024
 * sparse_vector    sparse_vector
 * content          string
 * extra_field_1    string
 *
 * Component usage notes:
 * 1. The field names and types for ID / vector / sparse_vector / content must match the above configuration
 * 2. The vector dimension must match the output dimension of the model for ModelName
 * 3. Some models do not output sparse vectors; in that case set UseSparse=false and the collection may omit sparse_vector
 */

cfg := &volc_vikingdb.RetrieverConfig{
    // https://api-vikingdb.volces.com (North China)
    // https://api-vikingdb.mlp.cn-shanghai.volces.com (East China)
    // https://api-vikingdb.mlp.ap-mya.byteplus.com (Overseas - Johor)
    Host:              "api-vikingdb.volces.com",
    Region:            "cn-beijing",
    AK: ak,
    SK: sk,
    Scheme:            "https",
    ConnectionTimeout: 0,
    Collection:        collectionName,
    Index:             indexName,
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
       UseBuiltin:  true,
       ModelName:   "bge-m3",
       UseSparse:   true,
       DenseWeight: 0.4,
    },
    Partition:      "", // corresponds to the index's sub-index partition field; leave empty if not set
    TopK:           of(10),
    ScoreThreshold: of(0.1),
    FilterDSL:      nil, // corresponds to the index's scalar filter field; leave nil if not set; see https://www.volcengine.com/docs/84313/1254609
}

volcRetriever, _ := volc_vikingdb.NewRetriever(ctx, cfg)
query := "tourist attraction"
docs, _ := volcRetriever.Retrieve(ctx, query)
log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, docs)
```

### In Orchestration

```go
// Chain
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(retriever)

// Graph
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddRetrieverNode("retriever_node", retriever)
```

## Options and Callbacks

### Option Mechanism

```go
// Use GetCommonOptions to handle common options
func (r *MyRetriever) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
    // 1. init and read options
    options := &retriever.Options{ // set defaults as needed
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // ...
}
```

### Callback Example

> Code: `eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding`

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/retriever"
    "github.com/cloudwego/eino/compose"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
)

handler := &callbacksHelper.RetrieverCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *retriever.CallbackInput) context.Context {
       log.Printf("input access, content: %s\n", input.Query)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *retriever.CallbackOutput) context.Context {
       log.Printf("output finished, len: %v\n", len(output.Docs))
       return ctx
    },
}

helper := callbacksHelper.NewHandlerHelper().Retriever(handler).Handler()

chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(volcRetriever)
run, _ := chain.Compile(ctx)
outDocs, _ := run.Invoke(ctx, query, compose.WithCallbacks(helper))
```

### Callback Structures

```go
// Callback input/output definitions
type CallbackInput struct {
    Query string
    TopK int
    Filter string
    ScoreThreshold *float64
    Extra map[string]any
}

type CallbackOutput struct {
    Docs []*schema.Document
    Extra map[string]any
}
```

## Existing Implementations

- Volc VikingDB Retriever: [Retriever — VikingDB](/docs/eino/ecosystem_integration/retriever/retriever_volc_vikingdb)

## Implementation Notes

1. Handle common options and callbacks.
2. Inject metadata required for downstream nodes.
