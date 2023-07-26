---
title: "Adaptor"
date: 2023-01-11
weight: 16
description: >

---

Hertz provides access and related methods to Go standard library `http.Request` and `http.ResponseWriter`, it is easy for users to integrate `net/http` to develop application.

Note: This adaptation comes at a performance penalty

## Example

```go
package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/adaptor"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(200)

	_, err := w.Write([]byte("Hello World"))
	if err != nil {
		fmt.Println(err)
		return
	}
}

func main() {
	h := server.Default()

	h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
		req, err := adaptor.GetCompatRequest(&c.Request)
		if err != nil {
			fmt.Println(err)
			return
		}
		// You may build more logic on req
		fmt.Println(req.URL.String())

		// caution: don't pass in c.GetResponse() as it return a copy of response
		rw := adaptor.GetCompatResponseWriter(&c.Response)

		handler(rw, req)
	})

	h.Spin()
}
```

## http.Request

| Function           | Function Signature                                                    | Description                                                                                                                                                                    |
|--------------------|-----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| GetCompatRequest   | `func GetCompatRequest(req *protocol.Request) (*http.Request, error)` | Build and fetch Go standard library `http.Request` from Hertz `protocol.Request`                                                                                               |
| CopyToHertzRequest | `func CopyToHertzRequest(req *http.Request, hreq *protocol.Request)`  | Copy the `URI`, `Host`, `Method`, `Protocol`, `Header` of Go standard library `http.Request` to Hertz `protocol.Request`, The `Body` field will be adapted by sharing `Reader` |

## http.ResponseWriter

| Function / Struct       | Function Signature                                                          | Description                                                                                                                          |
|-------------------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| GetCompatResponseWriter | `func GetCompatResponseWriter(resp *protocol.Response) http.ResponseWriter` | Build and fetch Go standard library `http.ResponseWriter` from Hertz `protocol.Response`                                             |
| compatResponse          | /                                                                           | `compatResponse` implements the `http.ResponseWriter` interface and has adaptations to `Header`, `Write` and `WriteHeader` functions |

## Handler

Hertz pprof middleware provides adaptation methods for the Go standard library `http.Handler` and `http.HandlerFunc`, it is easy for users to adapt to Hertz `app.HandlerFunc` for development.

| Function                | Function Signature                                                 | Description                                                                       |
|-------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| NewHertzHTTPHandlerFunc | `func NewHertzHTTPHandlerFunc(h http.HandlerFunc) app.HandlerFunc` | Used to convert Go standard library `http.HandlerFunc` to Hertz `app.HandlerFunc` |
| NewHertzHTTPHandler     | `func NewHertzHTTPHandler(h http.Handler) app.HandlerFunc`         | Used to convert Go standard library `http.Handler` to Hertz `app.HandlerFunc`     |

Refer to [hertz-example](https://github.com/cloudwego/hertz-examples/tree/main/adaptor) and [pprof](https://github.com/hertz-contrib/pprof/tree/main/adaptor) for more information
