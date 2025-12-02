---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Parser - html
weight: 0
---

## **基本介绍**

HTML 文档解析器是 Document Parser 接口的一个实现，用于将 HTML 网页内容解析为纯文本。该组件实现了 [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)，主要用于以下场景：

- 需要从网页中提取纯文本内容
- 需要获取网页的元数据（标题、描述等）

### **特性介绍**

HTML 解析器具有以下特点：

- 支持选择性提取页面内容，灵活的内容选择器配置 (html selector)
- 自动提取网页元数据 (metadata)
- 安全的 HTML 解析

## **使用方式**

### **组件初始化**

HTML 解析器通过 `NewParser` 函数进行初始化，主要配置参数如下：

```go
import (
  "github.com/cloudwego/eino-ext/components/document/parser/html"
)

parser, err := html.NewParser(ctx, &html.Config{
    Selector: &selector, // 可选：内容选择器，默认为 body
})
```

配置参数说明：

- `Selector`：可选参数，指定要提取的内容区域，使用 goquery 选择器语法
  - 例如：`body` 表示提取 `<body>` 标签内容
  - `#content` 表示提取 id 为 "content" 的元素内容

### **元数据说明**

解析器会自动提取以下 metadata：

- `html.MetaKeyTitle` ("_title")：网页标题
- `html.MetaKeyDesc` ("_description")：网页描述
- `html.MetaKeyLang` ("_language")：网页语言
- `html.MetaKeyCharset` ("_charset")：字符编码
- `html.MetaKeySource` ("_source")：文档来源 URI

### **完整使用示例**

#### **基本使用**

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
    
    // 初始化解析器
    p, err := html.NewParser(ctx, nil) // 使用默认配置
    if err != nil {
        panic(err)
    }
    
    // HTML 内容
    html := `
    <html lang="zh">
        <head>
            <title>示例页面</title>
            <meta name="description" content="这是一个示例页面">
            <meta charset="UTF-8">
        </head>
        <body>
            <div id="content">
                <h1>欢迎</h1>
                <p>这是正文内容。</p>
            </div>
        </body>
    </html>
    `
    
    // 解析文档
    docs, err := p.Parse(ctx, strings.NewReader(html),
        parser.WithURI("https://example.com"),
        parser.WithExtraMeta(map[string]any{
            "custom": "value",
        }),
    )
    if err != nil {
        panic(err)
    }
    
    // 使用解析结果
    doc := docs[0]
    println("内容:", doc.Content)
    println("标题:", doc.MetaData[html.MetaKeyTitle])
    println("描述:", doc.MetaData[html.MetaKeyDesc])
    println("语言:", doc.MetaData[html.MetaKeyLang])
}
```

#### **使用选择器**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/parser/html"
)

func main() {
    ctx := context.Background()
    
    // 指定只提取 id 为 content 的元素内容
    selector := "#content"
    p, err := html.NewParser(ctx, &html.Config{
        Selector: &selector,
    })
    if err != nil {
        panic(err)
    }
    
    // ... 解析文档的代码 ...
}
```

#### 在 loader 中使用

可参考 [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide) 中的示例

## **相关文档**

- [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
- [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
- [Parser - pdf](/zh/docs/eino/ecosystem_integration/document/parser_pdf)
