---
Description: ""
date: "2025-01-07"
lastmod: ""
tags: []
title: Splitter - markdown
weight: 0
---

## **Overview**

Markdown splitter is an implementation of the Document Transformer interface that splits by Markdown heading levels. It follows [Eino: Document Transformer Guide](/en/docs/eino/core_modules/components/document_transformer_guide).

### **How It Works**

1. Detect Markdown headings (`#`, `##`, `###`, etc.)
2. Build a document structure tree by levels
3. Split the document into fragments by headings

## **Usage**

### **Initialization**

Initialize via `NewHeaderSplitter` with configuration:

```go
splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    Headers: map[string]string{
        "#":   "h1", // H1
        "##":  "h2", // H2
        "###": "h3", // H3
    },
    TrimHeaders: false, // keep heading lines in output
})
```

Parameters:

- `Headers`: required, map heading tokens to metadata keys
- `TrimHeaders`: whether to remove heading lines in output

### **Complete Example**

```go
package main

import (
    "context"

    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    // Initialize splitter
    splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
        Headers: map[string]string{ "#": "h1", "##": "h2", "###": "h3" },
        TrimHeaders: false,
    })
    if err != nil { panic(err) }

    // Prepare documents to split
    docs := []*schema.Document{{
        ID: "doc1",
        Content: `# Document Title

Intro section.

## Chapter One

Chapter one content.

### Section 1.1

Section 1.1 content.

## Chapter Two

Chapter two content.

\`\`\`
# This is a comment in a code block and will not be detected as a heading
\`\`\`
`,
    }}

    // Execute splitting
    results, err := splitter.Transform(ctx, docs)
    if err != nil { panic(err) }

    // Process split results
    for i, doc := range results {
        println("fragment", i+1, ":", doc.Content)
        println("heading levels:")
        for k, v := range doc.MetaData {
            if k == "h1" || k == "h2" || k == "h3" { println("  ", k, ":", v) }
        }
    }
}
```

## **Features**

- Supports fenced code blocks ``` and ~~~
- Automatically maintains heading hierarchy
  - New peer headings reset lower-level headings
  - Heading level info is passed via metadata

## **References**

- [Eino: Document Transformer Guide](/en/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - recursive](/en/docs/eino/ecosystem_integration/document/splitter_recursive)
- [Splitter - semantic](/en/docs/eino/ecosystem_integration/document/splitter_semantic)
