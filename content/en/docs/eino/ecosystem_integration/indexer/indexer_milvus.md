---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Indexer - milvus
weight: 0
---

## Milvus Indexer

An Milvus 2.x indexer implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Indexer`
interface. This enables seamless integration
with Eino's vector storage and retrieval system for enhanced semantic search capabilities.

## Quick Start

### Installation

```bash
go get github.com/cloudwego/eino-ext/components/indexer/milvus
```

### Create the Milvus Indexer

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

## Configuration

```go
type IndexerConfig struct {
    // Client is the milvus client to be called
    // Required
    Client client.Client

    // Default Collection config
    // Collection is the collection name in milvus database
    // Optional, and the default value is "eino_collection"
    Collection string
    // Description is the description for collection
    // Optional, and the default value is "the collection for eino"
    Description string
    // PartitionNum is the collection partition number
    // Optional, and the default value is 1(disable)
    // If the partition number is larger than 1, it means use partition and must have a partition key in Fields
    PartitionNum int64
    // Fields is the collection fields
    // Optional, and the default value is the default fields
    Fields       []*entity.Field
    // SharedNum is the milvus required param to create collection
    // Optional, and the default value is 1
    SharedNum int32
    // ConsistencyLevel is the milvus collection consistency tactics
    // Optional, and the default level is ClBounded(bounded consistency level with default tolerance of 5 seconds)
    ConsistencyLevel ConsistencyLevel
    // EnableDynamicSchema is means the collection is enabled to dynamic schema
    // Optional, and the default value is false
    // Enable to dynamic schema it could affect milvus performance
    EnableDynamicSchema bool

    // DocumentConverter is the function to convert the schema.Document to the row data
    // Optional, and the default value is defaultDocumentConverter
    DocumentConverter func(ctx context.Context, docs []*schema.Document, vectors [][]float64) ([]interface{}, error)

    // Index config to the vector column
    // MetricType the metric type for vector
    // Optional and default type is HAMMING
    MetricType MetricType

    // Embedding vectorization method for values needs to be embedded from schema.Document's content.
    // Required
    Embedding embedding.Embedder
}
```

## Default Collection Schema

| Field    | Type           | DataBase Type | Index Type                 | Description             | Remark             |
|----------|----------------|---------------|----------------------------|-------------------------|--------------------|
| id       | string         | varchar       |                            | Document ID             | Max Length: 255    |
| content  | string         | varchar       |                            | Document content        | Max Length: 1024   |
| vector   | []byte         | binary array  | HAMMING(default) / JACCARD | Document content vector | Default Dim: 81920 |
| metadata | map[string]any | json          |                            | Document meta data      |                    |
