---
title: "ETag"
date: 2023-02-11
weight: 14
keywords: ["ETag"]
description: "Hertz provides Etag middleware that can operate on `ETag`."
---

The `ETag` (or entity tag) HTTP response header is an identifier for a specific version of a resource. It lets caches be more efficient and save bandwidth, as a web server does not need to resend a full response if the content was not changed. Additionally, etags help to prevent simultaneous updates of a resource from overwriting each other ("mid-air collisions").
Hertz also provides [Etag middleware](https://github.com/hertz-contrib/etag) that can operate on `ETag`, inspired by fiber's [implementation](https://github.com/gofiber/fiber/tree/master/middleware/etag).

## Install

Download and install

```shell
go get github.com/hertz-contrib/etag
```

Import into your code

```go
import "github.com/hertz-contrib/etag"
```

## Example

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New())
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

## Configuration

| Configuration | Default | Description                                                    |
| ------------- | ------- | -------------------------------------------------------------- |
| WithWeak      | false   | Enable weak validator                                          |
| WithNext      | nil     | Defines a function to skip etag middleware when return is true |
| WithGenerator | nil     | Custom etag generation logic                                   |

### WithWeak

`WithWeak` will enable weak validator for ETag.

Function Signature:

```go
func WithWeak() Option
```

Sample Code:

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithWeak()))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

### WithNext

`WithNext` will skip `etag` middleware when the defined function returns true.

Function Signature:

```go
func WithNext(next NextFunc) Option
```

Sample Code:

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithNext(
        func(ctx context.Context, c *app.RequestContext) bool {
            if string(c.Method()) == http.MethodPost {
                return true
            } else {
                return false
            }
        },
    )))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

### WithGenerator

`WithGenerator` will replace default ETag generation with yours.

**Note:** you should not add `W/` prefix to your custom ETag when used with `WithWeak`.

Function Signature:

```go
func WithGenerator(gen Generator) Option
```

Sample Code:

```go
package main

import (
    "context"
    "net/http"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/hertz-contrib/etag"
)

func main() {
    h := server.Default()
    h.Use(etag.New(etag.WithGenerator(
        func(ctx context.Context, c *app.RequestContext) []byte {
            return []byte("my-custom-etag")
        },
    )))
    h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "pong")
    })
    h.Spin()
}
```

## Full Example

Refer to the [etag/example](https://github.com/hertz-contrib/etag/tree/main/example) for full usage examples.
