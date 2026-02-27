---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: 'Eino: Retriever Guide'
weight: 4
---

## **Introduction**

The Retriever component is used to retrieve documents from various data sources. Its main function is to retrieve the most relevant documents from a document library based on a user's query. This component is particularly useful in the following scenarios:

- Vector similarity-based document retrieval
- Keyword-based document search
- Knowledge base question answering systems (RAG)

## **Component Definition**

### **Interface Definition**

> Code location: eino/components/retriever/interface.go

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

#### **Retrieve Method**

- Function: Retrieve relevant documents based on a query
- Parameters:
  - ctx: Context object for passing request-level information and the Callback Manager
  - query: Query string
  - opts: Retrieval options for configuring retrieval behavior
- Returns:
  - `[]*schema.Document`: List of retrieved documents
  - error: Error information during retrieval

### **Document Struct**

```go
type Document struct {
    // ID is the unique identifier of the document
    ID string
    // Content is the content of the document
    Content string
    // MetaData is used to store document metadata
    MetaData map[string]any
}
```

### **Common Options**

The Retriever component uses RetrieverOption to define optional parameters. Below are the common options that Retriever components need to implement. Additionally, each specific implementation can define its own specific Options, wrapped into the unified RetrieverOption type using the WrapRetrieverImplSpecificOptFn function.

```go
type Options struct {
    // Index is the index used by the retriever; different retrievers may interpret this differently
    Index *string
    
    // SubIndex is the sub-index used by the retriever; different retrievers may interpret this differently
    SubIndex *string
    
    // TopK is the maximum number of documents to retrieve
    TopK *int
    
    // ScoreThreshold is the similarity threshold for documents, e.g., 0.5 means the document's similarity score must be greater than 0.5
    ScoreThreshold *float64
    
    // Embedding is the component used to generate query vectors
    Embedding embedding.Embedder
    
    // DSLInfo is the DSL information used for retrieval, only used in viking-type retrievers
    DSLInfo map[string]interface{}
}
```

Options can be set using the following methods:

```go
// Set index
WithIndex(index string) Option

// Set sub-index
WithSubIndex(subIndex string) Option

// Set maximum number of documents to retrieve
WithTopK(topK int) Option

// Set similarity threshold
WithScoreThreshold(threshold float64) Option

// Set vector generation component
WithEmbedding(emb embedding.Embedder) Option

// Set DSL information (only for viking-type retrievers)
WithDSLInfo(dsl map[string]any) Option
```

## **Usage**

### **Standalone Usage**

#### VikingDB Example

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
 * In the following example, a dataset (collection) named eino_test is pre-created,
 * and an hnsw-hybrid index named test_index_1 is built on this dataset.
 * Dataset field configuration:
 * Field Name       Field Type       Vector Dimension
 * ID               string
 * vector           vector           1024
 * sparse_vector    sparse_vector
 * content          string
 * extra_field_1    string
 *
 * Component usage notes:
 * 1. The field names and types for ID / vector / sparse_vector / content must match the above configuration
 * 2. The vector dimension must match the output dimension of the model specified by ModelName
 * 3. Some models do not output sparse vectors; in that case, set UseSparse to false, and the collection may omit the sparse_vector field
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
    Partition:      "", // Corresponds to the index's [sub-index partition field]; leave empty if not set
    TopK:           of(10),
    ScoreThreshold: of(0.1),
    FilterDSL:      nil, // Corresponds to the index's [scalar filter field]; leave nil if not set; see https://www.volcengine.com/docs/84313/1254609
}

volcRetriever, _ := volc_vikingdb.NewRetriever(ctx, cfg)


query := "tourist attraction"
docs, _ := volcRetriever.Retrieve(ctx, query)

log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, docs)
```

#### Milvus Example

```go
import (
        "github.com/cloudwego/eino-ext/components/retriever/milvus2"
        "github.com/cloudwego/eino-ext/components/retriever/milvus2/search_mode"
)

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

// Retrieve documents
documents, err := retriever.Retrieve(ctx, "search query")
```

#### ElasticSearch 7 Example

```go
import (
        "github.com/cloudwego/eino/schema"
        elasticsearch "github.com/elastic/go-elasticsearch/v7"

        "github.com/cloudwego/eino-ext/components/retriever/es7"
        "github.com/cloudwego/eino-ext/components/retriever/es7/search_mode"
)

client, _ := elasticsearch.NewClient(elasticsearch.Config{
        Addresses: []string{"http://localhost:9200"},
        Username:  username,
        Password:  password,
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
```

#### OpenSearch 2 Example

```go
package main

import (
        "github.com/cloudwego/eino/schema"
        opensearch "github.com/opensearch-project/opensearch-go/v2"

        "github.com/cloudwego/eino-ext/components/retriever/opensearch2"
        "github.com/cloudwego/eino-ext/components/retriever/opensearch2/search_mode"
)

client, err := opensearch.NewClient(opensearch.Config{
        Addresses: []string{"http://localhost:9200"},
})

// Create retriever component
retriever, _ := opensearch2.NewRetriever(ctx, &opensearch2.RetrieverConfig{
        Client: client,
        Index:  "your_index_name",
        TopK:   5,
        // Select search mode
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

// Retrieve documents
docs, err := retriever.Retrieve(ctx, "search query")
```

### **Usage in Orchestration**

```go
// In Chain
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(retriever)

// In Graph
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddRetrieverNode("retriever_node", retriever)
```

## **Option and Callback Usage**

### **Callback Usage Example**

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

- Volc VikingDB Retriever: Retrieval implementation based on Volcano Engine VikingDB [Retriever - VikingDB](/docs/eino/ecosystem_integration/retriever/retriever_volc_vikingdb)
- Milvus v2.5+ Retriever: Vector database retriever based on Milvus [Retriever - Milvus 2 (v2.5+)](/docs/eino/ecosystem_integration/retriever/retriever_milvusv2)
- Milvus v2.4- Retriever: Vector database retriever based on Milvus [Retriever - Milvus (v2.4-)](/docs/eino/ecosystem_integration/retriever/retriever_milvus)
- Elasticsearch 8 Retriever: General search engine retriever based on ES8 [Retriever - Elasticsearch 8](/docs/eino/ecosystem_integration/retriever/retriever_es8)
- ElasticSearch 7 Retriever: General search engine retriever based on ES7 [Retriever - Elasticsearch 7](/docs/eino/ecosystem_integration/retriever/retriever_elasticsearch7)
- OpenSearch 3 Retriever: General search engine retriever based on OpenSearch 3 [Retriever - OpenSearch 3](/docs/eino/ecosystem_integration/retriever/retriever_opensearch3)
- OpenSearch 2 Retriever: General search engine retriever based on OpenSearch 2 [Retriever - OpenSearch 2](/docs/eino/ecosystem_integration/retriever/retriever_opensearch2)

## **Implementation Reference**

When implementing a custom Retriever component, pay attention to the following points:

1. Handle the option mechanism properly, including common options.
2. Handle callbacks properly.
3. Inject specific metadata for use by downstream nodes.

### **Option Mechanism**

The Retriever component provides a set of common options that implementations need to handle correctly:

```go
// Use GetCommonOptions to handle common options
func (r *MyRetriever) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
    // 1. Initialize and read options
    options := &retriever.Options{ // Can set default values
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // ...
}
```

### **Callback Handling**

Retriever implementations need to trigger callbacks at appropriate times. The following structs are defined by the retriever component:

```go
// Define callback input/output
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
    
    // 3. Callback before retrieval starts
    ctx = cm.OnStart(ctx, info, &retriever.CallbackInput{
        Query: query,
        TopK: *options.TopK,
    })
    
    // 4. Execute retrieval logic
    docs, err := r.doRetrieve(ctx, query, options)
    
    // 5. Handle error and completion callbacks
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
    // 1. If Embedding is set, generate vector representation of the query (note common option logic handling)
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
