---
title: "Logger Extension"
linkTitle: "Logger Extension"
weight: 1
date: 2022-06-22
keywords: ["Logger Extension"]
description: "Hertz provides logger extension, and the interface is defined in `pkg/common/hlog`."
---

Hertz provides logger extension, and the interface is defined in `pkg/common/hlog`.

## Interface Definition

In Hertz, the interfaces `Logger`, `CtxLogger`, `FormatLogger` are defined in `pkg/common/hlog`, and these interfaces are used to output logs in different ways, and a `Control` interface is defined to control the logger.
If you'd like to inject your own logger implementation, you must implement all the above interfaces (i.e. FullLogger). Hertz already provides a default implementation of `FullLogger`.

```go
// FullLogger is the combination of Logger, FormatLogger, CtxLogger and Control.
type FullLogger interface {
    Logger
    FormatLogger
    CtxLogger
    Control
}
```

> Note that the default logger makes use of the standard library `log.Logger` as its underlying output. So the filenames and line numbers shown in the log messages depend on the settings of call depth. Thus wrapping the implementation of hlog may cause inaccuracies for these two values.

## Inject your own logger

Hertz provides `SetLogger` interface to allow injection of your own logger. Besides, `SetOutput` can be used to redirect the default logger output, and then middlewares and the other components of the framework can use global methods in hlog to output logs.
By default, Hertz's default logger is used.

## Supported Log Extension

The log extensions currently supported in the open source version of Hertz are stored in the [hertz-logger](https://github.com/hertz-contrib/logger). You are welcomed to join us in contributing and maintaining for this project.
