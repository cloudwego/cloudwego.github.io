---
title: "Gzip Compress"
date: 2022-09-25
weight: 4
description: >

---

In HTTP, GNUzip(Gzip) compression coding is a way to optimize the performance of Web applications, and Hertz also provides an [implementation](https://github.com/hertz-contrib/gzip) of Gzip.

Refer to the below for usage [example](https://github.com/hertz-contrib/gzip/tree/main/example)



## Installation

```sh
go get github.com/hertz-contrib/gzip
```

## Sample Code:
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
## Configuration

### Gzip

`Gzip` provides four compression options: `BestCompression`, `BestSpeed`, `DefaultCompression`, `NoCompression` for user-defined compression modes

| Options            | Description                              |
| ------------------ | ---------------------------------------- |
| BestCompression    | Provides the best file compression ratio |
| BestSpeed          | Provides the best compression speed      |
| DefaultCompression | Default compression rate                 |
| NoCompression      | No compression                           |

Function Signature

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
        //BestCompression option
    	h.Use(gzip.Gzip(gzip.BestCompression))
        //BestSpeed option
        h.Use(gzip.Gzip(gzip.BestSpeed))
        //DefaultCompression option
        h.Use(gzip.Gzip(gzip.DefaultCompression))
        //NoCompression option
        h.Use(gzip.Gzip(gzip.NoCompression))
		h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
			c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
		})
		h.Spin()
    }
```

### WithExcludedExtensions

`gzip` provides `WithExcludeExtensions` to help users set file extensions that do not require `gzip` compression, the default values are `.png`, `.gif`, `.jpeg`, `.jpg`

Function Signature



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
				gzip.WithExcludedPaths([]string{"/api/"}),
    		),
    	)
		h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
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
            gzip.WithExcludedPathRegexes([]string{".*"}),
		),
	)
	h.GET("/api/book", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}
```

Refer to the [gzip](https://github.com/cloudwego/hertz-examples/tree/main/gzip) for more usage examples
