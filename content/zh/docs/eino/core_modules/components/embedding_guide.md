---
Description: ""
date: "2025-02-10"
lastmod: ""
tags: []
title: 'Eino: Embedding 使用说明'
weight: 7
---

## **基本介绍**

Embedding 组件是一个用于将文本转换为向量表示的组件。它的主要作用是将文本内容映射到向量空间，使得语义相似的文本在向量空间中的距离较近。这个组件在以下场景中发挥重要作用：

- 文本相似度计算
- 语义搜索
- 文本聚类分析

## **组件定义**

### **接口定义**

```go
type Embedder interface {
    EmbedStrings(ctx context.Context, texts []string, opts ...Option) ([][]float64, error)
}
```

#### **EmbedStrings 方法**

- 功能：将一组文本转换为向量表示
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - texts：待转换的文本列表
  - opts：转换选项，用于配置转换行为
- 返回值：
  - `[][]float64`：文本对应的向量表示列表，每个向量的维度由具体的实现决定
  - error：转换过程中的错误信息

### **公共 Option**

Embedding 组件使用 EmbeddingOption 来定义可选参数，下方是抽象出的公共 option。每个具体的实现可以定义自己的特定 Option，通过 WrapEmbeddingImplSpecificOptFn 函数包装成统一的 EmbeddingOption 类型。

```go
type Options struct {
    // Model 是用于生成向量的模型名称
    Model *string
}
```

可以通过以下方式设置选项：

```go
// 设置模型名称
WithModel(model string) Option
```

## **使用方式**

### **单独使用**

> 代码位置：eino-ext/components/embedding/openai/examples/embedding

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

### **在编排中使用**

> 代码位置：eino-ext/components/embedding/openai/examples/embedding

```go
// 在 Chain 中使用
chain := compose.NewChain[[]string, [][]float64]()
chain.AppendEmbedding(embedder)

// 在 Graph 中使用
graph := compose.NewGraph[[]string, [][]float64]()
graph.AddEmbeddingNode("embedding_node", embedder)
```

## **Option 和 Callback 使用**

### **Option 使用示例**

```go
// 使用选项 (以独立使用组件为例)
vectors, err := embedder.EmbedStrings(ctx, texts,
    embedding.WithModel("text-embedding-3-small"),
)
```

### **Callback 使用示例**

> 代码位置：eino-ext/components/embedding/openai/examples/embedding

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

// 编译并运行
runnable, _ := chain.Compile(ctx)
vectors, _ = runnable.Invoke(ctx, []string{"hello", "how are you"},
    compose.WithCallbacks(callbackHandler))

log.Printf("vectors in chain: %v", vectors)
```

## **已有实现**

1. OpenAI Embedding: 使用 OpenAI 的文本嵌入模型生成向量 [Embedding - OpenAI](/zh/docs/eino/ecosystem_integration/embedding/embedding_openai)
2. ARK Embedding: 使用 ARK 平台的模型生成向量 [Embedding - ARK](/zh/docs/eino/ecosystem_integration/embedding/embedding_ark)

## **自行实现参考**

实现自定义的 Embedding 组件时，需要注意以下几点：

1. 注意处理公共 option
2. 注意实现 callback 机制

### **Option 机制**

自定义 Embedding 需要实现自己的 Option 机制：

```go
// 定义 Option 结构体
type MyEmbeddingOptions struct {
    BatchSize int
    MaxRetries int
    Timeout time.Duration
}

// 定义 Option 函数
func WithBatchSize(size int) embedding.Option {
    return embedding.WrapEmbeddingImplSpecificOptFn(func(o *MyEmbeddingOptions) {
        o.BatchSize = size
    })
}
```

### **Callback 处理**

Embedder 实现需要在适当的时机触发回调。框架已经定义了标准的回调输入输出结构体：

```go
// CallbackInput 是 embedding 回调的输入
type CallbackInput struct {
    // Texts 是待转换的文本列表
    Texts []string
    // Config 是生成向量的配置信息
    Config *Config
    // Extra 是回调的额外信息
    Extra map[string]any
}

// CallbackOutput 是 embedding 回调的输出
type CallbackOutput struct {
    // Embeddings 是生成的向量列表
    Embeddings [][]float64
    // Config 是生成向量的配置信息
    Config *Config
    // TokenUsage 是 token 使用情况
    TokenUsage *TokenUsage
    // Extra 是回调的额外信息
    Extra map[string]any
}

// TokenUsage 是 token 使用情况
type TokenUsage struct {
    // PromptTokens 是提示词的 token 数量
    PromptTokens int
    // CompletionTokens 是补全的 token 数量
    CompletionTokens int
    // TotalTokens 是总的 token 数量
    TotalTokens int
}
```

### **完整实现示例**

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
    // 1. 处理选项
    options := &MyEmbeddingOptions{
        Options: &embedding.Options{},
        BatchSize: e.batchSize,
    }
    options.Options = embedding.GetCommonOptions(options.Options, opts...)
    options = embedding.GetImplSpecificOptions(options.Options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始生成前的回调
    ctx = cm.OnStart(ctx, info, &embedding.CallbackInput{
        Texts: texts,
        Config: &embedding.Config{
            Model: e.model,
        },
    })
    
    // 4. 执行向量生成逻辑
    vectors, tokenUsage, err := e.doEmbed(ctx, texts, options)
    
    // 5. 处理错误和完成回调
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
    // 实现逻辑
    return vectors, tokenUsage, nil
}
```

## 其他参考文档

- [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
