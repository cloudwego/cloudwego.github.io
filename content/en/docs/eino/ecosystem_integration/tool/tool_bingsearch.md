---
Description: ""
date: "2025-03-20"
lastmod: ""
tags: []
title: Tool - Bingsearch
weight: 0
---

## Bing Search Tool

This is a Bing search tool for [Eino](https://github.com/cloudwego/eino) implementing the `InvokableTool` interface. It integrates seamlessly with Eino’s ChatModel interaction system and `ToolsNode`.

## Features

- Implements `github.com/cloudwego/eino/components/tool.InvokableTool`
- Easy integration with Eino’s tool system
- Configurable search parameters

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/tool/bingsearch
```

## Quick Start

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    "github.com/bytedance/sonic"
    "github.com/cloudwego/eino-ext/components/tool/bingsearch"
)

func main() {
    // Set Bing Search API key
    bingSearchAPIKey := os.Getenv("BING_SEARCH_API_KEY")

    // Create context
    ctx := context.Background()

    // Create Bing Search tool
    bingSearchTool, err := bingsearch.NewTool(ctx, &bingsearch.Config{
        APIKey: bingSearchAPIKey,
        Cache:  5 * time.Minute,
    })

    if err != nil {
        log.Fatalf("Failed to create tool: %v", err)
    }
    // ... configure and use ToolsNode
}
```

## Configuration

Tool is configurable via `Config`:

```go
// Config represents the Bing search tool configuration.
type Config struct {
    // ToolName: optional, default "bing_search"
    ToolName string `json:"tool_name"`
    // ToolDesc: optional, default "search web for information by bing"
    ToolDesc string `json:"tool_desc"`

    // APIKey: required
    APIKey     string     `json:"api_key"`
    // Region: optional, default ""
    Region     Region     `json:"region"`
    // MaxResults: optional, default 10
    MaxResults int        `json:"max_results"`
    // SafeSearch: optional, default SafeSearchModerate
    SafeSearch SafeSearch `json:"safe_search"`
    // TimeRange: optional, default nil
    TimeRange  TimeRange  `json:"time_range"`

    // Headers: optional, default map[string]string{}
    Headers    map[string]string `json:"headers"`
    // Timeout: optional, default 30 * time.Second
    Timeout    time.Duration     `json:"timeout"`
    // ProxyURL: optional, default ""
    ProxyURL   string            `json:"proxy_url"`
    // Cache: optional, default 0 (disabled)
    Cache      time.Duration     `json:"cache"`
    // MaxRetries: optional, default 3
    MaxRetries int               `json:"max_retries"`
}
```

## Search
### Request Schema

```go
type SearchRequest struct {
    Query  string `json:"query" jsonschema_description:"The query to search the web for"`
    Offset int    `json:"page" jsonschema_description:"The index of the first result to return, default is 0"`
}
```

### Response Schema

```go
type SearchResponse struct {
    Results []*searchResult `json:"results" jsonschema_description:"The results of the search"`
}

type searchResult struct {
    Title       string `json:"title" jsonschema_description:"The title of the search result"`
    URL         string `json:"url" jsonschema_description:"The link of the search result"`
    Description string `json:"description" jsonschema_description:"The description of the search result"`
}
```

## More Details

- [DuckDuckGo Search Tool](tool_duckduckgo_search/)
- [Eino Documentation](https://github.com/cloudwego/eino)
