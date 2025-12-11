---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Document Transformer Guide'
weight: 9
---

## **Overview**

Document Transformer is a component for transforming and processing documents. It performs operations such as splitting, filtering, merging, and more to produce documents tailored to specific needs. Typical scenarios include:

- Split long documents into smaller chunks for processing
- Filter document content by rules
- Convert document structure
- Extract specific parts of a document

## **Component Definition**

### **Interface**

> Code: `eino/components/document/interface.go`

```go
type Transformer interface {
    Transform(ctx context.Context, src []*schema.Document, opts ...TransformerOption) ([]*schema.Document, error)
}
```

#### **Transform Method**

- Purpose: transform input documents
- Params:
  - `ctx`: request context, also carries the Callback Manager
  - `src`: documents to process
  - `opts`: options to configure behavior
- Returns:
  - `[]*schema.Document`: transformed documents
  - `error`: error during transformation

### **Document Struct**

```go
type Document struct {
    // ID is the unique identifier
    ID string
    // Content is the document text
    Content string
    // MetaData stores metadata
    MetaData map[string]any
}
```

Key fields:

- ID: unique identifier
- Content: actual text
- MetaData: metadata such as:
  - source info
  - vector representation (for retrieval)
  - score (for ranking)
  - sub-index (for hierarchical retrieval)
  - other custom metadata

### **Common Options**

Transformer uses `TransformerOption` for optional parameters. There are currently no global/common options; each implementation defines its own specific options, wrapped via `WrapTransformerImplSpecificOptFn` into `TransformerOption`.

## **Usage**

### **Standalone**

> Code: `eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter`

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// init transformer (markdown example)
transformer, _ := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    Headers: map[string]string{
       "##": "",
    },
})

markdownDoc := &schema.Document{
    Content: "## Title 1\nHello Word\n## Title 2\nWord Hello",
}
// transform
transformedDocs, _ := transformer.Transform(ctx, []*schema.Document{markdownDoc})

for idx, doc := range transformedDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

### **In Orchestration**

```go
// in Chain
chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// in Graph
graph := compose.NewGraph[[]*schema.Document, []*schema.Document]()
graph.AddDocumentTransformerNode("transformer_node", transformer)
```

## **Options and Callbacks**

### **Callback Example**

> Code: `eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter`

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

handler := &callbacksHelper.TransformerCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *document.TransformerCallbackInput) context.Context {
       log.Printf("input access, len: %v, content: %s\n", len(input.Input), input.Input[0].Content)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *document.TransformerCallbackOutput) context.Context {
       log.Printf("output finished, len: %v\n", len(output.Output))
       return ctx
    },
}

helper := callbacksHelper.NewHandlerHelper().
    Transformer(handler).
    Handler()

chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, []*schema.Document{markdownDoc}, compose.WithCallbacks(helper))

for idx, doc := range outDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

## **Existing Implementations**

1. Markdown Header Splitter: split by markdown headers — [Splitter - markdown](/docs/eino/ecosystem_integration/document/splitter_markdown)
2. Text Splitter: split by length or separators — [Splitter - semantic](/docs/eino/ecosystem_integration/document/splitter_semantic)
3. Document Filter: filter by rules — [Splitter - recursive](/docs/eino/ecosystem_integration/document/splitter_recursive)

## **Implement Your Own**

Consider the following when implementing a custom Transformer:

1. Option handling
2. Callback handling

### **Option Mechanism**

```go
type MyTransformerOptions struct {
    ChunkSize int
    Overlap int
    MinChunkLength int
}

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

### **Callback Handling**

```go
type TransformerCallbackInput struct {
    Input []*schema.Document
    Extra map[string]any
}

type TransformerCallbackOutput struct {
    Output []*schema.Document
    Extra map[string]any
}
```

### **Full Implementation Example**

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
    // 1. handle Option
    options := &MyTransformerOptions{
        ChunkSize: t.chunkSize,
        Overlap: t.overlap,
        MinChunkLength: t.minChunkLength,
    }
    options = document.GetTransformerImplSpecificOptions(options, opts...)
    
    // 2. before-transform callback
    ctx = callbacks.OnStart(ctx, info, &document.TransformerCallbackInput{
        Input: src,
    })
    
    // 3. perform transform
    docs, err := t.doTransform(ctx, src, options)
    
    // 4. handle error and finish callback
    if err != nil {
        ctx = callbacks.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = callbacks.OnEnd(ctx, info, &document.TransformerCallbackOutput{
        Output: docs,
    })
    
    return docs, nil
}
```

```go
func (t *MyTransformer) doTransform(ctx context.Context, src []*schema.Document, opts *MyTransformerOptions) ([]*schema.Document, error) {
    // implement document transform logic
    return docs, nil
}
```

### **Notes**

- Preserve and manage metadata when transforming documents; keep original metadata and add custom metadata as needed.

## **References**

- [Eino: Embedding Guide](/docs/eino/core_modules/components/embedding_guide)
- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
- [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide)
