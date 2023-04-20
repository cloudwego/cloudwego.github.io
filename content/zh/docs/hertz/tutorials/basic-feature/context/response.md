---
title: "响应"
date: 2023-04-14
weight: 4
description: >
---

## Body

```go
// TODO: API 说明
func (ctx *RequestContext) SetBodyStream(bodyStream io.Reader, bodySize int)
func (ctx *RequestContext) SetBodyString(body string)
func (ctx *RequestContext) Write(p []byte) (int, error)
func (ctx *RequestContext) WriteString(s string) (int, error)
func (ctx *RequestContext) Render(code int, r render.Render)
func (ctx *RequestContext) String(code int, format string, values ...interface{})
func (ctx *RequestContext) ProtoBuf(code int, obj interface{})
func (ctx *RequestContext) JSON(code int, obj interface{})
func (ctx *RequestContext) PureJSON(code int, obj interface{})
func (ctx *RequestContext) IndentedJSON(code int, obj interface{})
func (ctx *RequestContext) HTML(code int, name string, obj interface{})
func (ctx *RequestContext) Data(code int, contentType string, data []byte)
func (ctx *RequestContext) XML(code int, obj interface{})
func (ctx *RequestContext) File(filepath string)
func (ctx *RequestContext) FileAttachment(filepath, filename string)
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
// TODO: RequestContext.Response.BodyBuffer()
```

### SetBodyStream

设置 Body Stream 和可选的 Body 大小。

函数签名:

```go
func (ctx *RequestContext) SetBodyStream(bodyStream io.Reader, bodySize int)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    data := "hello world"
    r := strings.NewReader(data)
    ctx.SetBodyStream(r, -1) // Body: "hello world"
})

h.GET("/user1", func(c context.Context, ctx *app.RequestContext) {
    data := "hello world"
    r1 := strings.NewReader(data)
    ctx.SetBodyStream(r1, 5) // Body: "hello"
})
```

### SetBodyString

设置 Body 。

函数签名:

```go
func (ctx *RequestContext) SetBodyString(body string)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetBodyString("hello world") // Body: "hello world"
})
```

### Write

将 p 添加到 Body 中。

函数签名:

```go
func (ctx *RequestContext) Write(p []byte) (int, error)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte("hello"))
    ctx.Write([]byte(" "))
    ctx.Write([]byte("world"))
    // Body: "hello world"
})
```

### WriteString

设置 Body 并返回大小。

函数签名:

```go
func (ctx *RequestContext) WriteString(s string) (int, error)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    size, _ := ctx.WriteString("hello world")// Body: "hello world", size == 11
})

```

### Render

设置 Status Code 并通过 Render 设置 ContentType 和 Body。(更多内容请参考 [server/render](https://github.com/cloudwego/hertz/tree/main/pkg/app/server/render))

函数签名:

```go
func (ctx *RequestContext) Render(code int, r render.Render)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Render(consts.StatusOK, render.String{
        Format: "%s %s",
        Data:   []interface{}{"hello", "world"},
    })
    // Status Code: 200
    // Content-Type: text/plain; charset=utf-8 
    // Body: hello world
})
```

### String

设置 Status Code 以及通过 render.String 设置 Body。

函数签名:

```go
func (ctx *RequestContext) String(code int, format string, values ...interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.String(consts.StatusOK, "%s %s", "hello", "world")
    // Status Code: 200
    // Content-Type: text/plain; charset=utf-8 
    // Body: hello world
})
```

### ProtoBuf

设置 Status Code 以及通过 render.ProtoBuf 设置 Body。(更多内容请参考 [TestProtobuf](https://github.com/cloudwego/hertz/blob/main/pkg/app/context_test.go#L49))

函数签名:

```go
func (ctx *RequestContext) ProtoBuf(code int, obj interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    obj := yourProtoStruct{...} // your proto struct here
    ctx.ProtoBuf(consts.StatusOK, &obj)
})
```

### JSON

设置 Status Code 以及通过 render.JSONRender 设置 Body。

函数签名:

```go
func (ctx *RequestContext) JSON(code int, obj interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(consts.StatusOK, utils.H{
        "foo":  "bar",
        "html": "<b>",
    })
    // Status Code: 200
    // Content-Type: application/json; charset=utf-8 
    // Body: {"foo":"bar","html":"\u003cb\u003e"}
})
```

### PureJSON

设置 Status Code 以及通过 render.PureJSON 设置 Body。

> 注意: 与 JSON 不同，PureJSON 不会用 unicode 字符替换 html 特殊字符。

函数签名:

```go
func (ctx *RequestContext) PureJSON(code int, obj interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(consts.StatusOK, utils.H{
        "foo":  "bar",
        "html": "<b>",
    })
    // Status Code: 200
    // Content-Type: application/json; charset=utf-8 
    // Body: {"foo":"bar","html":"<b>"}
})
```

### IndentedJSON

设置 Status Code 以及通过 render.IndentedJSON 设置 Body。

> 注意: 与 JSON 不同，IndentedJSON 会提供换行与缩进。

函数签名:

```go
func (ctx *RequestContext) IndentedJSON(code int, obj interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(consts.StatusOK, utils.H{
        "foo":  "bar",
        "html": "<b>",
    })
    // Status Code: 200
    // Content-Type: application/json; charset=utf-8 
    // Body:
    // {
    //     "foo": "bar",
    //     "html": "\u003cb\u003e"
    // }
})
```

### HTML

设置 Status Code 以及通过 render.HTML 设置 Body。(更多内容请参考 [hertz-examples/render/html](https://github.com/cloudwego/hertz-examples/tree/main/render/html))

函数签名:

```go
func (ctx *RequestContext) HTML(code int, name string, obj interface{})
```

示例:

```go
h.Delims("{[{", "}]}")
h.LoadHTMLGlob("render/html/*")

h.GET("/index", func(c context.Context, ctx *app.RequestContext) {
    ctx.HTML(http.StatusOK, "index.tmpl", utils.H{
        "title": "Main website",
    })
})
```

### Data

设置 Status Code 以及通过 render.Data 设置 Body。

函数签名:

```go
func (ctx *RequestContext) Data(code int, contentType string, data []byte)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    data := []byte(`{"foo":"bar","html":"<b>"}`)
    ctx.Data(consts.StatusOK, "application/json; charset=utf-8", data)
    // Status Code: 200
    // Content-Type: application/json; charset=utf-8 
    // Body: {"foo":"bar","html":"<b>"}
})
```

### XML

TODO

函数签名:

```go
func (ctx *RequestContext) XML(code int, obj interface{})
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    type User struct {
        XMLName  xml.Name `xml:"user"`
        UserName string   `xml:"userName"`
        UserAge  int64    `xml:"userAge"`
    }

    ctx.XML(consts.StatusOK, &User{
        UserName: "foo",
        UserAge:  10,
    })
    // Status Code: 200
    // Content-Type: application/xml; charset=utf-8 
    // Body: <user><userName>foo</userName><userAge>10</userAge></user>
})
```

### File

将指定文件写入到 Body Stream 。

函数签名:

```go
func (ctx *RequestContext) File(filepath string)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.File("./main.go")
})
```

### FileAttachment

将指定文件写入到 Body Stream 并通过 Content-Disposition 指定为下载。

函数签名:

```go
func (ctx *RequestContext) FileAttachment(filepath, filename string)
```

示例:

```go

```

### FileFromFS

将指定文件写入到 Body Stream 。

函数签名:

```go
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.FileFromFS("./main.go", &app.FS{
        Root:               ".",
        IndexNames:         nil,
        GenerateIndexPages: false,
        AcceptByteRange:    true,
    })
})
```

### AbortWithMsg

设置 Status Code 和 Body 并终止后续的 Handler。

函数签名:

```go
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithMsg("abort", consts.StatusOK)
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### AbortWithStatusJSON

设置 Status Code 和 Json 格式 Body 并终止后续的 Handler。

函数签名:

```go
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
```

示例:

```go
 h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
  ctx.AbortWithStatusJSON(consts.StatusOK, utils.H{
   "foo":  "bar",
   "html": "<b>",
  })
 }, func(c context.Context, ctx *app.RequestContext) {
  // will not execute
 })
```

## Header

```go
// TODO: API 说明
func (ctx *RequestContext) SetContentType(contentType string)
func (ctx *RequestContext) SetContentTypeBytes(contentType []byte)
func (ctx *RequestContext) SetConnectionClose()
func (ctx *RequestContext) SetStatusCode(statusCode int)
func (ctx *RequestContext) Status(code int)
func (ctx *RequestContext) NotFound()
func (ctx *RequestContext) NotModified()
func (ctx *RequestContext) Redirect(statusCode int, uri []byte)
func (ctx *RequestContext) Header(key, value string)
func (ctx *RequestContext) SetCookie(name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool)
func (ctx *RequestContext) AbortWithStatus(code int)
func (ctx *RequestContext) AbortWithError(code int, err error) *errors.Error 
// TODO: RequestContext.Response.Header
```

## 其他

```go
// TODO: 分类
func (ctx *RequestContext) Flush() error 
func (ctx *RequestContext) GetResponse() (dst *protocol.Response) 
// TODO: protocol.Response
```

<!-- ### Flush

TODO

函数签名:

```go
func (ctx *RequestContext) Flush() error 
```

示例:

```go

``` -->
