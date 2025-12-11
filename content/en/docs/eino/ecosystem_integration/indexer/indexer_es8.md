---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Indexer - ES8
weight: 0
---

## **ES8 Indexer**

This is an Elasticsearch 8.x indexer implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Indexer` interface. It integrates with Eino’s vector storage and retrieval system for semantic search.

## **Features**

- Implements `github.com/cloudwego/eino/components/indexer.Indexer`
- Easy integration with Eino indexing
- Configurable Elasticsearch parameters
- Supports vector similarity search
- Batch indexing operations
- Custom field mapping
- Flexible document embedding

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/indexer/es8@latest
```

## **Quick Start**

Example usage (see `components/indexer/es8/examples/indexer/add_documents.go` for details):

```go
import (
    "github.com/cloudwego/eino/components/embedding"
    "github.com/cloudwego/eino/schema"
    "github.com/elastic/go-elasticsearch/v8"
    "github.com/cloudwego/eino-ext/components/indexer/es8"
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

    username := os.Getenv("ES_USERNAME")
    password := os.Getenv("ES_PASSWORD")
    httpCACertPath := os.Getenv("ES_HTTP_CA_CERT_PATH")

    cert, err := os.ReadFile(httpCACertPath)
    if err != nil { log.Fatalf("read file failed, err=%v", err) }

    client, err := elasticsearch.NewClient(elasticsearch.Config{
        Addresses: []string{"https://localhost:9200"},
        Username:  username,
        Password:  password,
        CACert:    cert,
    })
    if err != nil { log.Panicf("connect es8 failed, err=%v", err) }

    emb := createYourEmbedding()
    docs := loadYourDocs()

    indexer, err := es8.NewIndexer(ctx, &es8.IndexerConfig{
        Client:    client,
        Index:     indexName,
        BatchSize: 10,
        DocumentToFields: func(ctx context.Context, doc *schema.Document) (map[string]es8.FieldValue, error) {
            return map[string]es8.FieldValue{
                fieldContent:       { Value: doc.Content, EmbedKey: fieldContentVector },
                fieldExtraLocation: { Value: doc.MetaData[docExtraLocation] },
            }, nil
        },
        Embedding: emb,
    })
    if err != nil { log.Panicf("create indexer failed, err=%v", err) }

    ids, err := indexer.Store(ctx, docs)
    if err != nil { log.Panicf("create docs failed, err=%v", err) }
    fmt.Println(ids)
}
```

## **Configuration**

Configure via `IndexerConfig`:

```go
type IndexerConfig struct {
    Client *elasticsearch.Client // required: Elasticsearch client instance
    Index  string                // required: index name to store documents
    BatchSize int                // optional: batch size (default: 5)
    
    // required: map document fields to ES fields
    DocumentToFields func(ctx context.Context, doc *schema.Document) (map[string]FieldValue, error)
    
    // optional: only needed when embedding is required
    Embedding embedding.Embedder
}

type FieldValue struct {
    Value     any    // raw value to store
    EmbedKey  string // if set, Value will be embedded and saved under this field
    Stringify func(val any) (string, error) // optional: custom string conversion
}
```

## **More Details**

  - [Eino docs](https://github.com/cloudwego/eino)
  - [Elasticsearch Go client](https://github.com/elastic/go-elasticsearch)
