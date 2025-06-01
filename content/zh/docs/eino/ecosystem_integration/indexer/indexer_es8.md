---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Indexer - es8
weight: 0
---

## ES8 索引器

这是一个 [Eino](https://github.com/cloudwego/eino) 的 Elasticsearch 8.x 索引器实现，它实现了 `Indexer` 接口。这使得与 Eino 的向量存储和检索系统无缝集成，从而增强了语义搜索能力。

## 特性

  - 实现了 `github.com/cloudwego/eino/components/indexer.Indexer`
  - 易于与 Eino 的索引系统集成
  - 可配置的 Elasticsearch 参数
  - 支持向量相似度搜索
  - 批量索引操作
  - 支持自定义字段映射
  - 灵活的文档向量化

## 安装

```bash
go get github.com/cloudwego/eino-ext/components/indexer/es8@latest
```

## 快速开始

这是一个如何使用索引器的快速示例，你可以阅读 `components/indexer/es8/examples/indexer/add_documents.go` 获取更多细节：

```go
import (
	"github.com/cloudwego/eino/components/embedding"
	"github.com/cloudwego/eino/schema"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/cloudwego/eino-ext/components/indexer/es8" // 导入 es8 索引器
)

const (
	indexName          = "eino_example"
	fieldContent       = "content"
	fieldContentVector = "content_vector"
	fieldExtraLocation = "location"
	docExtraLocation   = "location"
)

func main() {
	ctx := context.Background()

	// es 支持多种连接方式
	username := os.Getenv("ES_USERNAME")
	password := os.Getenv("ES_PASSWORD")
	httpCACertPath := os.Getenv("ES_HTTP_CA_CERT_PATH")

	cert, err := os.ReadFile(httpCACertPath)
	if err != nil {
		log.Fatalf("read file failed, err=%v", err)
	}

	client, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{"https://localhost:9200"},
		Username:  username,
		Password:  password,
		CACert:    cert,
	})
    if err != nil {
		log.Panic("connect es8 failed, err=%v", err)
	}

	// 创建 embedding 组件
	emb := createYourEmbedding()

	// 加载文档
	docs := loadYourDocs()

	// 创建 es 索引器组件
	indexer, err := es8.NewIndexer(ctx, &es8.IndexerConfig{
		Client:    client,
		Index:     indexName,
		BatchSize: 10,
		DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es8.FieldValue, err error) {
			return map[string]es8.FieldValue{
				fieldContent: {
					Value:    doc.Content,
					EmbedKey: fieldContentVector, // 对文档内容进行向量化并保存向量到 "content_vector" 字段
				},
				fieldExtraLocation: {
					Value: doc.MetaData[docExtraLocation],
				},
			}, nil
		},
		Embedding: emb, // 替换为真实的 embedding 组件
	})
    if err != nil {
		log.Panic("create indexer failed, err=%v", err)
	}

	ids, err := indexer.Store(ctx, docs)
    if err != nil {
		log.Panic("store docs failed, err=%v", err)
	}

	fmt.Println(ids)
	// 与 Eino 系统一起使用
	// ... 配置并与 Eino 一起使用
}
```

## 配置

索引器可以通过 `IndexerConfig` 结构体进行配置：

```go
type IndexerConfig struct {
	Client *elasticsearch.Client // 必填：Elasticsearch 客户端实例
	Index  string                // 必填：存储文档的索引名称
	BatchSize int                // 可选：embedding 的最大文本大小（默认：5）
	
	// 必填：将文档字段映射到 Elasticsearch 字段的函数
	DocumentToFields func(ctx context.Context, doc *schema.Document) (map[string]FieldValue, error)
	
	// 可选：仅当需要向量化时才需要
	Embedding embedding.Embedder
}

// FieldValue 定义了字段应如何存储和向量化
type FieldValue struct {
	Value     any    // 要存储的原始值
	EmbedKey  string // 如果设置，Value 将被向量化并保存
	Stringify func(val any) (string, error) // 可选：自定义字符串转换
}
```

## 更多详情

  - [Eino 文档](https://github.com/cloudwego/eino)
  - [Elasticsearch Go 客户端文档](https://github.com/elastic/go-elasticsearch)
