---
title: "跨源资源共享"
date: 2022-05-21
weight: 1
description: >

---

跨源资源共享（CORS）机制允许服务器标识除了它自己的其它 origin，使得浏览器可以访问加载这些资源；
该机制也用来检查服务器是否允许浏览器发送真实的请求，通过浏览器发送"预检"请求实现，在预检请求头部中有 HTTP 方法和真实请求会用到的头。

hertz 提供 cors 跨域中间件的[实现](https://github.com/hertz-contrib/cors) ，这里的实现参考了 gin 的 [cors](https://github.com/gin-contrib/cors)。

## 安装

```shell
go get github.com/hertz-contrib/cors
```

## 示例代码


```go
package main

import (
    "time"

    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    // CORS for https://foo.com and https://github.com origins, allowing:
    // - PUT and PATCH methods
    // - Origin header
    // - Credentials share
    // - Preflight requests cached for 12 hours
    h.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"https://foo.com"},
        AllowMethods:     []string{"PUT", "PATCH"},
        AllowHeaders:     []string{"Origin"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        AllowOriginFunc: func(origin string) bool {
            return origin == "https://github.com"
        },
        MaxAge: 12 * time.Hour,
    }))
    h.Spin()
}
```

### 预检请求

对于跨源访问来说，如果是**简单请求**，本质上就是在 HTTP 请求头信息中添加一个 Origin 字段，用于描述本次请求来自哪个源，服务端可以直接响应。

而对于**非简单**跨源访问请求来说（比如请求方法是 `PUT` 或 `PATCH`，`Content-Type` 字段类型是 `application/json` 等），会在正式通信之前，发送一次 HTTP 预检请求（preflight），用于校验客户端是否有跨源资源访问权限，预检请求使用的方法是 `OPTIONS`，且这是浏览器自发的行为。

**注意：部分** `hertz-cors` **的配置只有在预检请求发生时才会生效。**

## 配置

Hertz 通过使用 cors 中间件，为客户端提供了跨源资源访问的能力。用户可以通过自定义 `Config` 结构的配置参数，精细控制服务端资源允许跨源访问的范围，亦或选择 hertz-cors 的默认配置，允许来自任意 origin 的客户端访问资源。

上述**示例代码**中只配置了部分可选参数，`Config` 的完整参数列表如下：

| 参数                   | 介绍                                                             |
| ---------------------- |----------------------------------------------------------------|
| AllowAllOrigins        | 用于设置允许来自任意 origin 的客户端访问服务端资源，默认为 `false`                      |
| AllowOrigins           | 用于设置允许跨源访问的 origin 列表，默认为 `[]`                                 |
| AllowOriginFunc        | 用于设置校验客户端 origin 的函数，当启用这个配置时，`AllowOrigins` 的内容将被忽略 |
| AllowMethods           | 用于设置允许客户端跨源访问所使用的 HTTP 方法列表（在接收到预检请求时生效）                       |
| AllowHeaders           | 用于设置客户端发起**非简单**的跨源资源访问请求时，允许使用的头信息字段列表，默认为 `[]`（在接收到预检请求时生效）  |
| AllowCredentials       | 用于设置允许客户端请求携带用户凭证，如：cookies，token，SSL 凭证，默认为 `false`           |
| ExposeHeaders          | 用于设置允许暴露给客户端的响应头列表，默认为 `[]`                                    |
| MaxAge                 | 用于设置预检请求的有效期（有效期内不会发起重复的预检请求）                                  |
| AllowWildcard          | 用于设置允许含通配符的 origin 访问资源，默认为 `false`                            |
| AllowBrowserExtensions | 用于设置允许使用流行的浏览器扩展模式，默认为 `false`                                 |
| AllowWebSockets        | 用于设置允许使用 WebSocket 协议，默认为 `false`                              |
| AllowFiles             | 用于设置允许使用 `file://` 协议（危险）除非你能确保 100% 的安全，才可以使用它，默认为 `false`    |

### AllowAllOrigins

该参数设置为 `true` 之后，将允许来自任意 origin 的客户端跨源访问服务端资源。

与 `AllowOriginFunc` 以及 `AllowOrigins` 配置**冲突**，同时只能配置一项。

### AllowOrigins

描述了可以跨源访问的 origin 列表，如果列表中的任何 origin 携带通配符 `*` （每个 origin 内只允许使用一个通配符 `*`），则允许任何满足匹配逻辑的 origin 访问。

与 `AllowAllOrigins` 以及 `AllowOriginFunc` 配置**冲突**，同时只能配置一项。

若需要使用携带通配符的 origin，则 `AllowWildcard` 参数需同时设置为 `true`。

示例代码1：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"https://foo.com"},
    }))
    h.Spin()
}
```

示例代码2：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        AllowWildcard: 	  true,
        AllowOrigins:     []string{"http://some-domain/*"},
    }))
    h.Spin()
}
```

### AllowOriginFunc

以 origin 为形参，用于自定义 origin 的校验逻辑，返回 `true` 表示校验通过。

与 `AllowAllOrigins` 以及 `AllowOrigins` 配置**冲突**，同时只能配置一项。

函数签名：

```go
func(origin string) bool
```

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        AllowOriginFunc: func(origin string) bool {
            return origin == "https://github.com"
        },
    }))
    h.Spin()
}
```

### AllowMethods

该配置只有在接收到预检请求时才会生效，用于设置允许客户端跨源访问所使用的 HTTP 方法列表。

如果是由 GET 或者 POST 发起的**简单请求**，则无需额外设置。

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        AllowWildcard:    true,
        AllowMethods:     []string{"PUT", "PATCH"},
    }))
    h.Spin()
}
```

### AllowHeaders

该配置只有在接收到预检请求时才会生效，如果浏览器请求包括 `Access-Control-Request-Headers` 字段，则 `Access-Control-Allow-Headers` 字段是必需的。它是一个逗号分隔的字符串，表明服务器支持的所有头信息字段。

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        AllowHeaders:     []string{"Origin"},
    }))
    h.Spin()
}
```

### ExposeHeaders

用于设置允许客户端从 HTTP Response 的 Header 中获取的自定义头信息字段名称。

示例代码：

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/cors"
)

func main() {
    h := server.Default()
    h.Use(cors.New(cors.Config{
        ExposeHeaders:    []string{"Content-Length"},
    }))
    h.Spin()
}
```

更多用法示例详见 [cors](https://github.com/cloudwego/hertz-examples/blob/main/middleware/CORS)
