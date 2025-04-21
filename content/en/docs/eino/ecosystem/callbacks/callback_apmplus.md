---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Callback - APMPlus
weight: 0
---

Eino encapsulates APMPlus's trace and metrics capabilities based on [Eino: Callback Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) capabilities (see [Document](https://www.volcengine.com/docs/6431/69092) 和 [Console](https://console.volcengine.com/apmplus-server)).

An example usage is as follows:

```go
package main

import (
    "context"
    "log"
    
    "github.com/cloudwego/eino-ext/callbacks/apmplus"
    "github.com/cloudwego/eino/callbacks"
)

func main() {
    ctx := context.Background()
    // Create apmplus handler
    cbh, showdown, err := apmplus.NewApmplusHandler(&apmplus.Config{
       Host: "apmplus-cn-beijing.volces.com:4317",
       AppKey:      "appkey-xxx",
       ServiceName: "eino-app",
       Release:     "release/v0.0.1",
    })
    if err != nil {
       log.Fatal(err)
    }

    // Set apmplus as a global callback
    callbacks.AppendGlobalHandlers(cbh)
    
    g := NewGraph[string,string]()
    /*
     * compose and run graph
     */
    
    // Exit after all trace and metrics reporting is complete
    showdown(ctx)
}
```

You can view the trace and metrics in the [APMPlus](https://console.volcengine.com/apmplus-server):

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>
