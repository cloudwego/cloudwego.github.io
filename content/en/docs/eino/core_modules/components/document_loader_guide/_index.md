---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: Document Loader User Guide'
weight: 1
---

## **Introduction**

Document Loader is a component for loading documents. Its main purpose is to load document content from different sources (such as network URLs, local files, etc.) and convert them into a standard document format. This component plays an important role in scenarios that require obtaining document content from various sources, such as:

- Loading web content from network URLs
- Reading local PDF, Word, and other format documents

## **Component Definition**

### **Interface Definition**

> Code location: eino/components/document/interface.go

```go
type Loader interface {
    Load(ctx context.Context, src Source, opts ...LoaderOption) ([]*schema.Document, error)
}
```

#### **Load Method**

- Function: Load documents from specified data sources
- Parameters:
  - ctx: Context object for passing request-level information and Callback Manager
  - src: Document source containing URI information of the document
  - opts: Loading options for configuring loading behavior
- Return values:
  - `[]*schema.Document`: Loaded document list
  - error: Error information during loading

### **Source Struct**

```go
type Source struct {
    URI string
}
```

The Source struct defines the document source information:

- URI: Uniform Resource Identifier of the document, can be a network URL or local file path

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

The Loader component uses `LoaderOption` to define loading options. Loader currently has no common Options. Each specific implementation can define its own specific options, wrapped into a unified `LoaderOption` type through the `WrapLoaderImplSpecificOptFn` function.

## **Usage**

### **Standalone Usage**

> Code location: eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// Initialize loader (using file loader as example)
loader, _ := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    // Configuration parameters
    UseNameAsID: true,
})

// Load document
filePath := "../../testdata/test.md"
docs, _ := loader.Load(ctx, document.Source{
    URI: filePath,
})

log.Printf("doc content: %v", docs[0].Content)
```

### **Usage in Orchestration**

```go
// Use in Chain
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendLoader(loader)

// Compile and run
runnable, _ := chain.Compile()

result, _ := runnable.Invoke(ctx, input)

// Use in Graph
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddLoaderNode("loader_node", loader)
```

## **Option and Callback Usage**

### **Callback Usage Example**

> Code location: eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"

    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// Create callback handler
handler := &callbacksHelper.LoaderCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *document.LoaderCallbackInput) context.Context {
       log.Printf("start loading docs...: %s\n", input.Source.URI)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *document.LoaderCallbackOutput) context.Context {
       log.Printf("complete loading docs, total loaded docs: %d\n", len(output.Docs))
       return ctx
    },
    // OnError
}

// Use callback handler
helper := callbacksHelper.NewHandlerHelper().
    Loader(handler).
    Handler()

chain := compose.NewChain[document.Source, []*schema.Document]()
chain.AppendLoader(loader)
// Use at runtime
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, document.Source{
    URI: filePath,
}, compose.WithCallbacks(helper))

log.Printf("doc content: %v", outDocs[0].Content)
```

## **Existing Implementations**

1. File Loader: For loading documents from the local file system [Loader - local file](/docs/eino/ecosystem_integration/document/loader_local_file)
2. Web Loader: For loading documents pointed to by network URLs [Loader - web url](/docs/eino/ecosystem_integration/document/loader_web_url)
3. S3 Loader: For loading documents stored in S3-compatible storage systems [Loader - amazon s3](/docs/eino/ecosystem_integration/document/loader_amazon_s3)

## **Implementation Reference**

When implementing your own loader component, pay attention to the option mechanism and callback handling.

### Option **Mechanism**

Custom Loader needs to implement its own Option parameter mechanism:

```go
// Define option struct
type MyLoaderOptions struct {
    Timeout time.Duration
    RetryCount int
}

// Define option functions
func WithTimeout(timeout time.Duration) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) {
        o.Timeout = timeout
    })
}

func WithRetryCount(count int) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) {
        o.RetryCount = count
    })
}
```

### **Callback Handling**

Loader implementations need to trigger callbacks at appropriate times:

> Code location: eino/components/document/callback_extra_loader.go

```go
// This is the callback input/output defined by the loader component. Implementations need to satisfy the meaning of the parameters.
type LoaderCallbackInput struct {
    Source Source
    Extra map[string]any
}

type LoaderCallbackOutput struct {
    Source Source
    Docs []*schema.Document
    Extra map[string]any
}
```

### **Complete Implementation Example**

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/schema"
)

func NewCustomLoader(config *Config) (*CustomLoader, error) {
    return &CustomLoader{
       timeout:    config.DefaultTimeout,
       retryCount: config.DefaultRetryCount,
    }, nil
}

type CustomLoader struct {
    timeout    time.Duration
    retryCount int
}

type Config struct {
    DefaultTimeout    time.Duration
    DefaultRetryCount int
}

func (l *CustomLoader) Load(ctx context.Context, src document.Source, opts ...document.LoaderOption) ([]*schema.Document, error) {
    // 1. Handle options
    options := &customLoaderOptions{
       Timeout:    l.timeout,
       RetryCount: l.retryCount,
    }
    options = document.GetLoaderImplSpecificOptions(options, opts...)
    var err error

    // 2. Handle errors and call error callback method
    defer func() {
       if err != nil {
          callbacks.OnError(ctx, err)
       }
    }()

    // 3. Callback before loading starts
    ctx = callbacks.OnStart(ctx, &document.LoaderCallbackInput{
       Source: src,
    })

    // 4. Execute loading logic
    docs, err := l.doLoad(ctx, src, options)

    if err != nil {
       return nil, err
    }

    ctx = callbacks.OnEnd(ctx, &document.LoaderCallbackOutput{
       Source: src,
       Docs:   docs,
    })

    return docs, nil
}

func (l *CustomLoader) doLoad(ctx context.Context, src document.Source, opts *customLoaderOptions) ([]*schema.Document, error) {
    // Implement document loading logic
    // 1. Load document content
    // 2. Construct Document object, note that important information like document source can be saved in MetaData
    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### **Notes**

- MetaData is an important part of the document, used to save various metadata information of the document
- Return meaningful error information when document loading fails, making error troubleshooting easier

## Other Reference Documents

- [[🚧]Eino: Document Transformer User Guide](/docs/eino/core_modules/components/document_transformer_guide)
- [[🚧]Eino: Embedding User Guide](/docs/eino/core_modules/components/embedding_guide)
- [[🚧]Eino: Indexer User Guide](/docs/eino/core_modules/components/indexer_guide)
- [[🚧]Eino: Retriever User Guide](/docs/eino/core_modules/components/retriever_guide)
