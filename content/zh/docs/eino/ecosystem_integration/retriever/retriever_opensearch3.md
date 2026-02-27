---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - OpenSearch 3
weight: 0
---

> **云搜索服务介绍**
>
> 云搜索服务（Cloud Search）是一个全托管、一站式信息检索与分析平台，提供了 ElasticSearch 和 OpenSearch 引擎，支持全文检索、向量检索、混合搜索及时空检索等多种核心能力。

[Eino](https://github.com/cloudwego/eino) 的 OpenSearch 3 检索器实现，实现了 `Retriever` 接口。这使得 OpenSearch 可以无缝集成到 Eino 的向量检索系统中，增强语义搜索能力。

## 功能特性

- 实现 `github.com/cloudwego/eino/components/retriever.Retriever`
- 易于集成到 Eino 的检索系统
- 可配置的 OpenSearch 参数
- 支持向量相似度搜索和关键词搜索
- 多种搜索模式：
  - KNN (近似最近邻)
  - Exact Match (精确匹配/关键词)
  - Raw String (原生 JSON 请求体)
  - Dense Vector Similarity (脚本评分，稠密向量)
  - Neural Sparse (稀疏向量)
- 支持自定义结果解析

## 搜索模式兼容性

<table>
<tr><td>搜索模式</td><td>最低 OpenSearch 版本</td><td>说明</td></tr>
<tr><td><pre>ExactMatch</pre></td><td>1.0+</td><td>标准查询 DSL</td></tr>
<tr><td><pre>RawString</pre></td><td>1.0+</td><td>标准查询 DSL</td></tr>
<tr><td><pre>DenseVectorSimilarity</pre></td><td>1.0+</td><td>使用 <pre>script_score</pre> 和 painless 向量函数</td></tr>
<tr><td><pre>Approximate</pre> (KNN)</td><td>1.0+</td><td>自 1.0 起支持基础 KNN。高效过滤 (Post-filtering) 需要 2.4+ (Lucene HNSW) 或 2.9+ (Faiss)。</td></tr>
<tr><td><pre>Approximate</pre> (Hybrid)</td><td>2.10+</td><td>生成 <pre>bool</pre> 查询。需要 2.10+ <pre>normalization-processor</pre> 支持高级分数归一化 (Convex Combination)。基础 <pre>bool</pre> 查询在早期版本 (1.0+) 也可工作。</td></tr>
<tr><td><pre>Approximate</pre> (RRF)</td><td>2.19+</td><td>需要 <pre>score-ranker-processor</pre> (2.19+) 和 <pre>neural-search</pre> 插件。</td></tr>
<tr><td><pre>NeuralSparse</pre> (Query Text)</td><td>2.11+</td><td>需要 <pre>neural-search</pre> 插件和已部署的模型。</td></tr>
<tr><td><pre>NeuralSparse</pre> (TokenWeights)</td><td>2.11+</td><td>需要 <pre>neural-search</pre> 插件。</td></tr>
</table>

## 安装

```bash
go get github.com/cloudwego/eino-ext/components/retriever/opensearch3@latest
```

## 快速开始

以下是一个如何使用该检索器的简单示例：

```go
package main

import (
        "context"
        "fmt"
        "log"
        "os"
        
        "github.com/cloudwego/eino/schema"
        opensearch "github.com/opensearch-project/opensearch-go/v4"
        "github.com/opensearch-project/opensearch-go/v4/opensearchapi"

        "github.com/cloudwego/eino-ext/components/embedding/ark"
        "github.com/cloudwego/eino-ext/components/retriever/opensearch3"
        "github.com/cloudwego/eino-ext/components/retriever/opensearch3/search_mode"
)

func main() {
        ctx := context.Background()

        client, err := opensearchapi.NewClient(opensearchapi.Config{
                Client: opensearch.Config{
                        Addresses: []string{"http://localhost:9200"},
                        Username:  username,
                        Password:  password,
                },
        })
        if err != nil {
                log.Fatal(err)
        }

        // 使用 Volcengine ARK 创建 embedding 组件
        emb, _ := ark.NewEmbedder(ctx, &ark.EmbeddingConfig{
                APIKey: os.Getenv("ARK_API_KEY"),
                Region: os.Getenv("ARK_REGION"),
                Model:  os.Getenv("ARK_MODEL"),
        })

        // 创建检索器组件
        retriever, _ := opensearch3.NewRetriever(ctx, &opensearch3.RetrieverConfig{
                Client: client,
                Index:  "your_index_name",
                TopK:   5,
                // 选择搜索模式
                SearchMode: search_mode.Approximate(&search_mode.ApproximateConfig{
                        VectorField: "content_vector",
                        K:           5,
                }),
                ResultParser: func(ctx context.Context, hit map[string]interface{}) (*schema.Document, error) {
                        // 解析 hit map 为 Document
                        id, _ := hit["_id"].(string)
                        source := hit["_source"].(map[string]interface{})
                        content, _ := source["content"].(string)
                        return &schema.Document{ID: id, Content: content}, nil
                },
                Embedding: emb,
        })

        docs, err := retriever.Retrieve(ctx, "search query")
        if err != nil {
                fmt.Printf("retrieve error: %v\n", err)
                return
        }
        for _, doc := range docs {
                fmt.Printf("ID: %s, Content: %s\n", doc.ID, doc.Content)
        }
}
```

## 配置说明

可以通过 `RetrieverConfig` 结构体配置检索器：

```go
type RetrieverConfig struct {
    Client *opensearchapi.Client // 必填：OpenSearch 客户端实例
    Index  string             // 必填：从中检索文档的索引名称
    TopK   int                // 必填：返回的结果数量

    // 必填：搜索模式配置
    // search_mode 包中提供了预置实现：
    // - search_mode.Approximate(&ApproximateConfig{...})
    // - search_mode.ExactMatch(field)
    // - search_mode.RawStringRequest()
    // - search_mode.DenseVectorSimilarity(type, vectorField)
    // - search_mode.NeuralSparse(vectorField, &NeuralSparseConfig{...})
    SearchMode SearchMode

    // 选填：将 OpenSearch hits (map[string]interface{}) 解析为 Document 的函数
    // 如果未提供，将使用默认解析器。
    ResultParser func(ctx context.Context, hit map[string]interface{}) (doc *schema.Document, err error)

    // 选填：仅当需要查询向量化时必填
    Embedding embedding.Embedder
}
```

## 获取帮助

如果有任何问题 或者任何功能建议，欢迎进这个群 oncall。

- [Eino 文档](https://www.cloudwego.io/zh/docs/eino/)
- [OpenSearch Go 客户端文档](https://github.com/opensearch-project/opensearch-go)
