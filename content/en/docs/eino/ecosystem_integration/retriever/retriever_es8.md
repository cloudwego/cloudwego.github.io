---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Retriever - Elasticsearch 8
weight: 0
---

> **Cloud Search Service Introduction**
>
> Cloud Search Service is a fully managed, one-stop information retrieval and analysis platform that provides ElasticSearch and OpenSearch engines, supporting full-text search, vector search, hybrid search, and spatiotemporal search capabilities.

## **ES8 Retriever**

This is an Elasticsearch 8.x retriever implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Retriever` interface. It integrates seamlessly with Eino's vector retrieval system to enhance semantic search capabilities.

## **Features**

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino's retrieval system
- Configurable Elasticsearch parameters
- Supports vector similarity search
- Multiple search modes including approximate search
- Supports custom result parsing
- Flexible document filtering

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/retriever/es8@latest
```

## **Quick Start**

Here is a quick example of how to use the retriever in approximate search mode. You can read `components/retriever/es8/examples/approximate/approximate.go` for more details:

```go
import (
        "github.com/cloudwego/eino/components/embedding"
        "github.com/cloudwego/eino/schema"
        elasticsearch "github.com/elastic/go-elasticsearch/v8"
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

        // ES supports multiple connection methods
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
                log.Panicf("connect es8 failed, err=%v", err)
        }

        // Create retriever component
        retriever, err := es8.NewRetriever(ctx, &es8.RetrieverConfig{
                Client: client,
                Index:  indexName,
                TopK:   5,
                SearchMode: search_mode.SearchModeApproximate(&search_mode.ApproximateConfig{
                        QueryFieldName:  fieldContent,
                        VectorFieldName: fieldContentVector,
                        Hybrid:          true,
                        // RRF is only available under specific licenses
                        // See: https://www.elastic.co/subscriptions
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
                Embedding: emb, // Your embedding component
        })
        if err != nil {
                log.Panicf("create retriever failed, err=%v", err)
        }

        // Search without filters
        docs, err := retriever.Retrieve(ctx, "tourist attraction")
        if err != nil {
                log.Panicf("retrieve docs failed, err=%v", err)
        }

        // Search with filters
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
                log.Panicf("retrieve docs failed, err=%v", err)
        }
}
```

## **Configuration**

The retriever can be configured via the `RetrieverConfig` struct:

```go
type RetrieverConfig struct {
        Client *elasticsearch.Client // Required: Elasticsearch client instance
        Index  string                // Required: Index name to retrieve documents from
        TopK   int                   // Required: Number of results to return
        
        // Required: Search mode configuration
        SearchMode search_mode.SearchMode
        
        // Required: Function to parse Elasticsearch hits into Documents
        ResultParser func(ctx context.Context, hit types.Hit) (*schema.Document, error)
        
        // Optional: Only needed when query vectorization is required
        Embedding embedding.Embedder
}
```

## Getting Help

If you have any questions or feature suggestions, feel free to reach out.

- [Eino Documentation](https://github.com/cloudwego/eino)
- [Elasticsearch Go Client Documentation](https://github.com/elastic/go-elasticsearch)
