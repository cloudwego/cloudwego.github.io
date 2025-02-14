---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Splitter - recursive
weight: 0
---

## **基本介绍**

递归分割器是 Document Transformer 接口的一个实现，用于将长文档按照指定大小递归地切分成更小的片段。该组件实现了 [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)。

### **工作原理**

递归分割器通过以下步骤工作：

1. 按照分隔符列表顺序尝试分割文档
2. 如果当前分隔符无法将文档分割成小于目标大小的片段，则使用下一个分隔符
3. 对分割后的片段进行合并，确保片段大小接近目标大小
4. 在合并过程中保持指定大小的重叠区域

## **使用方式**

### **组件初始化**

递归分割器通过 `NewSplitter` 函数进行初始化，主要配置参数如下：

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize:    1000,           // 必需：目标片段大小
    OverlapSize:  200,            // 可选：片段重叠大小
    Separators:   []string{"\n", ".", "?", "!"}, // 可选：分隔符列表
    LenFunc:      nil,            // 可选：自定义长度计算函数
    KeepType:     recursive.KeepTypeNone, // 可选：分隔符保留策略
})
```

配置参数说明：

- `ChunkSize`：必需参数，指定目标片段的大小
- `OverlapSize`：片段之间的重叠大小，用于保持上下文连贯性
- `Separators`：分隔符列表，按优先级顺序使用
- `LenFunc`：自定义文本长度计算函数，默认使用 `len()`
- `KeepType`：分隔符保留策略，可选值：
  - `KeepTypeNone`：不保留分隔符
  - `KeepTypeStart`：在片段开始处保留分隔符
  - `KeepTypeEnd`：在片段结尾处保留分隔符

### **完整使用示例**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/transformer/splitter/recursive"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化分割器
    splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
        ChunkSize:   1000,
        OverlapSize: 200,
        Separators:  []string{"\n\n", "\n", "。", "！", "？"},
        KeepType:    recursive.KeepTypeEnd,
    })
    if err != nil {
        panic(err)
    }
    
    // 准备要分割的文档
    docs := []*schema.Document{
        {
            ID: "doc1",
            Content: `这是第一个段落，包含了一些内容。
            
            这是第二个段落。这个段落有多个句子！这些句子通过标点符号分隔。
            
            这是第三个段落。这里有更多的内容。`,
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
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize: 1000,
    LenFunc: func(s string) int {
        // eg: 使用 unicode 字符数而不是字节数
        return len([]rune(s))
    },
})
```

调整重叠策略：

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize:   1000,
    // 增大重叠区域以保持更多上下文
    OverlapSize: 300,
    // 在片段结尾保留分隔符
    KeepType:    recursive.KeepTypeEnd,
})
```

自定义分隔符：

```go
splitter, err := recursive.NewSplitter(ctx, &recursive.Config{
    ChunkSize: 1000,
    // 按优先级排序的分隔符列表
    Separators: []string{
        "\n\n",     // 空行（段落分隔）
        "\n",       // 换行
        "。",       // 句号
    },
})
```

## **相关文档**

- [Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)
- [Splitter - markdown](/zh/docs/eino/ecosystem_integration/document/splitter_markdown)
- [Splitter - semantic](/zh/docs/eino/ecosystem_integration/document/splitter_semantic)
