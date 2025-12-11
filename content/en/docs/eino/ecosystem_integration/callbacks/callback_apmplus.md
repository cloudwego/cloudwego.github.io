---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Callback - APMPlus
weight: 0
---

Eino provides APMPlus tracing and metrics wrappers based on [graph callbacks](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual). See APMPlus [docs](https://www.volcengine.com/docs/6431/69092) and [console](https://console.volcengine.com/apmplus-server). Example:

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
    // create apmplus handler
    cbh, showdown, err := apmplus.NewApmplusHandler(&apmplus.Config{
       Host:        "apmplus-cn-beijing.volces.com:4317",
       AppKey:      "xxx",
       ServiceName: "eino-app",
       Release:     "release/v0.0.1",
    })
    if err != nil {
       log.Fatal(err)
    }

    // set apmplus as global callback
    callbacks.AppendGlobalHandlers(cbh)

    g := NewGraph[string,string]()
    /*
     * compose and run graph
     */

    // wait until all traces and metrics are flushed before exit
    showdown(ctx)
}
```

You can view traces and metrics in [APMPlus](https://console.volcengine.com/apmplus-server):

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>
