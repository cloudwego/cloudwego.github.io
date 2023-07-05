---
title: "请求"
date: 2023-04-14
weight: 1
description: >
---


## URI

```go
func (ctx *RequestContext) Host() []byte 
func (ctx *RequestContext) FullPath() string 
func (ctx *RequestContext) SetFullPath(p string)
func (ctx *RequestContext) Path() []byte 
func (ctx *RequestContext) Param(key string) string
func (ctx *RequestContext) Query(key string) string
func (ctx *RequestContext) DefaultQuery(key, defaultValue string) string
func (ctx *RequestContext) GetQuery(key string) (string, bool) 
func (ctx *RequestContext) QueryArgs() *protocol.Args
func (ctx *RequestContext) URI() *protocol.URI 
```

### Host

获取请求的主机地址。

函数签名:

```go
func (ctx *RequestContext) Host() []byte 
```

示例:

```go
// GET http://example.com
h.GET("/", func(c context.Context, ctx *app.RequestContext) {
    host := ctx.Host() // host == []byte("example.com")
})
```

### FullPath

获取匹配的路由完整路径，对于未匹配的路由返回空字符串。

函数签名:

```go
func (ctx *RequestContext) FullPath() string 
```

示例:

```go
h := server.Default(server.WithHandleMethodNotAllowed(true))

// GET http://example.com/user/bar
h.GET("/user/:name", func(c context.Context, ctx *app.RequestContext) {
    fpath := ctx.FullPath() // fpath == "/user/:name"
})

// GET http://example.com/bar
h.NoRoute(func(c context.Context, ctx *app.RequestContext) {
    fpath := ctx.FullPath() // fpath == ""
})

// POST http://example.com/user/bar
h.NoMethod(func(c context.Context, ctx *app.RequestContext) {
    fpath := ctx.FullPath() // fpath == ""
})
```

### SetFullPath

设置 FullPath 的值。

> 注意：FullPath 由路由查找时分配，通常你不需要使用 SetFullPath 去覆盖它。

函数签名:

```go
func (ctx *RequestContext) SetFullPath(p string)
```

示例:

```go
h.GET("/user/:name", func(c context.Context, ctx *app.RequestContext) {
    ctx.SetFullPath("/v1/user/:name")
    fpath := ctx.FullPath() // fpath == "/v1/user/:name"
})
```

### Path

获取请求的路径。

> 注意：出现参数路由时 Path 给出命名参数匹配后的路径，而 FullPath 给出原始路径。

函数签名:

```go
func (ctx *RequestContext) Path() []byte 
```

示例:

```go
// GET http://example.com/user/bar
h.GET("/user/:name", func(c context.Context, ctx *app.RequestContext) {
    path := ctx.Path() // path == []byte("/user/bar")
})
```

### Param

获取路由参数的值。

函数签名:

```go
func (ctx *RequestContext) Param(key string) string 
```

示例:

```go
// GET http://example.com/user/bar
h.GET("/user/:name", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.Param("name") // name == "bar"
    id := ctx.Param("id") // id == ""
})
```

### Query

获取路由 `Query String` 参数中指定属性的值，如果没有返回空字符串。

函数签名:

```go
func (ctx *RequestContext) Query(key string) string
```

示例:

```go
// GET http://example.com/user?name=bar
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.Query("name") // name == "bar"
    id := ctx.Query("id") // id == ""
})
```

### DefaultQuery

获取路由 `Query String` 参数中指定属性的值，如果没有返回设置的默认值。

函数签名:

```go
func (ctx *RequestContext) DefaultQuery(key, defaultValue string) string
```

示例:

```go
// GET http://example.com/user?name=bar&&age=
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.DefaultQuery("name", "tom") // name == "bar"
    id := ctx.DefaultQuery("id", "123") // id == "123"
    age := ctx.DefaultQuery("age", "45") // age == ""
})
```

### GetQuery

获取路由 `Query String` 参数中指定属性的值以及属性是否存在。

函数签名:

```go
func (ctx *RequestContext) GetQuery(key string) (string, bool)
```

示例:

```go
// GET http://example.com/user?name=bar&&age=
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    name, hasName := ctx.GetQuery("name") // name == "bar", hasName == true
    id, hasId := ctx.GetQuery("id") // id == "", hasId == false
    age, hasAge := ctx.GetQuery("age") // age == "", hasAge == true
})
```

### QueryArgs

获取路由 `Query String` 参数对象。

函数签名:

```go
func (ctx *RequestContext) QueryArgs() *protocol.Args
```

### Args 对象

Args 对象提供了以下方法获取/设置 Query String 参数。

|函数签名 | 说明 |
|:--|:--|
|`func (a *Args) Set(key, value string)`  |设置 Args 对象 key 的值 |
|`func (a *Args) Reset()` |重制 Args 对象 |
|`func (a *Args) CopyTo(dst *Args)` |将 Args 对象拷贝到 dst |
|`func (a *Args) Del(key string)` |删除 Args 对象 key 的键值对 |
|`func (a *Args) DelBytes(key []byte)`|删除 Args 对象字节数组类型 key 的键值对 |
|`func (a *Args) Has(key string) bool` |获取 Args 对象是否存在 key 的键值对 |
|`func (a *Args) String() string` | 将 Args 对象转换为字符串类型的 Query String |
|`func (a *Args) QueryString() []byte` |将 Args 对象转换为字节数组类型的 Query String |
|`func (a *Args) ParseBytes(b []byte)` |解析字节数组并将键值对存入 Args 对象 |
|`func (a *Args) Peek(key string) []byte` |获取 Args 对象 key 的值 |
|`func (a *Args) PeekExists(key string) (string, bool)` |获取 Args 对象 key 的值以及是否存在 |
|`func (a *Args) Len() int`| 获取 Args 对象键值对数量 |
|`func (a *Args) AppendBytes(dst []byte) []byte` |将 Args 对象 Query String 附加到 dst 中并返回 |
|`func (a *Args) VisitAll(f func(key, value []byte))` |遍历 Args 对象所有的键值对 |
|`func (a *Args) WriteTo(w io.Writer) (int64, error)`| 将 Args 对象 Query String 写入 io.Writer 中 |
|`func (a *Args) Add(key, value string)` |添加 Args 对象键为 key 的值 |

示例:

```go
// GET http://example.com/user?name=bar&&age=&&pets=dog&&pets=cat
h.GET("/user", func(c context.Context, ctx *app.RequestContext) {
    args := ctx.QueryArgs()

    // get information from args
    s := args.String()                    // s == "name=bar&age=&pets=dog&pets=cat"
    qs := args.QueryString()              // qs == []byte("name=bar&age=&pets=dog&pets=cat")
    cpqs := args.AppendBytes([]byte(nil)) // cpqs == []byte("name=bar&age=&pets=dog&pets=cat")
    name := args.Peek("name")             // name == []byte("bar")
    hasName := args.Has("name")           // hasName == true
    age, hasAge := args.PeekExists("age") // age == "", hasAge == true
    len := args.Len()                     // len == 4

    args.VisitAll(func(key, value []byte) {
        // 1. key == []byte("name"), value == []byte("bar")
        // 2. key == []byte("age"), value == nil
        // 3. key == []byte("pets"), value == []byte("dog")
        // 4. key == []byte("pets"), value == []byte("cat")
    })

    // send information to io.Writer
    req := protocol.AcquireRequest()
	n, err := args.WriteTo(req.BodyWriter())
    // n == 31 err == nil
	s := req.BodyBuffer().String()
    // s == "name=bar&age=&pets=dog&pets=cat"
	
    // change args
    var newArgs protocol.Args
    args.CopyTo(&newArgs)

    newArgs.Set("version", "v1")
    version := newArgs.Peek("version") //version == []byte("v1")

    newArgs.Del("age")
    hasAgeAfterDel := newArgs.Has("age") // hasAgeAfterDel == false

    newArgs.DelBytes([]byte("name"))
    hasNameAfterDel := newArgs.Has("name") // hasNameAfterDel == false

    newArgs.Add("name", "foo")
    newName := newArgs.Peek("name") //newName == []byte("foo")

    newArgs.Reset()
    empty := newArgs.String() // empty == ""

    // parse args
    var newArgs2 protocol.Args
    newArgs2.ParseBytes([]byte("name=bar&age=20"))
    nqs2 := newArgs2.String() // nqs2 == "name=bar&age=20"
})
```

### URI

返回请求的 `URI` 对象。

函数签名:

```go
func (ctx *RequestContext) URI() *protocol.URI 
```

### URI 对象

URI 对象提供了以下方法获取/设置 URI。

|函数签名 | 说明 |
|:--|:--|
| `func (u *URI) CopyTo(dst *URI)`| 拷贝 URI 对象的副本到 dst|
| `func (u *URI) QueryArgs() *Args`| 获取 [Args 对象](#args-对象)|
| `func (u *URI) Hash() []byte`| 获取 Hash 值，比如 <http://example.com/user?baz=123#qwe> 的 Hash 是 **qwe** |
| `func (u *URI) SetHash(hash string)`|设置 Hash |
| `func (u *URI) SetHashBytes(hash []byte)`|设置 `[]byte` 类型 Hash |
| `func (u *URI) Username() []byte`|获取 Username|
| `func (u *URI) SetUsername(username string)`|设置 Username|
| `func (u *URI) SetUsernameBytes(username []byte)`|设置 `[]byte` 类型 Username|
| `func (u *URI) Password() []byte`|获取 Password|
| `func (u *URI) SetPassword(password string)`|设置 Password|
| `func (u *URI) SetPasswordBytes(password []byte)`|设置 `[]byte` 类型 Password|
| `func (u *URI) QueryString() []byte`|获取 `Query String`，比如 <http://example.com/user?baz=123> 的 `Query String` 是 **baz=123**|
| `func (u *URI) SetQueryString(queryString string)`|设置 `Query String`|
| `func (u *URI) SetQueryStringBytes(queryString []byte)`|设置 `[]byte` 类型的 `Query String`|
| `func (u *URI) Path() []byte`| 获取 Path，比如 <http://example.com/user/he%20rtz> 的 Path 是 **/user/he rtz**
| `func (u *URI) PathOriginal() []byte`|获取未转义的 Path，比如 <http://example.com/user/he%20rtz> 的 Path 是 **/user/he%20rtz**|
| `func (u *URI) SetPath(path string)`|设置 Path|
| `func (u *URI) SetPathBytes(path []byte)`|设置 `[]byte` 类型 Path|
| `func (u *URI) String() string`|获取完整 URI 比如 <http://example.com/user?baz=123> 的完整URI是 <http://example.com/user?baz=123> |
| `func (u *URI) FullURI() []byte`|获取 `[]byte` 类型的完整 URI |
| `func (u *URI) Scheme() []byte`|获取协议，如 http|
| `func (u *URI) SetScheme(scheme string)`|设置协议 |
| `func (u *URI) SetSchemeBytes(scheme []byte)`|设置 `[]byte` 类型的协议 |
| `func (u *URI) Host() []byte`|获取 Host，比如 <http://example.com/user> 的 Host 是 **example.com**|
| `func (u *URI) SetHost(host string)`|设置 Host|
| `func (u *URI) SetHostBytes(host []byte)`|设置 `[]byte` 类型 Host|
| `func (u *URI) LastPathSegment() []byte`|获取 Path 的最后一部分，比如 Path **/foo/bar/baz.html** 的最后一部分是 **baz.html**|
| `func (u *URI) Update(newURI string)`|更新 URI|
| `func (u *URI) UpdateBytes(newURI []byte)`|更新 `[]byte` 类型的 URI|
| `func (u *URI) Parse(host, uri []byte)`|初始化 URI|
| `func (u *URI) AppendBytes(dst []byte) []byte`|将完整的 URI 赋值到 dst 中并返回 dst|
| `func (u *URI) RequestURI() []byte`|获取 RequestURI，比如 <http://example.com/user?baz=123> 的 RequestURI 是 **/user?baz=123**|
| `func (u *URI) Reset()`|重置 URI|

## Header

```go
// RequestHeader
func (h *RequestHeader) Add(key, value string)
func (h *RequestHeader) Set(key, value string)
func (h *RequestHeader) Header() []byte
func (h *RequestHeader) String() string
func (h *RequestHeader) VisitAll(f func(key, value []byte))

// RequestContext
func (ctx *RequestContext) IsGet() bool 
func (ctx *RequestContext) IsHead() bool
func (ctx *RequestContext) IsPost() bool
func (ctx *RequestContext) Method() []byte
func (ctx *RequestContext) ContentType() []byte
func (ctx *RequestContext) IfModifiedSince(lastModified time.Time) bool 
func (ctx *RequestContext) Cookie(key string) []byte
func (ctx *RequestContext) UserAgent() []byte
func (ctx *RequestContext) GetHeader(key string) []byte
```

### Add

添加或设置键为 key 的 Header。

> 注意：Add 通常用于为同一个 Key 设置多个 Header，若要为同一个 Key 设置单个 Header 请使用 [Set](#set)。当作用于 Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent 这些 Header 时，使用多个 Add 会覆盖掉旧值。

函数签名：

```go
func (h *RequestHeader) Add(key, value string)
```

示例：

```go
hertz.GET("/example", func(c context.Context, ctx *app.RequestContext) {
	ctx.Request.Header.Add("hertz1", "value1")
	ctx.Request.Header.Add("hertz1", "value2")
	ctx.Request.Header.SetContentTypeBytes([]byte("application/x-www-form-urlencoded"))
	contentType1 := ctx.Request.Header.ContentType() 
    // contentType1 == []byte("application/x-www-form-urlencoded")
	ctx.Request.Header.Add("Content-Type", "application/json; charset=utf-8")
	hertz1 := ctx.Request.Header.GetAll("hertz1") 
    // hertz1 == []string{"value1", "value2"}
	contentType2 := ctx.Request.Header.ContentType() 
    // contentType2 == []byte("application/json; charset=utf-8")
	})
```

### Set

设置 Header 键值。

> 注意：Set 通常用于为同一个 Key 设置单个 Header，若要为同一个 Key 设置多个 Header 请使用 [Add](#add)。

函数签名：

```go
func (h *RequestHeader) Set(key, value string)
```

示例：

```go
hertz.GET("/example", func(c context.Context, ctx *app.RequestContext) {
	ctx.Request.Header.Set("hertz1", "value1")
	ctx.Request.Header.Set("hertz1", "value2")
	ctx.Request.Header.SetContentTypeBytes([]byte("application/x-www-form-urlencoded"))
	contentType1 := ctx.Request.Header.ContentType() 
    // contentType1 == []byte("application/x-www-form-urlencoded")
	ctx.Request.Header.Set("Content-Type", "application/json; charset=utf-8")
	hertz1 := ctx.Request.Header.GetAll("hertz1")    
    // hertz1 == []string{"value2"}
	contentType2 := ctx.Request.Header.ContentType() 
    // contentType2 == []byte("application/json; charset=utf-8")
	})
```

### Header

获取 `[]byte` 类型的完整的 Header。

函数签名：

```go
func (h *RequestHeader) Header() []byte
```

示例：

```go
hertz.GET("/example", func(c context.Context, ctx *app.RequestContext) {
		ctx.Request.Header.Set("hertz1", "value1")
		header := ctx.Request.Header.Header()
		// header == []byte("GET /example HTTP/1.1
		//User-Agent: PostmanRuntime-ApipostRuntime/1.1.0
		//Host: localhost:8888
		//Cache-Control: no-cache
		//Accept: */*
		//Accept-Encoding: gzip, deflate, br
		//Connection: keep-alive
		//Hertz1: value1")
	})
```

### String

获取完整的 Header。

函数签名：

```go
func (h *RequestHeader) String() string
```

示例：

```go
hertz.GET("/example", func(c context.Context, ctx *app.RequestContext) {
		ctx.Request.Header.Set("hertz1", "value1")
		header := ctx.Request.Header.String()
		// header == "GET /example HTTP/1.1
		//User-Agent: PostmanRuntime-ApipostRuntime/1.1.0
		//Host: localhost:8888
		//Cache-Control: no-cache
		//Accept: */*
		//Accept-Encoding: gzip, deflate, br
		//Connection: keep-alive
		//Hertz1: value1"
	})
```

### 遍历 Header

遍历所有 Header 的键值并执行 f 函数。

函数签名：

```go
func (h *RequestHeader) VisitAll(f func(key, value []byte))
```

示例：

```go
hertz.GET("/example", func(c context.Context, ctx *app.RequestContext) {
	ctx.Request.Header.Add("Hertz1", "value1")
	ctx.Request.Header.Add("Hertz1", "value2")

	var hertzString []string
	ctx.Request.Header.VisitAll(func(key, value []byte) {
		if string(key) == "Hertz1" {
			hertzString = append(hertzString, string(value))
		}
	})
	// hertzString == []string{"value1", "value2"}
	})
```

### Method

获取请求方法的类型。

函数签名:

```go
func (ctx *RequestContext) Method() []byte
```

示例:

```go
// POST http://example.com/user
h.Any("/user", func(c context.Context, ctx *app.RequestContext) {
    method := ctx.Method() // method == []byte("POST")
})
```

### ContentType

获取请求头 `Content-Type` 的值。

函数签名:

```go
func (ctx *RequestContext) ContentType() []byte
```

示例:

```go
// POST http://example.com/user
// Content-Type: application/json
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    contentType := ctx.ContentType() // contentType == []byte("application/json")
})
```

### IfModifiedSince

判断时间是否超过请求头 `If-Modified-Since` 的值。

> 注意：如果请求头不包含 If-Modified-Since 也返回 true。

函数签名:

```go
func (ctx *RequestContext) IfModifiedSince(lastModified time.Time) bool
```

示例:

```go
// POST http://example.com/user
// If-Modified-Since: Wed, 21 Oct 2023 07:28:00 GMT
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
    ifModifiedSince := ctx.IfModifiedSince(t2022) // ifModifiedSince == false

    t2024, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2024 07:28:00 GMT")
    ifModifiedSince = ctx.IfModifiedSince(t2024) // ifModifiedSince == true
})
```

### Cookie

获取请求头 `Cookie` 中 key 的值。

函数签名:

```go
func (ctx *RequestContext) Cookie(key string) []byte
```

示例:

```go
// POST http://example.com/user
// Cookie: foo_cookie=choco; bar_cookie=strawberry
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    fCookie := ctx.Cookie("foo_cookie")     // fCookie == []byte("choco")
    bCookie := ctx.Cookie("bar_cookie")     // bCookie == []byte("strawberry")
    noneCookie := ctx.Cookie("none_cookie") // noneCookie == nil
})
```

### UserAgent

获取请求头 `User-Agent` 的值。

函数签名:

```go
func (ctx *RequestContext) UserAgent() []byte
```

示例:

```go
// POST http://example.com/user
// User-Agent: Chrome/51.0.2704.103 Safari/537.36
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    ua := ctx.UserAgent() // ua == []byte("Chrome/51.0.2704.103 Safari/537.36")
})
```

### GetHeader

获取请求头中 key 的值。

函数签名:

```go
func (ctx *RequestContext) GetHeader(key string) []byte
```

示例:

```go
// POST http://example.com/user
// Say-Hello: hello
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    customHeader := ctx.GetHeader("Say-Hello") // customHeader == []byte("hello")
})
```

### RequestHeader 对象

使用 `RequestContext.Request.Header` 获取 RequestHeader 对象，该对象提供了以下方法获取/设置请求头部。

|函数签名 | 说明 |
|:--|:--|
| `func (h *RequestHeader) Method() []byte`|获取 Method |
| `func (h *RequestHeader) SetMethod(method string)`|设置 Method|
| `func (h *RequestHeader) SetMethodBytes(method []byte)`|设置 `[]byte` 类型的 Method|
| `func (h *RequestHeader) IsGet() bool`|判断 Method 是否是 GET|
| `func (h *RequestHeader) IsHead() bool`|判断 Method 是否是 HEAD|
| `func (h *RequestHeader) IsPost() bool`|判断 Method 是否是 POST|
| `func (h *RequestHeader) IsPut() bool`|判断 Method 是否是 PUT|
| `func (h *RequestHeader) IsDelete() bool`|判断 Method 是否是 DELETE|
| `func (h *RequestHeader) IsConnect() bool`|判断 Method 是否是 CONNECT|
| `func (h *RequestHeader) IsOptions() bool`|判断 Method 是否是 OPTIONS|
| `func (h *RequestHeader) IsTrace() bool`|判断 Method 是否是 TRACE|
| `func (h *RequestHeader) IgnoreBody() bool`|判断是否忽略 Body (Method GET/HEAD 忽略 Body)|
| `func (h *RequestHeader) RequestURI() []byte`| 获取 RequestURI|
| `func (h *RequestHeader) SetRequestURI(requestURI string)`|设置 RequestURI|
| `func (h *RequestHeader) SetRequestURIBytes(requestURI []byte)`|设置 `[]byte` 类型的 RequestURI|
| `func (h *RequestHeader) SetProtocol(p string)`|设置协议类型，比如 HTTP/1.0|
| `func (h *RequestHeader) GetProtocol() string`|获取协议类型，比如 HTTP/1.1|
| `func (h *RequestHeader) IsHTTP11() bool`|判断是否是 HTTP/1.1|
| `func (h *RequestHeader) SetNoHTTP11(b bool)`|设置是否不是 HTTP/1.1|
| `func (h *RequestHeader) Host() []byte`| 获取 Host|
| `func (h *RequestHeader) SetHost(host string)`|设置 Host|
| `func (h *RequestHeader) SetHostBytes(host []byte)`|设置 `[]byte` 类型的 Host|
| `func (h *RequestHeader) ContentLength() int`|获取 Content-Length|
| `func (h *RequestHeader) ContentLengthBytes() []byte`|获取 `[]byte` 类型的 Content-Length|
| `func (h *RequestHeader) SetContentLength(contentLength int)`|设置 Content-Length|
| `func (h *RequestHeader) SetContentLengthBytes(contentLength []byte)`|设置 `[]byte` 类型的 Content-Length|
| `func (h *RequestHeader) InitContentLengthWithValue(contentLength int)`|初始化 Content-Length|
| `func (h *RequestHeader) ContentType() []byte`|获取 Content-Type|
| `func (h *RequestHeader) SetContentTypeBytes(contentType []byte)`|设置 Content-Type|
| `func (h *RequestHeader) SetNoDefaultContentType(b bool)`|控制未指定 Content-Type 时的默认发送行为，false 发送默认 Content-Type 的值，true 不发送 Content-Type|
| `func (h *RequestHeader) UserAgent() []byte`|获取 User-Agent|
| `func (h *RequestHeader) SetUserAgentBytes(userAgent []byte)`|设置 User-Agent|
| `func (h *RequestHeader) ConnectionClose() bool`|判断是否包含 Connection: close|
| `func (h *RequestHeader) SetConnectionClose(close bool)`|设置 connectionClose 标志 |
| `func (h *RequestHeader) ResetConnectionClose()`|重制 connectionClose 标志为 false 并删除 Connection Header|
| `func (h *RequestHeader) SetByteRange(startPos, endPos int)`| 设置 Range (Range: bytes=startPos-endPos)|
| `func (h *RequestHeader) SetMultipartFormBoundary(boundary string)`| 当 Content-Type=multipart/form-data 时为其设置boundary |
| `func (h *RequestHeader) MultipartFormBoundary() []byte`|获取 boundary 的值 |
| `func (h *RequestHeader) Trailer() *Trailer`|获取 Trailer|
| `func (h *RequestHeader) Cookie(key string) []byte`|获取 Cookie 键为 key 的值 |
| `func (h *RequestHeader) SetCookie(key, value string)`|设置 Cookie 的键值 |
| `func (h *RequestHeader) DelCookie(key string)`|删除键为 key 的 Cookie|
| `func (h *RequestHeader) DelAllCookies()`|删除所有 Cookie |
| `func (h *RequestHeader) FullCookie() []byte`|获取所有 Cookie|
| `func (h *RequestHeader) Cookies() []*Cookie`|获取所有 Cookie 对象 |
| `func (h *RequestHeader) VisitAllCookie(f func(key, value []byte))`| 遍历所有 Cookie 的键值并执行 f 函数 |
| `func (h *RequestHeader) Peek(key string) []byte`|获取 `[]byte` 类型的键为 key 的值 |
| `func (h *RequestHeader) Get(key string) string`|获取键为 key 的值 |
| `func (h *RequestHeader) PeekArgBytes(key []byte) []byte`|获取键为 key 的值 |
| `func (h *RequestHeader) PeekAll(key string) [][]byte`|获取 `[]byte` 类型的键为 key 的所有值（用于获取存在相同 key 的多个值）|
| `func (h *RequestHeader) GetAll(key string) []string`|获取键为 key 的所有值 |
| `func (h *RequestHeader) PeekIfModifiedSinceBytes() []byte`|获取 If-Modified-Since|
| `func (h *RequestHeader) PeekContentEncoding() []byte`|获取 Content-Encoding|
| `func (h *RequestHeader) PeekRange() []byte`|获取 Range|
| `func (h *RequestHeader) HasAcceptEncodingBytes(acceptEncoding []byte) bool`|判断是否存在 Accept-Encoding 以及 Accept-Encoding 是否包含 acceptEncoding|
| `func (h *RequestHeader) RawHeaders() []byte`|获取原始 Header |
| `func (h *RequestHeader) SetRawHeaders(r []byte)`  | 设置原始 Header |
| `func (h *RequestHeader) Add(key, value string)`| 添加或设置键为 key 的 Header。( key 会覆盖以下Header: Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent)|
| `func (h *RequestHeader) InitBufValue(size int)`|初始化缓冲区大小 |
| `func (h *RequestHeader) GetBufValue() []byte`|获取缓冲区的值 |
| `func (h *RequestHeader) SetCanonical(key, value []byte)`|设置 Header 键值，假设该键是规范形式。|
| `func (h *RequestHeader) Set(key, value string)`|设置 Header 键值 |
| `func (h *RequestHeader) SetBytesKV(key, value []byte)`|设置 Header 键值 |
| `func (h *RequestHeader) DelBytes(key []byte)`|删除 Header 中键为 key 的键值对 |
| `func (h *RequestHeader) AddArgBytes(key, value []byte, noValue bool)`|添加 Header 键值（key 不为 Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent）|
| `func (h *RequestHeader) SetArgBytes(key, value []byte, noValue bool)`|设置 Header 键值（key 不为 Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent）|
| `func (h *RequestHeader) AppendBytes(dst []byte) []byte`|将完整的 Header 附加到 dst 中并返回 |
| `func (h *RequestHeader) Header() []byte`|获取 `[]byte` 类型的完整的 Header |
| `func (h *RequestHeader) String() string`|获取完整的 Header |
| `func (h *RequestHeader) CopyTo(dst *RequestHeader)`|获取 RequestHeader 的副本 |
| `func (h *RequestHeader) VisitAll(f func(key, value []byte))`|遍历所有 Header 的键值并执行 f 函数 |
| `func (h *RequestHeader) VisitAllCustomHeader(f func(key, value []byte))`|遍历所有 Header 的键值并执行 f 函数，以下 key 除外 Content-Type, Content-Length, Cookie, Host, User-Agent）|
| `func (h *RequestHeader) Len() int`|返回 Header 的数量 |
| `func (h *RequestHeader) DisableNormalizing()`|禁用 Header 名字的规范化 (首字母和破折号后第一个字母大写)|
| `func (h *RequestHeader) IsDisableNormalizing() bool`|是否禁用 Header 名字的规范化 |
| `func (h *RequestHeader) ResetSkipNormalize()`|重制 Headers 除了 disableNormalizing 状态 |
| `func (h *RequestHeader) Reset()`|重制 Headers |

## Body

```go
func (ctx *RequestContext) GetRawData() []byte
func (ctx *RequestContext) Body() ([]byte, error) 
func (ctx *RequestContext) RequestBodyStream() io.Reader
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error) 
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error 
func (ctx *RequestContext) PostForm(key string) string
func (ctx *RequestContext) DefaultPostForm(key, defaultValue string) string 
func (ctx *RequestContext) GetPostForm(key string) (string, bool) 
func (ctx *RequestContext) PostArgs() *protocol.Args
func (ctx *RequestContext) FormValue(key string) []byte 
func (ctx *RequestContext) SetFormValueFunc(f FormValueFunc)  
```

### Body

获取请求的 body 数据，如果发生错误返回 error。

函数签名:

```go
func (ctx *RequestContext) Body() ([]byte, error) 
```

示例:

```go
// POST http://example.com/pet
// Content-Type: application/json
// {"pet":"cat"}
h.Post("/pet", func(c context.Context, ctx *app.RequestContext) {
    data, err := ctx.Body() // data == []byte("{\"pet\":\"cat\"}") , err == nil
})
```

### RequestBodyStream

获取请求的 BodyStream。

函数签名:

```go
func (ctx *RequestContext) RequestBodyStream() io.Reader
```

示例:

```go
// POST http://example.com/user
// Content-Type: text/plain
// abcdefg
h := server.Default(server.WithStreamBody(true))
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    sr := ctx.RequestBodyStream()
    data, _ := io.ReadAll(sr) // data == []byte("abcdefg")
})
```

### MultipartForm

获取 `multipart.Form` 对象。(详情请参考 [multipart#Form](https://pkg.go.dev/mime/multipart#Form))

函数签名:

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    form, err := ctx.MultipartForm()
    avatarFile := form.File["avatar"][0] // avatarFile.Filename == "abc.jpg"
    name := form.Value["name"][0] // name == "tom"
})
```

### FormFile

按名称检索 `multipart.Form.File`，返回给定 name 的第一个 `multipart.FileHeader`。(详情请参考 [multipart#FileHeader](https://pkg.go.dev/mime/multipart#FileHeader))

函数签名:

```go
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error) 
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    avatarFile, err := ctx.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
})
```

### SaveUploadedFile

保存 multipart 文件到磁盘。

函数签名:

```go
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error 
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.Post("/user", func(c context.Context, ctx *app.RequestContext) {
    avatarFile, err := ctx.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
    // save file
    ctx.SaveUploadedFile(avatarFile, avatarFile.Filename) // save file "abc.jpg"
})
```

### PostForm

按名称检索 `multipart.Form.Value`，返回给定 name 的第一个值。

> 注意：该函数支持从 application/x-www-form-urlencoded 和 multipart/form-data 这两种类型的content-type中获取 value 值。

函数签名:

```go
func (ctx *RequestContext) PostForm(key string) string
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.PostForm("name") // name == "tom"
})
```

### DefaultPostForm

按名称检索 `multipart.Form.Value`，返回给定 name 的第一个值，如果不存在返回 defaultValue。

> 注意：该函数支持从 application/x-www-form-urlencoded 和 multipart/form-data 这两种类型的content-type中获取 value 值。

函数签名:

```go
func (ctx *RequestContext) DefaultPostForm(key, defaultValue string) string 
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.PostForm("name", "jack") // name == "tom"
    age := ctx.PostForm("age", "10") // age == "10"
})
```

### PostArgs

获取 `application/x-www-form-urlencoded` 参数对象。(详情请参考 [Args 对象](#args-对象))

函数签名:

```go
func (ctx *RequestContext) PostArgs() *protocol.Args
```

示例:

```go
// POST http://example.com/user
// Content-Type: application/x-www-form-urlencoded
// name=tom&pet=cat&pet=dog
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    args := ctx.PostArgs()
    name := args.Peek("name") // name == "tom"

    var pets []string
    args.VisitAll(func(key, value []byte) {
        if string(key) == "pet" {
        pets = append(pets, string(value))
        }
    })
    // pets == []string{"cat", "dog"}
})
```

### FormValue

按照以下顺序获取 key 的值。

1. 从 [QueryArgs](#queryargs) 中获取值。
2. 从 [PostArgs](#postargs) 中获取值。
3. 从 [MultipartForm](#multipartform) 中获取值。

函数签名:

```go
func (ctx *RequestContext) FormValue(key string) []byte 
```

示例:

```go
// POST http://example.com/user?name=tom
// Content-Type: application/x-www-form-urlencoded
// age=10
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.FormValue("name") // name == []byte("tom"), get by QueryArgs
    age := ctx.FormValue("age") // age == []byte("10"), get by PostArgs
})

// POST http://example.com/user
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    name := ctx.FormValue("name") // name == []byte("tom"), get by MultipartForm
})
```

### SetFormValueFunc

设置 FormValue 函数。

函数签名:

```go
func (ctx *RequestContext) SetFormValueFunc(f FormValueFunc) 
```

示例:

```go
// POST http://example.com/user?name=tom
// Content-Type: multipart/form-data; 
// Content-Disposition: form-data; name="age"
// 10
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    // only return multipart form value
    ctx.SetFormValueFunc(func(rc *app.RequestContext, s string) []byte {
        mf, err := rc.MultipartForm()
        if err == nil && mf.Value != nil {
            vv := mf.Value[s]
            if len(vv) > 0 {
                return []byte(vv[0])
            }
        }
        return nil
    })

    name := ctx.FormValue("name") // name == nil
    age := ctx.FormValue("age")   // age == []byte("10")
})
```

## RequestContext 元数据存储

```go
func (ctx *RequestContext) Set(key string, value interface{})
func (ctx *RequestContext) Value(key interface{}) interface{}
func (ctx *RequestContext) Get(key string) (value interface{}, exists bool)
func (ctx *RequestContext) MustGet(key string) interface{} 
func (ctx *RequestContext) GetString(key string) (s string) 
func (ctx *RequestContext) GetBool(key string) (b bool) 
func (ctx *RequestContext) GetInt(key string) (i int) 
func (ctx *RequestContext) GetInt32(key string) (i32 int32) 
func (ctx *RequestContext) GetInt64(key string) (i64 int64) 
func (ctx *RequestContext) GetUint(key string) (ui uint) 
func (ctx *RequestContext) GetUint32(key string) (ui32 uint32) 
func (ctx *RequestContext) GetUint64(key string) (ui64 uint64) 
func (ctx *RequestContext) GetFloat32(key string) (f32 float32) 
func (ctx *RequestContext) GetFloat64(key string) (f64 float64) 
func (ctx *RequestContext) GetTime(key string) (t time.Time) 
func (ctx *RequestContext) GetDuration(key string) (d time.Duration) 
func (ctx *RequestContext) GetStringSlice(key string) (ss []string) 
func (ctx *RequestContext) GetStringMap(key string) (sm map[string]interface{}) 
func (ctx *RequestContext) GetStringMapString(key string) (sms map[string]string) 
func (ctx *RequestContext) GetStringMapStringSlice(key string) (smss map[string][]string) 
func (ctx *RequestContext) ForEachKey(fn func(k string, v interface{})) 
```

### Set

在上下文中存储键值对。

函数签名:

```go
func (ctx *RequestContext) Set(key string, value interface{})
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
    v := ctx.Value("version")  // v == interface {}(string) "v1"
})
```

### Value

获取上下文键为 key 的值。

> 注意：key 类型需要为 `string` , 否则返回 nil。

函数签名:

```go
func (ctx *RequestContext) Value(key interface{}) interface{}
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
    v := ctx.Value("version")  // v == interface {}(string) "v1"
})
```

### Get

获取上下文键为 key 的值以及 key 是否存在。

函数签名:

```go
func (ctx *RequestContext) Get(key string) (value interface{}, exists bool)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
    v, exists := ctx.Get("version")  // v == interface {}(string) "v1", exists == true
    v, exists = ctx.Get("pet")  // v == interface {} nil, exists == false
})
```

### MustGet

获取上下文键为 key 的值，如果不存在会发生 panic。

函数签名:

```go
func (ctx *RequestContext) MustGet(key string) interface{}
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
    v := ctx.MustGet("version")  // v == interface {}(string) "v1"
})
```

### GetString

获取上下文键为 key 的值，并转换为 `string` 类型。

函数签名:

```go
func (ctx *RequestContext) GetString(key string) (s string)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
    v := ctx.GetString("version")  // v == "v1"
})
```

### GetBool

获取上下文键为 key 的值，并转换为 `bool` 类型。

函数签名:

```go
func (ctx *RequestContext) GetBool(key string) (b bool)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("isAdmin", true)
    v := ctx.GetBool("isAdmin")  // v == true
})
```

### GetInt

获取上下文键为 key 的值，并转换为 `int` 类型。

函数签名:

```go
func (ctx *RequestContext) GetInt(key string) (i int)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", 20)
    v := ctx.GetInt("age")  // v == 20
})
```

### GetInt32

获取上下文键为 key 的值，并转换为 `int32` 类型。

函数签名:

```go
func (ctx *RequestContext) GetInt32(key string) (i32 int32)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", int32(20))
    v := ctx.GetInt32("age")  // v == 20
})
```

### GetInt64

获取上下文键为 key 的值，并转换为 `int64` 类型。

函数签名:

```go
func (ctx *RequestContext) GetInt64(key string) (i64 int64)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", int64(20))
    v := ctx.GetInt64("age")  // v == 20
})
```

### GetUint

获取上下文键为 key 的值，并转换为 `uint` 类型。

函数签名:

```go
func (ctx *RequestContext) GetUint(key string) (ui uint)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", uint(20))
    v := ctx.GetInt64("age")  // v == 20
})
```

### GetUint32

获取上下文键为 key 的值，并转换为 `uint32` 类型。

函数签名:

```go
func (ctx *RequestContext) GetUint32(key string) (ui32 uint32)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", uint32(20))
    v := ctx.GetUint32("age")  // v == 20
})
```

### GetUint64

获取上下文键为 key 的值，并转换为 `uint64` 类型。

函数签名:

```go
func (ctx *RequestContext) GetUint64(key string) (ui64 uint64)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", uint64(20))
    v := ctx.GetUint64("age")  // v == 20
})
```

### GetFloat32

获取上下文键为 key 的值，并转换为 `float32` 类型。

函数签名:

```go
func (ctx *RequestContext) GetFloat32(key string) (f32 float32)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", float32(20.1))
    v := ctx.GetFloat64("age")  // v == 20.1
})
```

### GetFloat64

获取上下文键为 key 的值，并转换为 `float64` 类型。

函数签名:

```go
func (ctx *RequestContext) GetFloat64(key string) (f64 float64)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("age", 20.1)
    v := ctx.GetFloat64("age")  // v == 20.1
})
```

### GetTime

获取上下文键为 key 的值，并转换为 `time.Time` 类型。

函数签名:

```go
func (ctx *RequestContext) GetTime(key string) (t time.Time)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
    ctx.Set("birthday", t2022)
    v := ctx.GetTime("birthday")  // v == t2022
})
```

### GetDuration

获取上下文键为 key 的值，并转换为 `time.Duration` 类型。

函数签名:

```go
func (ctx *RequestContext) GetDuration(key string) (d time.Duration)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("duration", time.Minute)
    v := ctx.GetDuration("duration")  // v == time.Minute
})
```

### GetStringSlice

获取上下文键为 key 的值，并转换为 `[]string` 类型。

函数签名:

```go
func (ctx *RequestContext) GetStringSlice(key string) (ss []string)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("pet", []string{"cat", "dog"})
    v := ctx.GetStringSlice("pet")  // v == []string{"cat", "dog"}
})
```

### GetStringMap

获取上下文键为 key 的值，并转换为 `map[string]interface{}` 类型。

函数签名:

```go
func (ctx *RequestContext) GetStringMap(key string) (sm map[string]interface{})
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("info", map[string]interface{}{"name": "tom"})
    v := ctx.GetStringMap("info") // v == map[string]interface{}{"name": "tom"}
})
```

### GetStringMapString

获取上下文键为 key 的值，并转换为 `map[string]string` 类型。

函数签名:

```go
func (ctx *RequestContext) GetStringMapString(key string) (sms map[string]string)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("info", map[string]string{}{"name": "tom"})
    v := ctx.GetStringMap("info") // v == map[string]string{}{"name": "tom"}
})
```

### GetStringMapStringSlice

获取上下文键为 key 的值，并转换为 `map[string][]string` 类型。

函数签名:

```go
func (ctx *RequestContext) GetStringMapStringSlice(key string) (smss map[string][]string)

```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("smss", map[string][]string{"pets": {"cat", "dog"}})
    v := ctx.GetStringMapStringSlice("smss") // v == map[string][]string{"pets": {"cat", "dog"}}
})
```

### ForEachKey

为上下文中的每个键值对调用 fn。

函数签名:

```go
func (ctx *RequestContext) ForEachKey(fn func(k string, v interface{}))
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("duration", time.Minute)
    ctx.Set("version", "v1")
    ctx.ForEachKey(func(k string, v interface{}) {
        // 1. k == "duration", v == interface{}(time.Duration) time.Minute
        // 2. k == "version", v == interface {}(string) "v1"
    })
})
```

## Handler

```go
func (ctx *RequestContext) Next(c context.Context) 
func (ctx *RequestContext) Handlers() HandlersChain 
func (ctx *RequestContext) Handler() HandlerFunc 
func (ctx *RequestContext) SetHandlers(hc HandlersChain) 
func (ctx *RequestContext) HandlerName() string 
func (ctx *RequestContext) GetIndex() int8 
func (ctx *RequestContext) Abort() 
func (ctx *RequestContext) IsAborted() bool
```

### Next

执行下一个 handler，该函数通常用于中间件 handler 中。

函数签名:

```go
func (ctx *RequestContext) Next(c context.Context)
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Next(c)
    v := ctx.GetString("version") // v == "v1"
}, func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("version", "v1")
})
```

### Handlers

获取 handlers chain。

函数签名:

```go
func (ctx *RequestContext) Handlers() HandlersChain
```

示例:

```go
middleware1 := func(c context.Context, ctx *app.RequestContext) {
}

handler1 := func(c context.Context, ctx *app.RequestContext) {
    handlers := ctx.Handlers() // []Handler{middleware1, handler1}
}

h.POST("/user", middleware1, handler1)
```

### Handler

获取 handlers chain 的最后一个 handler，一般来说，最后一个 handler 是 main handler。

函数签名:

```go
func (ctx *RequestContext) Handler() HandlerFunc
```

示例:

```go
middleware1 := func(c context.Context, ctx *app.RequestContext) {
    lastHandler := ctx.Handler() // lastHandler == handler1
}

handler1 := func(c context.Context, ctx *app.RequestContext) {
}

h.POST("/user", middleware1, handler1)
```

### SetHandlers

设置 handlers chain。

函数签名:

```go
func (ctx *RequestContext) SetHandlers(hc HandlersChain)
```

示例:

```go
handler1 := func(c context.Context, ctx *app.RequestContext) {
    ctx.Set("current", "handler1")
}

handler := func(c context.Context, ctx *app.RequestContext) {
    hc := app.HandlersChain{ctx.Handlers()[0], handler1} // append handler1 into handlers chain
    ctx.SetHandlers(hc)
    ctx.Next(c)
    current := ctx.GetString("current") // current == "handler1"
    ctx.String(consts.StatusOK, current)
}

h.POST("/user", handler)
```

### HandlerName

获取最后一个 handler 的函数名称。

函数签名:

```go
func (ctx *RequestContext) HandlerName() string
```

示例:

```go
package main

func main() {
    h := server.New()
    h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
        hn := ctx.HandlerName() // hn == "main.main.func1"
    })
}
```

### GetIndex

获取当前执行的 handler 在 handlers chain 中的 index。

函数签名:

```go
func (ctx *RequestContext) GetIndex() int8
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    index := ctx.GetIndex() // index == 0
}, func(c context.Context, ctx *app.RequestContext) {
    index := ctx.GetIndex() // index == 1
})
```

### Abort

终止后续的 handler 执行。

函数签名:

```go
func (ctx *RequestContext) Abort()
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Abort()
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

### IsAborted

获取后续的 handler 执行状态是否被终止。

函数签名:

```go
func (ctx *RequestContext) IsAborted() bool
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx.Abort()
    isAborted := ctx.IsAborted() // isAborted == true
}, func(c context.Context, ctx *app.RequestContext) {
    // will not execute
})
```

## 参数绑定与校验

(更多内容请参考 [binding-and-validate](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate))

```go
func (ctx *RequestContext) Bind(obj interface{}) error 
func (ctx *RequestContext) Validate(obj interface{}) error 
func (ctx *RequestContext) BindAndValidate(obj interface{}) error
```

## 获取 ClientIP

```go
func (ctx *RequestContext) ClientIP() string 
func (ctx *RequestContext) SetClientIPFunc(f ClientIP) 
```

### ClientIP

获取客户端 IP 的地址。

函数签名:

```go
func (ctx *RequestContext) ClientIP() string 
```

示例:

```go
h.Use(func(c context.Context, ctx *app.RequestContext) {
    ip := ctx.ClientIP() // example: 127.0.0.1
})
```

### SetClientIPFunc

设置获取客户端 IP 的地址的函数。

函数签名:

```go
func (ctx *RequestContext) SetClientIPFunc(f ClientIP) 
```

示例:

```go
// POST http://example.com/user
// X-Forwarded-For: 203.0.113.195
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ip := ctx.ClientIP() // ip == "127.0.0.1"

    opts := app.ClientIPOptions{
        RemoteIPHeaders: []string{"X-Forwarded-For", "X-Real-IP"},
        TrustedProxies:  map[string]bool{ip: true},
    }
    ctx.SetClientIPFunc(app.ClientIPWithOption(opts))

    ip = ctx.ClientIP() // ip == "203.0.113.195"
    ctx.String(consts.StatusOK, ip)
})
```

## 并发安全

```go
func (ctx *RequestContext) Copy() *RequestContext
```

### Copy

拷贝 RequestContext 副本，提供协程安全的访问方式。

函数签名:

```go
func (ctx *RequestContext) Copy() *RequestContext 
```

示例:

```go
h.POST("/user", func(c context.Context, ctx *app.RequestContext) {
    ctx1 := ctx.Copy()
    go func(context *app.RequestContext) {
        // safely
    }(ctx1)
})
```
