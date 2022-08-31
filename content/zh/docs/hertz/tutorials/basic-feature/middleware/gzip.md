---
title: "Gzip 压缩"
date: 2022-09-01
weight: 4
description: >

---

在 HTTP 中，GNUzip(Gzip) 压缩编码是一种用来优化 Web 应用程序性能的方式，并且 Hertz 也提供了 Gzip 的[实现](https://github.com/hertz-contrib/gzip) 。

使用方法可参考如下 [example](https://github.com/hertz-contrib/gzip/tree/main/example)

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/gzip"
)

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
	h.Use(gzip.Gzip(gzip.DefaultCompression))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}
```

更多用法示例详见 [gzip](https://github.com/hertz-contrib/gzip)
