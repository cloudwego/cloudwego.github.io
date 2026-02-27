---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Retriever - Dify
weight: 0
---

## **Dify Retriever**

This is a Dify retriever for [Eino](https://github.com/cloudwego/eino) implementing the `Retriever` interface. It integrates with Eino’s retrieval system and fetches relevant documents from Dify datasets.

## **Features**

- Implements `github.com/cloudwego/eino/components/retriever.Retriever`
- Easy integration with Eino retrieval
- Configurable retrieval parameters
- Supports reranking

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/retriever/dify
```

## **Quick Start**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/retriever/dify"
)

func main() {
    APIKey := os.Getenv("DIFY_DATASET_API_KEY")
    Endpoint := os.Getenv("DIFY_ENDPOINT")
    DatasetID := os.Getenv("DIFY_DATASET_ID")
    ctx := context.Background()

    ret, err := dify.NewRetriever(ctx, &dify.RetrieverConfig{ APIKey: APIKey, Endpoint: Endpoint, DatasetID: DatasetID })
    if err != nil { log.Fatalf("Failed to create retriever: %v", err) }

    docs, err := ret.Retrieve(ctx, "test query")
    if err != nil { log.Fatalf("Failed to retrieve: %v", err) }

    for _, doc := range docs {
        fmt.Printf("doc id: %s\n", doc.ID)
        fmt.Printf("doc content: %s\n", doc.Content)
        fmt.Printf("score: %v\n\n", doc.Score())
    }
}
```

## **Configuration**

Configure via `RetrieverConfig`:

```go
type RetrieverConfig struct {
    APIKey string
    Endpoint string // default: https://api.dify.ai/v1
    DatasetID string
    RetrievalModel *RetrievalModel
    Timeout time.Duration
}

type RetrievalModel struct {
    SearchMethod          SearchMethod
    RerankingEnable       *bool
    RerankingMode         *string
    RerankingModel        *RerankingModel
    Weights               *float64
    TopK                  *int
    ScoreThresholdEnabled *bool
    ScoreThreshold        *float64
}
```

## **Document Metadata**

Adds the following metadata on retrieved docs:

- `orig_doc_id`: original doc ID in Dify
- `orig_doc_name`: original doc name in Dify
- `keywords`: extracted keywords

Helpers:

```go
docID := dify.GetOrgDocID(doc)
docName := dify.GetOrgDocName(doc)
keywords := dify.GetKeywords(doc)
```

## **More Details**

- Dify: https://github.com/langgenius/dify
- Eino: https://github.com/cloudwego/eino
