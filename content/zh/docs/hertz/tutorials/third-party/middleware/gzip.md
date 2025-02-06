---
title: "Gzip 压缩"
date: 2022-10-19
weight: 4
keywords: ["Gzip", "压缩"]
description: "Hertz 提供了 Gzip 的实现。"
---

在 HTTP 中，GNUzip(Gzip) 压缩编码是一种用来优化 Web 应用程序性能的方式，并且 Hertz 也提供了 Gzip 的 [实现](https://github.com/hertz-contrib/gzip) 。

## 安装

```sh
go get github.com/hertz-contrib/gzip
```

## 示例代码

### Gzip

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

### GzipStream

若用户有 gzip 压缩加 chunk 流式写的需求，可以使用该中间件。该中间件的行为是：将每个 chunk 分块先 gzip 压缩再发送给客户端。每个 chunk 分块都是一份独立的压缩数据，所以客户端收到的每个 chunk 分块都可以独立解压使用。

> 注意：使用该中间件会劫持 response writer，可能会对其他接口造成影响，因此，只需要在有流式 gzip 需求的接口使用该中间件。

```go
package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"strings"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/compress"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/gzip"
)

func main() {
	h := server.Default(server.WithHostPorts(":8081"))

	// Note: Using this middleware will hijack the response writer and may have an impact on other interfaces.
	// Therefore, it is only necessary to use this middleware on interfaces with streaming gzip requirements.
	h.GET("/ping", gzip.GzipStream(gzip.DefaultCompression), func(ctx context.Context, c *app.RequestContext) {
		for i := 0; i < 10; i++ {
			c.Write([]byte(fmt.Sprintf("chunk %d: %s\n", i, strings.Repeat("hi~", i)))) // nolint: errcheck
			c.Flush()                                                                   // nolint: errcheck
			time.Sleep(time.Second)
		}
	})
	go h.Spin()

	cli, err := client.NewClient(client.WithResponseBodyStream(true))
	if err != nil {
		panic(err)
	}

	req := protocol.AcquireRequest()
	res := protocol.AcquireResponse()

	req.SetMethod(consts.MethodGet)
	req.SetRequestURI("http://localhost:8081/ping")
	req.Header.Set("Accept-Encoding", "gzip")

	if err = cli.Do(context.Background(), req, res); err != nil {
		panic(err)
	}

	bodyStream := res.BodyStream()

	r, err := compress.AcquireGzipReader(bodyStream)
	if err != nil {
		panic(err)
	}

	firstChunk := make([]byte, 10)
	_, err = r.Read(firstChunk)
	if err != nil {
		panic(err)
	}
	fmt.Println(fmt.Printf("%s", firstChunk))

	secondChunk := make([]byte, 13)
	_, err = r.Read(secondChunk)
	if err != nil {
		panic(err)
	}
	fmt.Println(fmt.Printf("%s", secondChunk))

	otherChunks, _ := ioutil.ReadAll(r)
	fmt.Println(fmt.Printf("%s", otherChunks))

	if r != nil {
		compress.ReleaseGzipReader(r)
	}
}
```

## 配置

> 以下配置对 `GzipStream` 同样适用。

`Gzip` 提供了四种压缩选项:`BestCompression`,`BestSpeed`,`DefaultCompression`,`NoCompression` 用于用户自定义压缩模式

| 选项               | 描述                 |
| ------------------ | -------------------- |
| BestCompression    | 提供最佳的文件压缩率 |
| BestSpeed          | 提供了最佳的压缩速度 |
| DefaultCompression | 默认压缩率           |
| NoCompression      | 不进行压缩           |

函数签名如下:

```go
func Gzip(level int, options ...Option) app.HandlerFunc
```

示例代码如下:

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
	// BestCompression option
	h.Use(gzip.Gzip(gzip.BestCompression))
	// BestSpeed option
	h.Use(gzip.Gzip(gzip.BestSpeed))
	// DefaultCompression option
	h.Use(gzip.Gzip(gzip.DefaultCompression))
	// NoCompression option
	h.Use(gzip.Gzip(gzip.NoCompression))
	h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}
```

### WithExcludedExtensions

`gzip` 提供 `WithExcludeExtensions` 用于帮助用户设置不需要 `gzip` 压缩的文件后缀，默认值为 `.png`, `.gif`, `.jpeg`, `.jpg`

函数签名如下:

```go
func WithExcludedPaths(args []string) Option
```

示例代码如下:

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
	h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
			gzip.WithExcludedExtensions([]string{".pdf", ".mp4"}),
		),
	)
	h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}
```

### WithExcludedPaths

`gzip` 提供了 `WithExcludedPaths` 用于帮助用户设置其不需要进行 `gzip` 压缩的文件路径

函数签名如下:

```go
func WithExcludedPaths(args []string) Option
```

示例代码如下:

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
	h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
			// This WithExcludedPaths takes as its parameter the file path
			gzip.WithExcludedPaths([]string{"/api/"}),
		),
	)
	// This is No compression
	h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	// This is the compressed
	h.GET("/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}

```

### WithExcludedPathRegexes

`gzip` 提供了 `WithExcludedPathRegexes` 用于帮助用户设置自定义的正则表达式来过滤掉不需要 `gzip` 压缩的文件

函数签名如下:

```go
func WithExcludedPathRegexes(args []string) Option
```

示例代码如下:

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
	h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
			// This WithExcludedPathRegexes takes as an argument a regular expression that describes the path to be excluded
			gzip.WithExcludedPathRegexes([]string{"/api.*"}),
		),
	)
	// This is No compression
	h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	// This is the compressed
	h.GET("/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}

```

更多用法示例详见 [gzip](https://github.com/cloudwego/hertz-examples/tree/main/middleware/gzip)
