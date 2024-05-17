---
title: "Hertz Release v0.8.0"
linkTitle: "Release v0.8.0"
projects: ["Hertz"]
date: 2024-01-12
description: >
---

In Hertz v0.8.0, in addition to the regular iterative optimization, we have also introduced an important feature.

## Partitioned cookies

In Hertz v0.8.0, we support the partitioned cookies feature.

> https://github.com/cloudwego/hertz/pull/1041

### Background

Third-party cookies provide the ability for cross-site tracking for the web, and their existence poses a huge threat to the privacy and security of web users. Chrome will disable third-party cookies for 1% of users starting from Quarter 1 of 2024, and gradually expand the disabling scope to 100% starting from the third quarter of 2024.
Partitioned Cookies Cookies Having Independent Partitioned State (CHIPS) serve as an alternative to third-party cookies, providing the ability to carry third-party cookies on cross-site requests.

#### Set Partitioned Cookies with the Set-Cookie Header

```
Set-Cookie header:
Set-Cookie: __Host-name=value; Secure; Path=/; SameSite=None; Partitioned;
```

### How to

#### Upgrade Hertz version

Hertz added support for Partitioned Cookies in v0.8.0. You need to upgrade to > = v0.8.0 to use Partitioned Cookies.

#### How to use Partitioned Cookies

Currently, Hertz supports Partitioned Cookies, but does not yet support passing whether it is Partitioned through SetCookie. We will add this feature in the next minor version. Before that, you can refer to the following code example to use Partitioned Cookies.

```
func SetPartitionedCookie(ctx *app.RequestContext, name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool) {
   if path == "" {
      path = "/"
   }
   cookie := protocol.AcquireCookie()
   defer protocol.ReleaseCookie(cookie)
   cookie.SetKey(name)
   cookie.SetValue(url.QueryEscape(value))
   cookie.SetMaxAge(maxAge)
   // If name has the prefix of __Host，Path must be /
   cookie.SetPath(path)
   cookie.SetDomain(domain)
   // Secure must be true。
   cookie.SetSecure(secure)
   cookie.SetHTTPOnly(httpOnly)
   cookie.SetSameSite(sameSite)
   cookie.SetPartitioned(true)
   ctx.Response.Header.SetCookie(cookie)
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

Verify Set-Cookie Header

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
