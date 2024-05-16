---
title: "Secure"
date: 2022-11-06
weight: 10
keywords: ["Secure", "访问请求安全"]
description: "Secure 是 Hertz 的一个 HTTP 中间件 , 它可以通过检查 HTTP 请求以达到快速的保证访问请求安全。"
---

Secure 是 Hertz 的一个 HTTP 中间件 , 它可以通过检查 HTTP 请求以达到快速的保证访问请求安全 (secure),
并且 Secure 中间件不仅提供了默认的基础配置，还提供了大量的自定义配置选项可供选择。

本 [中间件](https://github.com/hertz-contrib/secure) 参考了 [gin-contrib/secure](https://github.com/gin-contrib/secure) 的实现。

## 安装

安装

```shell
go get github.com/hertz-contrib/secure
```

在工程中引入

```go
import "github.com/hertz-contrib/secure"
```

## 示例代码

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/secure"
)

func main() {
	h := server.Default()
	// use default config
	h.Use(secure.New())
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(200, "pong")
	})
	h.Spin()
}
```

## 配置

### 使用须知

Secure 所提供的配置项是为了简化一些常见的 HTTP headers 的配置，如对配置项配置 HTTP headers 的作用感到困惑，可以自行在 [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) 中进行查询它们的作用

### New

Secure 提供 `New()` 函数用于将 Secure 集成进入 Hertz。默认配置如下所示

| 配置函数                  | 描述                                                                                                                                                                                  | 默认值                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| WithSSLRedirect           | `WithSSLRedirect` 设置为 true, 则将只允许 https 请求访问                                                                                                                              | true                                            |
| WithIsDevelopment         | 如果 `WithIsDevelopment` 设置为 true, 则中间件应用的整个安全策略将被完全禁用                                                                                                          | false                                           |
| WithSTSSecond             | `WithSTSSecond` 用于设置 Strict-Transport-Security 的 max-age 的秒数 (second)                                                                                                         | 315360000                                       |
| WithFrameDeny             | `WithFrameDeny` 用于设置 X-Frame-Options 中的值，为 true 则设置值为 DENY                                                                                                              | true                                            |
| WithContentTypeNosniff    | 如果 `WithContentTypeNosniff` 设置为 true, </br> 则在 X-Content-Type-Options 中 添加 `nosniff` 值                                                                                     | true                                            |
| WithBrowserXssFilter      | 如果 `WithBrowserXssFilter` 设置为 true, </br> 则添加在 X-XSS-Protection 头中添加 `1; mode=block` 的值                                                                                | true                                            |
| WithContentSecurityPolicy | `WithContentSecurityPolicy` </br> 用于配置 Content-Security-Policy 中的策略                                                                                                           | "default-src 'self'"                            |
| WithIENoOpen              | `WithIENoOpen` 用于防止 Internet Explorer 在网站的中执行下载任务，默认设置为 true, 即阻止下载                                                                                         | true                                            |
| WIthSSLProxyHeaders       | `WIthSSLProxyHeaders` 用于设置 **request headers map**。若请求是不安全的，就将请求头的信息和 **request headers map** 中的信息进行匹配。如果匹配到了相应的值，就把该请求视为安全的请求 | map[string]string{"X-Forwarded-Proto": "https"} |

当然，除了这些默认的配置项，我们还有其他的配置项在后续介绍

### WithAllowHosts

`WithAllowHosts` 用于设置一个允许访问的完全合格域名的白名单，该名单默认为默认为空列表，允许任何和所有的主机名称

函数签名:

```go
func WithAllowedHosts(ss []string) Option
```

### WithSSLTemporaryRedirect

`WithSSLTemporaryRedirect` 在设置为 true 时，在重定向时将使用 302 状态码 (StatusFound)。否则使用 301 (StatusMovedPermanently)

函数签名:

```go
func WithSSLTemporaryRedirect(b bool) Option
```

### WithSSLHost

`WithSSLHost` 用于设置将 http 请求重定向到 https 的主机名，默认为 "" 表示使用同一个主机名

函数签名:

```go
func WithSSLHost(s string) Option
```

### WithSTSIncludeSubdomains

`WithSTSIncludeSubdomains` 设置为 true 时，将会在 Strict-Transport-Security 中填入 `includeSubdomains` 的值，默认值为 false

函数签名:

```go
func WithSTSIncludeSubdomains(b bool) Option
```

### WithCustomFrameOptionsValue

使用 `WithCustomFrameOptionsValue` 可以在 X-Frame-Options 中填入自定义的值

**注意**:
这一设置将会覆盖上文提到的 `WithFrameDeny` 的设置

函数签名:

```go
func WithCustomFrameOptionsValue(s string) Option
```

### WithReferrerPolicy

`WithReferrerPolicy` 用于设置 Referrer-Policy 中的策略，Referrer-Policy 监管的访问来源信息应当包含在生成的请求之中

函数签名:

```go
func WithReferrerPolicy(s string) Option
```

### WithBadHostHandler

`WithBadHostHandler` 用于设置在请求发生错误时的处理逻辑，默认返回 403 (StatusForbidden) 状态码

函数签名:

```go
func WithBadHostHandler(handler app.HandlerFunc) Option
```

示例:

```go
package main

import (
	"context"
    "net/http"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"

	"github.com/hertz-contrib/secure"
)

func main() {
	h := server.New(server.WithHostPorts("127.0.0.1:8080"))
	h.Use(secure.New(
		secure.WithAllowedHosts([]string{"example.com"}),
		secure.WithSSLHost("example.com"),
		// 如果在启动服务器后访问 http://127.0.0.1:8080/ping, 就可以看到效果
		secure.WithBadHostHandler(func(ctx context.Context, c *app.RequestContext) {
			c.AbortWithStatusJSON(http.StatusForbidden, utils.H{
				"message": "this is a custom Bad Host Handler!",
			})
		}),
	))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(200, "pong")
	})
	h.Spin()
}
```

### WithFeaturePolicy

`WithFeaturePolicy` 用于设置 Feature-Policy 的策略

函数签名:

```go
func WithFeaturePolicy(s string) Option
```

### WithDontRedirectIPV4Hostnames

`WithDontRedirectIPV4Hostnames` 设置为 true 时，那么对 IPV4 地址的主机名的请求就不会被重定向。这项配置为了让类似 Loadbalancer 的设置健康检查成功。

函数签名:

```go
func WithDontRedirectIPV4Hostnames(b bool) Option
```
