---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - local file
weight: 0
---

## **基本介绍**

local file 文件加载器是 Document Loader 接口的一个实现，用于从本地文件系统中加载文档内容。该组件实现了 [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)。

### **特性介绍**

本地文件加载器具有以下特点：

- 支持通过文件路径直接加载文档
- 自动识别文件类型并选择合适的解析器 (需设置 ExtParser)
- 保留文件的元数据信息
- 支持将文件名作为文档 ID

## **使用方式**

### **组件初始化**

本地文件加载器通过 `NewFileLoader` 函数进行初始化，主要配置参数如下：

```go
import (
    "github.com/cloudwego/eino/components/document/loader/file"
)

func main() {
    loader, err := file.NewFileLoader(ctx, &FileLoaderConfig{
        UseNameAsID: true,                // 是否使用文件名作为文档ID
        Parser:      &parser.TextParser{}, // 可选：指定自定义解析器
    })
}
```

配置参数说明：

- `UseNameAsID`：是否将文件名用作文档 ID
- `Parser`：文档解析器，如果不指定则使用默认的扩展名解析器（ExtParser，当前仅实现了 TextParser）

### **加载文档**

文档加载通过 `Load` 方法实现：

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "./path/to/document.txt",
})
```

文档加载后会自动添加以下元数据：

- `_file_name`：文件名
- `_extension`：文件扩展名
- `_source`：文件的完整路径

注意事项：

- 路径必须指向一个文件，不能是目录
- 文件必须可读
- 如果 `UseNameAsID` 为 true，单文件时使用文件名作为 ID，多文档时使用 `文件名_序号` 作为 ID

### **完整使用示例**

#### **单独使用**

```go
package main

import (
    "context"
    
    file "github.com/cloudwego/eino-ext/components/document/loader/file"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()
    
    // 初始化加载器
    loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
        UseNameAsID: true,
    })
    if err != nil {
        panic(err)
    }
    
    // 加载文档
    docs, err := loader.Load(ctx, document.Source{
        URI: "./documents/sample.txt",
    })
    if err != nil {
        panic(err)
    }
    
    // 使用文档内容
    for _, doc := range docs {
        println(doc.Content)
        // 访问元数据
        fileName := doc.MetaData[file.MetaKeyFileName]
        extension := doc.MetaData[file.MetaKeyExtension]
        source := doc.MetaData[file.MetaKeySource]
    }
}
```

## **相关文档**

- [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
