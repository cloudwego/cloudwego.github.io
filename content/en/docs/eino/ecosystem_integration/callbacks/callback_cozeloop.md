---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Callback - CozeLoop
weight: 0
---

# **CozeLoop Callback**

This is a Trace callback implementation for [CozeLoop](https://github.com/cloudwego/eino). It implements the `Handler` interface and integrates seamlessly with Eino applications to provide enhanced observability.

## **Features**

- Implements `github.com/cloudwego/eino/internel/callbacks.Handler` interface
- Easy integration with Eino applications

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/callbacks/cozeloop
```

## **Quick Start**

```go
package main
import (
        "context"
        "log"

        ccb "github.com/cloudwego/eino-ext/callbacks/cozeloop"
        "github.com/cloudwego/eino/callbacks"
        "github.com/coze-dev/cozeloop-go"
)

func main() {
        // Set environment variables
        // COZELOOP_WORKSPACE_ID=your workspace id
        // COZELOOP_API_TOKEN=your token
        client, err := cozeloop.NewClient()
        if err != nil {
                panic(err)
        }
        defer client.Close(ctx)
        // Call once during service init
        handler := ccb.NewLoopHandler(client)
        callbacks.AppendGlobalHandlers(handler)
}
```

## **More Details**

- [CozeLoop Docs](https://github.com/coze-dev/cozeloop-go)
