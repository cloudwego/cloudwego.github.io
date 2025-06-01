---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Retriever - es8
weight: 0
---

## ES8 检索器

这是一个 [Eino](https://github.com/cloudwego/eino) 的 Elasticsearch 8.x 检索器实现，它实现了 `Retriever` 接口。这使得与 Eino 的向量检索系统无缝集成，从而增强了语义搜索能力。

## 特性

  - 实现了 `github.com/cloudwego/eino/components/retriever.Retriever`
  - 易于与 Eino 的检索系统集成
  - 可配置的 Elasticsearch 参数
  - 支持向量相似度搜索
  - 多种搜索模式，包括近似搜索
  - 支持自定义结果解析
  - 灵活的文档过滤

## 安装

```bash
go get github.com/cloudwego/eino-ext/components/retriever/es8@latest
```

## 快速开始

这是一个如何在近似搜索模式下使用检索器的快速示例，你可以阅读 `components/retriever/es8/examples/approximate/approximate.go` 获取更多细节：

```go
import (
	"github.com/cloudwego/eino/components/embedding"
	"github.com/cloudwego/eino/schema"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/typedapi/types"

	"github.com/cloudwego/eino-ext/components/retriever/es8"
	"github.com/cloudwego/eino-ext/components/retriever/es8/search_mode"
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

	// 创建检索器组件
	retriever, err := es8.NewRetriever(ctx, &es8.RetrieverConfig{
		Client: client,
		Index:  indexName,
		TopK:   5,
		SearchMode: search_mode.SearchModeApproximate(&search_mode.ApproximateConfig{
			QueryFieldName:  fieldContent,
			VectorFieldName: fieldContentVector,
			Hybrid:          true,
			// RRF 仅在特定许可证下可用
			// 参见：https://www.elastic.co/subscriptions
			RRF:             false,
			RRFRankConstant: nil,
			RRFWindowSize:   nil,
		}),
		ResultParser: func(ctx context.Context, hit types.Hit) (doc *schema.Document, err error) {
			doc = &schema.Document{
				ID:       *hit.Id_,
				Content:  "",
				MetaData: map[string]any{},
			}

			var src map[string]any
			if err = json.Unmarshal(hit.Source_, &src); err != nil {
				return nil, err
			}

			for field, val := range src {
				switch field {
				case fieldContent:
					doc.Content = val.(string)
				case fieldContentVector:
					var v []float64
					for _, item := range val.([]interface{}) {
						v = append(v, item.(float64))
					}
					doc.WithDenseVector(v)
				case fieldExtraLocation:
					doc.MetaData[docExtraLocation] = val.(string)
				}
			}

			if hit.Score_ != nil {
				doc.WithScore(float64(*hit.Score_))
			}

			return doc, nil
		},
		Embedding: emb, // 你的 embedding 组件
	})
	if err != nil {
		log.Panic("create retriever failed, err=%v", err)
	}

	// 无过滤条件搜索
	docs, err := retriever.Retrieve(ctx, "tourist attraction")
	if err != nil {
		log.Panic("retrieve docs failed, err=%v", err)
	}

	// 带过滤条件搜索
	docs, err = retriever.Retrieve(ctx, "tourist attraction",
		es8.WithFilters([]types.Query{{
			Term: map[string]types.TermQuery{
				fieldExtraLocation: {
					CaseInsensitive: of(true),
					Value:           "China",
				},
			},
		}}),
	)
	if err != nil {
		log.Panic("retrieve docs failed, err=%v", err)
	}
}
```

## 配置

检索器可以通过 `RetrieverConfig` 结构体进行配置：

```go
type RetrieverConfig struct {
	Client *elasticsearch.Client // 必填：Elasticsearch 客户端实例
	Index  string                // 必填：要从中检索文档的索引名称
	TopK   int                   // 必填：要返回的结果数量
	
	// 必填：搜索模式配置
	SearchMode search_mode.SearchMode
	
	// 必填：将 Elasticsearch 命中解析为 Document 的函数
	ResultParser func(ctx context.Context, hit types.Hit) (*schema.Document, error)
	
	// 可选：仅当需要查询向量化时才需要
	Embedding embedding.Embedder
}
```

## 更多详情

  - [Eino 文档](https://github.com/cloudwego/eino)
  - [Elasticsearch Go 客户端文档](https://github.com/elastic/go-elasticsearch)
