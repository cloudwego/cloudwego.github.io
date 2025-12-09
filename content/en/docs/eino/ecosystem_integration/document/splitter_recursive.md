---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Splitter - recursive
weight: 0
---

## **Overview**

Recursive splitter is an implementation of the Document Transformer interface that recursively splits long documents into smaller chunks by target size. It follows [Eino: Document Transformer Guide](/en/docs/eino/core_modules/components/document_transformer_guide).

### **How It Works**

1. Try splitting the document using separators in order
2. If the current separator cannot produce chunks under the target size, use the next separator
3. Merge split fragments to ensure sizes are close to the target
4. Maintain a specified overlap area during merging

## **Usage**

### **Initialization**

Initialize via `NewSplitter` with configuration:

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize:   1000,                         // required: target chunk size
    OverlapSize: 200,                          // optional: overlap size
    Separators:  []string{"\n\n", "\n", "。", "！", "？"}, // optional: separator list
    LenFunc:     nil,                          // optional: custom length func
    KeepType:    recursive.KeepTypeEnd,        // optional: keep-type strategy
})
```

Parameters:

- `ChunkSize`: required, target chunk size
- `OverlapSize`: overlap between chunks to keep context
- `Separators`: ordered list of separators by priority
- `LenFunc`: custom length function, default `len()`
- `KeepType`: separator keep strategy, values:
  - `KeepTypeNone`: do not keep separators
  - `KeepTypeStart`: keep at the start
  - `KeepTypeEnd`: keep at the end

### **Complete Example**

```go
package main

import (
    "context"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/recursive"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
        ChunkSize:   1000,
        OverlapSize: 200,
        Separators:  []string{"\n\n", "\n", "。", "！", "？"},
        KeepType:    recursive.KeepTypeEnd,
    })
    if err != nil { panic(err) }

    docs := []*schema.Document{{
        ID: "doc1",
        Content: `This is the first paragraph, with some content.

This is the second paragraph. This paragraph has multiple sentences! These sentences are separated by punctuation.

This is the third paragraph. Here is more content.`,
    }}

    results, err := splitter.Transform(ctx, docs)
    if err != nil { panic(err) }

    for i, doc := range results { println("fragment", i+1, ":", doc.Content) }
}
```

### **Advanced Usage**

Custom length function:

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize: 1000,
    LenFunc: func(s string) int {
        // use unicode rune count instead of byte length
        return len([]rune(s))
    },
})
```

Adjust overlap strategy:

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize:   1000,
    OverlapSize: 300,                     // larger overlap to keep more context
    KeepType:    recursive.KeepTypeEnd,   // keep separator at end of fragments
})
```

Custom separators:

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize: 1000,
    Separators: []string{
        "\n\n", // blank line (paragraph)
        "\n",   // newline
        "。",    // period
    },
})
```

## **References**

- [Eino: Document Transformer Guide](/en/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - markdown](/en/docs/eino/ecosystem_integration/document/splitter_markdown)
- [Splitter - semantic](/en/docs/eino/ecosystem_integration/document/splitter_semantic)
