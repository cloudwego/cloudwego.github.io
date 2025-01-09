---
Description: ""
date: "2025-01-07"
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

```go
// 初始化 retriever (以 vikingdb 为例)
retriever, err := vikingdb.NewRetriever(ctx, &vikingdb.RetrieverConfig{
    // 配置参数
})
if err != nil {
    return err
}

// 基本检索
docs, err := retriever.Retrieve(ctx, "查询内容")
if err != nil {
    return err
}

// 使用 Option 进行检索
docs, err = retriever.Retrieve(ctx, "查询内容",
    retriever.WithTopK(5),
    retriever.WithScoreThreshold(0.7),
)
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendRetriever(retriever)

// 编译并运行
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, "查询内容")

// 在 Graph 中使用
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddRetrieverNode("retriever_node", retriever)
```

## **Option 和 Callback 使用**

### **Callback 使用示例**

```go
// 创建 callback handler
handler := &retriever.CallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *retriever.CallbackInput) context.Context {
        fmt.Printf("开始检索，查询内容: %s，TopK: %d\n", input.Query, input.TopK)
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *retriever.CallbackOutput) context.Context {
        fmt.Printf("检索完成，找到文档数量: %d\n", len(output.Docs))
        return ctx
    },
}

// 使用 callback handler
helper := template.NewHandlerHelper().
    Retriever(handler).
    Handler()

// 在运行时使用
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, "查询内容", compose.WithCallbacks(helper))
```

## **已有实现**

- Volc VikingDB Retriever: 基于火山引擎 VikingDB 的检索实现 [Retriever - VikingDB](/zh/docs/eino/ecosystem_integration/retriever_volc_vikingdb)

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
