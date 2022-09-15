---
title: "Gzip Compress"
date: 2022-09-15
weight: 4
description: >

---

In HTTP, GNUzip(Gzip) compression coding is a way to optimize the performance of Web applications, and Hertz also provides an [implementation](https://github.com/hertz-contrib/gzip) of Gzip.

Refer to the below for usage [example](https://github.com/hertz-contrib/gzip/tree/main/example)

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

Refer to the [gzip](https://github.com/hertz-contrib/gzip) for more usage examples
