---
title: "单测"
date: 2022-05-23
weight: 15
description: >

---

一个好的项目的构建离不开单元测试。为了帮助使用者构建出好的项目，hertz 当然也提供了单元测试的工具。

原理和 golang httptest 类似，都是不经过网络只执行 `ServeHTTP` 返回执行后的 response。

## 例子

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

## 与业务 handler 配合使用

假如已经创建了 handler 以及一个函数`Ping()`

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

可以在单元测试中直接对`ping()`函数进行测试

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

之后对`Ping()`函数进行修改，单元测试文件不需要复制相同的业务逻辑。

更多 examples 参考 [pkg/common/ut](https://github.com/cloudwego/hertz/tree/main/pkg/common/ut) 中的单测文件。
