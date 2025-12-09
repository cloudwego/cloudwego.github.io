---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Parser - html
weight: 0
---

## **Overview**

The HTML document parser is an implementation of the Document Parser interface that parses HTML page content into plain text. It follows [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide) and is used for:

- extracting plain text from web pages
- retrieving page metadata (title, description, etc.)

### **Features**

HTML parser provides:

- selective content extraction with flexible selectors (html selector)
- automatic metadata extraction
- safe HTML parsing

## **Usage**

### **Initialization**

Initialize via `NewParser` with configuration:

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/html"
)

parser, err := html.NewParser(ctx, &html.Config{
    Selector: &selector, // optional: content selector, defaults to body
})
```

Config:

- `Selector`: optional, the region to extract using goquery selector syntax
  - e.g., `body` extracts `<body>` content
  - `#content` extracts the element with id "content"

### **Metadata Keys**

Parser auto‑extracts:

- `html.MetaKeyTitle` ("_title"): page title
- `html.MetaKeyDesc` ("_description"): page description
- `html.MetaKeyLang` ("_language"): page language
- `html.MetaKeyCharset` ("_charset"): charset
- `html.MetaKeySource` ("_source"): document source URI

### **Complete Example**

#### **Basic Usage**

```go
package main

import (
    "context"
    "strings"

    "github.com/cloudwego/eino-ext/components/document/parser/html"
    "github.com/cloudwego/eino/components/document/parser"
)

func main() {
    ctx := context.Background()

    // init parser
    p, err := html.NewParser(ctx, nil) // default config
    if err != nil {
        panic(err)
    }

    // HTML content
    htmlContent := `
    <html lang="en">
        <head>
            <title>Sample Page</title>
            <meta name="description" content="This is a sample page">
            <meta charset="UTF-8">
        </head>
        <body>
            <div id="content">
                <h1>Welcome</h1>
                <p>Main body.</p>
            </div>
        </body>
    </html>
    `

    // parse
    docs, err := p.Parse(ctx, strings.NewReader(htmlContent),
        parser.WithURI("https://example.com"),
        parser.WithExtraMeta(map[string]any{
            "custom": "value",
        }),
    )
    if err != nil {
        panic(err)
    }

    doc := docs[0]
    println("content:", doc.Content)
    println("title:", doc.MetaData[html.MetaKeyTitle])
    println("desc:", doc.MetaData[html.MetaKeyDesc])
    println("lang:", doc.MetaData[html.MetaKeyLang])
}
```

#### **Using Selectors**

```go
package main

import (
    "context"

    "github.com/cloudwego/eino-ext/components/document/parser/html"
)

func main() {
    ctx := context.Background()

    // only extract element with id content
    selector := "#content"
    p, err := html.NewParser(ctx, &html.Config{ Selector: &selector })
    if err != nil {
        panic(err)
    }

    // ... parsing code ...
}
```

#### In loader

See examples in [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)

## **References**

- [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Parser - pdf](/en/docs/eino/ecosystem_integration/document/parser_pdf)
