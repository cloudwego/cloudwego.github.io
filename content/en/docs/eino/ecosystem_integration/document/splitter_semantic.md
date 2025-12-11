---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Splitter - semantic
weight: 0
---

## **Overview**

Semantic splitter is an implementation of the Document Transformer interface that splits long documents based on semantic similarity. It follows [Eino: Document Transformer Guide](/docs/eino/core_modules/components/document_transformer_guide).

### **How It Works**

1. First split the document into initial fragments using basic separators (newline, period, etc.)
2. Generate an embedding vector for each fragment
3. Compute cosine similarity between adjacent fragments
4. Decide split points by a similarity threshold percentile
5. Merge fragments smaller than the minimum size

## **Usage**

### **Initialization**

Initialize via `NewSplitter` with configuration:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:    embedder,                        // required: embedder to generate vectors
    BufferSize:   2,                               // optional: context buffer size
    MinChunkSize: 100,                             // optional: minimum chunk size
    Separators:   []string{"\n", ".", "?", "!"}, // optional: separator list
    Percentile:   0.9,                             // optional: split threshold percentile
    LenFunc:      nil,                             // optional: custom length func
})
```

Parameters:

- `Embedding`: required embedder instance
- `BufferSize`: include more context for similarity computation
- `MinChunkSize`: merge fragments smaller than this size
- `Separators`: ordered list used for initial split
- `Percentile`: 0–1; higher means fewer splits
- `LenFunc`: custom length function, default `len()`

### **Complete Example**

```go
package main

import (
    "context"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/semantic"
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    embedder := &embedding.SomeEmbeddingImpl{} // eg: openai embedding

    splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
        Embedding:    embedder,
        BufferSize:   2,
        MinChunkSize: 100,
        Separators:   []string{"\n", ".", "?", "!"},
        Percentile:   0.9,
    })
    if err != nil { panic(err) }

    docs := []*schema.Document{{
        ID: "doc1",
        Content: `This is the first paragraph with important info.
This is the second paragraph, semantically related to the first.
This is the third paragraph, the topic has changed.
This is the fourth paragraph, continuing the new topic.`,
    }}

    results, err := splitter.Transform(ctx, docs)
    if err != nil { panic(err) }
    for i, doc := range results { println("fragment", i+1, ":", doc.Content) }
}
```

### **Advanced Usage**

Custom length function:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding: embedder,
    LenFunc: func(s string) int { return len([]rune(s)) }, // unicode length
})
```

Adjust granularity:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:    embedder,
    Percentile:   0.95,  // fewer split points
    MinChunkSize: 200,    // avoid too-small fragments
})
```

Optimize semantic judgment:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:  embedder,
    BufferSize: 10,                              // more context
    Separators: []string{"\n\n", "\n", "。", "！", "？", "，"}, // custom priority
})
```

## **References**

- [Eino: Document Transformer Guide](/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - recursive](/docs/eino/ecosystem_integration/document/splitter_recursive)
- [Splitter - markdown](/docs/eino/ecosystem_integration/document/splitter_markdown)
