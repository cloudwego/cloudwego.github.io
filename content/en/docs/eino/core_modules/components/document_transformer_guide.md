---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Document Transformer User Guide'
weight: 3
---

## **Introduction**

Document Transformer is a component for document conversion and processing. Its main purpose is to perform various transformation operations on input documents, such as splitting, filtering, merging, etc., to obtain documents that meet specific requirements. This component can be used in the following scenarios:

- Splitting long documents into small paragraphs for easier processing
- Filtering document content based on specific rules
- Performing structural transformations on document content
- Extracting specific parts of documents

## **Component Definition**

### **Interface Definition**

> Code location: eino/components/document/interface.go

```go
type Transformer interface {
    Transform(ctx context.Context, src []*schema.Document, opts ...TransformerOption) ([]*schema.Document, error)
}
```

#### **Transform Method**

- Function: Perform transformation processing on input documents
- Parameters:
  - ctx: Context object for passing request-level information and Callback Manager
  - src: List of documents to be processed
  - opts: Optional parameters for configuring transformation behavior
- Return values:
  - `[]*schema.Document`: Transformed document list
  - error: Error information during transformation

### **Document Struct**

```go
type Document struct {
    // ID is the unique identifier of the document
    ID string    
    // Content is the content of the document
    Content string
    // MetaData stores metadata information of the document
    MetaData map[string]any
}
```

The Document struct is the standard format for documents, containing the following important fields:

- ID: Unique identifier of the document, used to uniquely identify a document in the system
- Content: Actual content of the document
- MetaData: Metadata of the document, can store information such as:
  - Source information of the document
  - Vector representation of the document (for vector retrieval)
  - Document score (for ranking)
  - Document sub-index (for hierarchical retrieval)
  - Other custom metadata

### **Common Options**

The Transformer component uses TransformerOption to define optional parameters. There are currently no common options. Each specific implementation can define its own specific Options, wrapped into a unified TransformerOption type through the WrapTransformerImplSpecificOptFn function.

## **Usage**

### **Standalone Usage**

> Code location: eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// Initialize transformer (using markdown as example)
transformer, _ := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    // Configuration parameters
    Headers: map[string]string{
       "##": "",
    },
})

markdownDoc := &schema.Document{
    Content: "## Title 1\nHello Word\n## Title 2\nWord Hello",
}
// Transform document
transformedDocs, _ := transformer.Transform(ctx, []*schema.Document{markdownDoc})

for idx, doc := range transformedDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

### **Usage in Orchestration**

```go
// Use in Chain
chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// Use in Graph
graph := compose.NewGraph[[]*schema.Document, []*schema.Document]()
graph.AddDocumentTransformerNode("transformer_node", transformer)
```

## **Option and Callback Usage**

### **Callback Usage Example**

> Code location: eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// Create callback handler
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

// Use callback handler
helper := callbacksHelper.NewHandlerHelper().
    Transformer(handler).
    Handler()

chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// Use at runtime
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, []*schema.Document{markdownDoc}, compose.WithCallbacks(helper))

for idx, doc := range outDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

## **Existing Implementations**

1. Markdown Header Splitter: Document splitting based on Markdown headers [Splitter - markdown](/docs/eino/ecosystem_integration/document/splitter_markdown)
2. Text Splitter: Document splitting based on text length or delimiters [Splitter - semantic](/docs/eino/ecosystem_integration/document/splitter_semantic)
3. Document Filter: Filter document content based on rules [Splitter - recursive](/docs/eino/ecosystem_integration/document/splitter_recursive)

## **Implementation Reference**

When implementing a custom Transformer component, note the following:

1. Option handling
2. Callback handling

### **Option Mechanism**

Custom Transformer needs to implement its own Option mechanism:

```go
// Define Option struct
type MyTransformerOptions struct {
    ChunkSize int
    Overlap int
    MinChunkLength int
}

// Define Option functions
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

Transformer implementations need to trigger callbacks at appropriate times:

```go
// This is the callback input/output defined by transformer. Custom components need to satisfy the meaning of the structures when implementing.
type TransformerCallbackInput struct {
    Input []*schema.Document
    Extra map[string]any
}

type TransformerCallbackOutput struct {
    Output []*schema.Document
    Extra map[string]any
}
```

### **Complete Implementation Example**

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
    // 1. Handle Options
    options := &MyTransformerOptions{
        ChunkSize: t.chunkSize,
        Overlap: t.overlap,
        MinChunkLength: t.minChunkLength,
    }
    options = document.GetTransformerImplSpecificOptions(options, opts...)
    
    // 2. Callback before transformation starts
    ctx = callbacks.OnStart(ctx, info, &document.TransformerCallbackInput{
        Input: src,
    })
    
    // 3. Execute transformation logic
    docs, err := t.doTransform(ctx, src, options)
    
    // 4. Handle errors and completion callback
    if err != nil {
        ctx = callbacks.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = callbacks.OnEnd(ctx, info, &document.TransformerCallbackOutput{
        Output: docs,
    })
    
    return docs, nil
}

func (t *MyTransformer) doTransform(ctx context.Context, src []*schema.Document, opts *MyTransformerOptions) ([]*schema.Document, error) {
    // Implement document transformation logic
    return docs, nil
}
```

### **Notes**

- Pay attention to metadata handling for transformed documents, preserving original metadata and adding custom metadata

## Other Reference Documents

- [[🚧]Eino: Embedding User Guide](/docs/eino/core_modules/components/embedding_guide)
- [[🚧]Eino: Indexer User Guide](/docs/eino/core_modules/components/indexer_guide)
- [[🚧]Eino: Retriever User Guide](/docs/eino/core_modules/components/retriever_guide)
- [[🚧]Eino: Document Loader User Guide](/docs/eino/core_modules/components/document_loader_guide)
