---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Loader - local file
weight: 0
---

## **Introduction**

The local file loader is an implementation of the Document Loader interface used for loading document content from the local file system. This component implements the [Eino: Document Loader guide](/docs/eino/core_modules/components/document_loader_guide).

### **Features**

The local file loader has the following features:

- Supports loading documents directly through file paths
- Automatically detects file types and selects the appropriate parser (ExtParser must be set)
- Retains the metadata information of the files
- Supports using the file name as the document ID

## **Usage**

### **Component Initialization**

The local file loader is initialized via the `NewFileLoader` function, with the main configuration parameters as follows:

```go
import (
    "github.com/cloudwego/eino/components/document/loader/file"
)

func main() {
    loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
        UseNameAsID: true,                // Whether to use the file name as the document ID
        Parser:      &parser.TextParser{}, // Optional: specify a custom parser
    })
}
```

Configuration parameters explanation:

- `UseNameAsID`: Whether to use the file name as the document ID
- `Parser`: Document parser; if not specified, the default extension parser (ExtParser, currently only implemented TextParser) is used

### **Loading Documents**

Documents are loaded via the `Load` method:

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "./path/to/document.txt",
})
```

After loading, the following metadata will be automatically added to the documents:

- `_file_name`: File name
- `_extension`: File extension
- `_source`: Full file path

Notes:

- The path must point to a file, not a directory
- The file must be readable
- If `UseNameAsID` is true, the file name is used as the ID for a single file; for multiple documents, `fileName_index` is used as the ID

### **Full Example Usage**

#### **Standalone Usage**

```go
package main

import (
    "context"
    
    file "github.com/cloudwego/eino-ext/components/document/loader/file"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()
    
    // Initialize the loader
    loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
        UseNameAsID: true,
    })
    if err != nil {
        panic(err)
    }
    
    // Load document
    docs, err := loader.Load(ctx, document.Source{
        URI: "./documents/sample.txt",
    })
    if err != nil {
        panic(err)
    }
    
    // Use document content
    for _, doc := range docs {
        println(doc.Content)
        // Access metadata
        fileName := doc.MetaData[file.MetaKeyFileName]
        extension := doc.MetaData[file.MetaKeyExtension]
        source := doc.MetaData[file.MetaKeySource]
    }
}
```

## **Related Documentation**

- [Eino: Document Loader guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
