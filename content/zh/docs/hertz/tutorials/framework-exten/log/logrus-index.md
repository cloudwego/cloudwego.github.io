---
title: "logrus概览"
linkTitle: "logrus概览"
weight: 2
description: >

---

## 下载并安装：
```shell
go get github.com/hertz-contrib/logger/logrus
```

## 简单用法示例：
```go
package main

import (
    "context"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    hertzlogrus "github.com/hertz-contrib/logger/logrus"
)

func main() {
    logger := hertzlogrus.NewLogger()
    hlog.SetLogger(logger)

    ...

    hlog.CtxInfof(context.Background(), "hello %s", "hertz")
}
```

