---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Retriever guide'
weight: 0
---

## **Basic Introduction**

The Retriever component is used to retrieve documents from various data sources. Its main function is to retrieve the most relevant documents from a document library based on a user's query. This component is particularly useful in the following scenarios:

- Document retrieval based on vector similarity
- Document search based on keywords
- Knowledge base Q&A system (rag)

## **Component Definition**

### **Interface Definition**

> Code Location: eino/components/retriever/interface.go

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

#### **Retrieve Method**

- Function: Retrieve relevant documents based on the query
- Parameters:
  - ctx: Context object used to transfer request-level information and to pass the Callback Manager
  - query: Query string
  - opts: Retrieval options used to configure retrieval behavior
- Return Values:
  - `[]*schema.Document`: List of retrieved documents
  - error: Error information during the retrieval process

### **Document Struct**

```go
type Document struct {
    // ID is the unique identifier of the document
    ID string
    // Content is the content of the document
    Content string
    // MetaData is used to store metadata information of the document
    MetaData map[string]any
}
```

### **Common Options**

The Retriever component uses RetrieverOption to define optional parameters. The following are the common options that the Retriever component needs to implement. Additionally, each specific implementation can define its own specific options, which can be wrapped into a unified RetrieverOption type through the WrapRetrieverImplSpecificOptFn function.

```go
type Options struct {
    // Index is the index used by the retriever. The meaning of the index may vary across different retrievers.
    Index *string
    
    // SubIndex is the sub-index used by the retriever. The meaning of the sub-index may vary across different retrievers.
    SubIndex *string
    
    // TopK is the upper limit on the number of documents retrieved
    TopK *int
    
    // ScoreThreshold is the threshold for document similarity, e.g., 0.5 means the document's similarity score must be greater than 0.5
    ScoreThreshold *float64
    
    // Embedding is the component used for generating query vectors
    Embedding embedding.Embedder
    
    // DSLInfo is the DSL information used for retrieval, only used in Viking-type retrievers
    DSLInfo map[string]interface{}
}
```

The options can be set as follows:

```go
// Set the index
WithIndex(index string) Option

// Set the sub-index
WithSubIndex(subIndex string) Option

// Set the upper limit on the number of retrieved documents
WithTopK(topK int) Option

// Set the similarity threshold
WithScoreThreshold(threshold float64) Option

// Set the vector generation component
WithEmbedding(emb embedding.Embedder) Option

// Set DSL information (only for Viking-type retrievers)
WithDSLInfo(dsl map[string]any) Option
```## **Usage**

### **Standalone Usage**

> Code location: eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding

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
 * In the following example, a dataset called eino_test has been pre-built, and an hnsw-hybrid index called test_index_1 has been built on this dataset.
 * The dataset fields are configured as:
 * Field Name       Field Type     Vector Dimension
 * ID            string
 * vector         vector       1024
 * sparse_vector sparse_vector
 * content       string
 * extra_field_1 string
 *
 * Note when using the component:
 * 1. The field names and types of ID / vector / sparse_vector / content should be consistent with the above configuration.
 * 2. The vector dimension should be consistent with the vector dimension output by the model corresponding to ModelName.
 * 3. Some models do not output sparse vectors. In this case, set UseSparse to false, and the collection does not need to set the sparse_vector field.
 */

cfg := &volc_vikingdb.RetrieverConfig{
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
    Index:             indexName,
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
       UseBuiltin:  true,
       ModelName:   "bge-m3",
       UseSparse:   true,
       DenseWeight: 0.4,
    },
    Partition:      "", // Corresponding to the partition field in the index; when not set, leave it blank
    TopK:           of(10),
    ScoreThreshold: of(0.1),
    FilterDSL:      nil, // Corresponding to the scalar filtering field in the index; when not set, leave it blank; see https://www.volcengine.com/docs/84313/1254609 for the expression
}

volcRetriever, _ := volc_vikingdb.NewRetriever(ctx, cfg)


query := "tourist attraction"
docs, _ := volcRetriever.Retrieve(ctx, query)

log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, docs)
```

### **Usage in Composition**

```go
// Using in Chain
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(retriever)

// Using in Graph
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddRetrieverNode("retriever_node", retriever)
```

## **Option and Cal****lback Usage**

### **Callback Example**

> Code location: eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/retriever"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
)

// Create callback handler
handler := &callbacksHelper.RetrieverCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *retriever.CallbackInput) context.Context {
       log.Printf("input access, content: %s\n", input.Query)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *retriever.CallbackOutput) context.Context {
       log.Printf("output finished, len: %v\n", len(output.Docs))
       return ctx
    },
    // OnError
}

// Use callback handler
helper := callbacksHelper.NewHandlerHelper().
    Retriever(handler).
    Handler()

chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(volcRetriever)

// Use at runtime
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, query, compose.WithCallbacks(helper))

log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, outDocs)
```

## **Existing Implementations**

- Volc VikingDB Retriever: Retrieval implementation based on Volcano Engine VikingDB [Retriever - volc VikingDB](/en/docs/eino/ecosystem/retriever/retriever_volc_vikingdb)

## **Reference for Custom Implementation**

When implementing a custom Retriever component, pay attention to the following points:

1. Handle the option mechanism properly and manage common options.
2. Handle callbacks appropriately.
3. Inject specific metadata for use by subsequent nodes.

### **Option Mechanism**

The Retriever component provides a set of common options that need to be correctly handled during implementation:

```go
// Use GetCommonOptions to handle common options
func (r *MyRetriever) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
    // 1. Initialize and read options
    options := &retriever.Options{ // You can set default values
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // ...
}
```

### **Callback Handling**

Retriever implementations need to trigger callbacks at appropriate times. The following structures are defined by the retriever component:

```go
// Define callback input and output
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

### **Complete Implementation Example**

```go
type MyRetriever struct {
    embedder embedding.Embedder
    index string
    topK int
}

func NewMyRetriever(config *MyRetrieverConfig) (*MyRetriever, error) {
    return &MyRetriever{
        embedder: config.Embedder,
        index: config.Index,
        topK: config.DefaultTopK,
    }, nil
}

func (r *MyRetriever) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
    // 1. Handle options
    options := &retriever.Options{
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before starting retrieval
    ctx = cm.OnStart(ctx, info, &retriever.CallbackInput{
        Query: query,
        TopK: *options.TopK,
    })
    
    // 4. Execute retrieval logic
    docs, err := r.doRetrieve(ctx, query, options)
    
    // 5. Handle errors and complete callback
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &retriever.CallbackOutput{
        Docs: docs,
    })
    
    return docs, nil
}

func (r *MyRetriever) doRetrieve(ctx context.Context, query string, opts *retriever.Options) ([]*schema.Document, error) {
    // 1. If Embedding is set, generate vector representation of the query (pay attention to handling common options)
    var queryVector []float64
    if opts.Embedding != nil {
        vectors, err := opts.Embedding.EmbedStrings(ctx, []string{query})
        if err != nil {
            return nil, err
        }
        queryVector = vectors[0]
    }
    
    // 2. Other logic
    return docs, nil
}
```
