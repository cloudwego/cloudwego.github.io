---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Parser - pdf
weight: 0
---

## **Overview**

The PDF document parser is an implementation of the Document Parser interface that parses PDF file content into plain text. It follows [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide) and is used for:

- converting PDF documents into plain text
- splitting PDF content by pages

### **Features**

PDF parser provides:

- basic text extraction
- optional page‑based splitting
- automatic handling of fonts and encodings
- support for multi‑page PDFs

Notes:

- may not fully support all PDF formats
- does not preserve whitespace/newline formatting
- complex layouts may affect extraction quality

## **Usage**

### **Initialization**

Initialize via `NewPDFParser` with configuration:

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/pdf"
)

func main() {
    parser, err := pdf.NewPDFParser(ctx, &pdf.Config{
        ToPages: true,  // split by pages
    })
}
```

Config:

- `ToPages`: whether to split the PDF into multiple documents by pages, default false

### **Parse Documents**

```go
docs, err := parser.Parse(ctx, reader, opts...)
```

Options:

- `parser.WithURI` to set document URI
- `parser.WithExtraMeta` to add extra metadata

### **Complete Example**

#### **Basic Usage**

```go
package main

import (
    "context"
    "os"

    "github.com/cloudwego/eino-ext/components/document/parser/pdf"
    "github.com/cloudwego/eino/components/document/parser"
)

func main() {
    ctx := context.Background()

    // init parser
    p, err := pdf.NewPDFParser(ctx, &pdf.Config{ ToPages: false })
    if err != nil {
        panic(err)
    }

    // open file
    file, err := os.Open("document.pdf")
    if err != nil {
        panic(err)
    }
    defer file.Close()

    // parse
    docs, err := p.Parse(ctx, file,
        parser.WithURI("document.pdf"),
        parser.WithExtraMeta(map[string]any{ "source": "./document.pdf" }),
    )
    if err != nil {
        panic(err)
    }

    for _, doc := range docs {
        println(doc.Content)
    }
}
```

#### In loader

See examples in [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)

## **References**

- [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide)
