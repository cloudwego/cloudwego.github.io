---
title: "Request ID"
date: 2022-10-01
weight: 7
description: >

---

## Introduction

[Request ID middleware](https://github.com/hertz-contrib/requestid) for Hertz framework, inspired by [gin](https://github.com/gin-contrib/requestid), able to add an identifier to the response using the `X-Request-ID` header, and passes the `X-Request-ID` value back to the caller if it's sent in the request headers.

## Installation

Download and install

```shell
go get github.com/hertz-contrib/requestid
```

Import into your code

```go
import "github.com/hertz-contrib/requestid"
```

## Sample Code

### Basic Usage

Hertz will add a request id identifier to the response header which key is `X-Request-ID`.

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

### Custom Request ID keys

Hertz will add a request id identifier with the key `Your-Header-StrKey` to the response header.

Note: If you want to set up the request id in the request header, you need to keep consistent with the custom request id keys.

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

### Custom Request ID Generation

Hertz will add a key-value pair with the key `X-Request-ID` and the value `cloudwego.io` to the response header.

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
		requestid.New(requestid.WithGenerator(func() string {
			return "cloudwego.io"
		})),
	)

	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})

	h.Spin()
}
```

### Custom Request ID Handler

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
			requestid.WithGenerator(func() string {
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

### Get Request ID

`requestid.Get(c)` is a helper function to retrieve request id from request headers. It also works with customised header as defined with `requestid.WithCustomHeaderStrKey`.

Note: You may get empty string if request id is not present in the request.

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
		requestid.New(requestid.WithGenerator(func() string {
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

## Configuration

The fields of the core struct `config` are configured as follows:

| Attribute | Description                                                                                |
|-----------|--------------------------------------------------------------------------------------------|
| generator | Define a function that generates a Request ID. By default, a UUID identifier is generated. |
| headerKey | Define the key value of the Request ID.                                                    |
| handler   | Define the handler function fo the Request ID.                                             |
