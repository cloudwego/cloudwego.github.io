---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Parser - pdf
weight: 0
---

## **基本介绍**

PDF 文档解析器是 Document Parser 接口的一个实现，用于将 PDF 文件内容解析为纯文本。该组件实现了 [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)，主要用于以下场景：

- 需要将 PDF 文档转换为可处理的纯文本格式
- 需要按页面分割 PDF 文档内容

### **特性说明**

PDF 解析器具有以下特点：

- 支持基本的 PDF 文本提取
- 可以选择按页面分割文档
- 自动处理 PDF 字体和编码
- 支持多页面 PDF 文档

注意事项：

- 目前可能不能完全支持所有 PDF 格式
- 不会保留空格和换行等格式信息
- 复杂的 PDF 布局可能会影响提取效果

## **使用方式**

### **组件初始化**

PDF 解析器通过 `NewPDFParser` 函数进行初始化，主要配置参数如下：

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/pdf"
)

func main() {
    parser, err := pdf.NewPDFParser(ctx, &pdf.Config{
        ToPages: true,  // 是否按页面分割文档
    })
}
```

配置参数说明：

- `ToPages`：是否将 PDF 按页面分割成多个文档，默认为 false

### **解析文档**

文档解析通过 `Parse` 方法实现：

```go
docs, err := parser.Parse(ctx, reader, opts...)
```

解析选项：

- 支持通过 `parser.WithURI` 设置文档 URI
- 支持通过 `parser.WithExtraMeta` 添加额外元数据

### **完整使用示例**

#### **基本使用**

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
    
    // 初始化解析器
    p, err := pdf.NewPDFParser(ctx, &pdf.Config{
        ToPages: false, // 不按页面分割
    })
    if err != nil {
        panic(err)
    }
    
    // 打开 PDF 文件
    file, err := os.Open("document.pdf")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    // 解析文档
    docs, err := p.Parse(ctx, file, 
        parser.WithURI("document.pdf"),
        parser.WithExtraMeta(map[string]any{
            "source": "./document.pdf",
        }),
    )
    if err != nil {
        panic(err)
    }
    
    // 使用解析结果
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

#### 在 loader 中使用

可参考 [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide) 中的示例

## **相关文档**

- [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
- [Parser - pdf](/zh/docs/eino/ecosystem_integration/document/parser_pdf)
