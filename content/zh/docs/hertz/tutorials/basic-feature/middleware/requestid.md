---
title: "Request ID"
date: 2022-10-01
weight: 7
description: >

---

## 简介

Hertz 框架的 [Request ID 中间件](https://github.com/hertz-contrib/requestid)，参考了gin的[实现](https://github.com/gin-contrib/requestid)，可以在响应头中添加一个键为`X-Request-ID`的标识符，如果在请求头中设置了`X-Request-ID`属性，则会在响应头中将`X-Request-ID`原样返回。

## 安装

下载并安装

```shell
go get github.com/hertz-contrib/requestid
```

导入

```go
import "github.com/hertz-contrib/requestid"
```

## 代码示例

### 基本使用

使用后Hertz会在响应头中添加键为`X-Request-ID`的标识符

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		requestid.New(),
	)

	// Example ping request.
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### 自定义Request ID键值

使用后Hertz会在响应头中添加键为`Your-Header-StrKey`的标识符

注意：如果需要在请求头中设置`X-Request-ID`，则需要保持和自定义响应头键值一致

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	// define your own header to save request id here
	h.Use(
		requestid.New(
			requestid.WithCustomHeaderStrKey("Your-Header-StrKey"),
		),
	)

	// Example ping request.
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### 自定义Request ID值生成

使用后Hertz会在响应头中添加一条键为`X-Request-ID`，值为`cloudwego.io`的键值对

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		// define your own request id generator here
		requestid.New(requestid.WithGenerator(func() string {
			return "cloudwego.io"
		})),
	)

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### 自定义Request ID Handler

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	var bar string

	h.Use(
		requestid.New(
			requestid.WithGenerator(func() string {
				return "hello"
			}),
			// define your request id handler here
			requestid.WithHandler(func(ctx context.Context, c *app.RequestContext, requestID string) {
				bar = requestID + " hertz"
			}),
		),
	)

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{
			"ping": "pong",
			"foo":  bar, // hello hertz
		})
	})

	h.Spin()
}
```

### 获取Request ID

使用`requestid.Get(c)`函数从请求头中获取Request ID，它也支持使用`requestid.WithCustomHeaderStrKey`自定义Request ID键值

注意：如果请求头中没有设置Request ID则获取的值为空

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/requestid"
)

func main() {
	h := server.Default()

	h.Use(
		requestid.New(requestid.WithGenerator(func() string {
			return "cloudwego.io"
		})),
	)

	// You may retrieve request id from header by calling requestid.Get
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{
			"ping":       "pong",
			"request-id": requestid.Get(c),
		})
	})

	h.Spin()
}
```

## 配置

核心结构体`config`的字段配置如下：

| 属性        | 介绍                            |
|-----------|-------------------------------|
| generator | 定义生成Request ID的函数，默认生成uuid标识符 |
| headerKey | 定义Request ID的键值               |
| handler   | 定义Request ID的处理函数             |
