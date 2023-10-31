---
title: "Instrumentation"
date: 2023-10-28
weight: 3
keywords: ["Hertz", "Stats", "Instrumentation"]
description: Hertz supports flexible enabling of basic and fine-grained Instrumentation
---

## Stats Level

| Option        | Description                             | Enable Strategy                                  |
| ------------- | --------------------------------------- | ------------------------------------------------ |
| LevelDisabled | disable all events                      | When tracer is not available, enable by default. |
| LevelBase     | enable basic events                     |                                                  |
| LevelDetailed | enable basic events and detailed events | When tracer is available, enable by default.     |

## Stats Level Control

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

## Stats introduction

### Basic Stats Event

1. `HTTPStart` : Http start
2. `HTTPFinish` : Http finish

### Detailed Stats Event

1. `ReadHeaderStart`：read header start
2. `ReadHeaderFinish`：read header finish
3. `ReadBodyStart`：read body start
4. `ReadBodyFinish`：read body finish
5. `ServerHandleStart`：server handler start
6. `ServerHandleFinish`：server handler finish
7. `WriteStart`：write response start
8. `WriteFinish`：write response finish

> If you do not want to record this information, you can either not register any tracer or set the tracking strategy to LevelDisabled, and the framework will not record this information.
>
> - **Setting the stats level of a certain node in the tracing to `LevelDisabled` will result in the loss of spans/metrics for that node, but it will not cause the tracing to be interrupted.**
> - **Not registering any tracer will also result in the loss of spans/metrics for that node, and it will also cause the tracing to be interrupted.**

### Timeline

![timeline](/img/docs/hertz_tracing_timeline.png)
