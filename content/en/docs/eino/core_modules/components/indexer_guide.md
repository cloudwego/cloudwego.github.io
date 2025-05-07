---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Indexer guide'
weight: 0
---

## **Basic Introduction**

The Indexer component is used for storing and indexing documents. Its primary function is to store documents and their vector representations into a backend storage system and provide efficient retrieval capabilities. This component plays a significant role in the following scenarios:

- Building a vector database for semantic association search

## **Component Definition**

### **Interface Definition**

> Code Location: eino/components/indexer/interface.go

```go
type Indexer interface {
    Store(ctx context.Context, docs []*schema.Document, opts ...Option) (ids []string, err error)
}
```

#### **Store Method**

- Function: Store documents and build an index
- Parameters:
  - ctx: Context object used to pass request-level information and the Callback Manager
  - docs: List of documents to be stored
  - opts: Storage options used to configure storage behavior
- Returns:
  - ids: List of successfully stored document IDs
  - error: Error information during the storage process

### **Common Options**

The Indexer component uses IndexerOption to define optional parameters. Indexer defines the following common options. Additionally, each specific implementation can define its specific options, wrapped as a unified IndexerOption type through the WrapIndexerImplSpecificOptFn function.

```go
type Options struct {
    // SubIndexes is the list of sub-indexes to be created
    SubIndexes []string   
    // Embedding is the component used to generate document vectors
    Embedding embedding.Embedder
}
```

Options can be set in the following ways:

```go
// Set sub-indexes
WithSubIndexes(subIndexes []string) Option
// Set vector generation component
WithEmbedding(emb embedding.Embedder) Option
```

## **Usage**

### **Standalone Use**

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
)

collectionName := "eino_test"

/*
 * In the following example, a dataset named eino_test is prebuilt with the field configuration as:
 * Field Name       Field Type         Vector Dimension
 * ID               string
 * vector           vector             1024
 * sparse_vector    sparse_vector
 * content          string
 * extra_field_1    string
 *
 * When using the component, note:
 * 1. The field names and types for ID / vector / sparse_vector / content should be consistent with the above configuration
 * 2. The vector dimension must match the vector dimension output by the model corresponding to ModelName
 * 3. Some models do not output sparse vectors. In this case, UseSparse needs to be set to false, and the collection can omit the sparse_vector field
 */

cfg := &volc_vikingdb.IndexerConfig{
    // https://api-vikingdb.volces.com (North China)
    // https://api-vikingdb.mlp.cn-shanghai.volces.com (East China)
    // https://api-vikingdb.mlp.ap-mya.byteplus.com (Overseas-Johor)
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

doc := &schema.Document{
    ID:      "mock_id_1",
    Content: "A ReAct prompt consists of few-shot task-solving trajectories, with human-written text reasoning traces and actions, as well as environment observations in response to actions",
}
volc_vikingdb.SetExtraDataFields(doc, map[string]interface{}{"extra_field_1": "mock_ext_abc"})
volc_vikingdb.SetExtraDataTTL(doc, 1000)

docs := []*schema.Document{doc}
resp, _ := volcIndexer.Store(ctx, docs)

fmt.Printf("vikingDB store success, docs=%v, resp ids=%v\n", docs, resp)
```

### **Use in Orchestration**

```go
// Use in Chain
chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(indexer)

// Use in Graph
graph := compose.NewGraph[[]*schema.Document, []string]()
graph.AddIndexerNode("indexer_node", indexer)
```

## **Option and Callback Usage**

### **Option Usage Example**

```go
// Using options (when used individually)
ids, err := indexer.Store(ctx, docs,
    // Set subindex
    indexer.WithSubIndexes([]string{"kb_1", "kb_2"}),
    // Set embedding component
    indexer.WithEmbedding(embedder),
)
```

### **Callback Usage Example**

> Code location: eino-ext/components/indexer/volc_vikingdb/examples/builtin_embedding

```go
import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/indexer"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
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

// Using callback handler
helper := callbacksHelper.NewHandlerHelper().
    Indexer(handler).
    Handler()

chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(volcIndexer)

// At runtime
run, _ := chain.Compile(ctx)

outIDs, _ := run.Invoke(ctx, docs, compose.WithCallbacks(helper))

fmt.Printf("vikingDB store success, docs=%v, resp ids=%v\n", docs, outIDs)
```

## **Existing Implementation**

1. Volc VikingDB Indexer: Vector database indexer based on Volcano Engine VikingDB [Indexer - volc VikingDB](/docs/eino/ecosystem_integration/indexer/indexer_volc_vikingdb)

## **Custom Implementation Reference**

When implementing a custom Indexer component, please pay attention to the following points:

1. Proper handling of common options and component-specific options
2. Proper handling of callbacks

### **Option Mechanism**

Custom Indexers can implement their own Options as needed:

```go
// Define Option struct
type MyIndexerOptions struct {
    BatchSize int
    MaxRetries int
}

// Define Option function
func WithBatchSize(size int) indexer.Option {
    return indexer.WrapIndexerImplSpecificOptFn(func(o *MyIndexerOptions) {
        o.BatchSize = size
    })
}
```

### **Callback Handling**

The Indexer implementation needs to trigger callbacks at appropriate times. The framework has already defined standard callback input and output structs:

```go
// CallbackInput is the input for the indexer callback
type CallbackInput struct {
    // Docs is the list of documents to be indexed
    Docs []*schema.Document
    // Extra is the additional information for the callback
    Extra map[string]any
}

// CallbackOutput is the output for the indexer callback
type CallbackOutput struct {
    // IDs is the list of document IDs returned by the indexer
    IDs []string
    // Extra is the additional information for the callback
    Extra map[string]any
}
```

### **Complete Implementation Example**

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
    // 1. Handle options
    options := &indexer.Options{}
    options = indexer.GetCommonOptions(options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before starting storage
    ctx = cm.OnStart(ctx, info, &indexer.CallbackInput{
        Docs: docs,
    })
    
    // 4. Execute storage logic
    ids, err := i.doStore(ctx, docs, options)
    
    // 5. Handle errors and complete the callback
    if (err != nil) {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &indexer.CallbackOutput{
        IDs: ids,
    })
    
    return ids, nil
}

func (i *MyIndexer) doStore(ctx context.Context, docs []*schema.Document, opts *indexer.Options) ([]string, error) {
    // Implement document storage logic (make sure to handle common option parameters)
    // 1. If an Embedding component is set, generate vector representations for the documents
    if opts.Embedding != nil {
        // Extract document content
        texts := make([]string, len(docs))
        for j, doc := range docs {
            texts[j] = doc.Content
        }
        // Generate vectors
        vectors, err := opts.Embedding.EmbedStrings(ctx, texts)
        if err != nil {
            return nil, err
        }
        // Store vectors in the documents' Metadata
        for j, doc := range docs {
            doc.WithVector(vectors[j])
        }
    }
    
    // 2. Additional custom logic
    return ids, nil
}
```
