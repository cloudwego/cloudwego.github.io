---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Indexer Guide'
weight: 6
---

## Introduction

The `Indexer` component stores documents (and vectors) into backend systems and provides efficient retrieval. It’s useful for building vector databases for semantic search.

## Component Definition

### Interface

> Code: `eino/components/indexer/interface.go`

```go
type Indexer interface {
    Store(ctx context.Context, docs []*schema.Document, opts ...Option) (ids []string, err error)
}
```

#### Store

- Purpose: store documents and build indexes
- Params:
  - `ctx`: context and callback manager
  - `docs`: documents to store
  - `opts`: options for storage
- Returns:
  - `ids`: stored document IDs
  - `error`

### Common Options

`IndexerOption` defines options. Implementations may add specific options via `WrapIndexerImplSpecificOptFn`.

```go
type Options struct {
    SubIndexes []string
    Embedding embedding.Embedder
}
```

Set options:

```go
WithSubIndexes(subIndexes []string) Option
WithEmbedding(emb embedding.Embedder) Option
```

## Usage

### Standalone

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
)

collectionName := "eino_test"

/*
 * In the following example, a dataset (collection) named "eino_test" is pre-created with fields:
 * Field Name       Field Type      Vector Dim
 * ID               string
 * vector           vector          1024
 * sparse_vector    sparse_vector
 * content          string
 * extra_field_1    string
 *
 * Component usage notes:
 * 1. Field names and types for ID / vector / sparse_vector / content must match the above configuration
 * 2. The vector dimension must match the output dimension of the model indicated by ModelName
 * 3. Some models do not output sparse vectors; set UseSparse=false and the collection may omit sparse_vector
 */

cfg := &volc_vikingdb.IndexerConfig{
    // https://api-vikingdb.volces.com (North China)
    // https://api-vikingdb.mlp.cn-shanghai.volces.com (East China)
    // https://api-vikingdb.mlp.ap-mya.byteplus.com (Overseas - Johor)
    Host:              "api-vikingdb.volces.com",
    Region:            "cn-beijing",
    AK:                ak,
    SK:                sk,
    Scheme:            "https",
    ConnectionTimeout: 0,
    Collection:        collectionName,
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
       UseBuiltin: true,
       ModelName:  "bge-m3",
       UseSparse:  true,
    },
    AddBatchSize: 10,
}

volcIndexer, _ := volc_vikingdb.NewIndexer(ctx, cfg)

doc := &schema.Document{ ID: "mock_id_1", Content: "A ReAct prompt consists of..." }
volc_vikingdb.SetExtraDataFields(doc, map[string]interface{}{"extra_field_1": "mock_ext_abc"})
volc_vikingdb.SetExtraDataTTL(doc, 1000)

docs := []*schema.Document{doc}
resp, _ := volcIndexer.Store(ctx, docs)
fmt.Printf("vikingDB store success, docs=%v, resp ids=%v\n", docs, resp)
```

### In Orchestration

```go
// Chain
chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(indexer)

// Graph
graph := compose.NewGraph[[]*schema.Document, []string]()
graph.AddIndexerNode("indexer_node", indexer)
```

## Options and Callbacks

### Options Example

```go
ids, err := indexer.Store(ctx, docs,
    indexer.WithSubIndexes([]string{"kb_1", "kb_2"}),
    indexer.WithEmbedding(embedder),
)
```

### Callback Example

> Code: `eino-ext/components/indexer/volc_vikingdb/examples/builtin_embedding`

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/indexer"
    "github.com/cloudwego/eino/compose"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
)

handler := &callbacksHelper.IndexerCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *indexer.CallbackInput) context.Context {
       log.Printf("input access, len: %v, content: %s\n", len(input.Docs), input.Docs[0].Content)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *indexer.CallbackOutput) context.Context {
       log.Printf("output finished, len: %v, ids=%v\n", len(output.IDs), output.IDs)
       return ctx
    },
    // OnError
}

helper := callbacksHelper.NewHandlerHelper().Indexer(handler).Handler()

chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(volcIndexer)
run, _ := chain.Compile(ctx)
outIDs, _ := run.Invoke(ctx, docs, compose.WithCallbacks(helper))
```

## Existing Implementations

1. Volc VikingDB Indexer: [Indexer — VikingDB](/en/docs/eino/ecosystem_integration/indexer/indexer_volc_vikingdb)

## Implementation Notes

1. Handle common options and implementation-specific options.
2. Implement callbacks correctly.

### Options

```go
type MyIndexerOptions struct { BatchSize int; MaxRetries int }
func WithBatchSize(size int) indexer.Option {
    return indexer.WrapIndexerImplSpecificOptFn(func(o *MyIndexerOptions) { o.BatchSize = size })
}
```

### Callback Structures

```go
type CallbackInput struct {
    Docs []*schema.Document
    Extra map[string]any
}

type CallbackOutput struct {
    IDs []string
    Extra map[string]any
}
```

### Full Implementation Example

```go
type MyIndexer struct {
    batchSize int
    embedder embedding.Embedder
}

func NewMyIndexer(config *MyIndexerConfig) (*MyIndexer, error) {
    return &MyIndexer{
        batchSize: config.DefaultBatchSize,
        embedder: config.DefaultEmbedder,
    }, nil
}

func (i *MyIndexer) Store(ctx context.Context, docs []*schema.Document, opts ...indexer.Option) ([]string, error) {
    // 1. handle options
    options := &indexer.Options{}
    options = indexer.GetCommonOptions(options, opts...)
    
    // 2. get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. before-store callback
    ctx = cm.OnStart(ctx, info, &indexer.CallbackInput{
        Docs: docs,
    })
    
    // 4. perform storage
    ids, err := i.doStore(ctx, docs, options)
    
    // 5. handle error and finish callback
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &indexer.CallbackOutput{
        IDs: ids,
    })
    
    return ids, nil
}

func (i *MyIndexer) doStore(ctx context.Context, docs []*schema.Document, opts *indexer.Options) ([]string, error) {
    // implement storage logic (handle common options)
    // 1. If Embedding is set, generate vectors for documents
    if opts.Embedding != nil {
        texts := make([]string, len(docs))
        for j, doc := range docs {
            texts[j] = doc.Content
        }
        vectors, err := opts.Embedding.EmbedStrings(ctx, texts)
        if err != nil {
            return nil, err
        }
        for j := range docs {
            docs[j].WithVector(vectors[j])
        }
    }
    
    // 2. other custom logic
    return ids, nil
}
```
