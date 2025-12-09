---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Embedding - tencentcloud
weight: 0
---

## Tencent Cloud Hunyuan Embedding

This is a Tencent Cloud Hunyuan Embedding component for [Eino](https://github.com/cloudwego/eino) implementing the `Embedder` interface. It integrates seamlessly with Eino’s embedding system and provides text vectorization.

## Features

- Implements `github.com/cloudwego/eino/components/embedding.Embedder`
- Easy to integrate into Eino RAG workflows
- Built‑in token usage tracking
- Automatically batches large text arrays
- Built‑in callback support

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/embedding/tencentcloud
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/cloudwego/eino-ext/components/embedding/tencentcloud"
)

func main() {
    ctx := context.Background()

    // config
    cfg := &tencentcloud.EmbeddingConfig{
        SecretID:  os.Getenv("TENCENTCLOUD_SECRET_ID"),
        SecretKey: os.Getenv("TENCENTCLOUD_SECRET_KEY"),
        Region:    "ap-guangzhou",
    }

    // create embedder
    embedder, err := tencentcloud.NewEmbedder(ctx, cfg)
    if err != nil {
        panic(err)
    }

    // get embeddings
    embeddings, err := embedder.EmbedStrings(ctx, []string{"hello world", "bye world"})
    if err != nil {
        panic(err)
    }

    fmt.Printf("Embeddings: %v\n", embeddings)
}
```

## Configuration

Configure via `EmbeddingConfig`:

```go
type EmbeddingConfig struct {
    SecretID  string // Tencent Cloud Secret ID
    SecretKey string // Tencent Cloud Secret Key
    Region    string // Tencent Cloud region (e.g., "ap-guangzhou")
}
```

## Details

### Auto Batching

Automatically handles large text arrays. Per Tencent Cloud API limits, a single request can process up to 200 texts; the embedder splits larger arrays into proper batches.

### Token Usage Tracking

Tracks token usage via Eino’s callback system:
- input token count
- total token count

### Callback Support

Fully supports Eino callbacks:
- error tracking
- start/end event monitoring
- token usage statistics

## More Information

- Tencent Hunyuan API: https://cloud.tencent.com/document/product/1729/102832
- Eino docs: https://github.com/cloudwego/eino
