---
title: "访问日志"
date: 2023-03-14
weight: 10
keywords: ["HTTP", "访问日志"]
description: "访问日志可以收集所有 HTTP 请求的详细信息，包括时间、端口、请求方法等。Hertz 也提供了 access log 的实现。"
---

访问日志可以收集所有 HTTP 请求的详细信息，包括时间、端口、请求方法等。Hertz 也提供了 access log 的 [实现](https://github.com/hertz-contrib/logger)，这里的实现参考了 [fiber](https://github.com/gofiber/fiber/tree/master/middleware/logger)。

## 安装

```shell
go get github.com/hertz-contrib/logger/accesslog
```

## 示例代码

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

## 配置

用户可以通过自定义初始化配置来设置访问日志的格式以及内容。

### WithFormat

使用 `WithFormat` 自定义日志格式，默认的日志格式为 `[${time}] ${status} - ${latency} ${method} ${path}`。传入的格式方式为 `${tag}`，具体 tag 参数可以参考下面的 [支持的标签](#支持的标签)。

函数签名：

```go
func WithFormat(s string) Option
```

示例代码：

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

使用 `WithTimeFormat` 自定义时间格式，默认时间格式为 `15:04:05`，具体格式可以参考该 [链接](https://programming.guide/go/format-parse-string-time-date-example.html) 或者 go 的 [time](https://github.com/golang/go/blob/7bd22aafe41be40e2174335a3dc55431ca9548ec/src/time/format.go#L111) 包。

函数签名：

```go
func WithTimeFormat(s string) Option
```

示例代码：

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

使用 `WithTimeInterval` 配置时间戳的刷新间隔，默认值为 `500ms`。

函数签名：

```go
func WithTimeInterval(t time.Duration) Option
```

示例代码：

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

使用 `WithAccessLogFunc` 自定义日志打印函数。

函数签名：

```go
func WithAccessLogFunc(f func(ctx context.Context, format string, v ...interface{})) Option
```

示例代码：

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

使用 `WithTimeZoneLocation` 自定义时区，默认使用当地时区。

函数签名：

```go
func WithTimeZoneLocation(loc *time.Location) Option
```

示例代码：

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

使用 `WithLogConditionFunc` 可以根据条件来决定是否打印日志。

函数签名：

```go
func WithLogConditionFunc(f logConditionFunc) Option
```

示例代码：

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

## 日志格式

### 默认日志格式

```
[${time}] ${status} - ${latency} ${method} ${path}
```

例子:

```
[21:54:36] 200 - 2.906859ms GET /ping
```

### 支持的标签

| 标签          | 介绍                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| pid           | 进程 ID                                                                                                  |
| time          | 时间                                                                                                     |
| referer       | 当前请求的来源页面 [地址](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Referer)             |
| protocol      | 协议类型                                                                                                 |
| port          | 端口                                                                                                     |
| ip            | Host 中的 ip 地址                                                                                        |
| ips           | Header 中的 [X-Forwarded-For](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/X-Forwarded-For) |
| host          | HTTP 中的 Host                                                                                           |
| method        | 请求方法                                                                                                 |
| path          | 请求路径                                                                                                 |
| url           | 请求 url                                                                                                 |
| ua            | User-Agent 的缩写                                                                                        |
| latency       | 处理消息的延迟                                                                                           |
| status        | HTTP 返回的状态码                                                                                        |
| resBody       | 返回内容                                                                                                 |
| reqHeaders    | 请求的 Header 内容                                                                                       |
| resHeaders    | 返回的 Header 内容                                                                                       |
| queryParams   | 请求的 query 参数                                                                                        |
| body          | 请求的消息体内容                                                                                         |
| bytesSent     | 返回的消息体长度                                                                                         |
| bytesReceived | 请求的消息体长度                                                                                         |
| route         | 请求路由的路径                                                                                           |

### 标签扩展

支持自定义标签，前提要保证是线程安全的。

代码示例:

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
