---
Description: ""
date: "2025-12-01"
lastmod: ""
tags: []
title: Tool - DuckDuckGoSearch
weight: 0
---

## **基本介绍**

DuckDuckGo 搜索工具是 Tool InvokableTool 接口的一个实现，用于通过 DuckDuckGo 搜索引擎进行网络搜索，DuckDuckGo 是一个注重隐私的搜索引擎，不会追踪用户的搜索行为，重点是无需 api key 鉴权即可直接使用。该组件实现了 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)

## **使用方式**

### **组件初始化**

DuckDuckGo 搜索工具通过 `NewTextSearchTool` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/tool/duckduckgo/v2"

tool, err := duckduckgo.NewTextSearchTool(ctx, &duckduckgo.Config{
    ToolName:    "duckduckgo_search",     
    ToolDesc:    "search for information by duckduckgo",
    Region:      ddgsearch.RegionWT,      // The geographical region for results.
    MaxResults:  3,                      // Limit the number of results returned.
})
```

### **搜索参数**

搜索请求支持以下参数：

```go
type TextSearchRequest struct {
    // Query is the user's search query
    Query string `json:"query"`
    // TimeRange is the search time range
    // Default: TimeRangeAny
    TimeRange TimeRange `json:"time_range"`
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
    "time"

    "github.com/cloudwego/eino-ext/components/tool/duckduckgo/v2"
)

func main() {
    ctx := context.Background()

    // Create configuration
    config := &duckduckgo.Config{
       MaxResults: 3, // Limit to return 20 results
       Region:     duckduckgo.RegionWT,
       Timeout:    10 * time.Second,
    }

    // Create search client
    tool, err := duckduckgo.NewTextSearchTool(ctx, config)
    if err != nil {
       log.Fatalf("NewTextSearchTool of duckduckgo failed, err=%v", err)
    }

    results := make([]*duckduckgo.TextSearchResult, 0, config.MaxResults)

    searchReq := &duckduckgo.TextSearchRequest{
       Query: "eino",
    }
    jsonReq, err := json.Marshal(searchReq)
    if err != nil {
       log.Fatalf("Marshal of search request failed, err=%v", err)
    }

    resp, err := tool.InvokableRun(ctx, string(jsonReq))
    if err != nil {
       log.Fatalf("Search of duckduckgo failed, err=%v", err)
    }

    var searchResp duckduckgo.TextSearchResponse
    if err = json.Unmarshal([]byte(resp), &searchResp); err != nil {
       log.Fatalf("Unmarshal of search response failed, err=%v", err)
    }

    results = append(results, searchResp.Results...)

    // Print results
    fmt.Println("Search Results:")
    fmt.Println("==============")
    fmt.Printf("%s\n", searchResp.Message)
    for i, result := range results {
       fmt.Printf("\n%d. Title: %s\n", i+1, result.Title)
       fmt.Printf("   URL: %s\n", result.URL)
       fmt.Printf("   Summary: %s\n", result.Summary)
    }
    fmt.Println("")
    fmt.Println("==============")
}
```

### **搜索结果示例**

```json
{
    "message": "Found 3 results successfully.",
    "results": [
        {
            "title": "GitHub - cloudwego/eino: The ultimate LLM/AI application development ...",
            "url": "https://github.com/cloudwego/eino",
            "summary": "Eino ['aino] (pronounced similarly to \"I know\") aims to be the ultimate LLM application development framework in Golang. Drawing inspirations from many excellent LLM application development frameworks in the open-source community such as LangChain & LlamaIndex, etc., as well as learning from cutting-edge research and real world applications, Eino offers an LLM application development framework ..."
        },
        {
            "title": "Eino: Overview | CloudWeGo",
            "url": "https://www.cloudwego.io/docs/eino/overview/",
            "summary": "Eino is a framework that simplifies and standardizes the development of LLM applications in Golang. It provides component abstractions, orchestration APIs, best practices, tools and examples for building and running LLM applications."
        }
  {
            "title": "Home - Eino - AI powered network planning",
            "url": "https://www.eino.ai/",
            "summary": "An easy-to-use, AI powered networking planning app that helps network planners create digital twins for their projects and plan every network type."
        }
    ]
}
```

## **相关文档**

- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Tool - Googlesearch](/zh/docs/eino/ecosystem_integration/tool/tool_googlesearch)
- [DuckDuckGo 帮助文档](https://duckduckgo.com/duckduckgo-help-pages/settings/params/)
