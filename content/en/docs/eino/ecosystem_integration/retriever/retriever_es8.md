---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Retriever - ES8
weight: 0
---

## **ES8 Retriever**

This is an Elasticsearch 8.x retriever implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Retriever` interface. It integrates seamlessly with Eino’s vector retrieval system to enhance semantic search.

## **Features**

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino retrieval
- Configurable Elasticsearch parameters
- Supports vector similarity search
- Multiple search modes including approximate
- Custom result parsing
- Flexible document filtering

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/retriever/es8@latest
```

## **Quick Start**

Approximate search example (see `components/retriever/es8/examples/approximate/approximate.go` for details):

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

    // connections
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

    // retriever
    retriever, err := es8.NewRetriever(ctx, &es8.RetrieverConfig{
        Client: client,
        Index:  indexName,
        TopK:   5,
        SearchMode: search_mode.SearchModeApproximate(&search_mode.ApproximateConfig{
            QueryFieldName:  fieldContent,
            VectorFieldName: fieldContentVector,
            Hybrid:          true,
            // RRF availability depends on license
            // see: https://www.elastic.co/subscriptions
            RRF:             false,
            RRFRankConstant: nil,
            RRFWindowSize:   nil,
        }),
        ResultParser: func(ctx context.Context, hit types.Hit) (doc *schema.Document, err error) {
            doc = &schema.Document{ ID: *hit.Id_, Content: "", MetaData: map[string]any{} }

            var src map[string]any
            if err = json.Unmarshal(hit.Source_, &src); err != nil { return nil, err }

            for field, val := range src {
                switch field {
                case fieldContent:
                    doc.Content = val.(string)
                case fieldContentVector:
                    var v []float64
                    for _, item := range val.([]interface{}) { v = append(v, item.(float64)) }
                    doc.WithDenseVector(v)
                case fieldExtraLocation:
                    doc.MetaData[docExtraLocation] = val.(string)
                }
            }

            if hit.Score_ != nil { doc.WithScore(float64(*hit.Score_)) }
            return doc, nil
        },
        Embedding: emb,
    })
    if err != nil { log.Panicf("create retriever failed, err=%v", err) }

    // search without filters
    docs, err := retriever.Retrieve(ctx, "tourist attraction")
    if err != nil { log.Panicf("retrieve docs failed, err=%v", err) }

    // search with filters
    docs, err = retriever.Retrieve(ctx, "tourist attraction",
        es8.WithFilters([]types.Query{{
            Term: map[string]types.TermQuery{
                fieldExtraLocation: { CaseInsensitive: of(true), Value: "China" },
            },
        }}),
    )
    if err != nil { log.Panicf("retrieve docs failed, err=%v", err) }
}
```

## **Configuration**

Configure via `RetrieverConfig`:

```go
type RetrieverConfig struct {
    Client *elasticsearch.Client // required: Elasticsearch client
    Index  string                // required: index name
    TopK   int                   // required: number of results
    
    // required: search mode
    SearchMode search_mode.SearchMode
    
    // required: parse ES hit to Document
    ResultParser func(ctx context.Context, hit types.Hit) (*schema.Document, error)
    
    // optional: only needed if query embedding is required
    Embedding embedding.Embedder
}
```

## **More Details**

  - [Eino docs](https://github.com/cloudwego/eino)
  - [Elasticsearch Go client](https://github.com/elastic/go-elasticsearch)
