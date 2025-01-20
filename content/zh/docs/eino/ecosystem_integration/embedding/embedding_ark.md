---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Embedding - ARK
weight: 0
---

## **基本介绍**

Ark Embedding 是 Eino Embedding 接口的一个实现，用于将文本转换为向量表示，火山引擎 Ark 是一个提供机器学习模型推理服务的平台，其中包含了文本向量化服务。该组件实现了 [[🚧]Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)。

## **使用方式**

### **组件初始化**

Ark 向量嵌入器通过 `NewEmbedder` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/embedding/ark"

embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
    // 认证配置（二选一）
    APIKey: "your-api-key",  // 使用 API Key 认证
    // 或使用 AK/SK 认证
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    
    // 服务配置
    Model:   "ep-xxxxxxx-xxxxx", // Ark 平台的端点 ID
    BaseURL: "https://ark.cn-beijing.volces.com/api/v3", // 可选，默认为北京区域
    Region:  "cn-beijing",         // 可选，默认为北京区域
    
    // 高级配置
    Timeout:    &timeout,    // 请求超时时间
    RetryTimes: &retryTimes, // 重试次数
    Dimensions: &dimensions, // 输出向量维度
    User:       &user,      // 用户标识
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
    
    "github.com/cloudwego/eino-ext/components/embedding/ark"
)

func main() {
    ctx := context.Background()
    
    // 初始化嵌入器
    timeout := 30 * time.Second
    embedder, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
        APIKey:  "your-api-key",
        Model:   "ep-20xxxxxxx-xxxxx",
        Timeout: &timeout,
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
- [Embedding - OpenAI](/zh/docs/eino/ecosystem_integration/embedding/embedding_openai)
- [火山引擎 Ark 服务](https://www.volcengine.com/product/ark)
