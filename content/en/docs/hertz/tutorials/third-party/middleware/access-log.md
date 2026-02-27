---
title: "access log"
date: 2023-03-14
weight: 10
keywords: ["HTTP", "access log"]
description: "This middleware is used to hertz that logs HTTP request/response details."
---

This middleware is used to [hertz](https://github.com/cloudwego/hertz) that logs HTTP request/response details and inspired by [logger](https://github.com/gofiber/fiber/tree/master/middleware/logger).

## Install

```shell
go get github.com/hertz-contrib/logger/accesslog
```

## Example

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New())
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```

## Config

Hertz provides the `accesslog.Option` function to custom the log format and content.

### WithFormat

The `accesslog` provides `WithFormat` to help users set the format of the log, default is `[${time}] ${status} - ${latency} ${method} ${path}`. The format parameter consists of `${tag}`, The tag details are as follows [Supported tags](#supported-tags).

Function signatures:

```go
func WithFormat(s string) Option
```

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New(accesslog.WithFormat("[${time}] ${status} - ${latency} ${method} ${path} ${queryParams}")))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}

```

### WithTimeFormat

The `accesslog` provides `WithTimeFormat` to help users set the format of the `time`, default is `15:04:05`. For specific information, please refer to the [time](https://github.com/golang/go/blob/7bd22aafe41be40e2174335a3dc55431ca9548ec/src/time/format.go#L111) package of go.

Function signatures:

```go
func WithTimeFormat(s string) Option
```

Sample Code:

```go
package main

import (
	"context"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New(
		accesslog.WithTimeFormat(time.RFC822),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```

### WithTimeInterval

The `accesslog` provides `WithTimeInterval` to help the user set the update interval of the timestamp, default is `500ms`.

Function signatures:

```go
func WithTimeInterval(t time.Duration) Option
```

Sample Code:

```go
package main

import (
	"context"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New(
		accesslog.WithTimeInterval(time.Second),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}

```

### WithAccessLogFunc

The `accesslog` provides `WithAccessLogFunc` to help users set the log printing functions.

Function signatures:

```go
func WithAccessLogFunc(f func(ctx context.Context, format string, v ...interface{})) Option
```

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New(
		accesslog.WithAccessLogFunc(hlog.CtxInfof),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```

### WithTimeZoneLocation

The `accesslog` provides `WithTimeZoneLocation` to help users set the log printing location.

Function signatures:

```go
func WithTimeZoneLocation(loc *time.Location) Option
```

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)

	location, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return
	}
	h.Use(accesslog.New(
		accesslog.WithTimeZoneLocation(location),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```

### WithLogConditionFunc

The `accesslog` provides `WithLogConditionFunc` to allow user decide whether to print logs based on conditions.

Function signatures:

```go
func WithLogConditionFunc(f logConditionFunc) Option
```

Sample Code:

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	h := server.Default(
		server.WithHostPorts(":8080"),
	)

	h.Use(accesslog.New(
		accesslog.WithLogConditionFunc(func(ctx context.Context, c *app.RequestContext) bool {
			if c.FullPath() == "/ping" {
				return false
			}
			return true
		}),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```

## Log Format

### Default Log Format

```
[${time}] ${status} - ${latency} ${method} ${path}
```

example:

```
[21:54:36] 200 - 2.906859ms GET /ping
```

### Supported tags

| tag           | Introduction                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pid           | pid                                                                                                                                                                                    |
| time          | time                                                                                                                                                                                   |
| referer       | the [referer](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer) HTTP request header contains the absolute or partial address from which a resource has been requested |
| protocol      | protocol                                                                                                                                                                               |
| port          | port                                                                                                                                                                                   |
| ip            | the ip info in Host                                                                                                                                                                    |
| ips           | [X-Forwarded-For](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/X-Forwarded-For)                                                                                           |
| host          | host                                                                                                                                                                                   |
| method        | method                                                                                                                                                                                 |
| path          | path                                                                                                                                                                                   |
| url           | url                                                                                                                                                                                    |
| ua            | User-Agent                                                                                                                                                                             |
| latency       | latency                                                                                                                                                                                |
| status        | the status code of response                                                                                                                                                            |
| resBody       | response body                                                                                                                                                                          |
| reqHeaders    | request headers                                                                                                                                                                        |
| resHeaders    | response headers                                                                                                                                                                       |
| queryParams   | request parameters                                                                                                                                                                     |
| body          | request body                                                                                                                                                                           |
| bytesSent     | the length of response body                                                                                                                                                            |
| bytesReceived | the length of request body                                                                                                                                                             |
| route         | the path of route                                                                                                                                                                      |

### Custom Tag

We can add custom tags to the [accesslog.Tags](https://github.com/hertz-contrib/logger/blob/2de215a9fd505da955c4646f4fe9fd3c6d5bcff5/accesslog/tag.go#L79), but please note that it is not thread-safe.

Sample Code:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/bytebufferpool"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/logger/accesslog"
)

func main() {
	accesslog.Tags["test_tag"] = func(ctx context.Context, c *app.RequestContext, buf *bytebufferpool.ByteBuffer) (int, error) {
		return buf.WriteString("test")
	}
	h := server.Default(
		server.WithHostPorts(":8080"),
	)
	h.Use(accesslog.New(accesslog.WithFormat("${test_tag}")))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{"msg": "pong"})
	})
	h.Spin()
}
```
