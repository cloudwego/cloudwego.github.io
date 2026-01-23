---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Indexer 使用说明'
weight: 6
---

## **基本介绍**

Indexer 组件是一个用于存储和索引文档的组件。它的主要作用是将文档及其向量表示存储到后端存储系统中，并提供高效的检索能力。这个组件在以下场景中发挥重要作用：

- 构建向量数据库，以用于语义关联搜索

## **组件定义**

### **接口定义**

> 代码位置：eino/components/indexer/interface.go

```go
type Indexer interface {
    Store(ctx context.Context, docs []*schema.Document, opts ...Option) (ids []string, err error)
}
```

#### **Store 方法**

- 功能：存储文档并建立索引
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - docs：待存储的文档列表
  - opts：存储选项，用于配置存储行为
- 返回值：
  - ids：存储成功的文档 ID 列表
  - error：存储过程中的错误信息

### **公共 Option**

Indexer 组件使用 IndexerOption 来定义可选参数，Indexer 定义了如下的公共 option。另外，每个具体的实现可以定义自己的特定 Option，通过 WrapIndexerImplSpecificOptFn 函数包装成统一的 IndexerOption 类型。

```go
type Options struct {
    // SubIndexes 是要建立索引的子索引列表
    SubIndexes []string   
    // Embedding 是用于生成文档向量的组件
    Embedding embedding.Embedder
}
```

可以通过以下方式设置选项：

```go
// 设置子索引
WithSubIndexes(subIndexes []string) Option
// 设置向量生成组件
WithEmbedding(emb embedding.Embedder) Option
```

## **使用方式**

### **单独使用**

#### VikingDB 示例

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
)

collectionName := "eino_test"

/*
 * 下面示例中提前构建了一个名为 eino_test 的数据集 (collection)，字段配置为:
 * 字段名称       字段类型         向量维度
 * ID            string
 * vector         vector       1024
 * sparse_vector    sparse_vector
 * content        string
 * extra_field_1    string
 *
 * component 使用时注意:
 * 1. ID / vector / sparse_vector / content 的字段名称与类型与上方配置一致
 * 2. vector 向量维度需要与 ModelName 对应的模型所输出的向量维度一致
 * 3. 部分模型不输出稀疏向量，此时 UseSparse 需要设置为 false，collection 可以不设置 sparse_vector 字段
 */

cfg := &volc_vikingdb.IndexerConfig{
    // https://api-vikingdb.volces.com （华北）
    // https://api-vikingdb.mlp.cn-shanghai.volces.com（华东）
    // https://api-vikingdb.mlp.ap-mya.byteplus.com（海外-柔佛）
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

#### Milvus 示例

```go
package main

import (
        "github.com/cloudwego/eino/schema"
        "github.com/milvus-io/milvus/client/v2/milvusclient"
        "github.com/cloudwego/eino-ext/components/indexer/milvus2"
)

// 创建索引器
indexer, err := milvus2.NewIndexer(ctx, &milvus2.IndexerConfig{
        ClientConfig: &milvusclient.ClientConfig{
                Address:  addr,
                Username: username,
                Password: password,
        },
        Collection:   "my_collection",
        Dimension:    1024, // 与 embedding 模型维度匹配
        MetricType:   milvus2.COSINE,
        IndexBuilder: milvus2.NewHNSWIndexBuilder().WithM(16).WithEfConstruction(200),
        Embedding:    emb,
})

// 索引文档
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

#### ElasticSearch 7 示例

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

// 创建 ES 索引器组件
indexer, _ := es7.NewIndexer(ctx, &es7.IndexerConfig{
        Client:    client,
        Index:     indexName,
        BatchSize: 10,
        DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es7.FieldValue, err error) {
                return map[string]es7.FieldValue{
                        fieldContent: {
                                Value:    doc.Content,
                                EmbedKey: fieldContentVector, // 对文档内容进行向量化并保存到 "content_vector" 字段
                        },
                        fieldExtraLocation: {
                                Value: doc.MetaData[docExtraLocation],
                        },
                }, nil
        },
        Embedding: emb,
})

// 索引文档
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

#### OpenSearch 2 示例

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

// 创建 opensearch 索引器组件
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

// 索引文档
docs := []*schema.Document{
        {
                ID:      "doc1",
                Content: "EINO is a framework for building AI applications",
        },
}
ids, err := indexer.Store(ctx, docs)
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(indexer)

// 在 Graph 中使用
graph := compose.NewGraph[[]*schema.Document, []string]()
graph.AddIndexerNode("indexer_node", indexer)
```

## **Option 和 Callback 使用**

### **Option 使用示例**

```go
// 使用选项 (单独使用时)
ids, err := indexer.Store(ctx, docs,
    // 设置子索引
    indexer.WithSubIndexes([]string{"kb_1", "kb_2"}),
    // 设置向量生成组件
    indexer.WithEmbedding(embedder),
)
```

### **Callback 使用示例**

> 代码位置：eino-ext/components/indexer/volc_vikingdb/examples/builtin_embedding

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

// 使用 callback handler
helper := callbacksHelper.NewHandlerHelper().
    Indexer(handler).
    Handler()

chain := compose.NewChain[[]*schema.Document, []string]()
chain.AppendIndexer(volcIndexer)

// 在运行时使用
run, _ := chain.Compile(ctx)

outIDs, _ := run.Invoke(ctx, docs, compose.WithCallbacks(helper))

fmt.Printf("vikingDB store success, docs=%v, resp ids=%v\n", docs, outIDs)
```

## **已有实现**

- Volc VikingDB Indexer: 基于火山引擎 VikingDB 实现的向量数据库索引器 [Indexer - VikingDB](/zh/docs/eino/ecosystem_integration/indexer/indexer_volc_vikingdb)
- Milvus v2.5+ Indexer: 基于 Milvus 实现的向量数据库索引器 [Indexer - Milvus 2 (v2.5+)](/zh/docs/eino/ecosystem_integration/indexer/indexer_milvusv2)
- Milvus v2.4- Indexer: 基于 Milvus 实现的向量数据库索引器 [Indexer - Milvus (v2.4-)](/zh/docs/eino/ecosystem_integration/indexer/indexer_milvus)
- Elasticsearch 8 Indexer: 基于 ES8 实现的通用搜索引擎索引器 [Indexer - ElasticSearch 8](/zh/docs/eino/ecosystem_integration/indexer/indexer_es8)
- ElasticSearch 7 Indexer: 基于 ES7 实现的通用搜索引擎索引器 [Indexer - Elasticsearch 7 ](/zh/docs/eino/ecosystem_integration/indexer/indexer_elasticsearch7)
- OpenSearch 3 Indexer: 基于 OpenSearch 3 实现的通用搜索引擎索引器 [Indexer - OpenSearch 3](/zh/docs/eino/ecosystem_integration/indexer/indexer_opensearch3)
- OpenSearch 2 Indexer: 基于 OpenSearch 2 实现的通用搜索引擎索引器 [Indexer - OpenSearch 2](/zh/docs/eino/ecosystem_integration/indexer/indexer_opensearch2)

## **自行实现参考**

实现自定义的 Indexer 组件时，需要注意以下几点：

1. 注意对公共 option 的处理以及组件实现级的 option 处理
2. 注意对 callback 的处理

### **Option 机制**

自定义 Indexer 可根据需要实现自己的 Option：

```go
// 定义 Option 结构体
type MyIndexerOptions struct {
    BatchSize int
    MaxRetries int
}

// 定义 Option 函数
func WithBatchSize(size int) indexer.Option {
    return indexer.WrapIndexerImplSpecificOptFn(func(o *MyIndexerOptions) {
        o.BatchSize = size
    })
}
```

### **Callback 处理**

Indexer 实现需要在适当的时机触发回调。框架已经定义了标准的回调输入输出结构体：

```go
// CallbackInput 是 indexer 回调的输入
type CallbackInput struct {
    // Docs 是待索引的文档列表
    Docs []*schema.Document
    // Extra 是回调的额外信息
    Extra map[string]any
}

// CallbackOutput 是 indexer 回调的输出
type CallbackOutput struct {
    // IDs 是索引器返回的文档 ID 列表
    IDs []string
    // Extra 是回调的额外信息
    Extra map[string]any
}
```

### **完整实现示例**

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
    // 1. 处理选项
    options := &indexer.Options{},
    options = indexer.GetCommonOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始存储前的回调
    ctx = cm.OnStart(ctx, info, &indexer.CallbackInput{
        Docs: docs,
    })
    
    // 4. 执行存储逻辑
    ids, err := i.doStore(ctx, docs, options)
    
    // 5. 处理错误和完成回调
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
    // 实现文档存储逻辑 (注意处理公共option的参数)
    // 1. 如果设置了 Embedding 组件，生成文档的向量表示
    if opts.Embedding != nil {
        // 提取文档内容
        texts := make([]string, len(docs))
        for j, doc := range docs {
            texts[j] = doc.Content
        }
        // 生成向量
        vectors, err := opts.Embedding.EmbedStrings(ctx, texts)
        if err != nil {
            return nil, err
        }
        // 将向量存储到文档的 MetaData 中
        for j, doc := range docs {
            doc.WithVector(vectors[j])
        }
    }
    
    // 2. 其他自定义逻辑
    return ids, nil
}
```
