---
title: "响应"
date: 2023-04-14
weight: 2
description: >
---

## Header

```go
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
```

### SetContentType

设置 Content-Type。

函数签名:

```go
func (ctx *RequestContext) SetContentType(contentType string)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte(`{"foo":"bar"}`))
    ctx.SetContentType("application/json; charset=utf-8")
    // Content-Type: application/json; charset=utf-8
})
```

### SetContentTypeBytes

以 `[]byte` 方式设置 Content-Type。

函数签名:

```go
func (ctx *RequestContext) SetContentTypeBytes(contentType []byte)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte(`{"foo":"bar"}`))
    ctx.SetContentType([]byte("application/json; charset=utf-8"))
    // Content-Type: application/json; charset=utf-8
})
```

### SetConnectionClose

设置 Connection: close，告知客户端服务器想关闭连接。

函数签名:

```go
func (ctx *RequestContext) SetConnectionClose()
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetConnectionClose()
})
```

### SetStatusCode

设置 Status Code。

函数签名:

```go
func (ctx *RequestContext) SetStatusCode(statusCode int)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetStatusCode(consts.StatusOK)
    // Status Code: 200
})
```

### Status

设置 Status Code，[SetStatusCode](#setstatuscode) 的别名。

函数签名:

```go
func (ctx *RequestContext) Status(code int)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Status(consts.StatusOK)
    // Status Code: 200
})
```

### NotFound

设置 Status Code 代码为 404。

函数签名:

```go
func (ctx *RequestContext) NotFound()
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.NotFound()
    // Status Code: 404
})
```

### NotModified

设置 Status Code 代码为 304。

函数签名:

```go
func (ctx *RequestContext) NotModified()
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.NotModified()
    // Status Code: 304
})
```

### Redirect

设置 Status Code 代码以及要跳转的地址。

函数签名:

```go
func (ctx *RequestContext) Redirect(statusCode int, uri []byte)
```

示例:

```go
// internal redirection
// GET http://www.example.com:8888/user
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Redirect(consts.StatusFound, []byte("/pet"))
})
// GET http://www.example.com:8888/pet
h.GET("/pet", func(c context.Context, ctx *app.RequestContext) {
    ctx.String(consts.StatusOK, "cat")
})

// external redirection
// GET http://www.example.com:8888/user
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Redirect(consts.StatusFound, []byte("http://www.example1.com:8888/pet"))
})
// GET http://www.example1.com:8888/pet
h.GET("/pet", func(c context.Context, ctx *app.RequestContext) {
    ctx.String(consts.StatusOK, "cat")
})
```

### Header

设置或删除指定 Header。

函数签名:

```go
func (ctx *RequestContext) Header(key, value string)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Header("My-Name", "tom")
    ctx.Header("My-Name", "")
    ctx.Header("My-Name-Not-Exists", "yes")
})
```

### SetCookie

设置 Cookie。

函数签名:

```go
func (ctx *RequestContext) SetCookie(name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetCookie("user", "hertz", 1, "/", "localhost", protocol.CookieSameSiteLaxMode, true, true)
    cookie := ctx.Response.Header.Get("Set-Cookie") 
    // cookie == "user=hertz; max-age=1; domain=localhost; path=/; HttpOnly; secure; SameSite=Lax"
})
```

### AbortWithStatus

设置 Status Code 并终止后续的 Handler。

函数签名:

```go
func (ctx *RequestContext) AbortWithStatus(code int)
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithStatus(consts.StatusOK)
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### AbortWithError

设置 Status Code 收集 Error 并终止后续的 Handler，返回 Error。

函数签名:

```go
func (ctx *RequestContext) AbortWithError(code int, err error) *errors.Error 
```

示例:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithError(consts.StatusOK, errors.New("hertz error"))
	err := ctx.Errors.String()
	// err == "Error #01: hertz error"
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### ResponseHeader 对象

使用 RequestContext.Response.Header 获取 ResponseHeader 对象，它与 [RequestHeader](/zh/docs/hertz/tutorials/basic-feature/context/request/#requestheader-对象) 对象及提供的函数基本一致。

## 渲染

支持对 JSON，HTML，Protobuf 等的渲染。(更多内容请参考 [渲染](/zh/docs/hertz/tutorials/basic-feature/render))

```go
func (ctx *RequestContext) Render(code int, r render.Render)
func (ctx *RequestContext) String(code int, format string, values ...interface{})
func (ctx *RequestContext) ProtoBuf(code int, obj interface{})
func (ctx *RequestContext) JSON(code int, obj interface{})
func (ctx *RequestContext) PureJSON(code int, obj interface{})
func (ctx *RequestContext) IndentedJSON(code int, obj interface{})
func (ctx *RequestContext) HTML(code int, name string, obj interface{})
func (ctx *RequestContext) Data(code int, contentType string, data []byte)
func (ctx *RequestContext) XML(code int, obj interface{})
```

## Body

```go
func (ctx *RequestContext) SetBodyStream(bodyStream io.Reader, bodySize int)
func (ctx *RequestContext) SetBodyString(body string)
func (ctx *RequestContext) Write(p []byte) (int, error)
func (ctx *RequestContext) WriteString(s string) (int, error)
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
```

### SetBodyStream

设置 Body Stream 和可选的 Body 大小。

> 注意：bodySize 小于 0 时数据全部写入，大于等于 0 时根据设置的 bodySize 大小写入数据。

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

设置 Body。

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

将字节数组 p 添加到 Body 中。

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

## 文件操作

```go
func (ctx *RequestContext) File(filepath string)
func (ctx *RequestContext) FileAttachment(filepath, filename string)
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
```

### File

将指定文件写入到 Body Stream。

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
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.FileAttachment("./main.go")
})
```

### FileFromFS

将指定文件写入到 Body Stream。

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

## 其他

```go
func (ctx *RequestContext) Flush() error 
func (ctx *RequestContext) GetResponse() (dst *protocol.Response) 
```

### Flush

把数据刷入被劫持的 Response Writer 中。(更多内容请参考 [response_writer](/zh/docs/hertz/tutorials/framework-exten/response_writer/#%E5%8A%AB%E6%8C%81-response-%E7%9A%84-writer))

函数签名:

```go
func (ctx *RequestContext) Flush() error 
```

### GetResponse

获取 Response 对象。

函数签名:

```go
func (ctx *RequestContext) GetResponse() (dst *protocol.Response)
```
