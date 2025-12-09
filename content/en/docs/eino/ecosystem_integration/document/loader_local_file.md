---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - local file
weight: 0
---

## **Overview**

Local file loader is an implementation of the Document Loader interface that loads content from the local filesystem. It follows [Eino: Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide).

### **Features**

- Load documents by file path
- Auto-detect file type and choose a suitable parser (requires ExtParser)
- Preserve file metadata
- Support using filename as document ID

## **Usage**

### **Initialization**

```go
import (
    "github.com/cloudwego/eino/components/document/loader/file"
)

func main() {
    loader, err := file.NewFileLoader(ctx, &FileLoaderConfig{
        UseNameAsID: true,                // whether to use filename as document ID
        Parser:      &parser.TextParser{}, // optional: custom parser
    })
}
```

Parameters:

- `UseNameAsID`: whether to use filename as document ID
- `Parser`: document parser; if not set, default extension parser (ExtParser, currently TextParser) is used

### **Load Documents**

```go
docs, err := loader.Load(ctx, document.Source{ URI: "./path/to/document.txt" })
```

After load, the following metadata is added:

- `_file_name`: filename
- `_extension`: file extension
- `_source`: full file path

Notes:

- Path must point to a file, not a directory
- File must be readable
- If `UseNameAsID` is true: single file uses filename; multiple docs use `filename_index`

### **Complete Example**

```go
package main

import (
    "context"

    file "github.com/cloudwego/eino-ext/components/document/loader/file"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()

    loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{ UseNameAsID: true })
    if err != nil { panic(err) }

    docs, err := loader.Load(ctx, document.Source{ URI: "./documents/sample.txt" })
    if err != nil { panic(err) }

    for _, doc := range docs {
        println(doc.Content)
        fileName := doc.MetaData[file.MetaKeyFileName]
        extension := doc.MetaData[file.MetaKeyExtension]
        source := doc.MetaData[file.MetaKeySource]
    }
}
```

## **References**

- [Eino: Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser Interface Guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
