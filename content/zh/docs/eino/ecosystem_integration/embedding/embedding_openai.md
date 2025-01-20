---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Embedding - OpenAI
weight: 0
---

## **基本介绍**

OpenAI 向量嵌入器是 Eino Embedding 接口的一个实现，用于将文本转换为向量表示。该组件实现了 [[🚧]Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)，主要用于以下场景：

- 需要将文本转换为高维向量表示
- 使用 OpenAI 的 embedding 模型
- 使用 Azure OpenAI Service 的 embedding 模型

## **使用方式**

### **组件初始化**

OpenAI 向量嵌入器通过 `NewEmbedder` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/embedding/openai"

embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
    // OpenAI API 配置
    APIKey:  "your-api-key",
    Model:   "text-embedding-ada-002",
    Timeout: 30 * time.Second,
    
    // 可选：Azure OpenAI Service 配置
    ByAzure:    true,
    BaseURL:    "https://your-resource.openai.azure.com",
    APIVersion: "2023-05-15",

    EncodingFormat: &format,    // 编码格式
    Dimensions:     &dimension, // 向量维度
    User:          &user,      // 用户标识
})
```

### **生成向量嵌入**

文本向量化通过 `EmbedStrings` 方法实现：

```go
embeddings, err := embedder.EmbedStrings(ctx, []string{
    "第一段文本",
    "第二段文本",
})
```

### **完整使用示例**

#### **基本使用**

```go
package main

import (
    "context"
    "time"
    
    "github.com/cloudwego/eino-ext/components/embedding/openai"
)

func main() {
    ctx := context.Background()
    
    // 初始化嵌入器
    embedder, err := openai.NewEmbedder(ctx, &openai.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "text-embedding-ada-002",
        Timeout: 30 * time.Second,
    })
    if err != nil {
        panic(err)
    }
    
    // 生成文本向量
    texts := []string{
        "这是第一段示例文本",
        "这是第二段示例文本",
    }
    
    embeddings, err := embedder.EmbedStrings(ctx, texts)
    if err != nil {
        panic(err)
    }
    
    // 使用生成的向量
    for i, embedding := range embeddings {
        println("文本", i+1, "的向量维度:", len(embedding))
    }
}
```

## **相关文档**

- [Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)
- [Embedding - ARK](/zh/docs/eino/ecosystem_integration/embedding/embedding_ark)
- [OpenAI Embedding API 文档](https://platform.openai.com/docs/guides/embeddings)
- [Azure OpenAI Service 文档](https://learn.microsoft.com/azure/cognitive-services/openai/)
