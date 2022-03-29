---
title: "日志"
date: 2021-08-26
weight: 12
description: >
---


## pkg/klog

Kitex 在 pkg/klog 里定义了 `Logger`、`CtxLogger`、`FormatLogger` 等几个接口，并提供了一个 `FormatLogger` 的默认实现，可以通过 `klog.DefaultLogger()` 获取到其实例。

pkg/klog 同时也提供了若干全局函数，例如 `klog.Info`、`klog.Errorf` 等，用于调用默认 logger 的相应方法。

注意，由于默认 logger 底层使用标准库的 `log.Logger` 实现，其在日志里输出的调用位置依赖于设置的调用深度（call depth），因此封装 klog 提供的实现可能会导致日志内容里文件名和行数不准确。

## 注入自己的 logger 实现

可以用 `klog.SetLogger` 来替换掉默认的 logger 实现。

## 重定向默认 logger 的输出

可以使用 `klog.SetOutput` 来重定向 klog 提供的默认 logger 的输出。

例如，要把默认 logger 的输出重定向到启动路径下的 ./output.log，可以这样实现：

```go
package main
import (
    "os"
    "github.com/cloudwego/kitex/pkg/klog"
)
func main() {
    f, err := os.OpenFile("./output.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
    	panic(err)
    }
    defer f.Close()
    klog.SetOutput(f)
    ... // continue to set up your server
}
```
