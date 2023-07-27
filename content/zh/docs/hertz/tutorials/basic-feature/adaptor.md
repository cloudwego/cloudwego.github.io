---
title: "适配器"
date: 2023-01-11
weight: 16
description: >

---

Hertz 提供了获取 Go 标准库的 `http.Request` 和 `http.ResponseWriter` 的方式及其相关方法，以便于用户集成 `net/http` 进行开发。

注意：这种适配性是以性能损耗为代价的

## 示例代码

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

| 函数                 | 函数签名                                                                  | 介绍                                                                                                                                |
|--------------------|-----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| GetCompatRequest   | `func GetCompatRequest(req *protocol.Request) (*http.Request, error)` | 通过 Hertz `protocol.Request` 构建并获取 Go 标准库 `http.Request`                                                                           |
| CopyToHertzRequest | `func CopyToHertzRequest(req *http.Request, hreq *protocol.Request)`  | 拷贝 Go 标准库 `http.Request` 的 `URI`，`Host`，`Method`，`Protocol`，`Header` 到 Hertz `protocol.Request`，对于 `Body` 属性会以共享 `Reader` 的方式进行适配 |

## http.ResponseWriter

| 函数 / 结构体                | 函数签名                                                                        | 介绍                                                                                        |
|-------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| GetCompatResponseWriter | `func GetCompatResponseWriter(resp *protocol.Response) http.ResponseWriter` | 通过 Hertz `protocol.Response` 构建并获取 Go 标准库 `http.ResponseWriter`                           |
| compatResponse          | /                                                                           | `compatResponse` 结构体实现了 `http.ResponseWriter` 接口并对 `Header`，`Write`，`WriteHeader` 函数进行了适配 |

## Handler

Hertz 的 pprof 中间件提供了 Go 标准库 `http.Handler` 和 `http.HandlerFunc` 的适配方法，以便用户适配为 Hertz `app.HandlerFunc` 进行开发。

| 函数                      | 函数签名                                                               | 介绍                                                        |
|-------------------------|--------------------------------------------------------------------|-----------------------------------------------------------|
| NewHertzHTTPHandlerFunc | `func NewHertzHTTPHandlerFunc(h http.HandlerFunc) app.HandlerFunc` | 用于将 Go 标准库 `http.HandlerFunc` 转换为 Hertz `app.HandlerFunc` |
| NewHertzHTTPHandler     | `func NewHertzHTTPHandler(h http.Handler) app.HandlerFunc`         | 用于将 Go 标准库 `http.Handler` 转换为 Hertz `app.HandlerFunc`     |

参考 [hertz-example](https://github.com/cloudwego/hertz-examples/tree/main/adaptor) 和 [pprof](https://github.com/hertz-contrib/pprof/tree/main/adaptor) 以获取更多示例
