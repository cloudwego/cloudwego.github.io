---
title: "pprof扩展"
date: 2022-09-24
weight: 7
description: >

---


Hertz 提供了 [pprof扩展](https://github.com/hertz-contrib/pprof)，它参考了 Gin 的[实现](https://github.com/gin-contrib/pprof)。

使用方法可参考如下 [example](https://github.com/hertz-contrib/pprof/tree/main/example)。

## 安装
```shell
go get github.com/hertz-contrib/pprof
```

## 使用
### 代码实例1：基本使用

```go
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
    
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    
    h.Spin()
}
```

### 代码实例2: 自定义前缀

```go
import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "hertz-contrib-beiye/pprof"
)

func main() {
    h := server.Default()
    
    // default is "debug/pprof"
    pprof.Register(h, "dev/pprof")
    
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    
    h.Spin()
}

```

### 代码实例3: 自定义路由组

```go
import (
    "context"
    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "hertz-contrib-beiye/pprof"
    "net/http"
)

func main() {
    h := server.Default()
    
    pprof.Register(h)

    adminGroup := h.Group("/admin")
    adminGroup.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })
    
    pprof.RouteRegister(adminGroup, "pprof")
    
    h.Spin()
}

```


## 查看pprof

### 1. 通过浏览器查看

通过浏览器访问 `localhost:8888/debug/pprof`

* Hertz端口号默认为 8888
* pprof默认地址前缀为 `debug/pprof`

### 2. 通过 `go tool pprof` 查看

使用 `go tool pprof` 工具查看堆栈采样信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/heap
```

使用 `go tool pprof` 工具查看 30s 的 CPU 采样信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/profile
```

默认采样时间为 30s ，可通过查询字符串来自定义采样时间：

```bash
go tool pprof http://localhost:8888/debug/pprof/profile?seconds=10
```

使用 `go tool pprof` 工具查看 go 协程阻塞信息：

```bash
go tool pprof http://localhost:8888/debug/pprof/block
```

使用 `go tool pprof` 工具查看 5s 内的执行 trace：

```bash
wget http://localhost:8888/debug/pprof/trace?seconds=5
```


### 3. 通过 `go tool pprof` 查看火焰图

安装 [graphviz](http://www.graphviz.org/download/)

```bash
go tool pprof -http :8080 localhost:8888/debug/pprof/profile?seconds=10
```
