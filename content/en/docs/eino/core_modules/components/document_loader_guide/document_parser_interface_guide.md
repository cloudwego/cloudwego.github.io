---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Document Parser Interface Guide'
weight: 1
---

## Introduction

`Document Parser` is a toolkit for parsing raw content into standard documents. It is not a standalone component; it’s used inside `Document Loader`. Parsers support:

- Parsing various formats (text, PDF, Markdown, etc.)
- Automatically selecting a parser by file extension (`ExtParser`)
- Adding metadata to parsed documents

## Interfaces

### Parser

> Code: `eino/components/document/parser/interface.go`

```go
import (
    "github.com/cloudwego/eino/schema"
)

type Parser interface {
    Parse(ctx context.Context, reader io.Reader, opts ...Option) ([]*schema.Document, error)
}
```

#### Parse

- Purpose: parse from a `Reader`
- Params:
  - `ctx`: context
  - `reader`: raw content
  - `opts`: parsing options
- Returns:
  - `[]*schema.Document`: parsed documents
  - `error`

### Common Options

```go
type Options struct {
    // URI of the document source
    URI string

    // ExtraMeta merged into each parsed document’s metadata
    ExtraMeta map[string]any
}
```

Provided helpers:

- `WithURI`: set document URI (used by `ExtParser` to select parser)
- `WithExtraMeta`: set additional metadata

## Built-in Parsers

### TextParser

Basic text parser; uses input as content directly.

> Code: `eino-examples/components/document/parser/textparser`

```go
import "github.com/cloudwego/eino/components/document/parser"

textParser := parser.TextParser{}
docs, _ := textParser.Parse(ctx, strings.NewReader("hello world"))
logs.Infof("text content: %v", docs[0].Content)
```

### ExtParser

Selects parsers by file extension; falls back to a default parser.

> Code: `eino-examples/components/document/parser/extparser`

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

    htmlParser, _ := html.NewParser(ctx, &html.Config{ Selector: gptr.Of("body") })
    pdfParser, _ := pdf.NewPDFParser(ctx, &pdf.Config{})

    extParser, _ := parser.NewExtParser(ctx, &parser.ExtParserConfig{
       Parsers: map[string]parser.Parser{ ".html": htmlParser, ".pdf": pdfParser },
       FallbackParser: textParser,
    })

    filePath := "./testdata/test.html"
    file, _ := os.Open(filePath)
    docs, _ := extParser.Parse(ctx, file,
       parser.WithURI(filePath),
       parser.WithExtraMeta(map[string]any{ "source": "local" }),
    )

    for idx, doc := range docs {
       logs.Infof("doc_%v content: %v", idx, doc.Content)
    }
}
```

### Other Implementations

- PDF parser: [Parser — PDF](/en/docs/eino/ecosystem_integration/document/parser_pdf)
- HTML parser: [Parser — HTML](/en/docs/eino/ecosystem_integration/document/parser_html)

## Using Parsers in Document Loader

Parsers are primarily used by `Document Loader` to parse loaded content.

### File Loader Example

> Code: `eino-ext/components/document/loader/file/examples/fileloader`

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

ctx := context.Background()
loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    UseNameAsID: true,
    Parser:      &parser.TextParser{}, // Or parser.NewExtParser()
})

filePath := "../../testdata/test.md"
docs, err := loader.Load(ctx, document.Source{ URI: filePath })
log.Printf("doc content: %v", docs[0].Content)
log.Printf("Extension: %s\n", docs[0].MetaData[file._MetaKeyExtension_])
log.Printf("Source: %s\n", docs[0].MetaData[file._MetaKeySource_])
```

## Custom Parser Implementation

### Options

```go
type options struct {
    Encoding string
    MaxSize  int64
}

func WithEncoding(encoding string) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) { o.Encoding = encoding })
}

func WithMaxSize(size int64) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) { o.MaxSize = size })
}
```

### Example

> Code: `eino-examples/components/document/parser/customparser/custom_parser.go`

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
    commonOpts := parser.GetCommonOptions(&parser.Options{}, opts...)
    _ = commonOpts

    myOpts := &options{
       Encoding: p.defaultEncoding,
       MaxSize:  p.defaultMaxSize,
    }
    myOpts = parser.GetImplSpecificOptions(myOpts, opts...)
    _ = myOpts

    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### Notes

1. Handle common options consistently via the shared abstraction
2. Set and propagate metadata appropriately
