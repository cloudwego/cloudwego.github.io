---
title: "Unit Test"
date: 2022-05-23
weight: 15
description: >

---

A good project can't be built without unit tests. To help users build good projects, hertz of course provides unit testing tools.

The principle is similar to that of golang httptest, both of them just execute `ServeHTTP` without going through the network and return the response after execution.

## Example

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

## Work with biz handler

Assume you have a handler go file and a function called `Ping()`

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

Now you can do some unit test directly to the `Ping()` function.

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
