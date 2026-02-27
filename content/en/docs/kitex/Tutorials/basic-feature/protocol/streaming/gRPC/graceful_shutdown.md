---
title: "gRPC Streaming Graceful Shutdown"
date: 2025-01-13
weight: 4
keywords: ["gRPC Streaming Graceful Shutdown"]
description: "This article describes how to use Graceful Shutdown over gRPC"
---

## Background

To effectively solve the problem of upstream error reporting caused by service upgrade/migration, Kitex supports the graceful shutdown function of gRPC Streaming in the new version (v0.12.0).

By setting a reasonable window time, the streams with a lifetime shorter than this window can continue to work until the end, while the streams with a lifetime longer than this window will be forcibly closed.

## Usage

### Confirm the window time

Before starting the configuration, please obtain the duration distribution of the streams in the current service based on business statistics, and thereby establish a reasonable window time, denoted as **graceTime**, for example:

- All streams can be completed within 5 minutes, and 5 minutes is an acceptable service upgrade time, then **graceTime** is 5 minutes.
- Most streams can be completed within 5 minutes, and very few streams will last for 30 minutes, then **graceTime** can still be set to 5 minutes, and the flows exceeding graceTime will be forcibly closed.

### Configuration

When creating the Server, pass `server.WithExitWaitTime(graceTime)`.

If not configured, the default is **5 s**.

```go
import (
    "github.com/cloudwego/kitex/server"
)

const (
    graceTime = 600 * time.Second
)

svr := testservice.NewServer(hdl, server.WithExitWaitTime(graceTime))
```
