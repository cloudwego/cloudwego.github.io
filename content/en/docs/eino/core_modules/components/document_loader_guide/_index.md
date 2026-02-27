---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: Document Loader Guide'
weight: 8
---

## Introduction

`Document Loader` loads documents from various sources (e.g., web URLs, local files) and converts them into a standard document format. It’s useful for scenarios such as:

- Loading web content from URLs
- Reading local documents like PDF or Word

## Component Definition

### Interface

> Code: `eino/components/document/interface.go`

```go
type Loader interface {
    Load(ctx context.Context, src Source, opts ...LoaderOption) ([]*schema.Document, error)
}
```

#### Load

- Purpose: load documents from a given source
- Params:
  - `ctx`: request context and callback manager
  - `src`: document source including URI
  - `opts`: loader options
- Returns:
  - `[]*schema.Document`: loaded documents
  - `error`

### Source

```go
type Source struct {
    URI string
}
```

Defines source information:

- `URI`: a web URL or local file path

### Document

```go
type Document struct {
    ID string
    Content string
    MetaData map[string]any
}
```

Standard document fields:

- `ID`: unique identifier
- `Content`: document content
- `MetaData`: source info, embeddings, scores, sub-indexes, and custom metadata

### Options

`LoaderOption` represents loader options. There is no global common option; each implementation defines its own and wraps via `WrapLoaderImplSpecificOptFn`.

## Usage

### Standalone

> Code: `eino-ext/components/document/loader/file/examples/fileloader`

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

loader, _ := file.NewFileLoader(ctx, &file.FileLoaderConfig{ UseNameAsID: true })

filePath := "../../testdata/test.md"
docs, _ := loader.Load(ctx, document.Source{ URI: filePath })
log.Printf("doc content: %v", docs[0].Content)
```

### In Orchestration

```go
// Chain
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendLoader(loader)
runnable, _ := chain.Compile()
result, _ := runnable.Invoke(ctx, input)

// Graph
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddLoaderNode("loader_node", loader)
```

## Options and Callbacks

### Callback Example

> Code: `eino-ext/components/document/loader/file/examples/fileloader`

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

handler := &callbacksHelper.LoaderCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *document.LoaderCallbackInput) context.Context {
       log.Printf("start loading docs...: %s\n", input.Source.URI)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *document.LoaderCallbackOutput) context.Context {
       log.Printf("complete loading docs, total: %d\n", len(output.Docs))
       return ctx
    },
}

helper := callbacksHelper.NewHandlerHelper().Loader(handler).Handler()

chain := compose.NewChain[document.Source, []*schema.Document]()
chain.AppendLoader(loader)
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, document.Source{ URI: filePath }, compose.WithCallbacks(helper))
log.Printf("doc content: %v", outDocs[0].Content)
```

## Existing Implementations

1. File Loader — local filesystem: [Loader — local file](/docs/eino/ecosystem_integration/document/loader_local_file)
2. Web Loader — HTTP/HTTPS: [Loader — web url](/docs/eino/ecosystem_integration/document/loader_web_url)
3. S3 Loader — S3-compatible storage: [Loader — Amazon S3](/docs/eino/ecosystem_integration/document/loader_amazon_s3)

## Implementation Notes

### Option Mechanism

```go
type MyLoaderOptions struct {
    Timeout time.Duration
    RetryCount int
}

func WithTimeout(timeout time.Duration) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) { o.Timeout = timeout })
}

func WithRetryCount(count int) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) { o.RetryCount = count })
}
```

### Callback Structures

> Code: `eino/components/document/callback_extra_loader.go`

```go
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

### Full Implementation Example

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
    options := &customLoaderOptions{
       Timeout:    l.timeout,
       RetryCount: l.retryCount,
    }
    options = document.GetLoaderImplSpecificOptions(options, opts...)
    var err error

    defer func() {
       if err != nil {
          callbacks.OnError(ctx, err)
       }
    }()

    ctx = callbacks.OnStart(ctx, &document.LoaderCallbackInput{
       Source: src,
    })

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
    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### Notes

- `MetaData` is critical for storing document source and other metadata
- Return meaningful errors on load failures for easier debugging

## Other References

- [Eino: Document Transformer Guide](/docs/eino/core_modules/components/document_transformer_guide)
- [Eino: Embedding Guide](/docs/eino/core_modules/components/embedding_guide)
- [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
