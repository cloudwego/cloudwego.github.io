---
title: "Logging"
date: 2021-08-26
weight: 12
description: >
---

## pkg/klog

Kitex defines serveral interfaces in the package `pkg/klog`: `Logger`, `CtxLoggerKey` and `FormatLogger`. And it provides a default logger that implements those interfaces and can be accessed by calling `klog.DefaultLogger()`.

There are global functions in the package `pkg/klog` that expose the ability of the default logger, like `klog.Info`, `klog.Errorf` and so on.

Note that the default logger uses the `log.Logger` from the standard library as its underlying output. So the filename and line number shown in the log messages depend on the setting of call depth. Thus wrapping the implementation of `klog.DefaultLogger` may causes inaccuracies for these two value.

## Injecting your own logger

You can use `klog.SetLogger` to replace the default logger.


## Redirecting the Output of the Default Logger

The `klog.SetOutput` can be used to redirect the output of the default logger provided by the pkg/klog package.
