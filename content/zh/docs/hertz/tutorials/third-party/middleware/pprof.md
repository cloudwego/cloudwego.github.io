---
title: "Pprof"
date: 2022-09-24
weight: 7
keywords: ["pprof", "性能分析"]
description: "Hertz 提供了 pprof 扩展，帮助用户对 Hertz 项目进行性能分析。"
---

Hertz 提供了 [pprof](https://github.com/hertz-contrib/pprof) 扩展，帮助用户对 Hertz 项目进行性能分析，[pprof](https://github.com/hertz-contrib/pprof) 扩展的实现参考了 [Gin](https://github.com/gin-contrib/pprof) 的实现。

## 安装

```shell
go get github.com/hertz-contrib/pprof
```

## 示例代码

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/pprof"
)

func main() {
    h := server.Default()

    pprof.Register(h)

    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
    c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

## 配置

### PrefixOptions

`pprof` 的默认前缀为 `debug/pprof`，即用户在 Hertz 项目中注册并使用 `pprof` 后，用户可以通过访问
`localhost:8888/debug/pprof` 来查看当前项目的采样信息。
此外，用户可以在注册 `pprof` 时指定自定义前缀。

函数签名如下：

```go
Register(r *server.Hertz, prefixOptions ...string)
```

示例代码:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/pprof"
)

func main() {
	h := server.Default()

	// default is "debug/pprof"
	pprof.Register(h, "dev/pprof")

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### RouteRegister

`pprof` 不仅可以注册到 Hertz 对象上，还可以注册到路由组（RouterGroup）上。

函数签名如下：

```go
RouteRegister(rg *route.RouterGroup, prefixOptions ...string)
```

本方式注册后的 `pprof` 前缀为路由组的前缀与自定义前缀拼接后的结果。

- 用户不指定前缀，注册后的 `pprof` 的前缀为路由组的前缀与默认前缀 `/debug/pprof` 拼接后的结果，即为 `/xxx/debug/pprof`（`xxx` 为路由组前缀）；
- 用户指定前缀，注册后的 `pprof` 的前缀为路由组的的前缀与自定义前缀拼接后的结果，比如下文示例中注册后的 `pprof` 前缀为 `/admin/pprof`。

示例代码:

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/pprof"
)

func main() {
	h := server.Default()

	pprof.Register(h)

	adminGroup := h.Group("/admin")

	adminGroup.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	pprof.RouteRegister(adminGroup, "pprof")

	h.Spin()
}
```

## 查看 pprof 采样信息

### 通过浏览器查看

通过浏览器访问 `localhost:8888/debug/pprof`

- Hertz 端口号默认为 8888
- pprof 默认地址前缀为 `debug/pprof`
- 端口号和访问路由与用户实际端口号和 `pprof` 前缀一致

### 通过 `go tool pprof` 查看

使用 `go tool pprof` 工具查看堆栈采样信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/heap
```

使用 `go tool pprof` 工具查看 CPU 采样信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/profile
```

> 默认采样时间为 30s，可通过查询字符串来自定义采样时间：

```bash
go tool pprof http://localhost:8888/debug/pprof/profile?seconds=10
```

使用 `go tool pprof` 工具查看 go 协程阻塞信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/block
```

获取执行 trace 信息：

```bash
wget http://localhost:8888/debug/pprof/trace?seconds=5
```

### 通过 `go tool pprof` 查看火焰图

安装 [graphviz](http://www.graphviz.org/download/)

```bash
go tool pprof -http :8080 localhost:8888/debug/pprof/profile?seconds=10
```

完整用法示例详见 [example](https://github.com/hertz-contrib/pprof/tree/main/example)
