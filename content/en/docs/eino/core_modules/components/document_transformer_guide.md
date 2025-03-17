---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Document Transformer guide'
weight: 0
---

## **Introduction**

Document Transformer is a component used for document conversion and processing. Its main function is to perform various transformation operations on input documents, such as splitting, filtering, merging, etc., to obtain documents that meet specific needs. This component can be used in the following scenarios:

- Splitting long documents into smaller paragraphs for easier processing
- Filtering document content based on specific rules
- Performing structured transformations on document content
- Extracting specific parts from documents

## **Component Definition**

### **Interface Definition**

> Code Location: eino/components/document/interface.go

```go
type Transformer interface {
    Transform(ctx context.Context, src []*schema.Document, opts ...TransformerOption) ([]*schema.Document, error)
}
```

#### **Transform Method**

- Function: Performs transformation processing on the input documents
- Parameters:
  - ctx: Context object used to pass request-level information, and for passing the Callback Manager
  - src: List of documents to be processed
  - opts: Optional parameters to configure transformation behavior
- Return Values:
  - `[]*schema.Document`: List of transformed documents
  - error: Error information encountered during the transformation process

### **Document Structure**

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

The Document structure is the standard format of the document and includes the following important fields:

- ID: The unique identifier of the document, used to uniquely identify a document in the system
- Content: The actual content of the document
- MetaData: Metadata of the document, which can store information like:
  - The source information of the document
  - Vector representation of the document (for vector retrieval)
  - Score of the document (for sorting)
  - Sub-index of the document (for hierarchical retrieval)
  - Other custom metadata

### **Common Option**

The Transformer component uses TransformerOption to define optional parameters, and currently, there are no common options. Each specific implementation can define its own specific Option, which can be wrapped into a unified TransformerOption type via the WrapTransformerImplSpecificOptFn function.

## **Usage**

### **Use Individually**

> Code Location: eino-ext/components/document/transformer/splitter/markdown/examples/headersplitter

```go
import (
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
)

// Initialize the transformer (using markdown as an example)
transformer, _ := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    // Configuration parameters
    Headers: map[string]string{
       "##": "",
    },
})

markdownDoc := &schema.Document{
    Content: "## Title 1\nHello Word\n## Title 2\nWord Hello",
}
// Transform the document
transformedDocs, _ := transformer.Transform(ctx, []*schema.Document{markdownDoc})

for idx, doc := range transformedDocs {
    log.Printf("doc segment %v: %v", idx, doc.Content)
}
```

### **Use in Orchestration**

```go
// Use in a Chain
chain := compose.NewChain[[]*schema.Document, []*schema.Document]()
chain.AppendDocumentTransformer(transformer)

// Use in a Graph
graph := compose.NewGraph[[]*schema.Document, []*schema.Document]()
graph.AddDocumentTransformerNode("transformer_node", transformer)
```

## **Usage of Option and Callback**

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

1. Markdown Header Splitter: Document splitting based on Markdown headers [Splitter - markdown](/docs/eino/ecosystem/document/splitter_markdown)
2. Text Splitter: Document splitting based on text length or delimiters [Splitter - semantic](/docs/eino/ecosystem/document/splitter_semantic)
3. Document Filter: Filtering document content based on rules [Splitter - recursive](/docs/eino/ecosystem/document/splitter_recursive)

## **Reference Implementation**

When implementing a custom Transformer component, please pay attention to the following points:

1. Handling of options
2. Handling of callbacks

### **Option Mechanism**

A custom Transformer needs to implement its own option mechanism:

```go
// Define the Option struct
type MyTransformerOptions struct {
    ChunkSize int
    Overlap int
    MinChunkLength int
}

// Define the Option functions
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

### **Handling Callbacks**

The Transformer implementation needs to trigger callbacks at appropriate times:

```go
// These are the callback input and output defined by the transformer. Custom components need to comply with the structure definitions when implementing.
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
    // 1. Handle options
    options := &MyTransformerOptions{
        ChunkSize: t.chunkSize,
        Overlap: t.overlap,
        MinChunkLength: t.minChunkLength,
    }
    options = document.GetTransformerImplSpecificOptions(options, opts...)
    
    // 2. Get the callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Trigger the pre-transformation callback
    ctx = cm.OnStart(ctx, info, &document.TransformerCallbackInput{
        Input: src,
    })
    
    // 4. Execute the transformation logic
    docs, err := t.doTransform(ctx, src, options)
    
    // 5. Handle errors and trigger the completion callback
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
    // Implement the document transformation logic
    return docs, nil
}
```

### **Notes**

- It's important to manage the metadata of transformed documents carefully, ensuring that original metadata is retained and custom metadata is properly added.

## **Other Reference Documents**

- [Eino: Document Loader guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Embedding guide](/docs/eino/core_modules/components/embedding_guide)
- [Eino: Indexer guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever guide](/docs/eino/core_modules/components/retriever_guide)
