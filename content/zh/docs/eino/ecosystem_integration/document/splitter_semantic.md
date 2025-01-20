---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Splitter - semantic
weight: 0
---

## **基本介绍**

语义分割器是 Document Transformer 接口的一个实现，用于基于语义相似度将长文档切分成更小的片段。该组件实现了 [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)。

### **工作原理**

语义分割器通过以下步骤工作：

1. 首先使用基本分隔符（如换行符、句号等）将文档分割成始片段
2. 使用向量嵌入模型为每个片段生成语义向量
3. 计算相邻片段之间的余弦相似度
4. 根据相似度阈值决定是否在两个片段之间进行分割
5. 对小于最小大小的片段进行合并

## **使用方式**

### **组件初始化**

语义分割器通过 `NewSplitter` 函数进行初始化，主要配置参数如下：

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:    embedder,        // 必需：用于生成文本向量的嵌入器
    BufferSize:   2,              // 可选：上下文缓冲区大小
    MinChunkSize: 100,            // 可选：最小片段大小
    Separators:   []string{"\n", ".", "?", "!"}, // 可选：分隔符列表
    Percentile:   0.9,            // 可选：分割阈值百分位数
    LenFunc:      nil,            // 可选：自定义长度计算函数
})
```

配置参数说明：

- `Embedding`：必需参数，用于生成文本向量的嵌入器实例
- `BufferSize`：上下文缓冲区大小，用于在计算语义相似度时包含更多上下文信息
- `MinChunkSize`：最小片段大小，小于此大小的片段会被合并
- `Separators`：用于初始分割的分隔符列表，按顺序使用
- `Percentile`：分割阈值的百分位数，范围 0-1，越大分割越少
- `LenFunc`：自定义文本长度计算函数，默认使用 `len()`

### **完整使用示例**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/semantic"
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化嵌入器（示例使用）
    embedder := &embedding.SomeEmbeddingImpl{} // eg: openai embedding
    
    // 初始化分割器
    splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
        Embedding:    embedder,
        BufferSize:   2,
        MinChunkSize: 100,
        Separators:   []string{"\n", ".", "?", "!"},
        Percentile:   0.9,
    })
    if err != nil {
        panic(err)
    }
    
    // 准备要分割的文档
    docs := []*schema.Document{
        {
            ID: "doc1",
            Content: `这是第一段内容，包含了一些重要信息。
            这是第二段内容，与第一段语义相关。
            这是第三段内容，主题已经改变。
            这是第四段内容，继续讨论新主题。`,
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
    }
}
```

### **高级用法**

自定义长度计算：

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding: embedder,
    LenFunc: func(s string) int {
        // 使用 unicode 字符数而不是字节数
        return len([]rune(s))
    },
})
```

调整分割粒度：

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding:  embedder,
    // 增大百分位数，减少分割点
    Percentile: 0.95,
    // 增大最小片段大小，避免过小的片段
    MinChunkSize: 200,
})
```

优化语义判断：

```go
splitter, err := semantic.NewSplitter(ctx, &semantic.Config{
    Embedding: embedder,
    // 增大缓冲区大小，可包含更多上下文
    BufferSize: 10,
    // 自定义分隔符优先级
    Separators: []string{"\n\n", "\n", "。", "！", "？", "，"},
})
```

## **相关文档**

- [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - recursive](/zh/docs/eino/ecosystem_integration/document/splitter_recursive)
- [Splitter - markdown](/zh/docs/eino/ecosystem_integration/document/splitter_markdown)
