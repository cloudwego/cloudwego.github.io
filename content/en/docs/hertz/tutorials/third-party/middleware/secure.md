---
title: "Secure"
date: 2022-11-06
weight: 10
keywords: ["Secure", "secure access request"]
description: "Secure is an HTTP middleware from Hertz that checks HTTP requests to quickly secure access requests."
---

Secure is an HTTP middleware from Hertz that checks HTTP requests to quickly secure access requests.
Secure middleware provides not only a default base configuration, but also a wide range of custom configuration options.

The implementation of the [secure](https://github.com/hertz-contrib/secure) extension refers to the implementation of [gin-contrib/secure](https://github.com/gin-contrib/secure).

## Install

Download and install

```shell
go get github.com/hertz-contrib/secure
```

Import in your code

```go
import "github.com/hertz-contrib/secure"
```

## Example

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

## Config

### Instructions

Most of the Secure configuration items are designed to simplify the user's configuration of HTTP response headers, if you are confused about how to use HTTP headers, you can check it yourself in [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

### New

Secure provides the `New()` function for integrating Secure into Hertz, which is configured by default as follows

| Configuration             | Description                                                                                                                                                                                                                                                                    | Default Value                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| WithSSLRedirect           | If `WithSSLRedirect` is set to true, only https requests will be allowed                                                                                                                                                                                                       | true                                                      |
| WithIsDevelopment         | If `WithIsDevelopment` is set to true, the entire security policy of the middleware application will be completely disabled                                                                                                                                                    | false                                                     |
| WithSTSSecond             | `WithSTSSecond` is used to set the number of seconds for the max-age of Strict-Transport-Security                                                                                                                                                                              | 315360000                                                 |
| WithFrameDeny             | `WithFrameDeny` is used to set the value in X-Frame-Options, true sets the value to DENY                                                                                                                                                                                       | true                                                      |
| WithContentTypeNosniff    | If `WithContentTypeNosniff` is set to true, </br> then add the `nosniff` value to the X-Content-Type-Options                                                                                                                                                                   | true                                                      |
| WithBrowserXssFilter      | If `WithBrowserXssFilter` is set to true, </br> then add the value `1; mode=block` to the X-XSS-Protection header                                                                                                                                                              | true                                                      |
| WithContentSecurityPolicy | `WithContentSecurityPolicy` is used to configure policies in Content-Security-Policy                                                                                                                                                                                           | "default-src 'self'"                                      |
| WithIENoOpen              | `WithIENoOpen` is used to prevent Internet Explorer from executing download tasks in the website, the default setting is true, that is, to prevent downloading                                                                                                                 | true                                                      |
| WIthSSLProxyHeaders       | `WIthSSLProxyHeaders` is used to set the **request headers map**. If the request is insecure, the information in the request header is matched against the information in the **request headers map**. If it matches the corresponding value, the request is considered secure | map[string]string{<br/>"X-Forwarded-Proto": "https"<br/>} |

Of course, in addition to these default configuration items, we have other configuration items that will be introduced later

### WithAllowHosts

`WithAllowHosts` is used to set a whitelist of fully qualified domains that are allowed to be accessed, which defaults to an empty list by default, allowing any and all host names

Function signature:

```go
func WithAllowedHosts(ss []string) Option
```

### WithSSLTemporaryRedirect

When `WithSSLTemporaryRedirect` is set to true, a 302 status code (StatusFound) will be used on redirects. Otherwise, 301 (StatusMovedPermanently) is used

Function signature:

```go
func WithSSLTemporaryRedirect(b bool) Option
```

### WithSSLHost

`WithSSLHost` is used to set the host name to redirect http requests to https, default is "" which means use the same host name

Function signature:

```go
func WithSSLHost(s string) Option
```

### WithSTSIncludeSubdomains

When`WithSTSIncludeSubdomains` is set to true, will be appended to the Strict-Transport-Security header. Default is false.

Function signature:

```go
func WithSTSIncludeSubdomains(b bool) Option
```

### WithCustomFrameOptionsValue

Use `WithCustomFrame-OptionsValue` to fill in custom values in X-Frame-Options

**Note**:
This setting will override the `WithFrameDeny` setting mentioned above

Function signature:

```go
func WithCustomFrame-OptionsValue(s string) Option
```

### WithReferrerPolicy

`WithReferrerPolicy` is used to set the policy in the Referrer-Policy, which regulates the access source information that should be included in the generated request

Function signature:

```go
func WithReferrerPolicy(s string) Option
```

### WithBadHostHandler

`WithBadHostHandler` is used to set the logic to handle the request when an error occurs, default return 403 (StatusForbidden) status code

Function signature:

```go
func WithBadHostHandler(handler app.HandlerFunc) Option
```

Example:

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

`WithFeaturePolicy` is used to set the policy of Feature-Policy

Function signature:

```go
func WithFeaturePolicy(s string) Option
```

### WithDontRedirectIPV4Hostnames

When `WithDontRedirectIPV4Hostnames` is set to true, then requests for hostnames with IPV4 addresses will not be redirected. This is configured so that a health check like Loadbalancer's setup succeeds.

Function signature:

```go
func WithDontRedirectIPV4Hostnames(b bool) Option
```
