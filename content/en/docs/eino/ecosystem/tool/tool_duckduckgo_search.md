---
Description: ""
date: "2025-03-19"
lastmod: ""
tags: []
title: Tool - DuckDuckGoSearch
weight: 0
---

## **Basic Introduction**

The DuckDuckGo Search Tool is an implementation of the Tool InvokableTool interface for conducting web searches through the DuckDuckGo search engine. DuckDuckGo is a privacy-focused search engine that does not track users' search behavior and can be used directly without the need for API key authentication. This component implements the [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide).

## **Usage**

### **Component Initialization**

The DuckDuckGo Search Tool is initialized through the `NewTool` function. The main configuration parameters are as follows:

```go
import "github.com/cloudwego/eino-ext/components/tool/duckduckgo"

tool, err := duckduckgo.NewTool(ctx, &duckduckgo.Config{
    ToolName:    "duckduckgo_search",     // Tool name
    ToolDesc:    "search web for information by duckduckgo", // Tool description
    Region:      ddgsearch.RegionWT,      // Search region
    MaxResults:  10,                      // Number of results per page
    SafeSearch:  ddgsearch.SafeSearchOff, // Safe search level
    TimeRange:   ddgsearch.TimeRangeAll,  // Time range
    DDGConfig:   &ddgsearch.Config{},     // DuckDuckGo configuration
})
```

### **Search Parameters**

The search request supports the following parameters:

```go
type SearchRequest struct {
    Query string `json:"query"` // Search keyword
    Page  int    `json:"page"`  // Page number
}
```

### **Complete Usage Example**

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/cloudwego/eino-ext/components/tool/duckduckgo"
    "github.com/cloudwego/eino-ext/components/tool/duckduckgo/ddgsearch"
)

func main() {
    ctx := context.Background()

    // Create configuration
    config := &duckduckgo.Config{
        MaxResults: 3, // Limit to return 3 results
        Region:     ddgsearch.RegionCN,
        DDGConfig: &ddgsearch.Config{
            Timeout:    10 * time.Second,
            Cache:      true,
            MaxRetries: 5,
        },
    }

    // Create search client
    tool, err := duckduckgo.NewTool(ctx, config)
    if err != nil {
        log.Fatalf("NewTool of duckduckgo failed, err=%v", err)
    }

    // Create search request
    searchReq := &duckduckgo.SearchRequest{
        Query: "Golang programming development",
        Page:  1,
    }

    jsonReq, err := json.Marshal(searchReq)
    if err != nil {
        log.Fatalf("Marshal of search request failed, err=%v", err)
    }

    // Execute search
    resp, err := tool.InvokableRun(ctx, string(jsonReq))
    if err != nil {
        log.Fatalf("Search of duckduckgo failed, err=%v", err)
    }

    var searchResp duckduckgo.SearchResponse
    if err := json.Unmarshal([]byte(resp), &searchResp); err != nil {
        log.Fatalf("Unmarshal of search response failed, err=%v", err)
    }

    // Print results
    fmt.Println("Search Results:")
    fmt.Println("==============")
    for i, result := range searchResp.Results {
        fmt.Printf("\n%d. Title: %s\n", i+1, result.Title)
        fmt.Printf("   Link: %s\n", result.Link)
        fmt.Printf("   Description: %s\n", result.Description)
    }
    fmt.Println("")
    fmt.Println("==============")
}
```

### **Search Result Example**

```json
{
    "results": [
        {
            "title": "Go Concurrent Programming Practice",
            "description": "This is an article about concurrent programming in Go...",
            "link": "https://example.com/article1"
        },
        {
            "title": "Understanding Concurrency in Go",
            "description": "A comprehensive guide to concurrent programming...",
            "link": "https://example.com/article2"
        }
    ]
}
```

## **Related Documentation**

- [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)
- [Tool - Googlesearch](/docs/eino/ecosystem/tool/tool_googlesearch)
- [DuckDuckGo Help Pages](https://duckduckgo.com/duckduckgo-help-pages/settings/params/)
