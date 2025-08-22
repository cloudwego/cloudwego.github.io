---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: 'Eino: Document Loader guide'
weight: 0
---

## **Basic Introduction**

Document Loader is a component used for loading documents. Its primary function is to load document content from different sources (such as web URLs, local files, etc.) and convert it into a standard document format. This component plays an important role in scenarios where document content needs to be sourced from various origins, such as:

- Loading web page content from a web URL
- Reading local documents in formats such as PDF, Word, etc.

## **Component Definition**

### **Interface Definition**

> Code Location: eino/components/document/parser/interface.go

```go
type Loader interface {
    Load(ctx context.Context, src Source, opts ...LoaderOption) ([]*schema.Document, error)
}
```

#### **Load Method**

- Function: Loads documents from a specified data source
- Parameters:
  - ctx: Context object used to pass request-level information, and to pass the Callback Manager as well
  - src: Document source containing the URI information of the document
  - opts: Load options used to configure loading behavior
- Returns:
  - `[]*schema.Document`: List of loaded documents
  - error: Error information during the loading process

### **Source Struct**

```go
type Source struct {
    URI string
}
```

The Source struct defines the source information of a document:

- URI: The Uniform Resource Identifier of the document, which can be a web URL or a local file path

### **Document Struct**

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

The Document struct is the standard format of a document, containing the following important fields:

- ID: The unique identifier of the document, used to uniquely identify a document in the system
- Content: The actual content of the document
- MetaData: The metadata of the document, which can store the following information:
  - Source information of the document
  - Vector representation of the document (used for vector retrieval)
  - Score of the document (used for sorting)
  - Sub-index of the document (used for hierarchical retrieval)
  - Other custom metadata

### **Common Options**

The Loader component uses `LoaderOption` to define loading options. Currently, Loader does not have common Options; each specific implementation can define its own specific options, which are wrapped into a unified `LoaderOption` type through the `WrapLoaderImplSpecificOptFn` function.

## **Usage**

### **Standalone Use**

> Code Location: eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// Initialize loader (take file loader as an example)
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

### **Use in Orchestration**

```go
// Use in Chain
chain := compose.NewChain[document.Source, []*schema.Document]()
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
       log.Printf("complete loading docs，total loaded docs: %d\n", len(output.Docs))
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

1. File Loader: Used to load documents from the local file system [Loader - local file](/docs/eino/ecosystem_integration/document/loader_local_file)
2. Web Loader: Used to load documents pointed by web URLs [Loader - web url](/docs/eino/ecosystem_integration/document/loader_web_url)
3. S3 Loader: Used to load documents stored in S3 compatible storage systems [Loader - amazon s3](/docs/eino/ecosystem_integration/document/loader_amazon_s3)

## **Reference for Self-Implementation**

When self-implementing a loader component, attention must be paid to the option mechanism and callback handling.

### **Option Mechanism**

Custom Loaders need to implement their own Option parameter mechanism:

```go
// Define the options struct
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

> Code Location: eino/components/document/callback_extra_loader.go

```go
// These are the callback input and output defined by the loader component. Implementations should satisfy the parameter meanings.
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
    return & CustomLoader {
       timeout: config.DefaultTimeout,
       retryCount: config.DefaultRetryCount,
    }, nil
}

type CustomLoader struct {
    timeout time.Duration
    retryCount int
}

type Config struct {
    DefaultTimeout time.Duration
    DefaultRetryCount int
}

func (l *CustomLoader) Load(ctx context.Context, src document.Source, opts ...document.LoaderOption) ([]*schema.Document, error) {
    // 1. Handle options
    options := &customLoaderOptions{
       Timeout: l.timeout,
       RetryCount: l.retryCount,
    }
    options = document.GetLoaderImplSpecificOptions(options, opts...)
    var err error

    // 2. Handle errors and trigger error callbacks
    defer func() {
       if err != nil {
          callbacks.OnError(ctx, err)
       }
    }()

    // 3. Trigger pre-load callback
    ctx = callbacks.OnStart(ctx, &document.LoaderCallbackInput{
       Source: src,
    })

    // 4. Execute load logic
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
    // Implement document load logic
    // 1. Load document content
    // 2. Construct Document objects, ensuring to save important information such as document source in MetaData
    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### **Precautions**

- MetaData is an important part of the document, used to save various metadata of the document
- Return meaningful error information when document loading fails to facilitate error troubleshooting

## **Other Reference Documents**

- [Eino: Document Transformer guide](/docs/eino/core_modules/components/document_transformer_guide)
- [Eino: Embedding guide](/docs/eino/core_modules/components/embedding_guide)
- [Eino: Indexer guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever guide](/docs/eino/core_modules/components/retriever_guide)
