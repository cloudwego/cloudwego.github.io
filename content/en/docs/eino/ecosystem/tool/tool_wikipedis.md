---
Description: ""
date: "2025-03-13"
lastmod: ""
tags: []
title: Tool - Wikipedia
weight: 0
---

## **Basic Introduction**

The Wikipedia Search Tool is an implementation of the Eino InvokableTool interface, used for search through the Wikipedia Search API. This component implements the [Eino: ToolsNode guide](/en/docs/eino/core_modules/components/tools_node_guide).

## **Usage**

### **Component Initialization**

The Wikipedia Search Tool is initialized through the `NewTool` function. The main configuration parameters are as follows:

```go
import "github.com/cloudwego/eino-ext/components/tool/wikipedia"

tool, err := wikipedia.NewTool(ctx, &wikipedia.Config{
    UserAgent:   "eino (https://github.com/cloudwego/eino)",    // Optional. HTTP client user agent
    DocMaxChars: 2000,                                          // Optional. Maximum number of characters to return page content
    Timeout:     15 * time.Second,                              // Optional. Maximum wait time for HTTP client to return response
    TopK:        3,                                             // Optional. Number of search results returned
    MaxRedirect: 3,                                             // Optional. Maximum number of redirects allowed
    Language:    "en",                                          // Optional. Language for Wikipedia search
    ToolName:    "wikipedia_search",                            // Optional. Tool name
    ToolDesc:    "this tool provides quick and efficient access to information from the Wikipedia", // Optional. Tool description
})
```

### **Search Parameters**

The search request supports the following parameters:

```go
type SearchRequest struct {
    // Query is the search query string.
    Query string `json:"query" jsonschema_description:"The query to search the web for"`
}
```

### **Complete Usage Example**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/bytedance/sonic"
    "github.com/cloudwego/eino-ext/components/tool/wikipedia"
)

func main() {
    ctx := context.Background()

    // Create configuration
    config := &wikipedia.Config{
        UserAgent:   "eino",
        DocMaxChars: 2000,
        Timeout:     15 * time.Second,
        TopK:        3,
        MaxRedirect: 3,
        Language:    "en",
    }

    // Create wikipedia tool
    tool, err := wikipedia.NewTool(ctx, config)
    if err != nil {
        log.Fatal("Failed to create tool:", err)
    }

    // Create search request
    m, err := sonic.MarshalString(wikipedia.SearchRequest{"bytedance"})
    if err != nil {
        log.Fatal("Failed to marshal search request:", err)
    }

    // Execute search
    resp, err := tool.InvokableRun(ctx, m)
    if err != nil {
        log.Fatal("Search failed:", err)
    }

    var searchResponse wikipedia.SearchResponse
    if err = sonic.Unmarshal([]byte(resp), &searchResponse); err != nil {
        log.Fatal("Failed to unmarshal search response:", err)
    }

    // Print results
    fmt.Println("Search Results:")
    fmt.Println("==============")
    for _, r := range searchResponse.Results {
        fmt.Printf("Title: %s\n", r.Title)
        fmt.Printf("URL: %s\n", r.URL)
        fmt.Printf("Summary: %s\n", r.Extract)
        fmt.Printf("Snippet: %s\n", r.Snippet)
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
      "title": "ByteDance",
      "url": "https://en.wikipedia.org/wiki/ByteDance",
      "extract": "ByteDance Ltd. is a Chinese internet technology company headquartered in Haidian...",
      "snippet": "ByteDance Ltd. is a Chinese internet technology company headquartered in Haidian..."
    },
    {
      "title": "TikTok",
      "url": "https://en.wikipedia.org/wiki/TikTok",
      "extract": "TikTok, known in mainland China and Hong Kong as Douyin (Chinese: 抖音; pinyin: Dǒuyīn; lit. 'Shaking Sound')...",
      "snippet": "a short-form video-hosting service owned by Chinese Internet company ByteDance. It hosts user-submitted videos..."
    },
    {
      "title": "Zhang Yiming",
      "url": "https://en.wikipedia.org/wiki/Zhang%20Yiming",
      "extract": "Zhang Yiming (Chinese: 张一鸣; born 1 April 1983) is a Chinese Internet entrepreneur...",
      "snippet": "张一鸣; born 1 April 1983) is a Chinese Internet entrepreneur. He founded ByteDance in 2012..."
    }
  ]
}
```

## **Related Documentation**

- [Eino: ToolsNode guide](/en/docs/eino/core_modules/components/tools_node_guide)
- [Wikipedia API Documentation](https://www.mediawiki.org/wiki/API:Search)
