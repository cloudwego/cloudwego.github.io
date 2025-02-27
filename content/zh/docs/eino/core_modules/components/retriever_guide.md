---
Description: ""
date: "2025-01-22"
lastmod: ""
tags: []
title: 'Eino: Retriever 使用说明'
weight: 0
---

## **基本介绍**

Retriever 组件是一个用于从各种数据源检索文档的组件。它的主要作用是根据用户的查询（query）从文档库中检索出最相关的文档。这个组件在以下场景中特别有用：

- 基于向量相似度的文档检索
- 基于关键词的文档搜索
- 知识库问答系统 (rag)

## **组件定义**

### **接口定义**

> 代码位置：eino/components/retriever/interface.go

```go
type Retriever interface {
    Retrieve(ctx context.Context, query string, opts ...Option) ([]*schema.Document, error)
}
```

#### **Retrieve 方法**

- 功能：根据查询检索相关文档
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - query：查询字符串
  - opts：检索选项，用于配置检索行为
- 返回值：
  - `[]*schema.Document`：检索到的文档列表
  - error：检索过程中的错误信息

### **Document 结构体**

```go
type Document struct {
    // ID 是文档的唯一标识符
    ID string
    // Content 是文档的内容
    Content string
    // MetaData 用于存储文档的元数据信息
    MetaData map[string]any
}
```

### **公共 Option**

Retriever 组件使用 RetrieverOption 来定义可选参数， 以下是 Retriever 组件需要实现的公共 option。另外，每个具体的实现可以定义自己的特定 Option，通过 WrapRetrieverImplSpecificOptFn 函数包装成统一的 RetrieverOption 类型。

```go
type Options struct {
    // Index 是检索器使用的索引，不同检索器中的索引可能有不同含义
    Index *string
    
    // SubIndex 是检索器使用的子索引，不同检索器中的子索引可能有不同含义
    SubIndex *string
    
    // TopK 是检索的文档数量上限
    TopK *int
    
    // ScoreThreshold 是文档相似度的阈值，例如 0.5 表示文档的相似度分数必须大于 0.5
    ScoreThreshold *float64
    
    // Embedding 是用于生成查询向量的组件
    Embedding embedding.Embedder
    
    // DSLInfo 是用于检索的 DSL 信息，仅在 viking 类型的检索器中使用
    DSLInfo map[string]interface{}
}
```

可以通过以下方式设置选项：

```go
// 设置索引
WithIndex(index string) Option

// 设置子索引
WithSubIndex(subIndex string) Option

// 设置检索文档数量上限
WithTopK(topK int) Option

// 设置相似度阈值
WithScoreThreshold(threshold float64) Option

// 设置向量生成组件
WithEmbedding(emb embedding.Embedder) Option

// 设置 DSL 信息（仅用于 viking 类型检索器）
WithDSLInfo(dsl map[string]any) Option
```

## **使用方式**

### **单独使用**

> 代码位置：eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding

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
 * 下面示例中提前构建了一个名为 eino_test 的数据集 (collection)，并在此数据集上构建了一个名为 test_index_1 的 hnsw-hybrid 索引 (index)
 * 数据集字段配置为:
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

cfg := &volc_vikingdb.RetrieverConfig{
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
    Index:             indexName,
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
       UseBuiltin:  true,
       ModelName:   "bge-m3",
       UseSparse:   true,
       DenseWeight: 0.4,
    },
    Partition:      "", // 对应索引中的【子索引划分字段】, 未设置时至空即可
    TopK:           of(10),
    ScoreThreshold: of(0.1),
    FilterDSL:      nil, // 对应索引中的【标量过滤字段】，未设置时至空即可，表达式详见 https://www.volcengine.com/docs/84313/1254609
}

volcRetriever, _ := volc_vikingdb.NewRetriever(ctx, cfg)


query := "tourist attraction"
docs, _ := volcRetriever.Retrieve(ctx, query)

log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, docs)
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(retriever)

// 在 Graph 中使用
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddRetrieverNode("retriever_node", retriever)
```

## **Option 和 Callback 使用**

### **Callback 使用示例**

> 代码位置：eino-ext/components/retriever/volc_vikingdb/examples/builtin_embedding

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/retriever"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino-ext/components/retriever/volc_vikingdb"
)

// 创建 callback handler
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

// 使用 callback handler
helper := callbacksHelper.NewHandlerHelper().
    Retriever(handler).
    Handler()

chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(volcRetriever)

// 在运行时使用
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, query, compose.WithCallbacks(helper))

log.Printf("vikingDB retrieve success, query=%v, docs=%v", query, outDocs)
```

## **已有实现**

- Volc VikingDB Retriever: 基于火山引擎 VikingDB 的检索实现 [Retriever - VikingDB](/zh/docs/eino/ecosystem_integration/retriever/retriever_volc_vikingdb)

## **自行实现参考**

实现自定义的 Retriever 组件时，需要注意以下几点：

1. 注意 option 机制的处理，及处理公共的 option.
2. 注意处理 callback
3. 注意需要注入特定的 metadata，以便后续节点使用

### **option 机制**

Retriever 组件提供了一组公共选项，实现时需要正确处理这些选项：

```go
// 使用 GetCommonOptions 处理公共 option
func (r *MyRetriever) Retrieve(ctx context.Context, query string, opts ...retriever.Option) ([]*schema.Document, error) {
    // 1. 初始化及读取 option
    options := &retriever.Options{ // 可设置default值
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // ...
}
```

### **Callback 处理**

Retriever 实现需要在适当的时机触发回调，以下结构体是 retriever 组件定义好的结构：

```go
// 定义回调输入输出
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

### **完整实现示例**

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
    // 1. 处理选项
    options := &retriever.Options{
        Index: &r.index,
        TopK: &r.topK,
        Embedding: r.embedder,
    }
    options = retriever.GetCommonOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始检索前的回调
    ctx = cm.OnStart(ctx, info, &retriever.CallbackInput{
        Query: query,
        TopK: *options.TopK,
    })
    
    // 4. 执行检索逻辑
    docs, err := r.doRetrieve(ctx, query, options)
    
    // 5. 处理错误和完成回调
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
    // 1. 如果设置了 Embedding，生成查询的向量表示 (注意公共option的逻辑处理)
    var queryVector []float64
    if opts.Embedding != nil {
        vectors, err := opts.Embedding.EmbedStrings(ctx, []string{query})
        if err != nil {
            return nil, err
        }
        queryVector = vectors[0]
    }
    
    // 2. 其他逻辑
    return docs, nil
}
```
