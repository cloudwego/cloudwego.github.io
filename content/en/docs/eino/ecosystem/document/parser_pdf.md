---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Parser - pdf
weight: 0
---

## **Introduction**

The PDF Document Parser is an implementation of the Document Parser interface used to parse the contents of PDF files into plain text. This component implements the [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide) and is mainly used for the following scenarios:

- When you need to convert PDF documents into a processable plain text format
- When you need to split the contents of a PDF document by page

### **Features**

The PDF parser has the following features:

- Supports basic PDF text extraction
- Optionally splits documents by page
- Automatically handles PDF fonts and encoding
- Supports multi-page PDF documents

Notes:

- May not fully support all PDF formats currently
- Will not retain formatting like spaces and line breaks
- Complex PDF layouts may affect extraction results

## **Usage**

### **Component Initialization**

The PDF parser is initialized using the `NewPDFParser` function, with the main configuration parameters as follows:

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/pdf"
)

func main() {
    parser, err := pdf.NewPDFParser(ctx, &pdf.Config{
        ToPages: true,  // Whether to split the document by page
    })
}
```

Configuration parameters description:

- `ToPages`: Whether to split the PDF into multiple documents by page, default is false

### **Parsing Documents**

Document parsing is done using the `Parse` method:

```go
docs, err := parser.Parse(ctx, reader, opts...)
```

Parsing options:

- Supports setting the document URI using `parser.WithURI`
- Supports adding extra metadata using `parser.WithExtraMeta`

### **Complete Usage Example**

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
    
    // Initialize the parser
    p, err := pdf.NewPDFParser(ctx, &pdf.Config{
        ToPages: false, // Do not split by page
    })
    if err != nil {
        panic(err)
    }
    
    // Open the PDF file
    file, err := os.Open("document.pdf")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    // Parse the document
    docs, err := p.Parse(ctx, file, 
        parser.WithURI("document.pdf"),
        parser.WithExtraMeta(map[string]any{
            "source": "./document.pdf",
        }),
    )
    if err != nil {
        panic(err)
    }
    
    // Use the parsed results
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

#### **Using loader**

Refer to the example in the [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide)

## **Related Documents**

- [Eino: Document Parser guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Parser - html](/en/docs/eino/ecosystem/document/parser_html)
