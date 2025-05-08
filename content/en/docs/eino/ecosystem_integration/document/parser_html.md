---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Parser - html
weight: 0
---

## **Basic Introduction**

The HTML Document Parser is an implementation of the Document Parser interface, used to parse the content of HTML web pages into plain text. This component implements the [Eino: Document Parser guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide), mainly used in the following scenarios:

- When plain text content needs to be extracted from web pages
- When metadata of web pages (title, description, etc.) needs to be retrieved

### **Feature Introduction**

The HTML parser has the following features:

- Supports selective extraction of page content with flexible content selector configuration (html selector)
- Automatically extracts web page metadata (metadata)
- Secure HTML parsing

## **Usage**

### **Component Initialization**

The HTML parser is initialized using the `NewParser` function, with the main configuration parameters listed below:

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/html"
)

parser, err := html.NewParser(ctx, &html.Config{
    Selector: &selector, // Optional: content selector, defaults to body
})
```

Configuration parameter description:

- `Selector`: Optional parameter, specifies the content area to extract, using goquery selector syntax
  - For example: `body` indicates extracting the content of the `<body>` tag
  - `#content` indicates extracting the content of the element with id "content"

### **Metadata Description**

The parser will automatically extract the following metadata:

- `html.MetaKeyTitle` ("_title"): Webpage title
- `html.MetaKeyDesc` ("_description"): Webpage description
- `html.MetaKeyLang` ("_language"): Webpage language
- `html.MetaKeyCharset` ("_charset"): Character encoding
- `html.MetaKeySource` ("_source"): Document source URI

### **Complete Usage Example**

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
    
    // Initialize parser
    p, err := html.NewParser(ctx, nil) // Use default configuration
    if (err != nil) {
        panic(err)
    }
    
    // HTML content
    html := `
    <html lang="zh">
        <head>
            <title>Sample Page</title>
            <meta name="description" content="This is a sample page">
            <meta charset="UTF-8">
        </head>
        <body>
            <div id="content">
                <h1>Welcome</h1>
                <p>This is the main content.</p>
            </div>
        </body>
    </html>
    `
    
    // Parse the document
    docs, err := p.Parse(ctx, strings.NewReader(html),
        parser.WithURI("https://example.com"),
        parser.WithExtraMeta(map[string]any{
            "custom": "value",
        }),
    )
    if (err != nil) {
        panic(err)
    }
    
    // Use the parsing results
    doc := docs[0]
    println("Content:", doc.Content)
    println("Title:", doc.MetaData[html.MetaKeyTitle])
    println("Description:", doc.MetaData[html.MetaKeyDesc])
    println("Language:", doc.MetaData[html.MetaKeyLang])
}
```

#### **Using Selector**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/parser/html"
)

func main() {
    ctx := context.Background()
    
    // Specify to only extract the content of the element with id "content"
    selector := "#content"
    p, err := html.NewParser(ctx, &html.Config{
        Selector: &selector,
    })
    if (err != nil) {
        panic(err)
    }
    
    // ... code to parse the document ...
}
```

#### **Using Loader**

Refer to the [Eino: Document Parser guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide) for examples.

## **Related Documents**

- [Eino: Document Parser guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader guide](/docs/eino/core_modules/components/document_loader_guide)
- [Parser - pdf](/docs/eino/ecosystem_integration/document/parser_pdf)
