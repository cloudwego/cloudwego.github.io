---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Callback - APMPlus
weight: 0
---

Eino encapsulates APMPlus's trace and metrics capabilities based on [Eino: Callback Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) capabilities (see [Document](https://www.volcengine.com/docs/6431/69092) and [Console](https://console.volcengine.com/apmplus-server)).

## Features

- Implements `github.com/cloudwego/eino/callbacks.Handler`
- Implements session functionality to associate multiple requests in a single session and conduct [AI Session Analysis](https://www.volcengine.com/docs/6431/1587839)
- Easy integration with Eino's application

## Installation

```bash
go get github.com/cloudwego/eino-ext/callbacks/apmplus
```

## Quick Start

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
    runner, _ := g.Compile(ctx)
	// To set session information, use apmplus.SetSession method
	ctx = apmplus.SetSession(ctx, apmplus.WithSessionID("your_session_id"), apmplus.WithUserID("your_user_id"))
	// Execute the runner
	result, _ := runner.Invoke(ctx, "input")
	/*
	 * Process the result
	 */
    
    // Exit after all trace and metrics reporting is complete
    showdown(ctx)
}
```

You can view the trace and metrics in the [APMPlus](https://console.volcengine.com/apmplus-server):

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>

After passing the Session information when calling the Eino application, you can view [AI Session Analysis](https://www.volcengine.com/docs/6431/1587839) in APMPlus:

<a href="/img/eino/eino_callback_apmplus_session1.png" target="_blank"><img src="/img/eino/eino_callback_apmplus_session1.png" width="100%" /></a>

<a href="/img/eino/eino_callback_apmplus_session2.png" target="_blank"><img src="/img/eino/eino_callback_apmplus_session2.png" width="100%" /></a>
