---
title: "Unit Test"
date: 2022-05-23
weight: 15
keywords: ["Unit Test"]
description: "Hertz provides unit testing capabilities for users."
---

A good project can't be built without unit tests. To help users build good projects, hertz of course provides unit testing tools.

The principle is similar to that of golang httptest, both of them just execute `ServeHTTP` without going through the network and return the response after execution.

## Create RequestContext

```go
func CreateUtRequestContext(method, url string, body *Body, headers ...Header) *app.RequestContext
```

### CreateUtRequestContext

Return an `app.RequestContext` for testing purposes.

Function Signature:

```go
func CreateUtRequestContext(method, url string, body *Body, headers ...Header) *app.RequestContext
```

Example Code:

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
	c := ut.CreateUtRequestContext(method, path, &ut.Body{Body: bytes.NewBufferString(body), Len: len(body)},
		ut.Header{Key: headerKey, Value: headerValue})

	assert.DeepEqual(t, method, string(c.Method()))
	assert.DeepEqual(t, path, string(c.Path()))
	body1, err := c.Body()
	assert.DeepEqual(t, nil, err)
	assert.DeepEqual(t, body, string(body1))
	assert.DeepEqual(t, headerValue, string(c.GetHeader(headerKey)))
}
```

## Send Request

```go
func PerformRequest(engine *route.Engine, method, url string, body *Body, headers ...Header) *ResponseRecorder
```

### PerformRequest

The `PerformRequest` function sends a constructed request to the specified engine without network transmission.

The url can be a standard relative path or an absolute path.

If you want to set a streaming request body, you can set engine.streamRequestBody to true through `server.WithStreamBody(true)` or set the len of the body to -1.

This function returns the [ResponseRecorder](#responserecorder).

Function Signature:

```go
func PerformRequest(engine *route.Engine, method, url string, body *Body, headers ...Header) *ResponseRecorder
```

Example Code:

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

## Receive Response

When executing the [PerformRequest](#performarequest) function, functions such as `NewRecorder`, `Header`, `Write`, `WriteHeader`, `Flush` have already been called internally. The user only needs to call the `Result` function to obtain the returned `protocol.Response` object, and then perform unit testing.

### ResponseRecorder

Used to record the response information of the handler, as follows:

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

The method provided by this object is as follows:

| Function Signature                                                 | Description                                                                                                                                                                                     |
| :----------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `func NewRecorder() *ResponseRecorder`                             | Return the initialized `ResponseRecorder` object                                                                                                                                                |
| `func (rw *ResponseRecorder) Header() *protocol.ResponseHeader`    | Return `ResponseRecorder.header`                                                                                                                                                                |
| `func (rw *ResponseRecorder) Write(buf []byte) (int, error)`       | Write data of type `[]byte` to `ResponseRecorder.Body`                                                                                                                                          |
| `func (rw *ResponseRecorder) WriteString(str string) (int, error)` | Write data of type `string` to `ResponseRecorder.Body`                                                                                                                                          |
| `func (rw *ResponseRecorder) WriteHeader(code int)`                | Set `ResponseRecorder.Code` and `ResponseRecorder.header.SetStatusCode(code)`                                                                                                                   |
| `func (rw *ResponseRecorder) Flush()`                              | Implemented `http.Flusher`, set `ResponseRecorder.Flushed` to true                                                                                                                              |
| `func (rw *ResponseRecorder) Result() *protocol.Response`          | Return the response information generated by the handler, including at least StatusCode, Header, Body, and optional Trailer. In the future, it will support returning more response information |

## Work with biz handler

Assume you have a handler go file and a function called `Ping()`:

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

Now you can do some unit test directly to the `Ping()` function:

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

Every time you change the `Ping()` behavior, you don't need to copy it to test file again and again.

For more examples, refer to the unit test file in [pkg/common/ut](https://github.com/cloudwego/hertz/tree/main/pkg/common/ut).
