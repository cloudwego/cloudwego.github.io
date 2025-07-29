---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Callback - APMPlus
weight: 0
---

Eino 基于 [graph callback](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual) 能力封装了 APMPlus 的 trace 和 metrics 能力（参见 [文档](https://www.volcengine.com/docs/6431/69092) 和 [控制台](https://console.volcengine.com/apmplus-server)）

## 特性

- 实现了 `github.com/cloudwego/eino/callbacks.Handler` 接口
- 实现了会话功能，能够将 Eino 应用中的同一个会话里的多个请求关联起来，并进行 [AI 会话分析](https://www.volcengine.com/docs/6431/1587839)
- 易于与 Eino 应用集成

## 安装

```bash
go get github.com/cloudwego/eino-ext/callbacks/apmplus
```

## 快速开始

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
    callbacks.AppendGlobalHandlers(cbh)

    g := NewGraph[string,string]()
    /*
     * compose and run graph
     */
    runner, _ := g.Compile(ctx)
    runner.Run(ctx)

    // 如想设置会话信息, 可通过 apmplus.SetSession 方法
	ctx = apmplus.SetSession(ctx, apmplus.WithSessionID("your_session_id"), apmplus.WithUserID("your_user_id"))

    // 执行 runner
	result, _ := runner.Invoke(ctx, "input")
	/*
	 * 处理结果
    */

    // 等待所有trace和metrics上报完成后退出
    showdown(ctx)
}
```

可以在 [APMPlus](https://console.volcengine.com/apmplus-server) 中查看 trace 和 metrics：

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>

在调用 Eino 应用过程中传入 Session 信息后，可以在 APMPlus 中查看 [AI 会话分析](https://www.volcengine.com/docs/6431/1587839)：

<a href="/img/eino/eino_callback_apmplus_session1.png" target="_blank"><img src="/img/eino/eino_callback_apmplus_session1.png" width="100%" /></a>

<a href="/img/eino/eino_callback_apmplus_session2.png" target="_blank"><img src="/img/eino/eino_callback_apmplus_session2.png" width="100%" /></a>
