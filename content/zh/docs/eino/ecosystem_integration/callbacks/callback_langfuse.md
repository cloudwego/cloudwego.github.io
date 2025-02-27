---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Callback - Langfuse
weight: 0
---

Eino 基于 [graph callback](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) 能力封装了 langfuse 的 trace 能力（参见 [https://langfuse.com/docs/get-started](https://langfuse.com/docs/get-started)），使用示例如下：

```go
package main

import (
    "github.com/cloudwego/eino-ext/callbacks/langfuse"
    "github.com/cloudwego/eino/callbacks"
)

func main() {
    cbh, flusher := NewLangfuseHandler(&_Config_{
        Host: "https://cloud.langfuse.com",
        PublicKey: "pk-xxx",
        SecretKey: "sk-xxx",
    })
    
    **callbacks**.InitCallbackHandlers([]**callbacks**._Handler_{cbh}) // 设置langfuse为全局callback
    
    g := NewGraph[string,string]()
    /*
    * compose and run graph
    */
    
    flusher() // 等待所有trace上报完成后退出
}
```

可以在 Langfuse project 中查看 trace：

<a href="/img/eino/eino_callback_langfuse_usage.gif" target="_blank"><img src="/img/eino/eino_callback_langfuse_usage.gif" width="100%" /></a>
