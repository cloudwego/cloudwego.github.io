---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Embedding Guide'
weight: 7
---

## Introduction

The `Embedding` component converts text into vector representations, mapping content into a vector space where semantically similar texts are closer. It’s useful for:

- Text similarity
- Semantic search
- Clustering analysis

## Component Definition

### Interface

```go
type Embedder interface {
    EmbedStrings(ctx context.Context, texts []string, opts ...Option) ([][]float64, error)
}
```

#### EmbedStrings

- Purpose: convert a list of texts into vectors
- Params:
  - `ctx`: request context and callback manager
  - `texts`: list of texts
  - `opts`: embedding options
- Returns:
  - `[][]float64`: vectors (dimensions depend on implementation)
  - `error`

### Common Options

Embedding uses `EmbeddingOption`. Implementations may define specific options and wrap via `WrapEmbeddingImplSpecificOptFn`.

```go
type Options struct {
    Model *string
}
```

Set options:

```go
WithModel(model string) Option
```

## Usage

### Standalone

> Code: `eino-ext/components/embedding/openai/examples/embedding`

```go
import "github.com/cloudwego/eino-ext/components/embedding/openai"

embedder, _ := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
    APIKey:     accessKey,
    Model:      "text-embedding-3-large",
    Dimensions: &defaultDim,
    Timeout:    0,
})

vectorIDs, _ := embedder.EmbedStrings(ctx, []string{"hello", "how are you"})
```

### In Orchestration

> Code: `eino-ext/components/embedding/openai/examples/embedding`

```go
// Chain
chain := compose.NewChain[[]string, [][]float64]()
chain.AppendEmbedding(embedder)

// Graph
graph := compose.NewGraph[[]string, [][]float64]()
graph.AddEmbeddingNode("embedding_node", embedder)
```

## Options and Callbacks

### Options Example

```go
vectors, err := embedder.EmbedStrings(ctx, texts,
    embedding.WithModel("text-embedding-3-small"),
)
```

### Callback Example

> Code: `eino-ext/components/embedding/openai/examples/embedding`

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/compose"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino-ext/components/embedding/openai"
)

handler := &callbacksHelper.EmbeddingCallbackHandler{
    OnStart: func(ctx context.Context, runInfo *callbacks.RunInfo, input *embedding.CallbackInput) context.Context {
       log.Printf("input access, len: %v, content: %s\n", len(input.Texts), input.Texts)
       return ctx
    },
    OnEnd: func(ctx context.Context, runInfo *callbacks.RunInfo, output *embedding.CallbackOutput) context.Context {
       log.Printf("output finished, len: %v\n", len(output.Embeddings))
       return ctx
    },
}

callbackHandler := callbacksHelper.NewHandlerHelper().Embedding(handler).Handler()

chain := compose.NewChain[[]string, [][]float64]()
chain.AppendEmbedding(embedder)
runnable, _ := chain.Compile(ctx)
vectors, _ = runnable.Invoke(ctx, []string{"hello", "how are you"}, compose.WithCallbacks(callbackHandler))
log.Printf("vectors in chain: %v", vectors)
```

## Existing Implementations

1. OpenAI Embedding: [Embedding — OpenAI](/en/docs/eino/ecosystem_integration/embedding/embedding_openai)
2. ARK Embedding: [Embedding — ARK](/en/docs/eino/ecosystem_integration/embedding/embedding_ark)

## Implementation Notes

1. Handle common options
2. Implement callback mechanisms

### Options

```go
type MyEmbeddingOptions struct {
    BatchSize int
    MaxRetries int
    Timeout time.Duration
}

func WithBatchSize(size int) embedding.Option {
    return embedding.WrapEmbeddingImplSpecificOptFn(func(o *MyEmbeddingOptions) { o.BatchSize = size })
}
```

### Callback Structures

```go
type CallbackInput struct {
    Texts []string
    Config *Config
    Extra map[string]any
}

type CallbackOutput struct {
    Embeddings [][]float64
    Config *Config
    TokenUsage *TokenUsage
    Extra map[string]any
}

type TokenUsage struct {
    PromptTokens int
    CompletionTokens int
    TotalTokens int
}
```

### Full Implementation Example

```go
type MyEmbedder struct {
    model string
    batchSize int
}

func NewMyEmbedder(config *MyEmbedderConfig) (*MyEmbedder, error) {
    return &MyEmbedder{
        model: config.DefaultModel,
        batchSize: config.DefaultBatchSize,
    }, nil
}

func (e *MyEmbedder) EmbedStrings(ctx context.Context, texts []string, opts ...embedding.Option) ([][]float64, error) {
    // 1. handle options
    options := &MyEmbeddingOptions{
        Options: &embedding.Options{},
        BatchSize: e.batchSize,
    }
    options.Options = embedding.GetCommonOptions(options.Options, opts...)
    options = embedding.GetImplSpecificOptions(options.Options, opts...)
    
    // 2. get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. before-embed callback
    ctx = cm.OnStart(ctx, info, &embedding.CallbackInput{
        Texts: texts,
        Config: &embedding.Config{
            Model: e.model,
        },
    })
    
    // 4. perform embedding
    vectors, tokenUsage, err := e.doEmbed(ctx, texts, options)
    
    // 5. handle error and finish callback
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &embedding.CallbackOutput{
        Embeddings: vectors,
        Config: &embedding.Config{
            Model: e.model,
        },
        TokenUsage: tokenUsage,
    })
    
    return vectors, nil
}

func (e *MyEmbedder) doEmbed(ctx context.Context, texts []string, opts *MyEmbeddingOptions) ([][]float64, *TokenUsage, error) {
    // implement logic
    return vectors, tokenUsage, nil
}
```

## References

- [Eino: Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Indexer Guide](/en/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever Guide](/en/docs/eino/core_modules/components/retriever_guide)
