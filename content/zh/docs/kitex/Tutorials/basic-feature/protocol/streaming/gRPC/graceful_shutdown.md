---
title: "gRPC Streaming 优雅退出"
date: 2025-01-10
weight: 4
keywords: ["优雅退出"]
description: "本文介绍如何使用 gRPC Streaming 优雅突出"
---

## 背景

为了有效解决因服务升级/迁移而导致上游报错的问题，Kitex 在新版本(v0.12.0)中支持 gRPC Streaming 优雅退出功能。

通过设置合理的窗口时间，使得生命周期小于这个窗口的流能持续工作直到结束，而生命周期大于这个窗口的流会被强制关闭。

## 使用方式

### 确认窗口时间

在开始配置前，请根据业务统计，得到当前服务中流的持续时间分布，从而确立一个合理的**窗口时间**，记为 graceTime，例如：

- 所有流都能在 5 分钟内完成，且 5 分钟是可接受的服务升级时间，则 graceTime 为 5 分钟
- 大部分流都能在 5 分钟内完成，极少部分流会持续 30 分钟，则 graceTime 依然可以设为 5 分钟，超过 graceTime 的流被强制关闭

### 配置

创建 Server 时，传入 `server.WithExitWaitTime(graceTime)`

如果不配置，默认 **5 s**。

```go
import (
    "github.com/cloudwego/kitex/server"
)

const (
    graceTime = 600 * time.Second
)

svr := testservice.NewServer(hdl, server.WithExitWaitTime(graceTime))
```
