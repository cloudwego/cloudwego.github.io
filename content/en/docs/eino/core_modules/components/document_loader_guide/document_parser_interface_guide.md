---
Description: ""
date: "2025-04-21"
lastmod: ""
tags: []
title: 'Eino: Document Parser guide'
weight: 0
---

## **Basic Introduction**

Document Parser is a toolkit for parsing document content. It is not a standalone component but an internal tool used by Document Loader to parse raw content of various formats into standard document formats. The Parser supports:

- Parsing document content of different formats (such as text, PDF, Markdown, etc.)
- Automatically selecting the appropriate parser based on the file extension (e.g., ExtParser)
- Adding metadata information to the parsed documents

## **Interface Definition**

### **Parser Interface**

> Code Location: eino/components/document/parser/interface.go

```go
import (
    "github.com/cloudwego/eino/schema"
)

// Parser is a document parser, can be used to parse a document from a reader.
type Parser interface {
    Parse(ctx context.Context, reader io.Reader, opts ...Option) ([]*schema.Document, error)
}
```

#### **Parse Method**

- Function: Parses the document content from a Reader
- Parameters:
  - ctx: Context object
  - reader: Reader providing the raw content
  - opts: Parsing options
- Return Values:
  - `[]*schema.Document`: List of parsed documents
  - error: Errors encountered during parsing

### **Common Option Definitions**

```go
type Options struct {
    // URI indicates the source of the document
    URI string

    // ExtraMeta will be merged into each parsed document's metadata
    ExtraMeta map[string]any
}
```

Two basic option functions are provided:

- WithURI: Sets the URI of the document, used in ExtParser to select the parser
- WithExtraMeta: Sets additional metadata

## **Built-in Parsers**

### **TextPars****er**

The most basic text parser, which directly uses the input content as document content:

> Code Location: eino-examples/components/document/parser/textparser

```go
import "github.com/cloudwego/eino/components/document/parser"

textParser := parser.TextParser{}
docs, _ := textParser.Parse(ctx, strings.NewReader("hello world"))

logs.Infof("text content: %v", docs[0].Content)
```

### **ExtParser**

File extension-based parser, which can automatically choose the appropriate parser based on the file extension:

> Code Location: eino-examples/components/document/parser/extparser

```go
package main

import (
    "context"
    "os"

    "github.com/cloudwego/eino-ext/components/document/parser/html"
    "github.com/cloudwego/eino-ext/components/document/parser/pdf"
    "github.com/cloudwego/eino/components/document/parser"

    "github.com/cloudwego/eino-examples/internal/gptr"
    "github.com/cloudwego/eino-examples/internal/logs"
)

func main() {
    ctx := context.Background()

    textParser := parser.TextParser{}

    htmlParser, _ := html.NewParser(ctx, &html.Config{
       Selector: gptr.Of("body"),
    })

    pdfParser, _ := pdf.NewPDFParser(ctx, &pdf.Config{})

    // Create extension parser
    extParser, _ := parser.NewExtParser(ctx, &parser.ExtParserConfig{
       // Register parsers for specific extensions
       Parsers: map[string]parser.Parser{
          ".html": htmlParser,
          ".pdf":  pdfParser,
       },
       // Set default parser for handling unknown formats
       FallbackParser: textParser,
    })

    // Use the parser
    filePath := "./testdata/test.html"
    file, _ := os.Open(filePath)
    
    docs, _ := extParser.Parse(ctx, file,
       // Must provide URI for ExtParser to choose the correct parser
       parser.WithURI(filePath),
       parser.WithExtraMeta(map[string]any{
          "source": "local",
       }),
    )

    for idx, doc := range docs {
       logs.Infof("doc_%v content: %v", idx, doc.Content)
    }
}
```

### **Other Implementations**

- pdf parser, used for extracting and parsing PDF formatted files: [Parser - pdf](/docs/eino/ecosystem/document/parser_pdf)
- html parser, used for extracting and parsing HTML formatted content: [Parser - html](/docs/eino/ecosystem/document/parser_html)

## **Using ****Document Loader**

The parser is mainly used in the Document Loader to parse the loaded document content. Here are some typical usage scenarios:

### **File Loader**

> Code Location: eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// Use FileLoader to load local files
ctx := context.Background()

log.Printf("===== call File Loader directly =====")
// Initialize the loader (using file loader as an example)
loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    // Configuration parameters
    UseNameAsID: true,
    Parser:      &parser.TextParser{}, // use TextParser as default parser
})
if err != nil {
    log.Fatalf("file.NewFileLoader failed, err=%v", err)
}

// Load the document
filePath := "../../testdata/test.md"
docs, err := loader.Load(ctx, document.Source{
    URI: filePath,
})
if err != nil {
    log.Fatalf("loader.Load failed, err=%v", err)
}

log.Printf("doc content: %v", docs[0].Content)
log.Printf("Extension: %s\n", docs[0].MetaData[file._MetaKeyExtension_]) // Output: Extension: .txt
log.Printf("Source: %s\n", docs[0].MetaData[file._MetaKeySource_])       // Output: Source: ./document.txt
```

## **Custom Parser Implementation**

### **option Mechanism**

Custom parsers can define their own options:

```go
// options
// Customize the option structure independently
type options struct {
    Encoding string
    MaxSize  int64
}

// WithEncoding
// Customize the Option method independently
func WithEncoding(encoding string) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) {
       o.Encoding = encoding
    })
}

func WithMaxSize(size int64) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) {
       o.MaxSize = size
    })
}
```

### **Complete Implementation Example**

> Code Location: eino-examples/components/document/parser/customparser/custom_parser.go

```go
import (
    "github.com/cloudwego/eino/components/document/parser"
    "github.com/cloudwego/eino/schema"
)

type Config struct {
    DefaultEncoding string
    DefaultMaxSize  int64
}

type CustomParser struct {
    defaultEncoding string
    defaultMaxSize  int64
}

func NewCustomParser(config *Config) (*CustomParser, error) {
    return &CustomParser{
       defaultEncoding: config.DefaultEncoding,
       defaultMaxSize:  config.DefaultMaxSize,
    }, nil
}

func (p *CustomParser) Parse(ctx context.Context, reader io.Reader, opts ...parser.Option) ([]*schema.Document, error) {
    // 1. Handle common options
    commonOpts := parser.GetCommonOptions(&parser.Options{}, opts...)
    _ = commonOpts

    // 2. Handle specific options
    myOpts := &options{
       Encoding: p.defaultEncoding,
       MaxSize:  p.defaultMaxSize,
    }
    myOpts = parser.GetImplSpecificOptions(myOpts, opts...)
    _ = myOpts
    // 3. Implement parsing logic

    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### **Notes**

1. Pay attention to handling abstract common options
2. Pay attention to the setting and passing of metadata
