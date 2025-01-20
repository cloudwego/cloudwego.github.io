---
Description: ""
date: "2025-01-22"
lastmod: ""
tags: []
title: 'Eino: Document Transformer 使用说明'
weight: 8
---

## **基本介绍**

Document Transformer 是一个用于文档转换和处理的组件。它的主要作用是对输入的文档进行各种转换操作，如分割、过滤、合并等，从而得到满足特定需求的文档。这个组件可用于以下场景中：

- 将长文档分割成小段落以便于处理
- 根据特定规则过滤文档内容
- 对文档内容进行结构化转换
- 提取文档中的特定部分

## **组件定义**

### **接口定义**

> 代码位置：eino/components/document/interface.go

```go
type Transformer interface {
    Transform(ctx context.Context, src []*schema.Document, opts ...TransformerOption) ([]*schema.Document, error)
}
```

#### **Transform 方法**

- 功能：对输入的文档进行转换处理
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - src：待处理的文档列表
  - opts：可选参数，用于配置转换行为
- 返回值：
  - `[]*schema.Document`：转换后的文档列表
  - error：转换过程中的错误信息

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

Document 结构体是文档的标准格式，包含以下重要字段：

- ID：文档的唯一标识符，用于在系统中唯一标识一个文档
- Content：文档的实际内容
- MetaData：文档的元数据，可以存储如下信息：
  - 文档的来源信息
  - 文档的向量表示（用于向量检索）
  - 文档的分数（用于排序）
  - 文档的子索引（用于分层检索）
  - 其他自定义元数据

### **公共 Option**

Transformer 组件使用 TransformerOption 来定义可选参数，目前没有公共的 option。每个具体的实现可以定义自己的特定 Option，通过 WrapTransformerImplSpecificOptFn 函数包装成统一的 TransformerOption 类型。

## **使用方式**

### **单独使用**

> 代码位置：eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// 初始化 transformer (以 markdown 为例)
transformer, _ := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    // 配置参数
    Headers: map[string]string{
       "##": "",
    },
})

markdownDoc := &schema.Document{
    Content: "## Title 1\nHello Word\n## Title 2\nWord Hello",
}
// 转换文档
transformedDocs, _ := transformer.Transform(ctx, []*schema.Document{markdownDoc})

for idx, doc := range transformedDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// 在 Graph 中使用
graph := compose.NewGraph[[]*schema.Document, []*schema.Document]()
graph.AddDocumentTransformerNode("transformer_node", transformer)
```

## **Option 和 Callback 使用**

### **Callback 使用示例**

> 代码位置：eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// 创建 callback handler
handler := &callbacksHelper.TransformerCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *document.TransformerCallbackInput) context.Context {
       log.Printf("input access, len: %v, content: %s\n", len(input.Input), input.Input[0].Content)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *document.TransformerCallbackOutput) context.Context {
       log.Printf("output finished, len: %v\n", len(output.Output))
       return ctx
    },
    // OnError
}

// 使用 callback handler
helper := callbacksHelper.NewHandlerHelper().
    Transformer(handler).
    Handler()

chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// 在运行时使用
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, []*schema.Document{markdownDoc}, compose.WithCallbacks(helper))

for idx, doc := range outDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

## **已有实现**

1. Markdown Header Splitter: 基于 Markdown 标题进行文档分割 [Splitter - markdown](/zh/docs/eino/ecosystem_integration/document/splitter_markdown)
2. Text Splitter: 基于文本长度或分隔符进行文档分割 [Splitter - semantic](/zh/docs/eino/ecosystem_integration/document/splitter_semantic)
3. Document Filter: 基于规则过滤文档内容 [Splitter - recursive](/zh/docs/eino/ecosystem_integration/document/splitter_recursive)

## **自行实现参考**

实现自定义的 Transformer 组件时，需要注意以下几点：

1. option 的处理
2. callback 的处理

### **Option 机制**

自定义 Transformer 需要实现自己的 Option 机制：

```go
// 定义 Option 结构体
type MyTransformerOptions struct {
    ChunkSize int
    Overlap int
    MinChunkLength int
}

// 定义 Option 函数
func WithChunkSize(size int) document.TransformerOption {
    return document.WrapTransformerImplSpecificOptFn(func(o *MyTransformerOptions) {
        o.ChunkSize = size
    })
}

func WithOverlap(overlap int) document.TransformerOption {
    return document.WrapTransformerImplSpecificOptFn(func(o *MyTransformerOptions) {
        o.Overlap = overlap
    })
}
```

### **Callback 处理**

Transformer 实现需要在适当的时机触发回调：

```go
// 这是由 transformer 定义的回调输入输出，自行组件在实现时需要满足结构的含义
type TransformerCallbackInput struct {
    Input []*schema.Document
    Extra map[string]any
}

type TransformerCallbackOutput struct {
    Output []*schema.Document
    Extra map[string]any
}
```

### **完整实现示例**

```go
type MyTransformer struct {
    chunkSize int
    overlap int
    minChunkLength int
}

func NewMyTransformer(config *MyTransformerConfig) (*MyTransformer, error) {
    return &MyTransformer{
        chunkSize: config.DefaultChunkSize,
        overlap: config.DefaultOverlap,
        minChunkLength: config.DefaultMinChunkLength,
    }, nil
}

func (t *MyTransformer) Transform(ctx context.Context, src []*schema.Document, opts ...document.TransformerOption) ([]*schema.Document, error) {
    // 1. 处理 Option
    options := &MyTransformerOptions{
        ChunkSize: t.chunkSize,
        Overlap: t.overlap,
        MinChunkLength: t.minChunkLength,
    }
    options = document.GetTransformerImplSpecificOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始转换前的回调
    ctx = cm.OnStart(ctx, info, &document.TransformerCallbackInput{
        Input: src,
    })
    
    // 4. 执行转换逻辑
    docs, err := t.doTransform(ctx, src, options)
    
    // 5. 处理错误和完成回调
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &document.TransformerCallbackOutput{
        Output: docs,
    })
    
    return docs, nil
}

func (t *MyTransformer) doTransform(ctx context.Context, src []*schema.Document, opts *MyTransformerOptions) ([]*schema.Document, error) {
    // 实现文档转换逻辑
    return docs, nil
}
```

### **注意事项**

- 转换后的文档需要注意对 metadata 的处理，注意保留原 metadata，以及新增自定义的 metadata

## 其他参考文档

- [[🚧]Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)
- [[🚧]Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
- [[🚧]Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
- [[🚧]Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
