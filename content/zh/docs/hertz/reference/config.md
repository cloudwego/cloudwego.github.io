---
title: "配置说明"
linkTitle: "配置说明"
weight: 1
description: >

---

## Server

Server 侧的配置项均在初始化 Server 时采用 `server.xxx` 的方式，如

```go
package main

import "github.com/cloudwego/hertz/pkg/app/server"

func main() {
	h := server.New(server.WithXXXX())
	...
}
```

|  配置名称   | 类型  |  说明  |
|  :----  | :----  | :---- |
| WithTransport  | network.NewTransporter | 更换底层 transport，默认值：netpoll.NewTransporter |
| WithHostPorts  | string | 指定监听的地址和端口 |
| WithKeepAliveTimeout | time.Duration | tcp 长连接保活时间，一般情况下不用修改，更应该关注 idleTimeout。默认值：1min |
| WithReadTimeout | time.Duration | 底层读取数据超时时间。默认值：3min |
| WithIdleTimeout | time.Duration | 长连接请求链接空闲超时时间。默认值：3min |
| WithMaxRequestBodySize | int | 配置最大的请求体大小，默认4M（4M对应的填的值是4\*1024\*1024） |
| WithRedirectTrailingSlash | bool | 自动根据末尾的 / 转发，例如：如果 router 只有 /foo/，那么 /foo 会重定向到 /foo/ ；如果只有 /foo，那么 /foo/ 会重定向到 /foo。默认开启 |
| WithRemoveExtraSlash | bool | RemoveExtraSlash 当有额外的 / 时也可以当作参数。如: user/:name，如果开启该选项 user//xiaoming 也可匹配上参数。默认关闭 |
| WithUnescapePathValues | bool | 如果开启，请求路径会被自动转义（eg. '%2F' -> '/'）。如果 UseRawPath 为 false（默认情况），则 UnescapePathValues 实际上为 true，因为 .URI().Path() 将被使用，它已经是转义后的。设置该参数为 false，需要配合 WithUseRawPath(true)。 默认开启(true) |
| WithUseRawPath | bool | 如果开启， 会使用原始 path 进行路由匹配。默认关闭 |
| WithHandleMethodNotAllowed | bool | 如果开启，当当前路径不能被匹配上时，server 会去检查其他方法是否注册了当前路径的路由，如果存在则会响应"Method Not Allowed"，并返回状态码405; 如果没有，则会用 NotFound 的 handler 进行处理。默认关闭 |
| WithDisablePreParseMultipartForm | bool | 如果开启，则不会预处理 multipart form。可以通过 ctx.Request.Body() 获取到 body 后由用户处理。默认关闭 |
| WithStreamBody | bool | 如果开启，则会使用流式处理 body。默认关闭 |
| WithNetwork | string | 设置网络协议，可选：tcp，udp，unix（unix domain socket），默认为tcp |
| ContinueHandler | func(header *RequestHeader) bool | 在接收到 Expect 100 Continue 头之后调用 ContinueHandler。使用 ContinueHandler，服务器可以决定是否根据标头读取可能很大的请求正文 |
| PanicHandler | HandlerFunc | 处理 panic，用来生成错误页面并返回500 |
| NotFound | HandlerFunc | 当路由匹配不上时被调用的 handler |
| WithExitWaitTime | time.Duration | 设置优雅退出时间。Server 会停止建立新的连接，并对关闭后的每一个请求设置 Connection: Close 的 header，当到达设定的时间关闭 Server。当所有连接已经关闭时，Server 可以提前关闭。默认 5s |
| WithTLS | tls.Config | 配置 server tls 能力 |
| WithListenConfig | net.ListenConfig | 设置监听器配置，可用于设置是否允许 reuse port 等|
| WithALPN | bool | 是否开启 ALPN。默认关闭 |
| WithTracer | tracer.Tracer | 注入 tracer 实现，如不注入 Tracer 实现，默认关闭 |
| WithTraceLevel | stats.Level | 设置 trace level，默认 LevelDetailed |

Server Connection 数量限制:

* 如果是使用标准网络库，无此限制
* 如果是使用 netpoll，最大连接数为 10000
  （这个是netpoll底层使用的 [gopool](https://github.com/bytedance/gopkg/blob/b9c1c36b51a6837cef4c2223e11522e3a647460c/util/gopool/gopool.go#L46)
  ）控制的，修改方式也很简单，调用 gopool 提供的函数即可：`gopool.SetCap(xxx)`(main.go 中调用一次即可)。

## Client

Client 侧的配置项均在初始化 Client 时采用 `client.xxx` 的方式

```go
package main

import "github.com/cloudwego/hertz/pkg/app/client"

func main() {
	c, err := client.NewClient(client.WithXxx())
	...
}
```

|  配置名称   | 类型  |  说明  |
|  :----  | :----  | :---- |
| WithDialTimeout | time.Duration | 连接建立超时时间，默认 1s |
| WithMaxConnsPerHost | int | 设置为每个 host 建立的最大连接数，默认 512 |
| WithMaxIdleConnDuration | time.Duration | 设置空闲连接超时时间，当超时后会关闭该连接，默认10s |
| WithMaxConnDuration | time.Duration | 设置连接存活的最大时长，超过这个时间的连接在完成当前请求后会被关闭，默认无限长 |
| WithMaxConnWaitTimeout | time.Duration | 设置等待空闲连接的最大时间，默认不等待 |
| WithKeepAlive | bool | 是否使用长连接，默认开启 |
| WithMaxIdempotentCallAttempts | int | 设置失败重试次数，默认5次 |
| WithClientReadTimeout | time.Duration | 设置读取 response 的最长时间，默认无限长 |
| WithTLSConfig | *tls.Config | 双向 TLS 认证时，设置 client 的 TLS config |
| WithDialer | network.Dialer | 设置 client 使用的网络库，默认 netpoll |
| WithResponseBodyStream | bool | 设置是否使用流式处理，默认关闭 |
| WithDialFunc | client.DialFunc | 设置 Dial Function |
