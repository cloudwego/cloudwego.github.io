---
title: "Sentinel"
date: 2022-09-29
weight: 2
keywords: ["治理特性", "Sentinel"]
description: "Hertz 提供了 hertz-contrib/opensergo, 以方便用户集成 sentinel-golang。"
---

Hertz 提供了 [hertz-contrib/opensergo](https://github.com/hertz-contrib/opensergo), 以方便用户集成 sentinel-golang。

## 安装

```bash
go get github.com/hertz-contrib/opensergo
```

## 配置

前置介绍：

> **热点参数**限流会统计传入参数中的热点参数，并根据配置的限流阈值与模式，对包含热点参数的资源调用进行限流。热点参数限流可以看做是一种特殊的流量控制，仅对包含热点参数的资源调用生效。

### sentinel-golang

关于 sentinel-golang 的基本配置，详情参考 [文档](https://sentinelguard.io/zh-cn/docs/golang/quick-start.html)

### 服务端

#### SentinelServerMiddleware

`SentinelServerMiddleware()` 返回 `app.HandlerFunc` 类型，用于将 sentinel-golang 集成进入 hertz server

默认资源名称为 {method}:{path}，如 "GET:/api/users/:id", 默认 block 时返回 429 状态码

可以通过 `WithServerXxx()` 函数来进行自定义格式

示例代码：

```go
package main

// ...

func main() {
	h := server.Default(server.WithHostPorts(":8081"))
	h.Use(adaptor.SentinelServerMiddleware())
	// ...
}
```

#### WithServerResourceExtractor

`WithResourceExtractor` 为设置网络请求的自定义函数，通过自定义的资源名和 sentinel-golang 中的**热点参数**流控规则
的 `Resource` 相匹配以达到自定义规则的目的

示例代码：

```go
package main

// ...

func main() {
	h := server.Default(server.WithHostPorts(":8081"))
	h.Use(adaptor.SentinelServerMiddleware(
		// customize resource extractor if required
		// method_path by default
		adaptor.WithServerResourceExtractor(func(ctx context.Context, c *app.RequestContext) string {
			return "server_test"
		}),
	))
	// ...
}
```

#### WithServerBlockFallback

`WithServerBlockFallback` 为设置请求被阻断时的自定义回调函数，可以通过 `context.Context` 和 `app.RequestContext`
分别来进行错误日志打印和自定义回调处理

示例代码：

```go
package main

// ...

func main() {
	h := server.Default(server.WithHostPorts(":8081"))
	h.Use(adaptor.SentinelServerMiddleware(
		// customize block fallback if required
		// abort with status 429 by default
		adaptor.WithServerBlockFallback(func(ctx context.Context, c *app.RequestContext) {
			c.AbortWithStatusJSON(400, utils.H{
				"err":  "too many request; the quota used up",
				"code": 10222,
			})
		}),
	))
	// ...
}
```

### 客户端

#### SentinelClientMiddleware

`SentinelClientMiddleware()` 返回一个 `client.Middleware` 类型，用于将 sentinel-golang 集成进入 hertz client

默认的资源名格式为 {method}:{path}, 例如 "GET:/api/users", 默认 block 时返回 `blockError`

可以通过 `WithClientXxx()` 函数来进行自定义格式

示例代码：

```go
package main

// ...

func main() {
	c, err := client.NewClient()
	if err != nil {
		log.Fatalf("Unexpected error: %+v", err)
		return
	}

	c.Use(adaptor.SentinelClientMiddleware())
}
```

#### WithClientResourceExtractor

`WithClientResourceExtractor` 为设置网络请求的自定义函数，通过自定义的资源名和 sentinel-golang 中的 **热点参数** 流控规则
的 `Resource` 相匹配以达到自定义规则的目的

示例代码：

```go
package main

// ...

func main() {
	c, err := client.NewClient()
	if err != nil {
		log.Fatalf("Unexpected error: %+v", err)
		return
	}

	c.Use(adaptor.SentinelClientMiddleware(
		// customize resource extractor if required
		// method_path by default
		adaptor.WithClientResourceExtractor(func(ctx context.Context, request *protocol.Request, response *protocol.Response) string {
			return "client_test"
		}),
	))
}
```

#### WithClientBlockFallback

`WithClientBlockFallback` 为设置请求被阻断时的自定义回调函数，可以通过 `context.Context`, `protocol.Request`
, `protocol.Response` 来进行错误日志打印等功能，也可以通过自定义回调处理 `error` 来进行自定义错误处理。

示例代码：

```go
package main

// ...

func main() {
	c, err := client.NewClient()
	if err != nil {
		log.Fatalf("Unexpected error: %+v", err)
		return
	}

	c.Use(adaptor.SentinelClientMiddleware(
		// customize resource extractor if required
		// method_path by default
		adaptor.WithClientBlockFallback(func(ctx context.Context, req *protocol.Request, resp *protocol.Response, blockError error) error {
			resp.SetStatusCode(http.StatusBadRequest)
			resp.SetBody([]byte("request failed"))
			return blockError
		}),
	))
}
```

## 完整示例代码

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/sentinel/hertz)
