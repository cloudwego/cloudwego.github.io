---
title: "Request ID"
date: 2022-10-01
weight: 9
keywords: ["Request ID", "X-Request-ID"]
description: "Hertz provides Request ID middleware that can operate on `X-Request-ID`."
---

`X-Request-ID` is a common non-standard response fields in HTTP Headers, used to correlate HTTP requests between a client and server.
Hertz also provides [Request ID middleware](https://github.com/hertz-contrib/requestid) that can operate on `X-Request-ID`, inspired by gin's [implementation](https://github.com/gin-contrib/requestid).

## Install

Download and install

```shell
go get github.com/hertz-contrib/requestid
```

Import into your code

```go
import "github.com/hertz-contrib/requestid"
```

## Example

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    h.Use(
        // provide your own request id generator here
        requestid.New(
            requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
                return "cloudwego.io"
            }),
            // set custom header for request id
            requestid.WithCustomHeaderStrKey("Your-Customised-Key"),
        ),
    )

    // Example ping request.
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        hlog.Info(string(c.Response.Header.Header()))
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

## Config

Hertz is able to add an identifier to the response using the `X-Request-ID` header, and passes the `X-Request-ID` value back to the caller if it's sent in the request headers by using middleware.
The Request ID middleware provides the default configuration, you can also customize the following configuration using `WithGenerator`, `WithCustomHeaderStrKey`, `WithHandler` functions according to different scenarios.

| configuration          | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| WithGenerator          | Define a function that generates a Request ID. By default, a UUID identifier is generated. |
| WithCustomHeaderStrKey | Define the key value of the Request ID. By default, the key value is `X-Request-ID`.       |
| WithHandler            | Define the handler function of the Request ID.                                             |

### New

The `requestid` middleware provides `New` to add the Request ID field to the response header.

Function signatures:

```go
func New(opts ...Option) app.HandlerFunc
```

Sample Code:

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    h.Use(
        requestid.New(),
    )

    // Example ping request.
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

### WithCustomHeaderStrKey

The `requestid` middleware provides `WithCustomHeaderStrKey` to customize the Request ID key value.

Note: If you want to set up the request id in the request header, you need to keep consistent with the custom request id keys.

Function signatures:

```go
func WithCustomHeaderStrKey(s HeaderStrKey) Option
```

Sample Code:

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    // define your own header to save request id here
    h.Use(
        requestid.New(
            requestid.WithCustomHeaderStrKey("Your-Header-StrKey"),
        ),
    )

    // Example ping request.
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

### WithGenerator

The `requestid` middleware provides `WithGenerator` for custom Request ID value generation.

Function signatures:

```go
func WithGenerator(g Generator) Option
```

Sample Code:

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    h.Use(
        // define your own request id generator here
        requestid.New(requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
            return "cloudwego.io"
        })),
    )

    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

### WithHandler

The `requestid` middleware provides `WithHandler` for custom Request ID handlers.

Function signatures:

```go
func WithHandler(handler Handler) Option
```

Sample Code:

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    var bar string

    h.Use(
        requestid.New(
            requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
                return "hello"
            }),
            // define your request id handler here
            requestid.WithHandler(func(ctx context.Context, c *app.RequestContext, requestID string) {
                bar = requestID + " hertz"
            }),
        ),
    )

    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{
            "ping": "pong",
            "foo":  bar, // hello hertz
        })
    })

    h.Spin()
}
```

### Get

`requestid` middleware provides `Get` which is a helper function to retrieve request id from request headers. It also works with customised header as defined with `requestid.WithCustomHeaderStrKey`.

Function signatures:

```go
func Get(c *app.RequestContext) string
```

Sample Code:

```go
package main

import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/utils"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/requestid"
)

func main() {
    h := server.Default()

    h.Use(
        requestid.New(requestid.WithGenerator(func(ctx context.Context, c *app.RequestContext) string {
            return "cloudwego.io"
        })),
    )

    // You may retrieve request id from header by calling requestid.Get
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.JSON(consts.StatusOK, utils.H{
            "ping":       "pong",
            "request-id": requestid.Get(c),
        })
    })

    h.Spin()
}
```

## Full Example

As for usage, you may refer to hertz [example](https://github.com/hertz-contrib/requestid/tree/main/example)
