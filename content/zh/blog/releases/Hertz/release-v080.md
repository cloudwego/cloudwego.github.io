---
title: "Hertz v0.8.0 版本发布"
linkTitle: "Release v0.8.0"
projects: ["Hertz"]
date: 2024-01-12
description: >
---

Hertz v0.8.0 版本中，除了常规迭代优化之外，我们还带来了一个重要 feature。

## Partitioned cookies

在 Hertz v0.8.0 版本中，我们支持了 partitioned cookies 特性。

> https://github.com/cloudwego/hertz/pull/1041

### 背景

三方 Cookie 为 Web 提供了跨站点跟踪的能力，它的存在为 Web 用户的隐私和安全都带来了巨大威胁。Chrome 从 2024 年第一季度开始对 1% 的用户禁用第三方 Cookie，从 2024 年第三季度开始逐步将禁用范围扩大到 100%。
Partitioned Cookies Cookies Having Independent Partitioned State (CHIPS) 作为三方Cookie的替代方案，提供了跨站（cross-site）请求携带三方 Cookie 的能力。

#### 通过 Set-Cookie Header 设置 Partitioned Cookie

```
Set-Cookie header:
Set-Cookie: __Host-name=value; Secure; Path=/; SameSite=None; Partitioned;
```

### How to

#### 升级 Hertz 版本

Hertz 在 v0.8.0 添加了对 Partitioned Cookies 的支持，你需要升级到>=v0.8.0来使用 Partitioned Cookie。

#### 如何使用 Partitioned Cookies

目前 Hertz 支持 Partitioned Cookies，但还不支持通过 SetCookie 传入是否为 Partitioned，我们将在下个小版本增加此功能。在此之前，你可以参考下面的代码示例来使用 Partitioned Cookies。

```
func SetPartitionedCookie(c *app.RequestContext, name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool) {
   if path == "" {
      path = "/"
   }
   cookie := protocol.AcquireCookie()
   defer protocol.ReleaseCookie(cookie)
   cookie.SetKey(name)
   cookie.SetValue(url.QueryEscape(value))
   cookie.SetMaxAge(maxAge)
   // 如果 name 前缀为 __Host，则 Path 必须为/
   cookie.SetPath(path)
   cookie.SetDomain(domain)
   // Secure 必须为 true。
   cookie.SetSecure(secure)
   cookie.SetHTTPOnly(httpOnly)
   cookie.SetSameSite(sameSite)
   cookie.SetPartitioned(true)
   c.Response.Header.SetCookie(cookie)
}

func main() {
   h := server.Default()

   h.GET("/partitioned", func(ctx context.Context, c *app.RequestContext) {
      SetPartitionedCookie(c, "user", "hertz", 1, "/", "localhost", protocol.CookieSameSiteNoneMode, true, true)
      c.JSON(consts.StatusOK, utils.H{"partitioned": "yes"})
   })

   h.Spin()
}
```

验证 Set-Cookie Header

```
curl -v http://localhost:8888/partitioned
*   Trying [::1]:8888...
* Connected to localhost (::1) port 8888
> GET /partitioned HTTP/1.1
> Host: localhost:8888
> User-Agent: curl/8.4.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: hertz
< Date: Fri, 12 Jan 2024 07:01:02 GMT
< Content-Type: application/json; charset=utf-8
< Content-Length: 21
< Set-Cookie: user=hertz; max-age=1; domain=localhost; path=/; HttpOnly; secure; SameSite=None; Partitioned
<
* Connection #0 to host localhost left intact
{"partitioned":"yes"}%
```
