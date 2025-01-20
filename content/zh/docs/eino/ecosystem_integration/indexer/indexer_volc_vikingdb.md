---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Indexer - volc VikingDB
weight: 0
---

## **基本介绍**

火山引擎 VikingDB 向量索引器是 Indexer 接口的一个实现，用于将文档内容存储到火山引擎的 VikingDB 向量数据库中。该组件实现了 [[🚧]Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)

### **火山引擎 VikingDB 服务介绍**

火山引擎 VikingDB 是一个高性能的向量数据库服务，提供向量存储、检索和向量化等功能。本组件通过火山引擎 SDK 与服务进行交互，支持两种向量化方式：

- 使用 VikingDB 内置的向量化方法（Embedding V2）
- 使用自定义的向量嵌入模型

## **使用方式**

### **组件初始化**

火山引擎 VikingDB 索引器通过 `NewIndexer` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"

indexer, err := volc_vikingdb.NewIndexer(ctx, &volc_vikingdb.IndexerConfig{
    Host:              "api-vikingdb.volces.com", // 服务地址
    Region:            "cn-beijing",            // 区域
    AK:                "your-ak",               // Access Key
    SK:                "your-sk",               // Secret Key
    Scheme:            "https",                 // 协议
    ConnectionTimeout: 30,                      // 连接超时时间（秒）
    
    Collection: "your-collection",              // 集合名称
    
    EmbeddingConfig: volc_vikingdb.EmbeddingConfig{
        UseBuiltin: true,                       // 是否使用内置向量化
        ModelName:  "text2vec-base",           // 模型名称
        UseSparse:  true,                       // 是否使用稀疏向量
        Embedding:  embedder,                   // 自定义向量嵌入器
    },
    
    AddBatchSize: 5,                           // 批量添加大小
})
```

### **完整使用示例**

#### **使用内置向量化**

```go
package main

import (
    "context"
    
    volcvikingdb "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化索引器
    idx, err := volcvikingdb.NewIndexer(ctx, &volcvikingdb.IndexerConfig{
        Host:     "api-vikingdb.volces.com",
        Region:   "cn-beijing",
        AK:       "your-ak",
        SK:       "your-sk",
        Scheme:   "https",
        
        Collection: "test-collection",
        
        EmbeddingConfig: volcvikingdb.EmbeddingConfig{
            UseBuiltin: true,
            ModelName:  "text2vec-base",
            UseSparse:  true,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // 准备文档
    docs := []*schema.Document{
        {
            Content: "这是第一个文档的内容",
        },
        {
            Content: "这是第二个文档的内容",
        },
    }
    
    // 存储文档
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // 处理返回的ID
    for i, id := range ids {
        println("文档", i+1, "的存储ID:", id)
    }
}
```

#### **使用自定义向量嵌入**

```go
package main

import (
    "context"
    
    volcvikingdb "github.com/cloudwego/eino-ext/components/indexer/volc_vikingdb"
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    
    // 初始化向量嵌入器（openai 示例）
    embedder, err := &openai.NewEmbedder(ctx, &openai.EmbeddingConfig{})
    if err != nil {
        panic(err)
    }
    
    // 初始化索引器
    idx, err := volcvikingdb.NewIndexer(ctx, &volcvikingdb.IndexerConfig{
        Host:     "api-vikingdb.volces.com",
        Region:   "cn-beijing",
        AK:       "your-ak",
        SK:       "your-sk",
        Scheme:   "https",
        
        Collection: "test-collection",
        
        EmbeddingConfig: volcvikingdb.EmbeddingConfig{
            UseBuiltin: false,
            Embedding:  embedder,
        },
    })
    if err != nil {
        panic(err)
    }
    
    // 准备文档
    docs := []*schema.Document{
        {
            Content: "Document content one",
        },
        {
            Content: "Document content two",
        },
    }
    
    // 存储文档
    ids, err := idx.Store(ctx, docs)
    if err != nil {
        panic(err)
    }
    
    // 处理返回的ID
    for i, id := range ids {
        println("文档", i+1, "的存储ID:", id)
    }
}
```

## **相关文档**

- [Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
- [火山引擎 VikingDB 使用指南](https://www.volcengine.com/docs/84313/1254617)
