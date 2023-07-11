---
title: "Response"
date: 2023-07-10
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

Set Content-Type.

Function Signature:

```go
func (ctx *RequestContext) SetContentType(contentType string)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte(`{"foo":"bar"}`))
    ctx.SetContentType("application/json; charset=utf-8")
    // Content-Type: application/json; charset=utf-8
})
```

### SetContentTypeBytes

Set Content Type with type `[]byte`.

Function Signature:

```go
func (ctx *RequestContext) SetContentTypeBytes(contentType []byte)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte(`{"foo":"bar"}`))
    ctx.SetContentType([]byte("application/json; charset=utf-8"))
    // Content-Type: application/json; charset=utf-8
})
```

### SetConnectionClose

Set Connection: close to inform the client that the server wants to close the connection.

Function Signature:

```go
func (ctx *RequestContext) SetConnectionClose()
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetConnectionClose()
})
```

### SetStatusCode

Set Status Code.

Function Signature:

```go
func (ctx *RequestContext) SetStatusCode(statusCode int)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetStatusCode(consts.StatusOK)
    // Status Code: 200
})
```

### Status

Set Status Code, which is an alias for [SetStatusCode](#setStatuscode).

Function Signature:

```go
func (ctx *RequestContext) Status(code int)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Status(consts.StatusOK)
    // Status Code: 200
})
```

### NotFound

Set the Status Code to 404.

Function Signature:

```go
func (ctx *RequestContext) NotFound()
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.NotFound()
    // Status Code: 404
})
```

### NotModified

Set the Status Code to 304.

Function Signature:

```go
func (ctx *RequestContext) NotModified()
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.NotModified()
    // Status Code: 304
})
```

### Redirect

Set the Status Code and the address to jump to.

Function Signature:

```go
func (ctx *RequestContext) Redirect(statusCode int, uri []byte)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Redirect(consts.StatusFound, []byte("/pet"))
})

h.GET("/pet", func(c context.Context, ctx *app.RequestContext) {
    ctx.String(consts.StatusOK, "cat")
})
```

### Header

Set or delete the specified header.

Function Signature:

```go
func (ctx *RequestContext) Header(key, value string)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Header("My-Name", "tom")
    ctx.Header("My-Name", "")
    ctx.Header("My-Name-Not-Exists", "yes")
})
```

### SetCookie

Set Cookie.

Function Signature:

```go
func (ctx *RequestContext) SetCookie(name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetCookie("user", "hertz", 1, "/", "localhost", protocol.CookieSameSiteLaxMode, true, true)
    cookie := ctx.Response.Header.Get("Set-Cookie") 
    // cookie == "user=hertz; max-age=1; domain=localhost; path=/; HttpOnly; secure; SameSite=Lax"
})
```

### AbortWithStatus

Set the Status Code and terminate subsequent handlers.

Function Signature:

```go
func (ctx *RequestContext) AbortWithStatus(code int)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithStatus(consts.StatusOK)
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### AbortWithError

Set the Status Code and collect Errors, terminate subsequent handlers, and return an Error.

Function Signature:

```go
func (ctx *RequestContext) AbortWithError(code int, err error) *errors.Error 
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithError(consts.StatusOK, errors.New("hertz error"))
	err := ctx.Errors.String()
	// err == "Error #01: hertz error"
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### ResponseHeader 

Use RequestContext.Response.Header to obtain the ResponseHeader object, which is basically consistent with the [RequestHeader](/docs/hertz/tutorials/basic-feature/context/request/#requestheader-object) object and the provided functions.

## Render

Hertz supports rendering of JSON, HTML, Protobuf, etc. (For more information, please refer to [Render](/docs/hertz/tutorials/basic-feature/render))

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
func (ctx *RequestContext) File(filepath string)
func (ctx *RequestContext) FileAttachment(filepath, filename string)
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
```

### SetBodyStream

Set Body Stream and optional Body Size.

> Note: When the bodySize is less than 0, all data is written. When it is greater than or equal to 0, data is written based on the set bodySize size.

Function Signature:

```go
func (ctx *RequestContext) SetBodyStream(bodyStream io.Reader, bodySize int)
```

Example Code:

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

Set Body.

Function Signature:

```go
func (ctx *RequestContext) SetBodyString(body string)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetBodyString("hello world") // Body: "hello world"
})
```

### Write

Add the byte array p to the Body.

Function Signature:

```go
func (ctx *RequestContext) Write(p []byte) (int, error)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Write([]byte("hello"))
    ctx.Write([]byte(" "))
    ctx.Write([]byte("world"))
    // Body: "hello world"
})
```

### WriteString

Set the Body and return the size.

Function Signature:

```go
func (ctx *RequestContext) WriteString(s string) (int, error)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    size, _ := ctx.WriteString("hello world")// Body: "hello world", size == 11
})

```

### File

Write the specified file to Body Stream.

Function Signature:

```go
func (ctx *RequestContext) File(filepath string)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.File("./main.go")
})
```

### FileAttachment

Write the specified file to Body Stream and specify it as download through Content-Disposition.

Function Signature:

```go
func (ctx *RequestContext) FileAttachment(filepath, filename string)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.FileAttachment("./main.go")
})
```

### FileFromFS

Write the specified file to Body Stream.

Function Signature:

```go
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
```

Example Code:

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

Set the Status Code and Body and terminate subsequent handlers.

Function Signature:

```go
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
```

Example Code:

```go
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.AbortWithMsg("abort", consts.StatusOK)
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### AbortWithStatusJSON

Set Status Code and Json format Body and terminate subsequent handlers.

Function Signature:

```go
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
```

Example Code:

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

## Other Functions

```go
func (ctx *RequestContext) Flush() error 
func (ctx *RequestContext) GetResponse() (dst *protocol.Response) 
```

### Flush

Brush data into the hijacked Response Writer. (For more information, please refer to [response_writer](/docs/hertz/tutorials/framework-exten/response_writer/#%E5%8A%AB%E6%8C%81-response-%E7%9A%84-writer))

Function Signature:

```go
func (ctx *RequestContext) Flush() error 
```

### GetResponse

Get the Response object.

Function Signature:

```go
func (ctx *RequestContext) GetResponse() (dst *protocol.Response)
```
