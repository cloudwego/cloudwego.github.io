---
title: "Pprof"
date: 2022-09-24
weight: 7
keywords: ["pprof", "performance analysis"]
description: "Hertz provides the pprof extension to help users perform performance analysis on Hertz projects. "
---

Hertz provides the [pprof](https://github.com/hertz-contrib/pprof) extension to help users perform performance analysis on Hertz projects. The implementation of the [pprof](https://github.com/hertz-contrib/pprof) extension refers to the implementation of [Gin](https://github.com/gin-contrib/pprof).

## Install

```shell
go get github.com/hertz-contrib/pprof
```

## Example

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

## Config

### PrefixOptions

The default prefix of `pprof` is `debug/pprof`, that is, after the user registers and uses `pprof` extension in the Hertz project, the user can view the sampling information of the current project by visiting `localhost:8888/debug/pprof`. Additionally, `pprof` supports user-defined prefixes.

The function signature is as follows:

```go
Register(r *server.Hertz, prefixOptions ...string)
```

Sample code:

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

`pprof` can be registered not only on the Hertz object, but also on the router group (RouterGroup).

The function signature is as follows:

```go
RouteRegister(rg *route.RouterGroup, prefixOptions ...string)
```

The `pprof` prefix registered in this way is the result of splicing the prefix of the routing group and the custom prefix.

- If the user does not specify a prefix, the prefix of the registered `pprof` is the result of concatenating the prefix of the routing group and the default prefix `/debug/pprof`, that is, `/xxx/debug/pprof` (xxx is the prefix of the routing group);
- If the user specifies a prefix, the prefix of the registered `pprof` is the result of concatenating the prefix of the routing group and the custom prefix. For example, in the following example, the registered `pprof` prefix is `/admin/pprof`.

Sample code:

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

## View pprof sampling information

### Via browser

Access `localhost:8888/debug/pprof` via browser

- Hertz port number defaults to 8888
- pprof default address prefix is `debug/pprof`
- The port number and access route are the same as the user's actual port number and `pprof` prefix

### Via `go tool pprof`

Use the `go tool pprof` tool to view stack sampling information:

```bash
go tool pprof http://localhost:8888/debug/pprof/heap
```

Use the `go tool pprof` tool to view the CPU sampling information:

```bash
go tool pprof http://localhost:8888/debug/pprof/profile
```

> The default sampling time is 30s , and the sampling time can be customized by query string:

```bash
go tool pprof http://localhost:8888/debug/pprof/profile?seconds=10
```

Use the `go tool pprof` tool to view the blocking information of the go coroutine:

```bash
go tool pprof http://localhost:8888/debug/pprof/block
```

Get the execution trace information:

```bash
wget http://localhost:8888/debug/pprof/trace?seconds=5
```

### View flame graphs with `go tool pprof`

Install [graphviz](http://www.graphviz.org/download/)

```bash
go tool pprof -http :8080 localhost:8888/debug/pprof/profile?seconds=10
```

See the full usage [example](https://github.com/hertz-contrib/pprof/tree/main/example)
