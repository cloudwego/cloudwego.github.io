---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Indexer - es8
weight: 0
---

## ES8 Indexer

An Elasticsearch 8.x indexer implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Indexer` interface. This enables seamless integration with Eino's vector storage and retrieval system for enhanced semantic search capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/indexer.Indexer`
- Easy integration with Eino's indexer system
- Configurable Elasticsearch parameters
- Support for vector similarity search
- Bulk indexing operations
- Custom field mapping support
- Flexible document vectorization

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/es8@latest
```

## Quick Start

Here's a quick example of how to use the indexer, you could read components/indexer/es8/examples/indexer/add_documents.go for more details:

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

	// es supports multiple ways to connect
	username := os.Getenv("ES_USERNAME")
	password := os.Getenv("ES_PASSWORD")
	httpCACertPath := os.Getenv("ES_HTTP_CA_CERT_PATH")

	cert, err := os.ReadFile(httpCACertPath)
	if err != nil {
		log.Fatalf("read file failed, err=%v", err)
	}

	client, _ := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{"https://localhost:9200"},
		Username:  username,
		Password:  password,
		CACert:    cert,
	})

	// create embedding component
	emb := createYourEmbedding()

	// load docs
	docs := loadYourDocs()

	// create es indexer component
	indexer, _ := es8.NewIndexer(ctx, &es8.IndexerConfig{
		Client:    client,
		Index:     indexName,
		BatchSize: 10,
		DocumentToFields: func(ctx context.Context, doc *schema.Document) (field2Value map[string]es8.FieldValue, err error) {
			return map[string]es8.FieldValue{
				fieldContent: {
					Value:    doc.Content,
					EmbedKey: fieldContentVector, // vectorize doc content and save vector to field "content_vector"
				},
				fieldExtraLocation: {
					Value: doc.MetaData[docExtraLocation],
				},
			}, nil
		},
		Embedding: emb, // replace it with real embedding component
	})

	ids, _ := indexer.Store(ctx, docs)

	fmt.Println(ids)
    // Use with Eino's system
    // ... configure and use with Eino
}
```

## Configuration

The indexer can be configured using the `IndexerConfig` struct:

```go
type IndexerConfig struct {
    Client *elasticsearch.Client // Required: Elasticsearch client instance
    Index  string                // Required: Index name to store documents
    BatchSize int                // Optional: Max texts size for embedding (default: 5)
    
    // Required: Function to map Document fields to Elasticsearch fields
    DocumentToFields func(ctx context.Context, doc *schema.Document) (map[string]FieldValue, error)
    
    // Optional: Required only if vectorization is needed
    Embedding embedding.Embedder
}

// FieldValue defines how a field should be stored and vectorized
type FieldValue struct {
    Value     any    // Original value to store
    EmbedKey  string // If set, Value will be vectorized and saved
    Stringify func(val any) (string, error) // Optional: custom string conversion
}
```

## For More Details

- [Eino Documentation](https://github.com/cloudwego/eino)
- [Elasticsearch Go Client Documentation](https://github.com/elastic/go-elasticsearch)
