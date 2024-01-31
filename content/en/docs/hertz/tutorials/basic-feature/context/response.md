---
title: "Response"
date: 2023-07-10
weight: 2
keywords: ["RequestContext", "Render", "Header", "Body", "File operation", "Response", "Flush"]
description: "The functions related to the response in RequestContext."
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

Set Status Code, which is an alias for [SetStatusCode](#setstatuscode).

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

#### Partitioned Cookies (Experimental Feature)

Starting January 2024, Chrome restricts third-party cookies by default for 1% of users, blocking SameSite=None
attribute cookies. Partitioned cookies (also known as [CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips))
are introduced as a privacy-preserving alternative for third-party cookies in cross-site requests.

Support for partitioned cookies is available as an experimental feature since version 0.8.0, following the current
[RFC draft]((https://www.ietf.org/archive/id/draft-cutler-httpbis-partitioned-cookies-01.html#name-partitioned-cookies-with-th))
and subject to future changes.

Example Code:

```go
func SetPartitionedCookie(ctx *app.RequestContext, name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool) {
   if path == "" {
      path = "/"
   }
   cookie := protocol.AcquireCookie()
   defer protocol.ReleaseCookie(cookie)
   // It is recommended to use the __Host prefix when setting partitioned cookies 
   // to make them bound to the hostname (and not the registrable domain).
   cookie.SetKey(name)
   cookie.SetValue(url.QueryEscape(value))
   cookie.SetMaxAge(maxAge)
   // if name has __Host prefix, Path must be set to "/”.
   cookie.SetPath(path)
   cookie.SetDomain(domain)
   // Partitioned cookies must be set with Secure.
   cookie.SetSecure(secure)
   cookie.SetHTTPOnly(httpOnly)
   cookie.SetSameSite(sameSite)
   cookie.SetPartitioned(true)
   // Set-Cookie: user=hertz; max-age=1; domain=localhost; path=/; HttpOnly; secure; SameSite=None; Partitioned
   ctx.Response.Header.SetCookie(cookie)
}

func main() {
   h := server.Default()

   h.GET("/partitioned", func(ctx context.Context, c *app.RequestContext) {
      SetPartitionedCookie(c, "user", "hertz", 1, "/", "localhost", protocol.CookieSameSiteNoneMode, true, true)
      c.JSON(consts.StatusOK, utils.H{"partitioned": "yes"})
   })

   h.Spin()
}
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

Use RequestContext.Response.Header to obtain the ResponseHeader object, this object provides the following methods to obtain/set the response header.

|Function Signature | Description |
|:--|:--|
|`func (h *ResponseHeader) IsHTTP11() bool` |Determine if it is the `HTTP/1.1` protocol, and true indicates it is the `HTTP/1.1` protocol  |
|`func (h *ResponseHeader) SetHeaderLength(length int)`  |Set the length of the response header |
|`func (h *ResponseHeader) GetHeaderLength()` |Get the length of the response header |
|`func (h *ResponseHeader) SetContentRange(startPos, endPos, contentLength int)` |Set `Content-Range: bytes startPos-endPos/contentLength` in the response header, such as `Content-Range: bytes 1-5/10` |
|`func (h *ResponseHeader) NoDefaultContentType() bool` |Obtain the default sending behavior when no Content-Type is specified. False indicates sending the default Content-Type value, true indicates not sending, and the default Content-Type value is `text/plain; charset=utf-8` |
|`func (h *ResponseHeader) SetNoDefaultContentType(b bool)` |Set the default sending behavior when no Content-Type is specified. False indicates sending the default Content-Type value, true indicates not sending, and the default Content-Type value is `text/plain; charset=utf-8` |
|`func (h *ResponseHeader) SetContentType(contentType string)` |Set Content-Type |
|`func (h *ResponseHeader) ContentType() []byte` |Obtain Content-Type |
|`func (h *ResponseHeader) SetContentTypeBytes(contentType []byte)` |Set Content-Type |
|`func (h *ResponseHeader) ContentLength() int` |Obtain Content-Length, which can be a negative value. -1 represents `Transfer-Encoding: chunked`, -2 represents `Transfer-Encoding: identity` |
|`func (h *ResponseHeader) SetContentLength(contentLength int)` |Set Content-Length, which can be a negative value. -1 represents `Transfer-Encoding: chunked`, -2 represents `Transfer-Encoding: identity` |
|`func (h *ResponseHeader) SetContentLengthBytes(contentLength []byte)` |Set Content-Length for type `[]byte`, which can be a negative value. -1 represents `Transfer-Encoding: chunked`, -2 represents `Transfer-Encoding: identity` |
|`func (h *ResponseHeader) CopyTo(dst *ResponseHeader)` |Return a copy of the response header, which can be used when there is competitive access to the response header |
|`func (h *ResponseHeader) GetHeaders() []argsKV` |Return all response headers in the form of key value pairs |
|`func (h *ResponseHeader) VisitAll(f func(key, value []byte))` |Visit all the key values of all headers and execute the f function |
|`func (h *ResponseHeader) Get(key string) string` |Obtain the value of key, concurrency security |
|`func (h *ResponseHeader) GetAll(key string) []string` |Obtain all values of key with type `[]byte` (used to obtain multiple values with the same key),  concurrency safety |
|`func (h *ResponseHeader) Peek(key string) []byte` |Obtain a key value of type `[]byte` as key, which is not secure for concurrency, and using `Get` when competing for access |
|`func (h *ResponseHeader) PeekAll(key string) [][]byte` |Obtain all values of type `[]byte` key as key (used to obtain multiple values with the same key), which is not secure for concurrency, and uses `GetAll` when competing for access |
|`func (h *ResponseHeader) Set(key, value string)` |Set the header key value to set a single header for the same key |
|`func (h *ResponseHeader) SetBytesV(key string, value []byte)` |Set the header key value of type `[]byte` to set a single header for the same key |
|`func (h *ResponseHeader) Add(key, value string)` |Set the header key value to set multiple headers for the same key, but the key will overwrite the following headers: Content Type, Content Length, Connection, Cookie, Transfer Encoding, Host, User Agent |
| `func (h *ResponseHeader) AddArgBytes(key, value []byte, noValue bool)`|Add Header key value (different from `Add`, the key must not be normalized and will not undergo special processing when it is Content-Type, Content-Length, Content-Encoding, Connection, Server, Set-Cookie, Transfer-Encoding)|
| `func (h *ResponseHeader) SetArgBytes(key, value []byte, noValue bool)`|Set Header key value (different from `Set`, the key must not be normalized and will not undergo special processing when it is Content-Type, Content-Length, Content-Encoding, Connection, Server, Set-Cookie, Transfer-Encoding)|
|`func (h *ResponseHeader) Del(key string)` |Delete key value pairs with key in the header |
|`func (h *ResponseHeader) DelBytes(key []byte)` |Delete key value pairs with key in the header |
|`func (h *ResponseHeader) AppendBytes(dst []byte) []byte` |Attach the complete header to the dst and return |
|`func (h *ResponseHeader) Header() []byte` |Obtain the complete header of type `[]byte` |
|`func (h *ResponseHeader) PeekLocation() []byte` |Return the value with key `Location` in the header  |
|`func (h *ResponseHeader) Cookie(cookie *Cookie) bool` |Fill cookie for the given cookie.Key, and return false if the cookie.Key is missing |
|`func (h *RequestHeader) FullCookie() []byte` |Return the complete cookie as a byte array |
|`func (h *ResponseHeader) SetCookie(cookie *Cookie)` |Set Cookie Key Values |
|`func (h *ResponseHeader) VisitAllCookie(f func(key, value []byte))` |Visit all the key values of all cookies and execute the f function |
|`func (h *ResponseHeader) DelAllCookies()` |Delete all cookies |
|`func (h *ResponseHeader) DelCookie(key string)` |Delete cookie with key in the response header. To delete cookies from the client, use the `DelClientCookie` function |
|`func (h *ResponseHeader) DelCookieBytes(key []byte)` |Delete cookie with key in the response header. To delete cookies from the client, use the `DelClientCookieBytes` function |
|`func (h *ResponseHeader) DelClientCookie(key string)` |Remove the cookie from the client |
|`func (h *ResponseHeader) DelClientCookieBytes(key []byte)` |Remove the cookie from the client |
|`func (h *ResponseHeader) SetConnectionClose(close bool)`|Set the `Connection: close` flag in the response header |
|`func (h *ResponseHeader) ConnectionClose() bool` |Determine if Connection: close is included |
|`func (h *ResponseHeader) ContentEncoding() []byte` |Obtion Content-Encoding |
|`func (h *ResponseHeader) SetContentEncoding(contentEncoding string)` |Set Content-Encoding |
|`func (h *ResponseHeader) SetContentEncodingBytes(contentEncoding []byte)` |Set Content-Encoding |
|`func (h *ResponseHeader) SetCanonical(key, value []byte)` |Set the Header key value, assuming that the key is in canonical form |
|`func (h *ResponseHeader) Server() []byte` |Return the value with key `Server` in the header |
|`func (h *ResponseHeader) SetServerBytes(server []byte)` |Set the key in the header to the value of Server |
|`func (h *ResponseHeader) MustSkipContentLength() bool` |Determine if there is a response body (according to the HTTP/1.1 protocol, there is no response body when the response status codes are 1xx, 204, or 304) |
|`func (h *ResponseHeader) StatusCode() int` |Obtion StatusCode |
|`func (h *ResponseHeader) SetStatusCode(statusCode int)`|Set StatusCode |
|`func (h *ResponseHeader) Len() int` |Return the number of headers |
|`func (h *ResponseHeader) DisableNormalizing()` |Disable the normalization of header name (capitalize the first letter and the first letter after the Em dash) |
|`func (h *ResponseHeader) IsDisableNormalizing() bool` |Whether to disable the normalization of header names, default not disabled |
|`func (h *ResponseHeader) Trailer() *Trailer` |Get Trailer |
|`func (h *ResponseHeader) SetProtocol(p string)` |Set protocol name |
|`func (h *ResponseHeader) GetProtocol() string` |Get protocol name |
|`func (h *ResponseHeader) Reset()`|Reset the response header |
|`func (h *ResponseHeader) ResetSkipNormalize()` |Reset the response header, except for the `disableNormalizing` state |
|`func (h *ResponseHeader) ResetConnectionClose()` |Reset the connectionClose flag to false and delete the Connection Header |

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
func (ctx *RequestContext) AbortWithMsg(msg string, statusCode int)
func (ctx *RequestContext) AbortWithStatusJSON(code int, jsonObj interface{})
```

### SetBodyStream

Set Body Stream and optional Body Size. This function is used for streaming processing on Hertz Server, as detailed in [Streaming](/docs/hertz/tutorials/basic-feature/engine/#streaming).

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

## File operation

```go
func (ctx *RequestContext) File(filepath string)
func (ctx *RequestContext) FileAttachment(filepath, filename string)
func (ctx *RequestContext) FileFromFS(filepath string, fs *FS)
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
