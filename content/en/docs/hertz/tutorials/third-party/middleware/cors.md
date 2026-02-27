---
title: "CORS"
date: 2022-05-21
weight: 1
keywords: ["CORS"]
description: "Hertz provides implementation of CORS middleware."
---

The CORS (Cross-Origin Resource Sharing) mechanism allows a server to identify any origin other than its own so that browsers can access and load those resources.
This mechanism is also used to check whether the server allows the browser to send a real request by sending a "precheck" request through the browser.
In the "precheck" request header, there are HTTP methods and headers that the real request will use.

Hertz provides [implementation](https://github.com/hertz-contrib/cors) of CORS middleware. The implementation here refers to GIN's [cors](https://github.com/gin-contrib/cors).

## Install

```shell
go get github.com/hertz-contrib/cors
```

## Example

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

### Preflight request

For cross-origin access, in the case of a **simple request**, this is essentially adding an Origin field to the HTTP request header to describe where the source comes from, and the server can respond directly.

For **non-simple** cross-origin access requests (e.g. request method is `PUT` or `PATCH`, `Content-Type` field type is `application/json`, etc.), an HTTP preflight request is sent to verify that the client has access to the server before formal communication directly. A preflight request is a browser-initiated action that uses the HTTP Method `OPTIONS`.

**Note: Some of the** `hertz-cors` **configurations will only take effect when a preflight request occurs.**

## Config

Hertz allows clients to access resources across origins through the use of cors middleware. You can finely control the extent to which server-side resources are allowed to be accessed across origins by customizing the configuration parameters of the `Config` structure. And you can also choose the default configuration of hertz-cors to allow clients from any origin to access resources.

Only part of the optional parameters are configured in the above **Example**, the full list of parameters for `Config` is as follows:

| Parameter              | Introduction                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AllowAllOrigins        | The property used to allow clients from any origin to access server-side resources, the default value is `false`                                                                                   |
| AllowOrigins           | The property used to set the list of origins a cross-domain request can be executed from, the default value is `[]`                                                                                |
| AllowOriginFunc        | The property used to set a custom function to validate the origin, if this option is set, the content of `AllowOrigins` is ignored                                                                 |
| AllowMethods           | The property used to set the list of methods the client is allowed to use with cross-domain requests (takes effect when a preflight request is received)                                           |
| AllowHeaders           | The property used to set the list of **non-simple** headers the client is allowed to use with cross-domain requests, the default value is `[]` (takes effect when a preflight request is received) |
| AllowCredentials       | The property indicates whether the request can include user credentials like cookies, HTTP authentication, or client-side SSL certificates, the default value is `false`                           |
| ExposeHeaders          | The property used to indicate which headers are safe to expose to the API of a CORS API specification, the default value is `[]`                                                                   |
| MaxAge                 | The property used to set how long (in seconds) the results of a preflight request can be cached                                                                                                    |
| AllowWildcard          | The property used to allow to add of origins like `http://some-domain/*`, `https://api.*`, or `http://some.*.subdomain.com`, the default value is `false`                                          |
| AllowBrowserExtensions | The property used to allow usage of popular browser extensions schemas, the default value is `false`                                                                                               |
| AllowWebSockets        | The property used to allow usage of WebSocket protocol, the default value is `false`                                                                                                               |
| AllowFiles             | The property used to allow usage of `file://` schema (dangerous!) use it only when you 100% sure it's needed, the default value is `false`                                                         |

### AllowAllOrigins

If the property value is true, all cross-domain requests will be allowed.

When `AllowAllOrigins` is true, `AllowOriginFunc` and `AllowOrigins` must not be used, otherwise, conflicts will occur.

### AllowOrigins

The property set a list of origins that can be accessed cross-domain, any cross-domain requests that satisfies the matching logic can access resource (only one `*` is allowed within each origin).

**Conflicts** with `AllowAllOrigins`, only one of which can be configured at a time.

When used together with `AllowOriginFunc`, `AllowOriginFunc` takes precedence over `AllowOrigins`.

If you want to use an origin with wildcards, the `AllowWildcard` parameter must also be set to `true`.

Sample Code1:

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

Sample Code2:

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

It takes the origin as an argument and returns true if allowed or false otherwise.

**Conflicts** with `AllowAllOrigins`, only one of which can be configured at a time.

When used together with `AllowOrigins`, `AllowOriginFunc` takes precedence over `AllowOrigins`.

Function signatures:

```go
func(origin string) bool
```

Sample Code:

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

This configuration takes effect only when a preflight request is received and is used to set the list of HTTP methods the client is allowed to use with cross-domain requests.

If the request is a **simple request** initiated by GET or POST, no additional settings are required.

Sample Code:

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

This configuration takes effect only when a preflight request is received. The `Access-Control-Allow-Headers` field is required if the browser request includes the `Access-Control-Request-Headers` field. It is a comma-separated string indicating all the header fields supported by the server.

Sample Code:

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

The property indicates which headers are safe to expose to the API of a CORS API specification.

Sample Code:

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

As for usage, you may refer to hertz [cors](https://github.com/cloudwego/hertz-examples/blob/main/middleware/CORS)
