---
title: "常见问题"
linkTitle: "常见问题"
weight: 4
keywords: ["内存使用率", "常见错误码", "上下文使用", "精度丢失问题"]
description: "Hertz 常见问题解答。"
---

## 内存使用率高

### 客户端不规范使用没有关连接

如果 Client 侧发起大量连接而不关闭的话，极端情况下会有较大的资源浪费，随着时间的增长，可能会造成内存使用率高的问题。

**解决办法**

合理配置 `idleTimeout`，超时后 Hertz Server 会把连接关掉保证 Server 侧的稳定性。默认配置为3分钟。

### 超大请求/响应

1. 如果请求和响应非常大，并且没有使用一些其他发送模式如 stream、chunk 时，数据会全部进入内存，给内存造成较大压力。
2. netpoll 网络库下的流式为假流式。由于 netpoll 使用 LT 触发模式，当数据到达时，会触发 netpoll 读取数据；在接口设计上，也因此没有实现 `Reader` 接口。为了实现流式的能力，Hertz 将 netpoll 封装为 Reader，但其本身数据仍然不可控的进入了内存，所以在超大流式请求的情况下，可能会造成内存压力。

**解决办法**

超大请求的场景下，使用流式 + go net 的组合。

## 常见错误码排查

如果框架报以下的错误码，可以按照可能原因进行排查。如果出现非以下错误码，则不是框架打出来的，需要由使用方定位一下是否自行设置或者由某些中间件设置了错误码。

### 404

1. 访问到了错误的端口上了，常见访问到了 debug 端口
   1. 解决方案：区分框架服务的监听端口和 debug server 的监听端口，默认:8888
2. 未匹配到路由
   1. 根据启动日志查看是否所有预期路由都正常注册
   2. 查看访问方法是否正确

### 417

server 在执行完自定义的 `ContinueHandler` 之后返回 `false`（server 主动拒绝掉 100 Continue 后续的 body）。

### 500

1. 中间件或者 `handlerFunc` 中抛 panic
   1. 解决方案：panic 栈信息定位具体问题
2. fs 场景 path 携带 `/../`，可能出现访问预期之外的文件，server 端 app log 中伴随错误日志：`cannot serve path with '/../' at position %d due to security reasons: %q`。
   1. 解决方案：检查是否存在非法请求

## 上下文使用指南

### 说明

Hertz 在 `HandlerFunc` 设计上，同时提供了一个标准 `context.Context` 和一个请求上下文作为函数的入参。
`handler/middleware` 函数签名为：

```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

### 元数据存储方面

两个上下文都有储值能力，使用时具体选择哪一个的简单依据：所储存值的生命周期和所选择的上下文要匹配。

**具体细节**

`ctx` 主要用来存储请求级别的变量,请求结束就回收了，特点是查询效率高（底层是 `map`），协程不安全，且未实现 `context.Context` 接口。
`c` 作为上下文在中间件 `/handler` 之间传递。拥有 `context.Context` 的所有语义，协程安全。所有需要 `context.Context` 接口作为入参的地方，直接传递 `c` 即可。

除此之外，如果面对一定要异步传递 `ctx` 的场景，hertz 也提供了 `ctx.Copy()` 接口，方便业务能够获取到一个协程安全的副本。

## 精度丢失问题

### 说明

1. JavaScript 的数字类型一旦数字超过限值时将会丢失精度，进而导致前后端的值出现不一致。

```javascript
var s = '{"x":6855337641038665531}';
var obj = JSON.parse(s);
alert(obj.x);

// Output 6855337641038666000
```

2. 在 JSON 的规范中，对于数字类型是不区分整形和浮点型的。 在使用 `json.Unmarshal` 进行 JSON 的反序列化的时候，如果没有指定数据类型，使用 `interface{}` 作为接收变量，将默认采用 `float64` 作为其数字的接受类型，当数字的精度超过float能够表示的精度范围时就会造成精度丢失的问题。

### 解决办法

1. 使用 json 标准包的 `string` tag。

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

type User struct {
    ID int `json:"id,string"`
}

func main() {
    h := server.Default()

    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        var u User
        u.ID = 6855337641038665531
        c.JSON(consts.StatusOK, u)
    })

    h.Spin()
}
```

2. 使用 `json.Number`

```go
package main

import (
    "context"
    "encoding/json"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

type User struct {
    ID json.Number `json:"id"`
}

func main() {
    h := server.Default()

    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        var u User
        err := json.Unmarshal([]byte(`{"id":6855337641038665531}`), &u)
        if err != nil {
            panic(err)
        }
        c.JSON(consts.StatusOK, u)
    })

    h.Spin()
}

```
