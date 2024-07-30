---
title: "Sentinel"
date: 2022-09-29
weight: 2
keywords: ["Service Governance", "Sentinel"]
description: "Hertz provides hertz-contrib/opensergo, to facilitate the integration of sentinel-golang."
---

Hertz provides [hertz-contrib/opensergo](https://github.com/hertz-contrib/opensergo), to facilitate the integration of sentinel-golang.

## Installation

```bash
go get github.com/hertz-contrib/opensergo
```

### Config

### sentinel-golang

The basic configuration of sentinel-golang can be found at [documentation](https://github.com/alibaba/sentinel-golang)

### Server

#### SentinelServerMiddleware

`SentinelServerMiddleware()` returns new `app.HandlerFunc`

Default resource name is {method}:{path}, such as "GET:/api/users/:id"

Default block fallback is returning 429 code

Define your own behavior by `WithServerXxx()`

Sample Code:

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

`WithServerResourceExtractor` sets the resource extractor of the web requests for server side.

Sample Code:

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

`WithServerBlockFallback` sets the fallback handler when requests are blocked for server side.

Sample Code:

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

### Client

#### SentinelClientMiddleware

`SentinelClientMiddleware()` returns new `client.Middleware`
Default resource name is {method}:{path}, such as "GET:/api/users"
Default block fallback is returning blockError
Define your own behavior by `WithClientXxx()`

Sample Code:

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

`WithClientResourceExtractor` sets the resource extractor of the web requests for client side.

Sample Code:

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

`WithClientBlockFallback` sets the fallback handler when requests are blocked for client side.

Sample Code:

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

## Complete sample code

Full usage examples are available at [example](https://github.com/cloudwego/hertz-examples/tree/main/sentinel/hertz)
