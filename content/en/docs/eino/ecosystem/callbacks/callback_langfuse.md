---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Callback - Langfuse
weight: 0
---

Eino encapsulates langfuse's trace capabilities based on [Eino: Callback Manual](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) capabilities (see [https://langfuse.com/docs/get-started](https://langfuse.com/docs/get-started)).

An example usage is as follows:

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
    
    **callbacks**.InitCallbackHandlers([]**callbacks**._Handler_{cbh}) // Set langfuse as a global callback
    
    g := NewGraph[string,string]()
    /*
    * compose and run graph
    */
    
    flusher() // Exit after all trace reporting is complete
}
```

You can view the trace in the Langfuse project:

<a href="/img/eino/langfuse_callback.gif" target="_blank"><img src="/img/eino/langfuse_callback.gif" width="100%" /></a>
