---
title: "Gzip Compress"
date: 2022-10-19
weight: 4
keywords: ["Gzip", "Compress"]
description: "Hertz provides an implementation of Gzip."
---

In HTTP, GNUzip(Gzip) compression coding is a way to optimize the performance of Web applications, and Hertz also provides an [implementation](https://github.com/hertz-contrib/gzip) of Gzip.

## Install

```sh
go get github.com/hertz-contrib/gzip
```

## Example

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

### Gzip Stream

If the user has a need for gzip compression combined with chunked streaming writing, they can use this middleware. The behavior of this middleware is to chunk each chunk, compress it with gzip, and then send it to the client. Each chunk is a separate compressed data, so each chunk received by the client can be independently decompressed and used.

> Note: Using this middleware will hijack the response writer and may have an impact on other interfaces. Therefore, it is only necessary to use this middleware on interfaces with streaming gzip requirements.

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

## Config

> The following configuration is also applicable to `Gzip Stream`.

`Gzip` provides four compression options: `BestCompression`, `BestSpeed`, `DefaultCompression`, `NoCompression` for user-defined compression modes

| Options            | Description                              |
| ------------------ | ---------------------------------------- |
| BestCompression    | Provides the best file compression ratio |
| BestSpeed          | Provides the best compression speed      |
| DefaultCompression | Default compression rate                 |
| NoCompression      | No compression                           |

Function Signature:

```go
func Gzip(level int, options ...Option) app.HandlerFunc
```

Sample Code:

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

`gzip` provides `WithExcludeExtensions` to help users set file extensions that do not require `gzip` compression, the default values are `.png`, `.gif`, `.jpeg`, `.jpg`

Function Signature:

```go
func WithExcludedPaths(args []string) Option
```

Sample Code:

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

`gzip` provides `WithExcludedPaths` to help users set the paths of files they do not want to compress with `gzip`

Function Signature:

```go
func WithExcludedPaths(args []string) Option
```

Sample Code:

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

`gzip` provides `WithExcludedPathRegexes` to help users set custom regular expressions to filter out files that do not need to be compressed by `gzip`

Function Signature

```go
func WithExcludedPathRegexes(args []string) Option
```

Sample Code:

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

Refer to the [gzip](https://github.com/cloudwego/hertz-examples/tree/main/middleware/gzip) for more usage examples
