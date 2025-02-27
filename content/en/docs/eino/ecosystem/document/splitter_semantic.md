---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Splitter - semantic
weight: 0
---

## **Introduction**

The semantic segmenter is an implementation of the Document Transformer interface, used to segment long documents into smaller fragments based on semantic similarity. This component is implemented according to the [Eino: Document Transformer guide](/en/docs/eino/core_modules/components/document_transformer_guide).

### **Working Principle**

The semantic segmenter operates through the following steps:

1. First, it uses basic delimiters (such as newline characters, periods, etc.) to split the document into initial segments.
2. It generates semantic vectors for each segment using a vector embedding model.
3. It calculates the cosine similarity between adjacent segments.
4. It decides whether to separate two segments based on a similarity threshold.
5. It merges segments smaller than the minimum size.

## **Usage**

### **Component Initialization**

The semantic splitter initializes through the `NewSplitter` function with the main configuration parameters as follows:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:    embedder,        // Required: Embedding instance used to generate text vectors
    BufferSize:   2,               // Optional: Context buffer size
    MinChunkSize: 100,             // Optional: Minimum chunk size
    Separators:   []string{"\n", ".", "?", "!"}, // Optional: List of separators
    Percentile:   0.9,             // Optional: Percentile for splitting threshold
    LenFunc:      nil,             // Optional: Custom length calculation function
})
```

Explanation of configuration parameters:

- `Embedding`: Required parameter, instance of the embedder used to generate text vectors
- `BufferSize`: Context buffer size to include more context information when calculating semantic similarity
- `MinChunkSize`: Minimum chunk size, chunks smaller than this size will be merged
- `Separators`: List of separators used for initial splitting, used sequentially
- `Percentile`: Percentile of the splitting threshold, range 0-1, the larger it is, the fewer splits there are
- `LenFunc`: Custom text length calculation function, by default uses `len()`

### **Full Usage Example**

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
    
    // Initialize embedder (example usage)
    embedder := &embedding.SomeEmbeddingImpl{} // eg: openai embedding
    
    // Initialize splitter
    splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
        Embedding:    embedder,
        BufferSize:   2,
        MinChunkSize: 100,
        Separators:   []string{"\n", ".", "?", "!"},
        Percentile:   0.9,
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare the document to be split
    docs := []*schema.Document{
        {
            ID: "doc1",
            Content: `This is the first paragraph, containing some important information.
            This is the second paragraph, semantically related to the first.
            This is the third paragraph, the topic has changed.
            This is the fourth paragraph, continuing the new topic.`,
        },
    }
    
    // Execute the split
    results, err := splitter.Transform(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // Process the split results
    for i, doc := range results {
        println("Segment", i+1, ":", doc.Content)
    }
}
```

### **Advanced Usage**

Custom length calculation:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding: embedder,
    LenFunc: func(s string) int {
        // Use the number of unicode characters instead of bytes
        return len([]rune(s))
    },
})
```

Adjust splitting granularity:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:  embedder,
    // Increase percentile to reduce split points
    Percentile: 0.95,
    // Increase minimum chunk size to avoid too small chunks
    MinChunkSize: 200,
})
```

Optimize semantic judgment:

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding: embedder,
    // Increase buffer size to include more context
    BufferSize: 10,
    // Custom separator priority
    Separators: []string{"\n\n", "\n", ".", "!", "?", ","},
})
```

## **Related Documents**

- [Eino: Document Parser guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Transformer guide](/en/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - semantic](/en/docs/eino/ecosystem/document/splitter_semantic)
- [Splitter - markdown](/en/docs/eino/ecosystem/document/splitter_markdown)
