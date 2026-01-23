---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Indexer Guide'
weight: 6
---

## **Introduction**

The Indexer component is used to store and index documents. Its main purpose is to store documents and their vector representations into backend storage systems and provide efficient retrieval capabilities. This component plays an important role in the following scenarios:

- Building vector databases for semantic search

## **Component Definition**

### **Interface Definition**

> Code location: eino/components/indexer/interface.go

```go
type Indexer interface {
    Store(ctx context.Context, docs []*schema.Document, opts ...Option) (ids []string, err error)
}
```

#### **Store Method**

- Purpose: Store documents and build indexes
- Parameters:
  - ctx: Context object for passing request-level information and the Callback Manager
  - docs: List of documents to store
  - opts: Storage options for configuring storage behavior
- Returns:
  - ids: List of successfully stored document IDs
  - error: Error information during storage

### **Common Options**

The Indexer component uses IndexerOption to define optional parameters. Indexer defines the following common options. Additionally, each specific implementation can define its own specific Options, wrapped into a unified IndexerOption type through the WrapIndexerImplSpecificOptFn function.

```go
type Options struct {
    // SubIndexes is the list of sub-indexes to build
    SubIndexes []string   
    // Embedding is the component used to generate document vectors
    Embedding embedding.Embedder
}
```

Options can be set as follows:

```go
// Set sub-indexes
WithSubIndexes(subIndexes []string) Option
// Set vector generation component
WithEmbedding(emb embedding.Embedder) Option
```

## **Usage**

### **Standalone Usage**

#### VikingDB Example

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
)

collectionName := "eino_test"

/*
 * In the following example, a dataset (collection) named eino_test is pre-created with fields:
 * Field Name       Field Type       Vector Dimension
 * ID               string
 * vector           vector           1024
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

#### Milvus Example

```go
package main

import (
        "github.com/cloudwego/eino/schema"
        "github.com/milvus-io/milvus/client/v2/milvusclient"
        "github.com/cloudwego/eino-ext/components/indexer/milvus2"
)

// Create indexer
indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
        ClientConfig: &milvusclient.ClientConfig{
                Address:  addr,
                Username: username,
                Password: password,
        },
        Collection:   "my_collection",
        Dimension:    1024, // Match embedding model dimension
        MetricType:   milvus2.COSINE,
        IndexBuilder: milvus2.NewHNSWIndexBuilder().WithM(16).WithEfConstruction(200),
        Embedding:    emb,
})

// Index documents
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

#### ElasticSearch 7 Example

```go
import (
        "github.com/cloudwego/eino/components/embedding"
        "github.com/cloudwego/eino/schema"
        elasticsearch "github.com/elastic/go-elasticsearch/v7"
        "github.com/cloudwego/eino-ext/components/indexer/es7"
)

client, _ := elasticsearch.NewClient(elasticsearch.Config{
        Addresses: []string{"http://localhost:9200"},
        Username:  username,
        Password:  password,
})

// Create ES indexer component
indexer, _ := es7.NewIndexer(ctx, &es7.IndexerConfig{
        Client:    client,
        Index:     indexName,
        BatchSize: 10,
        DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es7.FieldValue, err error) {
                return map[string]es7.FieldValue{
                        fieldContent: {
                                Value:    doc.Content,
                                EmbedKey: fieldContentVector, // Vectorize document content and save to "content_vector" field
                        },
                        fieldExtraLocation: {
                                Value: doc.MetaData[docExtraLocation],
                        },
                }, nil
        },
        Embedding: emb,
})

// Index documents
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

#### OpenSearch 2 Example

```go
package main

import (
        "github.com/cloudwego/eino/schema"
        opensearch "github.com/opensearch-project/opensearch-go/v2"
        "github.com/cloudwego/eino-ext/components/indexer/opensearch2"
)

client, err := opensearch.NewClient(opensearch.Config{
        Addresses: []string{"http://localhost:9200"},
        Username:  username,
        Password:  password,
})

// Create opensearch indexer component
indexer, _ := opensearch2.NewIndexer(ctx, &opensearch2.IndexerConfig{
        Client:    client,
        Index:     "your_index_name",
        BatchSize: 10,
        DocumentToFields: func(ctx context.Context, doc *schema.Document) (map[string]opensearch2.FieldValue, error) {
                return map[string]opensearch2.FieldValue{
                        "content": {
                                Value:    doc.Content,
                                EmbedKey: "content_vector",
                        },
                }, nil
        },
        Embedding: emb,
})

// Index documents
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

### **Using in Orchestration**

```go
// Using in Chain
chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(indexer)

// Using in Graph
graph := compose.NewGraph[[]*schema.Document, []string]()
graph.AddIndexerNode("indexer_node", indexer)
```

## **Option and Callback Usage**

### **Option Usage Example**

```go
// Using options (standalone usage)
ids, err := indexer.Store(ctx, docs,
    // Set sub-indexes
    indexer.WithSubIndexes([]string{"kb_1", "kb_2"}),
    // Set vector generation component
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

// Using at runtime
run, _ := chain.Compile(ctx)

outIDs, _ := run.Invoke(ctx, docs, compose.WithCallbacks(helper))

fmt.Printf("vikingDB store success, docs=%v, resp ids=%v\n", docs, outIDs)
```

## **Existing Implementations**

- Volc VikingDB Indexer: Vector database indexer based on Volcano Engine VikingDB [Indexer - VikingDB](/docs/eino/ecosystem_integration/indexer/indexer_volc_vikingdb)
- Milvus v2.5+ Indexer: Vector database indexer based on Milvus [Indexer - Milvus 2 (v2.5+)](/docs/eino/ecosystem_integration/indexer/indexer_milvusv2)
- Milvus v2.4- Indexer: Vector database indexer based on Milvus [Indexer - Milvus (v2.4-)](/docs/eino/ecosystem_integration/indexer/indexer_milvus)
- Elasticsearch 8 Indexer: General search engine indexer based on ES8 [Indexer - ElasticSearch 8](/docs/eino/ecosystem_integration/indexer/indexer_es8)
- ElasticSearch 7 Indexer: General search engine indexer based on ES7 [Indexer - Elasticsearch 7](/docs/eino/ecosystem_integration/indexer/indexer_elasticsearch7)
- OpenSearch 3 Indexer: General search engine indexer based on OpenSearch 3 [Indexer - OpenSearch 3](/docs/eino/ecosystem_integration/indexer/indexer_opensearch3)
- OpenSearch 2 Indexer: General search engine indexer based on OpenSearch 2 [Indexer - OpenSearch 2](/docs/eino/ecosystem_integration/indexer/indexer_opensearch2)

## **Custom Implementation Reference**

When implementing a custom Indexer component, note the following:

1. Handle common options and implementation-specific options properly
2. Handle callbacks properly

### **Option Mechanism**

Custom Indexer can implement its own Options as needed:

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

Indexer implementations need to trigger callbacks at appropriate times. The framework has defined standard callback input/output structures:

```go
// CallbackInput is the input for indexer callback
type CallbackInput struct {
    // Docs is the list of documents to be indexed
    Docs []*schema.Document
    // Extra is additional information for the callback
    Extra map[string]any
}

// CallbackOutput is the output for indexer callback
type CallbackOutput struct {
    // IDs is the list of document IDs returned by the indexer
    IDs []string
    // Extra is additional information for the callback
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
    options := &indexer.Options{},
    options = indexer.GetCommonOptions(options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before storage
    ctx = cm.OnStart(ctx, info, &indexer.CallbackInput{
        Docs: docs,
    })
    
    // 4. Execute storage logic
    ids, err := i.doStore(ctx, docs, options)
    
    // 5. Handle error and completion callback
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
    // Implement document storage logic (handle common option parameters)
    // 1. If Embedding component is set, generate vector representations for documents
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
        // Store vectors in document MetaData
        for j, doc := range docs {
            doc.WithVector(vectors[j])
        }
    }
    
    // 2. Other custom logic
    return ids, nil
}
```
