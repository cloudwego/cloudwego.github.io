---
Description: ""
date: "2025-02-19"
lastmod: ""
tags: []
title: Tool - DuckDuckGoSearch
weight: 0
---

## **基本介绍**

DuckDuckGo 搜索工具是 Tool InvokableTool 接口的一个实现，用于通过 DuckDuckGo 搜索引擎进行网络搜索，DuckDuckGo 是一个注重隐私的搜索引擎，不会追踪用户的搜索行为，重点是无需 api key 鉴权即可直接使用。该组件实现了 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)

## **使用方式**

### **组件初始化**

DuckDuckGo 搜索工具通过 `NewTool` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/tool/duckduckgo"

tool, err := duckduckgo.NewTool(ctx, &duckduckgo.Config{
    ToolName:    "duckduckgo_search",     // 工具名称
    ToolDesc:    "search web for information by duckduckgo", // 工具描述
    Region:      ddgsearch.RegionWT,      // 搜索地区
    MaxResults:  10,                      // 每页结果数量
    SafeSearch:  ddgsearch.SafeSearchOff, // 安全搜索级别
    TimeRange:   ddgsearch.TimeRangeAll,  // 时间范围
    DDGConfig:   &ddgsearch.Config{},     // DuckDuckGo 配置
})
```

### **搜索参数**

搜索请求支持以下参数：

```go
type SearchRequest struct {
    Query string `json:"query"` // 搜索关键词
    Page  int    `json:"page"`  // 页码
}
```

### **完整使用示例**

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/cloudwego/eino-ext/components/tool/duckduckgo"
    "github.com/cloudwego/eino-ext/components/tool/duckduckgo/ddgsearch"
)

func main() {
    ctx := context.Background()

    // Create configuration
    config := &duckduckgo.Config{
       MaxResults: 3, // Limit to return 3 results
       Region:     ddgsearch._RegionCN_,
       DDGConfig: &ddgsearch.Config{
          Timeout:    10,
          Cache:      true,
          MaxRetries: 5,
       },
    }

    // Create search client
    tool, err := duckduckgo.NewTool(ctx, config)
    if err != nil {
       log.Fatal("Failed to create tool:", err)
    }

    // Create search request
    searchReq := &duckduckgo.SearchRequest{
       Query: "Golang programming development",
       Page:  1,
    }

    jsonReq, err := json.Marshal(searchReq)
    if err != nil {
       log.Fatal("Failed to marshal search request:", err)
    }

    // Execute search
    resp, err := tool.InvokableRun(ctx, string(jsonReq))
    if err != nil {
       log.Fatal("Search failed:", err)
    }

    var searchResp duckduckgo.SearchResponse
    if err := json.Unmarshal([]byte(resp), &searchResp); err != nil {
       log.Fatal("Failed to unmarshal search response:", err)
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

### **搜索结果示例**

```json
{
    "results": [
        {
            "title": "Go 并发编程实践",
            "description": "这是一篇关于 Go 语言并发编程的文章...",
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

## **相关文档**

- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Tool - Googlesearch](/zh/docs/eino/ecosystem_integration/tool/tool_googlesearch)
- [DuckDuckGo 帮助文档](https://duckduckgo.com/duckduckgo-help-pages/settings/params/)
