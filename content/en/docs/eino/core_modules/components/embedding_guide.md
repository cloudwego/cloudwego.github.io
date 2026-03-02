---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Embedding User Guide'
weight: 2
---

## **Introduction**

The Embedding component is a component for converting text into vector representations. Its main purpose is to map text content into vector space, so that semantically similar texts are closer in vector space. This component plays an important role in the following scenarios:

- Text similarity calculation
- Semantic search
- Text clustering analysis

## **Component Definition**

### **Interface Definition**

```go
type Embedder interface {
    EmbedStrings(ctx context.Context, texts []string, opts ...Option) ([][]float64, error)
}
```

#### **EmbedStrings Method**

- Function: Convert a set of texts into vector representations
- Parameters:
  - ctx: Context object for passing request-level information and Callback Manager
  - texts: List of texts to be converted
  - opts: Conversion options for configuring conversion behavior
- Return values:
  - `[][]float64`: List of vector representations for the texts, the dimension of each vector is determined by the specific implementation
  - error: Error information during conversion

### **Common Options**

The Embedding component uses EmbeddingOption to define optional parameters. Below are the abstracted common options. Each specific implementation can define its own specific Options, wrapped into a unified EmbeddingOption type through the WrapEmbeddingImplSpecificOptFn function.

```go
type Options struct {
    // Model is the model name used for generating vectors
    Model *string
}
```

Options can be set in the following ways:

```go
// Set model name
WithModel(model string) Option
```

## **Usage**

### **Standalone Usage**

> Code location: eino-ext/components/embedding/openai/examples/embedding

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

### **Usage in Orchestration**

> Code location: eino-ext/components/embedding/openai/examples/embedding

```go
// Use in Chain
chain := compose.NewChain[[]string, [][]float64]()
chain.AppendEmbedding(embedder)

// Use in Graph
graph := compose.NewGraph[[]string, [][]float64]()
graph.AddEmbeddingNode("embedding_node", embedder)
```

## **Option and Callback Usage**

### **Option Usage Example**

```go
// Using options (standalone component usage example)
vectors, err := embedder.EmbedStrings(ctx, texts,
    embedding.WithModel("text-embedding-3-small"),
)
```

### **Callback Usage Example**

> Code location: eino-ext/components/embedding/openai/examples/embedding

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

// Compile and run
runnable, _ := chain.Compile(ctx)
vectors, _ = runnable.Invoke(ctx, []string{"hello", "how are you"},
    compose.WithCallbacks(callbackHandler))

log.Printf("vectors in chain: %v", vectors)
```

## **Existing Implementations**

1. OpenAI Embedding: Generate vectors using OpenAI's text embedding models [Embedding - OpenAI](/docs/eino/ecosystem_integration/embedding/embedding_openai)
2. ARK Embedding: Generate vectors using ARK platform models [Embedding - ARK](/docs/eino/ecosystem_integration/embedding/embedding_ark)

## **Implementation Reference**

When implementing a custom Embedding component, note the following:

1. Make sure to handle common options
2. Make sure to implement callback mechanism

### **Option Mechanism**

Custom Embedding needs to implement its own Option mechanism:

```go
// Define Option struct
type MyEmbeddingOptions struct {
    BatchSize int
    MaxRetries int
    Timeout time.Duration
}

// Define Option functions
func WithBatchSize(size int) embedding.Option {
    return embedding.WrapEmbeddingImplSpecificOptFn(func(o *MyEmbeddingOptions) {
        o.BatchSize = size
    })
}
```

### **Callback Handling**

Embedder implementations need to trigger callbacks at appropriate times. The framework has defined standard callback input/output structs:

```go
// CallbackInput is the input for embedding callback
type CallbackInput struct {
    // Texts is the list of texts to be converted
    Texts []string
    // Config is the configuration for generating vectors
    Config *Config
    // Extra is additional information for the callback
    Extra map[string]any
}

// CallbackOutput is the output for embedding callback
type CallbackOutput struct {
    // Embeddings is the list of generated vectors
    Embeddings [][]float64
    // Config is the configuration for generating vectors
    Config *Config
    // TokenUsage is the token usage information
    TokenUsage *TokenUsage
    // Extra is additional information for the callback
    Extra map[string]any
}

// TokenUsage is the token usage information
type TokenUsage struct {
    // PromptTokens is the number of tokens in the prompt
    PromptTokens int
    // CompletionTokens is the number of tokens in the completion
    CompletionTokens int
    // TotalTokens is the total number of tokens
    TotalTokens int
}
```

### **Complete Implementation Example**

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
    // 1. Handle options
    options := &MyEmbeddingOptions{
        Options: &embedding.Options{},
        BatchSize: e.batchSize,
    }
    options.Options = embedding.GetCommonOptions(options.Options, opts...)
    options = embedding.GetImplSpecificOptions(options.Options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before generation starts
    ctx = cm.OnStart(ctx, info, &embedding.CallbackInput{
        Texts: texts,
        Config: &embedding.Config{
            Model: e.model,
        },
    })
    
    // 4. Execute vector generation logic
    vectors, tokenUsage, err := e.doEmbed(ctx, texts, options)
    
    // 5. Handle errors and completion callback
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
    // Implement logic
    return vectors, tokenUsage, nil
}
```

## Other Reference Documents

- [Eino: Document Loader User Guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Indexer User Guide](/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever User Guide](/docs/eino/core_modules/components/retriever_guide)
