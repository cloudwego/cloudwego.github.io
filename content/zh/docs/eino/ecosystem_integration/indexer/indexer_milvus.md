---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Indexer - Milvus v1 (旧版)
weight: 0
---

> **模块说明：** 本模块 (`EINO-ext/milvus`) 基于 `milvus-sdk-go` 实现。鉴于底层 SDK 已停止维护，且最高仅适配至 Milvus 2.4 版本，本模块仅作为向后兼容组件保留。
>
> **建议：** 新接入的用户请直接使用 [Indexer - Milvus 2 (v2.5+)](/zh/docs/eino/ecosystem_integration/indexer/indexer_milvusv2) 模块以获得持续支持。

## **Milvus 存储**

基于 Milvus 2.x 的向量存储实现，为 [Eino](https://github.com/cloudwego/eino) 提供了符合 `Indexer` 接口的存储方案。该组件可无缝集成 Eino 的向量存储和检索系统，增强语义搜索能力。

## **快速开始**

### **安装**

```bash
go get github.com/cloudwego/eino-ext/components/indexer/milvus
```

### **创建 Milvus 存储**

```go
package main

import (
        "context"
        "log"
        "os"
        
        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino/schema"
        "github.com/milvus-io/milvus-sdk-go/v2/client"
        
        "github.com/cloudwego/eino-ext/components/indexer/milvus"
)

func main() {
        // Get the environment variables
        addr := os.Getenv("MILVUS_ADDR")
        username := os.Getenv("MILVUS_USERNAME")
        password := os.Getenv("MILVUS_PASSWORD")
        arkApiKey := os.Getenv("ARK_API_KEY")
        arkModel := os.Getenv("ARK_MODEL")
        
        // Create a client
        ctx := context.Background()
        cli, err := client.NewClient(ctx, client.Config{
                Address:  addr,
                Username: username,
                Password: password,
        })
        if err != nil {
                log.Fatalf("Failed to create client: %v", err)
                return
        }
        defer cli.Close()
        
        // Create an embedding model
        emb, err := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: arkApiKey,
                Model:  arkModel,
        })
        if err != nil {
                log.Fatalf("Failed to create embedding: %v", err)
                return
        }
        
        // Create an indexer
        indexer, err := milvus.NewIndexer(ctx, &milvus.IndexerConfig{
                Client:    cli,
                Embedding: emb,
        })
        if err != nil {
                log.Fatalf("Failed to create indexer: %v", err)
                return
        }
        log.Printf("Indexer created success")
        
        // Store documents
        docs := []*schema.Document{
                {
                        ID:      "milvus-1",
                        Content: "milvus is an open-source vector database",
                        MetaData: map[string]any{
                                "h1": "milvus",
                                "h2": "open-source",
                                "h3": "vector database",
                        },
                },
                {
                        ID:      "milvus-2",
                        Content: "milvus is a distributed vector database",
                },
        }
        ids, err := indexer.Store(ctx, docs)
        if err != nil {
                log.Fatalf("Failed to store: %v", err)
                return
        }
        log.Printf("Store success, ids: %v", ids)
}
```

## **Configuration**

```go
type IndexerConfig struct {
        // Client 是要调用的 milvus 客户端
        // 必需
        Client client.Client
        
        // 默认集合配置
        // Collection 是 milvus 数据库中的集合名称
        // 可选，默认值为 "eino_collection"
    // 如果你想使用这个配置，必须加上Field配置，否则无法正常运行
        Collection string
        // Description 是集合的描述
        // 可选，默认值为 "the collection for eino"
        Description string
        // PartitionNum 是集合分区数量
        // 可选，默认值为 1（禁用）
        // 如果分区数量大于 1，表示使用分区，并且必须在 Fields 中有一个分区键
        PartitionNum int64
        // Fields 是集合字段
        // 可选，默认值为默认字段
        Fields       []*entity.Field
        // SharedNum 是创建集合所需的 milvus 参数
        // 可选，默认值为 1
        SharedNum int32
        // ConsistencyLevel 是 milvus 集合一致性策略
        // 可选，默认级别为 ClBounded（有界一致性级别，默认容忍度为 5 秒）
        ConsistencyLevel ConsistencyLevel
        // EnableDynamicSchema 表示集合是否启用动态模式
        // 可选，默认值为 false
        // 启用动态模式可能会影响 milvus 性能
        EnableDynamicSchema bool
        
        // DocumentConverter 是将 schema.Document 转换为行数据的函数
        // 可选，默认值为 defaultDocumentConverter
        DocumentConverter func(ctx context.Context, docs []*schema.Document, vectors [][]float64) ([]interface{}, error)
        
        // 向量列的索引配置
        // MetricType 是向量的度量类型
        // 可选，默认类型为 HAMMING
        MetricType MetricType
        
        // Embedding 是从 schema.Document 的内容中嵌入值所需的向量化方法
        // 必需
        Embedding embedding.Embedder
}
```

## **默认数据模型**

## 获取帮助

- [[集团内部版] Milvus 快速入门](https://bytedance.larkoffice.com/wiki/P3JBw4PtKiLGPhkUCQZcXbHFnkf)

如果有任何问题 或者任何功能建议，欢迎进这个群 oncall。

### 外部参考

- [Milvus 文档](https://milvus.io/docs)
- [Milvus 索引类型](https://milvus.io/docs/index.md)
- [Milvus 度量类型](https://milvus.io/docs/metric.md)
- [milvus-sdk-go 参考](https://milvus.io/api-reference/go/v2.4.x/About.md)

### 相关文档

- [Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
- [Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
