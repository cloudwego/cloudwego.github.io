---
Description: ""
date: "2025-03-18"
lastmod: ""
tags: []
title: Callback - Langfuse
weight: 0
---

Eino provides Langfuse tracing wrappers based on [graph callbacks](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) (see https://langfuse.com/docs/get-started). Example:

```go
package main

import (
    "github.com/cloudwego/eino-ext/callbacks/langfuse"
    "github.com/cloudwego/eino/callbacks"
)

func main() {
    cbh, flusher := NewLangfuseHandler(&Config{
        Host: "https://cloud.langfuse.com",
        PublicKey: "pk-xxx",
        SecretKey: "sk-xxx",
    })

    callbacks.AppendGlobalHandlers(cbh) // set langfuse as global callback

    g := NewGraph[string,string]()
    /*
    * compose and run graph
    */

    flusher() // wait until all traces are flushed before exit
}
```

You can view traces in the Langfuse project:

<a href="/img/eino/eino_callback_langfuse_usage.gif" target="_blank"><img src="/img/eino/eino_callback_langfuse_usage.gif" width="100%" /></a>
