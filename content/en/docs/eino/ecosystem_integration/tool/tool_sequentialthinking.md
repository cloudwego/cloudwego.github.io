---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Tool - sequentialthinking
weight: 0
---

## **Sequential Thinking Tool**

Sequential Thinking Tool is for dynamic and reflective problem solving. Inspired by MCP’s `sequentialthinking`, it guides a large language model to think step by step via a series of questions.

## **Features**

- Guided step-by-step thinking
- Dynamic prompts and self-reflection
- Improves problem-solving quality

## **Use Cases**

- Decompose complex problems into steps
- Plan and iterate with room for adjustments
- Analyze directions that may need correction
- Handle ambiguous scope early on
- Maintain context across multiple steps
- Filter irrelevant information

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/tool/sequentialthinking@latest
```

## **Quick Start**

```go
package main

import (
    "context"
    "fmt"
    
    "github.com/bytedance/sonic"
    
    "github.com/cloudwego/eino-ext/components/tool/sequentialthinking"
)

func main() {
    ctx := context.Background()
    tool, err := sequentialthinking.NewTool()
    if err != nil { panic(err) }
    args := &sequentialthinking.ThoughtRequest{ Thought: "This is a test thought", ThoughtNumber: 1, TotalThoughts: 3, NextThoughtNeeded: true }
    argsStr, _ := sonic.Marshal(args)
    result, err := tool.InvokableRun(ctx, string(argsStr))
    if err != nil { panic(err) }
    fmt.Println(result)
}
```
