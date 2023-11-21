---
title: "埋点"
date: 2023-10-28
weight: 3
keywords: ["Hertz", "Stats", "Instrumentation"]
description: Hertz 支持灵活启用基本埋点和细粒度埋点
---

## 埋点粒度

| 参数          | 介绍                     | 启用策略               |
| ------------- | ------------------------ | ---------------------- |
| LevelDisabled | 禁用埋点                 | 无 tracer 时，默认启用 |
| LevelBase     | 仅启用基本埋点           |                        |
| LevelDetailed | 启用基本埋点和细粒度埋点 | 有 tracer 时，默认启用 |

## 埋点粒度控制

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/tracer/stats"
)

func main() {
    h := server.Default(server.WithTraceLevel(stats.LevelBase))
    h.Spin()
}
```

## 埋点说明

### 基本埋点

1. `HTTPStart` : 请求开始
2. `HTTPFinish` : 请求结束

### 细粒度埋点

1. `ReadHeaderStart`：读取 header 开始
2. `ReadHeaderFinish`：读取 header 结束
3. `ReadBodyStart`：读取 body 开始
4. `ReadBodyFinish`：读取 body 结束
5. `ServerHandleStart`：业务 handler 开始
6. `ServerHandleFinish`：业务 handler 结束
7. `WriteStart`：写 response 开始
8. `WriteFinish`：写 response 结束

> 如果不希望记录这些信息，可以不注册任何 tracer 或者将埋点策略设置为 `LevelDisabled`，则框架不会记录这些信息。
>
> **将链路中某节点埋点策略设置为 `LevelDisabled` 或者不注册任何 tracer，会导致本节点 span/metrics 丢失，同时也会导致链路中断。**

### 时序图

![timeline](/img/docs/hertz_tracing_timeline.png)
