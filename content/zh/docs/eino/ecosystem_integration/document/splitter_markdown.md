---
Description: ""
date: "2025-01-07"
lastmod: ""
tags: []
title: Splitter - markdown
weight: 0
---

## **基本介绍**

Markdown 分割器是 Document Transformer 接口的一个实现，用于根据 Markdown 文档的标题层级结构进行分割。该组件实现了 [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)。

### **工作原理**

Markdown 标题分割器通过以下步骤工作：

1. 识别文档中的 Markdown 标题（`#`、`##`、`###` 等）
2. 根据标题层级构建文档结构树
3. 将文档按标题分割成独立片段

## **使用方式**

### **组件初始化**

Markdown 标题分割器通过 `NewHeaderSplitter` 函数进行初始化，主要配置参数如下：

```go
splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
    Headers: map[string]string{
        "#":   "h1",              // 一级标题
        "##":  "h2",              // 二级标题
        "###": "h3",              // 三级标题
    },
    TrimHeaders: false,           // 是否在输出中保留标题行
})
```

配置参数说明：

- `Headers`：必需参数，定义标题标记和对应的元数据键名映射
- `TrimHeaders`：是否在输出的内容中移除标题行

### **完整使用示例**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/markdown"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化分割器
    splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
        Headers: map[string]string{
            "#":   "h1",
            "##":  "h2",
            "###": "h3",
        },
        TrimHeaders: false,
    })
    if err != nil {
        panic(err)
    }
    
    // 准备要分割的文档
    docs := []*schema.Document{
        {
            ID: "doc1",
            Content: `# 文档标题

这是介绍部分的内容。

## 第一章

这是第一章的内容。

### 1.1 节

这是 1.1 节的内容。

## 第二章

这是第二章的内容。

\`\`\`
# 这是代码块中的注释，不会被识别为标题
\`\`\`
`,
        },
    }
    
    // 执行分割
    results, err := splitter.Transform(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // 处理分割结果
    for i, doc := range results {
        println("片段", i+1, ":", doc.Content)
        println("标题层级：")
        for k, v := range doc.MetaData {
            if k == "h1" || k == "h2" || k == "h3" {
                println("  ", k, ":", v)
            }
        }
    }
}
```

## **特性说明**

- 支持 ````` 和 `~~~` 风格的代码块
- 自动维护标题的层级关系
  - 新的同级标题会重置下级标题
  - 标题层级信息通过元数据传递

## **相关文档**

- [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - recursive](/zh/docs/eino/ecosystem_integration/document/splitter_recursive)
- [Splitter - semantic](/zh/docs/eino/ecosystem_integration/document/splitter_semantic)
