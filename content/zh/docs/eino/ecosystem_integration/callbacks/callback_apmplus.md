---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Callback - APMPlus
weight: 0
---

Eino 基于 [graph callback](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) 能力封装了 APMPlus 的 trace 和 metrics 能力（参见 [文档](https://www.volcengine.com/docs/6431/69092) 和 [控制台](https://console.volcengine.com/apmplus-server)），使用示例如下：

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
    // 创建apmplus handler
    cbh, showdown, err := apmplus.NewApmplusHandler(&apmplus.Config{
       Host: "apmplus-cn-beijing.volces.com:4317",
       AppKey:      "appkey-xxx",
       ServiceName: "eino-app",
       Release:     "release/v0.0.1",
    })
    if err != nil {
       log.Fatal(err)
    }

    // 设置apmplus为全局callback
    callbacks.InitCallbackHandlers([]callbacks.Handler{cbh})

    g := NewGraph[string,string]()
    /*
     * compose and run graph
     */

    // 等待所有trace和metrics上报完成后退出
    showdown(ctx)
}
```

可以在 [APMPlus](https://console.volcengine.com/apmplus-server) 中查看 trace 和 metrics：

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>
