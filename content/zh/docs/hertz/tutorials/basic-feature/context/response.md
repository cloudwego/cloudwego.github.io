---
title: "响应"
date: 2023-04-14
weight: 2
keywords:
  ["RequestContext", "渲染", "Header", "Body", "文件操作", "响应", "Flush"]
description: "RequestContext 中与响应相关的功能。"
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Write([]byte(`{"foo":"bar"}`))
    c.SetContentType("application/json; charset=utf-8")
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Write([]byte(`{"foo":"bar"}`))
    c.SetContentType([]byte("application/json; charset=utf-8"))
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.SetConnectionClose()
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.SetStatusCode(consts.StatusOK)
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Status(consts.StatusOK)
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.NotFound()
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.NotModified()
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Redirect(consts.StatusFound, []byte("/pet"))
})
// GET http://www.example.com:8888/pet
h.GET("/pet", func(ctx context.Context, c *app.RequestContext) {
    c.String(consts.StatusOK, "cat")
})

// external redirection
// GET http://www.example.com:8888/user
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Redirect(consts.StatusFound, []byte("http://www.example1.com:8888/pet"))
})
// GET http://www.example1.com:8888/pet
h.GET("/pet", func(ctx context.Context, c *app.RequestContext) {
    c.String(consts.StatusOK, "cat")
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Header("My-Name", "tom")
    c.Header("My-Name", "")
    c.Header("My-Name-Not-Exists", "yes")
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.SetCookie("user", "hertz", 1, "/", "localhost", protocol.CookieSameSiteLaxMode, true, true)
    cookie := c.Response.Header.Get("Set-Cookie")
    // cookie == "user=hertz; max-age=1; domain=localhost; path=/; HttpOnly; secure; SameSite=Lax"
})
```

#### 分区 Cookie (实验性功能)

Chrome 从 2024 年第一季度开始，禁用了 1% 的用户的第三方 Cookie，拦截 SameSite 属性为 None 的第三方 Cookie。
通过引入分区 Cookie（也称为 [CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips)），允许在跨站请求中携带第三方 Cookie。

自版本 0.8.0 起，Hertz 实验性地支持了分区 Cookie。该实现遵循当前的 [RFC 草案](https://www.ietf.org/archive/id/draft-cutler-httpbis-partitioned-cookies-01.html#name-partitioned-cookies-with-th)
开发，并可能随着草案的迭代而调整。

示例:

```go
func SetPartitionedCookie(c *app.RequestContext, name, value string, maxAge int, path, domain string, sameSite protocol.CookieSameSite, secure, httpOnly bool) {
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
    c.Response.Header.SetCookie(cookie)
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

设置 Status Code 并终止后续的 Handler。

函数签名:

```go
func (ctx *RequestContext) AbortWithStatus(code int)
```

示例:

```go
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.AbortWithStatus(consts.StatusOK)
}, func(ctx context.Context, c *app.RequestContext) {
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.AbortWithError(consts.StatusOK, errors.New("hertz error"))
	err := c.Errors.String()
	// err == "Error #01: hertz error"
}, func(ctx context.Context, c *app.RequestContext) {
    // will not execute
})
```

### ResponseHeader 对象

使用 RequestContext.Response.Header 获取 ResponseHeader 对象，该对象提供了以下方法获取/设置响应头部。

| 函数签名                                                                        | 说明                                                                                                                                                                                |
| :------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `func (h *ResponseHeader) IsHTTP11() bool`                                      | 判断是否是 `HTTP/1.1` 协议，true 表示是 `HTTP/1.1` 协议                                                                                                                             |
| `func (h *ResponseHeader) SetHeaderLength(length int)`                          | 设置响应头的大小                                                                                                                                                                    |
| `func (h *ResponseHeader) GetHeaderLength()`                                    | 获取响应头的大小                                                                                                                                                                    |
| `func (h *ResponseHeader) SetContentRange(startPos, endPos, contentLength int)` | 在响应头中设置 `Content-Range: bytes startPos-endPos/contentLength`，如 `Content-Range: bytes 1-5/10`                                                                               |
| `func (h *ResponseHeader) NoDefaultContentType() bool`                          | 获取未指定 Content-Type 时的默认发送行为，false 表示发送默认 Content-Type 的值，true 表示不发送，默认 Content-Type 的值为 `text/plain; charset=utf-8`                               |
| `func (h *ResponseHeader) SetNoDefaultContentType(b bool)`                      | 设置未指定 Content-Type 时的默认发送行为，false 表示发送默认 Content-Type 的值，true 表示不发送，默认 Content-Type 的值为 `text/plain; charset=utf-8`                               |
| `func (h *ResponseHeader) SetContentType(contentType string)`                   | 设置 Content-Type                                                                                                                                                                   |
| `func (h *ResponseHeader) ContentType() []byte`                                 | 获取 Content-Type                                                                                                                                                                   |
| `func (h *ResponseHeader) SetContentTypeBytes(contentType []byte)`              | 设置 Content-Type                                                                                                                                                                   |
| `func (h *ResponseHeader) ContentLength() int`                                  | 获取 Content-Length，可以是负值，-1 表示 `Transfer-Encoding: chunked`，-2 表示 `Transfer-Encoding: identity`                                                                        |
| `func (h *ResponseHeader) SetContentLength(contentLength int)`                  | 设置 Content-Length，可以是负值，-1 表示 `Transfer-Encoding: chunked`，-2 表示 `Transfer-Encoding: identity`                                                                        |
| `func (h *ResponseHeader) SetContentLengthBytes(contentLength []byte)`          | 设置 `[]byte` 类型的 Content-Length，可以是负值，-1 表示 `Transfer-Encoding: chunked`，-2 表示 `Transfer-Encoding: identity`                                                        |
| `func (h *ResponseHeader) CopyTo(dst *ResponseHeader)`                          | 返回响应头的副本，在对响应头存在竞争访问时可以使用                                                                                                                                  |
| `func (h *ResponseHeader) GetHeaders() []argsKV`                                | 以键值对的形式返回所有响应头                                                                                                                                                        |
| `func (h *ResponseHeader) VisitAll(f func(key, value []byte))`                  | 遍历所有 Header 的键值并执行 f 函数                                                                                                                                                 |
| `func (h *ResponseHeader) Get(key string) string`                               | 获取键为 key 的值，并发安全                                                                                                                                                         |
| `func (h *ResponseHeader) GetAll(key string) []string`                          | 获取 `[]byte` 类型的键为 key 的所有值（用于获取存在相同 key 的多个值），并发安全                                                                                                    |
| `func (h *ResponseHeader) Peek(key string) []byte`                              | 获取 `[]byte` 类型的键为 key 的值，并发不安全，竞争访问时使用 `Get`                                                                                                                 |
| `func (h *ResponseHeader) PeekAll(key string) [][]byte`                         | 获取 `[]byte` 类型的键为 key 的所有值（用于获取存在相同 key 的多个值），并发不安全，竞争访问时使用 `GetAll`                                                                         |
| `func (h *ResponseHeader) Set(key, value string)`                               | 设置 Header 键值，用于为同一个 Key 设置单个 Header                                                                                                                                  |
| `func (h *ResponseHeader) SetBytesV(key string, value []byte)`                  | 设置 `[]byte` 类型的 Header 键值，用于为同一个 Key 设置单个 Header                                                                                                                  |
| `func (h *ResponseHeader) Add(key, value string)`                               | 设置 Header 键值，用于为同一个 Key 设置多个 Header，但 key 会覆盖以下 Header: Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent                 |
| `func (h *ResponseHeader) AddArgBytes(key, value []byte, noValue bool)`         | 添加 Header 键值（与 `Add` 不同，key 一定不会被规范化且 key 为 Content-Type, Content-Length, Content-Encoding, Connection, Server, Set-Cookie, Transfer-Encoding 时不会做特殊处理） |
| `func (h *ResponseHeader) SetArgBytes(key, value []byte, noValue bool)`         | 设置 Header 键值（与 `Set` 不同，key 一定不会被规范化且 key 为 Content-Type, Content-Length, Content-Encoding, Connection, Server, Set-Cookie, Transfer-Encoding 时不会做特殊处理） |
| `func (h *ResponseHeader) Del(key string)`                                      | 删除 Header 中键为 key 的键值对                                                                                                                                                     |
| `func (h *ResponseHeader) DelBytes(key []byte)`                                 | 删除 Header 中键为 key 的键值对                                                                                                                                                     |
| `func (h *ResponseHeader) AppendBytes(dst []byte) []byte`                       | 将完整的 Header 附加到 dst 中并返回                                                                                                                                                 |
| `func (h *ResponseHeader) Header() []byte`                                      | 获取 `[]byte` 类型的完整的 Header                                                                                                                                                   |
| `func (h *ResponseHeader) PeekLocation() []byte`                                | 返回 Header 中 key 为 `Location` 的值                                                                                                                                               |
| `func (h *ResponseHeader) Cookie(cookie *Cookie) bool`                          | 填充给定 cookie.Key 的 cookie，如果 cookie.Key 不存在则返回 false                                                                                                                   |
| `func (h *RequestHeader) FullCookie() []byte`                                   | 以字节数组形式返回完整的 cookie                                                                                                                                                     |
| `func (h *ResponseHeader) SetCookie(cookie *Cookie)`                            | 设置 Cookie 的键值                                                                                                                                                                  |
| `func (h *ResponseHeader) VisitAllCookie(f func(key, value []byte))`            | 遍历所有 Cookie 的键值并执行 f 函数                                                                                                                                                 |
| `func (h *ResponseHeader) DelAllCookies()`                                      | 删除所有 Cookie                                                                                                                                                                     |
| `func (h *ResponseHeader) DelCookie(key string)`                                | 删除响应头中键为 key 的 Cookie，若要删除来自客户端的 Cookie，请使用 `DelClientCookie` 函数                                                                                          |
| `func (h *ResponseHeader) DelCookieBytes(key []byte)`                           | 删除响应头中键为 key 的 Cookie，若要删除来自客户端的 Cookie，请使用 `DelClientCookieBytes` 函数                                                                                     |
| `func (h *ResponseHeader) DelClientCookie(key string)`                          | 删除来自客户端键为 key 的 Cookie                                                                                                                                                    |
| `func (h *ResponseHeader) DelClientCookieBytes(key []byte)`                     | 删除来自客户端键为 key 的 Cookie                                                                                                                                                    |
| `func (h *ResponseHeader) SetConnectionClose(close bool)`                       | 在响应头中设置 `Connection: close` 标志                                                                                                                                             |
| `func (h *ResponseHeader) ConnectionClose() bool`                               | 判断是否包含 Connection: close                                                                                                                                                      |
| `func (h *ResponseHeader) ContentEncoding() []byte`                             | 获取 Content-Encoding                                                                                                                                                               |
| `func (h *ResponseHeader) SetContentEncoding(contentEncoding string)`           | 设置 Content-Encoding                                                                                                                                                               |
| `func (h *ResponseHeader) SetContentEncodingBytes(contentEncoding []byte)`      | 设置 Content-Encoding                                                                                                                                                               |
| `func (h *ResponseHeader) SetCanonical(key, value []byte)`                      | 设置 Header 键值，假设该键是规范形式                                                                                                                                                |
| `func (h *ResponseHeader) Server() []byte`                                      | 返回 Header 中 key 为 `Server` 的值                                                                                                                                                 |
| `func (h *ResponseHeader) SetServerBytes(server []byte)`                        | 设置 Header 中 key 为 Server 的值                                                                                                                                                   |
| `func (h *ResponseHeader) MustSkipContentLength() bool`                         | 判断是否有响应 body（HTTP/1.1 协议规定，响应状态码为 1xx、204、304 时没有响应 body）                                                                                                |
| `func (h *ResponseHeader) StatusCode() int`                                     | 获取响应状态码                                                                                                                                                                      |
| `func (h *ResponseHeader) SetStatusCode(statusCode int)`                        | 设置响应状态码                                                                                                                                                                      |
| `func (h *ResponseHeader) Len() int`                                            | 返回 Header 的数量                                                                                                                                                                  |
| `func (h *ResponseHeader) DisableNormalizing()`                                 | 禁用 Header 名字的规范化 (首字母和破折号后第一个字母大写)                                                                                                                           |
| `func (h *ResponseHeader) IsDisableNormalizing() bool`                          | 是否禁用 Header 名字的规范化，默认不禁用                                                                                                                                            |
| `func (h *ResponseHeader) Trailer() *Trailer`                                   | 获取 Trailer                                                                                                                                                                        |
| `func (h *ResponseHeader) SetProtocol(p string)`                                | 设置协议名                                                                                                                                                                          |
| `func (h *ResponseHeader) GetProtocol() string`                                 | 获取协议名                                                                                                                                                                          |
| `func (h *ResponseHeader) Reset()`                                              | 重置响应头                                                                                                                                                                          |
| `func (h *ResponseHeader) ResetSkipNormalize()`                                 | 重置响应头，除了 `disableNormalizing` 状态                                                                                                                                          |
| `func (h *ResponseHeader) ResetConnectionClose()`                               | 重置 connectionClose 标志为 false 并删除 Connection Header                                                                                                                          |

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

设置 Body Stream 和可选的 Body 大小。该函数用于 Hertz Server 的流式处理，详情可见 [流式处理](/zh/docs/hertz/tutorials/basic-feature/engine/#流式处理)。

> 注意：bodySize 小于 0 时数据全部写入，大于等于 0 时根据设置的 bodySize 大小写入数据。

函数签名:

```go
func (ctx *RequestContext) SetBodyStream(bodyStream io.Reader, bodySize int)
```

示例:

```go
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    data := "hello world"
    r := strings.NewReader(data)
    c.SetBodyStream(r, -1) // Body: "hello world"
})

h.GET("/user1", func(ctx context.Context, c *app.RequestContext) {
    data := "hello world"
    r1 := strings.NewReader(data)
    c.SetBodyStream(r1, 5) // Body: "hello"
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.SetBodyString("hello world") // Body: "hello world"
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Write([]byte("hello"))
    c.Write([]byte(" "))
    c.Write([]byte("world"))
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    size, _ := c.WriteString("hello world")// Body: "hello world", size == 11
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.AbortWithMsg("abort", consts.StatusOK)
}, func(ctx context.Context, c *app.RequestContext) {
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
 h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
  c.AbortWithStatusJSON(consts.StatusOK, utils.H{
   "foo":  "bar",
   "html": "<b>",
  })
 }, func(ctx context.Context, c *app.RequestContext) {
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.File("./main.go")
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.FileAttachment("./main.go")
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    c.FileFromFS("./main.go", &app.FS{
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
