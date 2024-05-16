---
title: "单测"
date: 2022-05-23
weight: 15
keywords: ["单测"]
description: "Hertz 为用户提供的单元测试能力。"
---

一个好的项目的构建离不开单元测试。为了帮助使用者构建出好的项目，hertz 当然也提供了单元测试的工具。

原理和 golang httptest 类似，都是不经过网络只执行 `ServeHTTP` 返回执行后的 response。

## 创建请求上下文

```go
func CreateUtRequestContext(method, url string, body *Body, headers ...Header) *app.RequestContext
```

### CreateUtRequestContext

返回一个 `app.RequestContext` 对象，用于单元测试。

函数签名：

```go
func CreateUtRequestContext(method, url string, body *Body, headers ...Header) *app.RequestContext
```

示例代码：

```go
import (
	"bytes"
	"testing"

	"github.com/cloudwego/hertz/pkg/common/test/assert"
	"github.com/cloudwego/hertz/pkg/common/ut"
)

func TestCreateUtRequestContext(t *testing.T) {
	body := "1"
	method := "PUT"
	path := "/hey/dy"
	headerKey := "Connection"
	headerValue := "close"
	ctx := ut.CreateUtRequestContext(method, path, &ut.Body{Body: bytes.NewBufferString(body), Len: len(body)},
		ut.Header{Key: headerKey, Value: headerValue})

	assert.DeepEqual(t, method, string(ctx.Method()))
	assert.DeepEqual(t, path, string(ctx.Path()))
	body1, err := ctx.Body()
	assert.DeepEqual(t, nil, err)
	assert.DeepEqual(t, body, string(body1))
	assert.DeepEqual(t, headerValue, string(ctx.GetHeader(headerKey)))
}
```

## 发送请求

```go
func PerformRequest(engine *route.Engine, method, url string, body *Body, headers ...Header) *ResponseRecorder
```

### PerformRequest

`PerformRequest` 函数在没有网络传输的情况下向指定 engine 发送构造好的请求。

url 可以是标准的相对路径也可以是绝对路径。

如果想设置流式的请求体，可以通过 `server.WithStreamBody(true)` 将 engine.streamRequestBody 设置为 true 或者将 body 的 len 设置为 -1。

该函数返回 [ResponseRecorder 对象](#responserecorder-对象)。

函数签名：

```go
func PerformRequest(engine *route.Engine, method, url string, body *Body, headers ...Header) *ResponseRecorder
```

示例代码：

```go
import (
   "bytes"
   "context"
   "testing"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/common/config"
   "github.com/cloudwego/hertz/pkg/common/test/assert"
   "github.com/cloudwego/hertz/pkg/common/ut"
   "github.com/cloudwego/hertz/pkg/route"
)

func TestPerformRequest(t *testing.T) {
   router := route.NewEngine(config.NewOptions([]config.Option{}))
   router.GET("/hey/:user", func(ctx context.Context, c *app.RequestContext) {
      user := c.Param("user")
      assert.DeepEqual(t, "close", c.Request.Header.Get("Connection"))
      c.Response.SetConnectionClose()
      c.JSON(201, map[string]string{"hi": user})
   })

   w := ut.PerformRequest(router, "GET", "/hey/hertz", &ut.Body{bytes.NewBufferString("1"), 1},
      ut.Header{"Connection", "close"})
   resp := w.Result()
   assert.DeepEqual(t, 201, resp.StatusCode())
   assert.DeepEqual(t, "{\"hi\":\"hertz\"}", string(resp.Body()))
}
```

## 接收响应

在执行 [PerformRequest](#performrequest) 函数时，内部已经调用了 `NewRecorder`, `Header`, `Write`, `WriteHeader`, `Flush` 等函数，用户只需调用 `Result` 函数拿到返回的 `protocol.Response` 对象进行单测即可。

### ResponseRecorder 对象

用于记录 handler 的响应信息，内容如下：

```go
type ResponseRecorder struct {
	// Code is the HTTP response code set by WriteHeader.
	//
	// Note that if a Handler never calls WriteHeader or Write,
	// this might end up being 0, rather than the implicit
	// http.StatusOK. To get the implicit value, use the Result
	// method.
	Code int

	// header contains the headers explicitly set by the Handler.
	// It is an internal detail.
	header *protocol.ResponseHeader

	// Body is the buffer to which the Handler's Write calls are sent.
	// If nil, the Writes are silently discarded.
	Body *bytes.Buffer

	// Flushed is whether the Handler called Flush.
	Flushed bool

	result      *protocol.Response // cache of Result's return value
	wroteHeader bool
}
```

该对象提供的方法如下：

| 函数签名                                                           | 说明                                                                                                            |
| :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `func NewRecorder() *ResponseRecorder`                             | 返回初始化后的 `ResponseRecorder` 对象                                                                          |
| `func (rw *ResponseRecorder) Header() *protocol.ResponseHeader`    | 返回 `ResponseRecorder.header`                                                                                  |
| `func (rw *ResponseRecorder) Write(buf []byte) (int, error)`       | 将 `[]byte` 类型的数据写入 `ResponseRecorder.Body`                                                              |
| `func (rw *ResponseRecorder) WriteString(str string) (int, error)` | 将 `string` 类型的数据写入 `ResponseRecorder.Body`                                                              |
| `func (rw *ResponseRecorder) WriteHeader(code int)`                | 设置 `ResponseRecorder.Code` 以及 `ResponseRecorder.header.SetStatusCode(code)`                                 |
| `func (rw *ResponseRecorder) Flush()`                              | 实现了 `http.Flusher`，将 `ResponseRecorder.Flushed` 设置为 true                                                |
| `func (rw *ResponseRecorder) Result() *protocol.Response`          | 返回 handler 生成的响应信息，至少包含 StatusCode, Header, Body 以及可选的 Trailer，未来将支持返回更多的响应信息 |

## 与业务 handler 配合使用

假如已经创建了 handler 以及一个函数 `Ping()`:

```go

package handler

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/utils"
)

// Ping .
func Ping(ctx context.Context, c *app.RequestContext) {
	c.JSON(200, utils.H{
		"message": "pong",
	})
}
```

可以在单元测试中直接对 `Ping()` 函数进行测试：

```go
package handler

import (
	"bytes"
	"testing"

	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/test/assert"
	"github.com/cloudwego/hertz/pkg/common/ut"
)

func TestPerformRequest(t *testing.T) {
	h := server.Default()
	h.GET("/ping", Ping)
	w := ut.PerformRequest(h.Engine, "GET", "/ping", &ut.Body{bytes.NewBufferString("1"), 1},
		ut.Header{"Connection", "close"})
	resp := w.Result()
	assert.DeepEqual(t, 201, resp.StatusCode())
	assert.DeepEqual(t, "{\"message\":\"pong\"}", string(resp.Body()))
}
```

之后对 `Ping()` 函数进行修改，单元测试文件不需要复制相同的业务逻辑。

更多 examples 参考 [pkg/common/ut](https://github.com/cloudwego/hertz/tree/main/pkg/common/ut) 中的单测文件。
