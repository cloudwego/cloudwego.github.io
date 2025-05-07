---
Description: ""
date: "2025-02-21"
lastmod: ""
tags: []
title: Splitter - markdown
weight: 0
---

## **Introduction**

The Markdown Splitter is an implementation of the Document Transformer interface, used to split a Markdown document based on the document's header hierarchy. This component implements the [Eino: Document Transformer guide](/docs/eino/core_modules/components/document_transformer_guide).

### **Working Principle**

The Markdown Header Splitter works through the following steps:

1. Identify Markdown headers in the document (`#`, `##`, `###`, etc.)
2. Construct a document structure tree based on the header hierarchy
3. Split the document into independent segments based on the headers

## **Usage**

### **Component Initialization**

The Markdown Header Splitter is initialized using the `NewHeaderSplitter` function. The main configuration parameters are as follows:

```go
splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    Headers: map[string]string{
        "#":   "h1",              // Level 1 header
        "##":  "h2",              // Level 2 header
        "###": "h3",              // Level 3 header
    },
    TrimHeaders: false,           // Whether to keep header lines in the output
})
```

Explanation of configuration parameters:

- `Headers`: Required parameter, defines the mapping between header tags and corresponding metadata key names
- `TrimHeaders`: Whether to remove header lines from the output content

### **Full Usage Example**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // Initialize the splitter
    splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
        Headers: map[string]string{
            "#":   "h1",
            "##":  "h2",
            "###": "h3",
        },
        TrimHeaders: false,
    })
    if err != nil {
        panic(err)
    }
    
    // Prepare the document to be split
    docs := []*schema.Document{
        {
            ID: "doc1",
            Content: `# Document Title

This is the content of the introduction section.

## Chapter 1

This is the content of Chapter 1.

### Section 1.1

This is the content of Section 1.1.

## Chapter 2

This is the content of Chapter 2.

\`\`\`
# This is a comment inside a code block and will not be recognized as a header
\`\`\`
`,
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
        println("Header Hierarchy:")
        for k, v := range doc.MetaData {
            if k == "h1" || k == "h2" || k == "h3" {
                println("  ", k, ":", v)
            }
        }
    }
}
```

## **Features**

- Supports both ````` and `~~~` style code blocks
- Automatically maintains the header hierarchy
  - New headers of the same level reset the subheaders
  - Header hierarchy information is passed through metadata

## **Related Documents**

- [Eino: Document Parser guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Transformer guide](/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - recursive](/docs/eino/ecosystem/document/splitter_recursive)
- [Splitter - semantic](/docs/eino/ecosystem/document/splitter_semantic)
