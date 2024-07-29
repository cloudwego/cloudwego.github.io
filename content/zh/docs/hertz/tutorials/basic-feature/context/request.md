---
title: "请求"
date: 2023-04-14
weight: 1
keywords:
  [
    "RequestContext",
    "URI",
    "Header",
    "Body",
    "文件操作",
    "元数据存储",
    "Handler",
    "请求",
    "参数绑定与校验",
    "ClientIP",
    "并发安全",
  ]
description: "RequestContext 中与请求相关的功能。"
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
h.GET("/", func(ctx context.Context, c *app.RequestContext) {
    host := c.Host() // host == []byte("example.com")
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
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    fpath := c.FullPath() // fpath == "/user/:name"
})

// GET http://example.com/bar
h.NoRoute(func(ctx context.Context, c *app.RequestContext) {
    fpath := c.FullPath() // fpath == ""
})

// POST http://example.com/user/bar
h.NoMethod(func(ctx context.Context, c *app.RequestContext) {
    fpath := c.FullPath() // fpath == ""
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
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    c.SetFullPath("/v1/user/:name")
    fpath := c.FullPath() // fpath == "/v1/user/:name"
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
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    path := c.Path() // path == []byte("/user/bar")
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
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    name := c.Param("name") // name == "bar"
    id := c.Param("id") // id == ""
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.Query("name") // name == "bar"
    id := c.Query("id") // id == ""
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.DefaultQuery("name", "tom") // name == "bar"
    id := c.DefaultQuery("id", "123") // id == "123"
    age := c.DefaultQuery("age", "45") // age == ""
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
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name, hasName := c.GetQuery("name") // name == "bar", hasName == true
    id, hasId := c.GetQuery("id") // id == "", hasId == false
    age, hasAge := c.GetQuery("age") // age == "", hasAge == true
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

| 函数签名                                               | 说明                                          |
| :----------------------------------------------------- | :-------------------------------------------- |
| `func (a *Args) Set(key, value string)`                | 设置 Args 对象 key 的值                       |
| `func (a *Args) Reset()`                               | 重置 Args 对象                                |
| `func (a *Args) CopyTo(dst *Args)`                     | 将 Args 对象拷贝到 dst                        |
| `func (a *Args) Del(key string)`                       | 删除 Args 对象 key 的键值对                   |
| `func (a *Args) DelBytes(key []byte)`                  | 删除 Args 对象字节数组类型 key 的键值对       |
| `func (a *Args) Has(key string) bool`                  | 获取 Args 对象是否存在 key 的键值对           |
| `func (a *Args) String() string`                       | 将 Args 对象转换为字符串类型的 Query String   |
| `func (a *Args) QueryString() []byte`                  | 将 Args 对象转换为字节数组类型的 Query String |
| `func (a *Args) ParseBytes(b []byte)`                  | 解析字节数组并将键值对存入 Args 对象          |
| `func (a *Args) Peek(key string) []byte`               | 获取 Args 对象 key 的值                       |
| `func (a *Args) PeekExists(key string) (string, bool)` | 获取 Args 对象 key 的值以及是否存在           |
| `func (a *Args) PeekAll(key string) [][]byte`          | 获取 Args 对象 key 的所有值                   |
| `func (a *Args) Len() int`                             | 获取 Args 对象键值对数量                      |
| `func (a *Args) AppendBytes(dst []byte) []byte`        | 将 Args 对象 Query String 附加到 dst 中并返回 |
| `func (a *Args) VisitAll(f func(key, value []byte))`   | 遍历 Args 对象所有的键值对                    |
| `func (a *Args) WriteTo(w io.Writer) (int64, error)`   | 将 Args 对象 Query String 写入 io.Writer 中   |
| `func (a *Args) Add(key, value string)`                | 添加 Args 对象键为 key 的值                   |

示例：

```go
// GET http://example.com/user?name=bar&&age=&&pets=dog&&pets=cat
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    args := c.QueryArgs()

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

    pets := args.PeekAll("pets") // pets == [][]byte{[]byte("dog"), []byte("cat")}

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

| 函数签名                                                | 说明                                                                                                                 |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| `func (u *URI) CopyTo(dst *URI)`                        | 拷贝 URI 对象的副本到 dst                                                                                            |
| `func (u *URI) QueryArgs() *Args`                       | 获取 [Args 对象](#args-对象)                                                                                         |
| `func (u *URI) Hash() []byte`                           | 获取 Hash 值，比如 <http://example.com/user?baz=123#qwe> 的 Hash 是 **qwe**                                          |
| `func (u *URI) SetHash(hash string)`                    | 设置 Hash                                                                                                            |
| `func (u *URI) SetHashBytes(hash []byte)`               | 设置 `[]byte` 类型 Hash                                                                                              |
| `func (u *URI) Username() []byte`                       | 获取 Username                                                                                                        |
| `func (u *URI) SetUsername(username string)`            | 设置 Username                                                                                                        |
| `func (u *URI) SetUsernameBytes(username []byte)`       | 设置 `[]byte` 类型 Username                                                                                          |
| `func (u *URI) Password() []byte`                       | 获取 Password                                                                                                        |
| `func (u *URI) SetPassword(password string)`            | 设置 Password                                                                                                        |
| `func (u *URI) SetPasswordBytes(password []byte)`       | 设置 `[]byte` 类型 Password                                                                                          |
| `func (u *URI) QueryString() []byte`                    | 获取 `Query String`，比如 <http://example.com/user?baz=123> 的 `Query String` 是 **baz=123**                         |
| `func (u *URI) SetQueryString(queryString string)`      | 设置 `Query String`，注意，在该方法之后使用 `RequestHeader.SetRequestURI` 可能会覆盖掉原来想设置的值                 |
| `func (u *URI) SetQueryStringBytes(queryString []byte)` | 设置 `[]byte` 类型的 `Query String`，注意，在该方法之后使用 `RequestHeader.SetRequestURI` 可能会覆盖掉原来想设置的值 |
| `func (u *URI) Path() []byte`                           | 获取 Path，比如 <http://example.com/user/he%20rtz> 的 Path 是 **/user/he rtz**                                       |
| `func (u *URI) PathOriginal() []byte`                   | 获取未转义的 Path，比如 <http://example.com/user/he%20rtz> 的 Path 是 **/user/he%20rtz**                             |
| `func (u *URI) SetPath(path string)`                    | 设置 Path                                                                                                            |
| `func (u *URI) SetPathBytes(path []byte)`               | 设置 `[]byte` 类型 Path                                                                                              |
| `func (u *URI) String() string`                         | 获取完整 URI 比如 <http://example.com/user?baz=123> 的完整 URI 是 <http://example.com/user?baz=123>                  |
| `func (u *URI) FullURI() []byte`                        | 获取 `[]byte` 类型的完整 URI                                                                                         |
| `func (u *URI) Scheme() []byte`                         | 获取协议，如 http                                                                                                    |
| `func (u *URI) SetScheme(scheme string)`                | 设置协议                                                                                                             |
| `func (u *URI) SetSchemeBytes(scheme []byte)`           | 设置 `[]byte` 类型的协议                                                                                             |
| `func (u *URI) Host() []byte`                           | 获取 Host，比如 <http://example.com/user> 的 Host 是 **example.com**                                                 |
| `func (u *URI) SetHost(host string)`                    | 设置 Host                                                                                                            |
| `func (u *URI) SetHostBytes(host []byte)`               | 设置 `[]byte` 类型 Host                                                                                              |
| `func (u *URI) LastPathSegment() []byte`                | 获取 Path 的最后一部分，比如 Path **/foo/bar/baz.html** 的最后一部分是 **baz.html**                                  |
| `func (u *URI) Update(newURI string)`                   | 更新 URI                                                                                                             |
| `func (u *URI) UpdateBytes(newURI []byte)`              | 更新 `[]byte` 类型的 URI                                                                                             |
| `func (u *URI) Parse(host, uri []byte)`                 | 初始化 URI                                                                                                           |
| `func (u *URI) AppendBytes(dst []byte) []byte`          | 将完整的 URI 赋值到 dst 中并返回 dst                                                                                 |
| `func (u *URI) RequestURI() []byte`                     | 获取 RequestURI，比如 <http://example.com/user?baz=123> 的 RequestURI 是 **/user?baz=123**                           |
| `func (u *URI) Reset()`                                 | 重置 URI                                                                                                             |

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
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
	c.Request.Header.Add("hertz1", "value1")
	c.Request.Header.Add("hertz1", "value2")
	c.Request.Header.SetContentTypeBytes([]byte("application/x-www-form-urlencoded"))
	contentType1 := c.Request.Header.ContentType()
    // contentType1 == []byte("application/x-www-form-urlencoded")
	c.Request.Header.Add("Content-Type", "application/json; charset=utf-8")
	hertz1 := c.Request.Header.GetAll("hertz1")
    // hertz1 == []string{"value1", "value2"}
	contentType2 := c.Request.Header.ContentType()
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
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
	c.Request.Header.Set("hertz1", "value1")
	c.Request.Header.Set("hertz1", "value2")
	c.Request.Header.SetContentTypeBytes([]byte("application/x-www-form-urlencoded"))
	contentType1 := c.Request.Header.ContentType()
    // contentType1 == []byte("application/x-www-form-urlencoded")
	c.Request.Header.Set("Content-Type", "application/json; charset=utf-8")
	hertz1 := c.Request.Header.GetAll("hertz1")
    // hertz1 == []string{"value2"}
	contentType2 := c.Request.Header.ContentType()
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
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
		c.Request.Header.Set("hertz1", "value1")
		header := c.Request.Header.Header()
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
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
		c.Request.Header.Set("hertz1", "value1")
		header := c.Request.Header.String()
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
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
	c.Request.Header.Add("Hertz1", "value1")
	c.Request.Header.Add("Hertz1", "value2")

	var hertzString []string
	c.Request.Header.VisitAll(func(key, value []byte) {
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
h.Any("/user", func(ctx context.Context, c *app.RequestContext) {
    method := c.Method() // method == []byte("POST")
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    contentType := c.ContentType() // contentType == []byte("application/json")
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
    ifModifiedSince := c.IfModifiedSince(t2022) // ifModifiedSince == false

    t2024, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2024 07:28:00 GMT")
    ifModifiedSince = c.IfModifiedSince(t2024) // ifModifiedSince == true
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    fCookie := c.Cookie("foo_cookie")     // fCookie == []byte("choco")
    bCookie := c.Cookie("bar_cookie")     // bCookie == []byte("strawberry")
    noneCookie := c.Cookie("none_cookie") // noneCookie == nil
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    ua := c.UserAgent() // ua == []byte("Chrome/51.0.2704.103 Safari/537.36")
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    customHeader := c.GetHeader("Say-Hello") // customHeader == []byte("hello")
})
```

### RequestHeader 对象

使用 `RequestContext.Request.Header` 获取 RequestHeader 对象，该对象提供了以下方法获取/设置请求头部。

| 函数签名                                                                     | 说明                                                                                                                                                                            |
| :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `func (h *RequestHeader) Method() []byte`                                    | 获取 Method                                                                                                                                                                     |
| `func (h *RequestHeader) SetMethod(method string)`                           | 设置 Method                                                                                                                                                                     |
| `func (h *RequestHeader) SetMethodBytes(method []byte)`                      | 设置 `[]byte` 类型的 Method                                                                                                                                                     |
| `func (h *RequestHeader) IsGet() bool`                                       | 判断 Method 是否是 GET                                                                                                                                                          |
| `func (h *RequestHeader) IsHead() bool`                                      | 判断 Method 是否是 HEAD                                                                                                                                                         |
| `func (h *RequestHeader) IsPost() bool`                                      | 判断 Method 是否是 POST                                                                                                                                                         |
| `func (h *RequestHeader) IsPut() bool`                                       | 判断 Method 是否是 PUT                                                                                                                                                          |
| `func (h *RequestHeader) IsDelete() bool`                                    | 判断 Method 是否是 DELETE                                                                                                                                                       |
| `func (h *RequestHeader) IsConnect() bool`                                   | 判断 Method 是否是 CONNECT                                                                                                                                                      |
| `func (h *RequestHeader) IsOptions() bool`                                   | 判断 Method 是否是 OPTIONS                                                                                                                                                      |
| `func (h *RequestHeader) IsTrace() bool`                                     | 判断 Method 是否是 TRACE                                                                                                                                                        |
| `func (h *RequestHeader) IgnoreBody() bool`                                  | 判断是否忽略 Body (Method GET/HEAD 忽略 Body)                                                                                                                                   |
| `func (h *RequestHeader) RequestURI() []byte`                                | 获取 RequestURI                                                                                                                                                                 |
| `func (h *RequestHeader) SetRequestURI(requestURI string)`                   | 设置 RequestURI                                                                                                                                                                 |
| `func (h *RequestHeader) SetRequestURIBytes(requestURI []byte)`              | 设置 `[]byte` 类型的 RequestURI                                                                                                                                                 |
| `func (h *RequestHeader) SetProtocol(p string)`                              | 设置协议类型，比如 HTTP/1.0                                                                                                                                                     |
| `func (h *RequestHeader) GetProtocol() string`                               | 获取协议类型，比如 HTTP/1.1                                                                                                                                                     |
| `func (h *RequestHeader) IsHTTP11() bool`                                    | 判断是否是 HTTP/1.1                                                                                                                                                             |
| `func (h *RequestHeader) SetNoHTTP11(b bool)`                                | 设置是否不是 HTTP/1.1                                                                                                                                                           |
| `func (h *RequestHeader) Host() []byte`                                      | 获取 Host                                                                                                                                                                       |
| `func (h *RequestHeader) SetHost(host string)`                               | 设置 Host                                                                                                                                                                       |
| `func (h *RequestHeader) SetHostBytes(host []byte)`                          | 设置 `[]byte` 类型的 Host                                                                                                                                                       |
| `func (h *RequestHeader) ContentLength() int`                                | 获取 Content-Length                                                                                                                                                             |
| `func (h *RequestHeader) ContentLengthBytes() []byte`                        | 获取 `[]byte` 类型的 Content-Length                                                                                                                                             |
| `func (h *RequestHeader) SetContentLength(contentLength int)`                | 设置 Content-Length                                                                                                                                                             |
| `func (h *RequestHeader) SetContentLengthBytes(contentLength []byte)`        | 设置 `[]byte` 类型的 Content-Length                                                                                                                                             |
| `func (h *RequestHeader) InitContentLengthWithValue(contentLength int)`      | 初始化 Content-Length                                                                                                                                                           |
| `func (h *RequestHeader) ContentType() []byte`                               | 获取 Content-Type                                                                                                                                                               |
| `func (h *RequestHeader) SetContentTypeBytes(contentType []byte)`            | 设置 Content-Type                                                                                                                                                               |
| `func (h *RequestHeader) SetNoDefaultContentType(b bool)`                    | 控制未指定 Content-Type 时的默认发送行为，false 发送默认 Content-Type 的值，true 不发送 Content-Type                                                                            |
| `func (h *RequestHeader) UserAgent() []byte`                                 | 获取 User-Agent                                                                                                                                                                 |
| `func (h *RequestHeader) SetUserAgentBytes(userAgent []byte)`                | 设置 User-Agent                                                                                                                                                                 |
| `func (h *RequestHeader) ConnectionClose() bool`                             | 判断是否包含 Connection: close                                                                                                                                                  |
| `func (h *RequestHeader) SetConnectionClose(close bool)`                     | 设置 connectionClose 标志                                                                                                                                                       |
| `func (h *RequestHeader) ResetConnectionClose()`                             | 重置 connectionClose 标志为 false 并删除 Connection Header                                                                                                                      |
| `func (h *RequestHeader) SetByteRange(startPos, endPos int)`                 | 设置 Range (Range: bytes=startPos-endPos)                                                                                                                                       |
| `func (h *RequestHeader) SetMultipartFormBoundary(boundary string)`          | 当 Content-Type=multipart/form-data 时为其设置 boundary                                                                                                                         |
| `func (h *RequestHeader) MultipartFormBoundary() []byte`                     | 获取 boundary 的值                                                                                                                                                              |
| `func (h *RequestHeader) Trailer() *Trailer`                                 | 获取 Trailer                                                                                                                                                                    |
| `func (h *RequestHeader) Cookie(key string) []byte`                          | 获取 Cookie 键为 key 的值                                                                                                                                                       |
| `func (h *RequestHeader) SetCookie(key, value string)`                       | 设置 Cookie 的键值                                                                                                                                                              |
| `func (h *RequestHeader) DelCookie(key string)`                              | 删除键为 key 的 Cookie                                                                                                                                                          |
| `func (h *RequestHeader) DelAllCookies()`                                    | 删除所有 Cookie                                                                                                                                                                 |
| `func (h *RequestHeader) FullCookie() []byte`                                | 获取所有 Cookie                                                                                                                                                                 |
| `func (h *RequestHeader) Cookies() []*Cookie`                                | 获取所有 Cookie 对象                                                                                                                                                            |
| `func (h *RequestHeader) VisitAllCookie(f func(key, value []byte))`          | 遍历所有 Cookie 的键值并执行 f 函数                                                                                                                                             |
| `func (h *RequestHeader) Peek(key string) []byte`                            | 获取 `[]byte` 类型的键为 key 的值                                                                                                                                               |
| `func (h *RequestHeader) Get(key string) string`                             | 获取键为 key 的值                                                                                                                                                               |
| `func (h *RequestHeader) PeekArgBytes(key []byte) []byte`                    | 获取键为 key 的值                                                                                                                                                               |
| `func (h *RequestHeader) PeekAll(key string) [][]byte`                       | 获取 `[]byte` 类型的键为 key 的所有值（用于获取存在相同 key 的多个值）                                                                                                          |
| `func (h *RequestHeader) GetAll(key string) []string`                        | 获取键为 key 的所有值                                                                                                                                                           |
| `func (h *RequestHeader) PeekIfModifiedSinceBytes() []byte`                  | 获取 If-Modified-Since                                                                                                                                                          |
| `func (h *RequestHeader) PeekContentEncoding() []byte`                       | 获取 Content-Encoding                                                                                                                                                           |
| `func (h *RequestHeader) PeekRange() []byte`                                 | 获取 Range                                                                                                                                                                      |
| `func (h *RequestHeader) HasAcceptEncodingBytes(acceptEncoding []byte) bool` | 判断是否存在 Accept-Encoding 以及 Accept-Encoding 是否包含 acceptEncoding                                                                                                       |
| `func (h *RequestHeader) RawHeaders() []byte`                                | 获取原始 Header                                                                                                                                                                 |
| `func (h *RequestHeader) SetRawHeaders(r []byte)`                            | 设置原始 Header                                                                                                                                                                 |
| `func (h *RequestHeader) Add(key, value string)`                             | 添加或设置键为 key 的 Header，用于为同一个 Key 设置多个 Header，但 key 会覆盖以下 Header: Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent |
| `func (h *RequestHeader) InitBufValue(size int)`                             | 初始化缓冲区大小                                                                                                                                                                |
| `func (h *RequestHeader) GetBufValue() []byte`                               | 获取缓冲区的值                                                                                                                                                                  |
| `func (h *RequestHeader) SetCanonical(key, value []byte)`                    | 设置 Header 键值，假设该键是规范形式                                                                                                                                            |
| `func (h *RequestHeader) Set(key, value string)`                             | 设置 Header 键值，用于为同一个 Key 设置单个 Header                                                                                                                              |
| `func (h *RequestHeader) SetBytesKV(key, value []byte)`                      | 设置 `[]byte` 类型的 Header 键值，用于为同一个 Key 设置单个 Header                                                                                                              |
| `func (h *RequestHeader) DelBytes(key []byte)`                               | 删除 Header 中键为 key 的键值对                                                                                                                                                 |
| `func (h *RequestHeader) AddArgBytes(key, value []byte, noValue bool)`       | 添加 Header 键值（与 `Add` 不同，key 一定不会被规范化且 key 为 Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent 时不会做特殊处理）         |
| `func (h *RequestHeader) SetArgBytes(key, value []byte, noValue bool)`       | 设置 Header 键值（与 `Set` 不同，key 一定不会被规范化且 key 为 Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent 时不会做特殊处理）         |
| `func (h *RequestHeader) AppendBytes(dst []byte) []byte`                     | 将完整的 Header 附加到 dst 中并返回                                                                                                                                             |
| `func (h *RequestHeader) Header() []byte`                                    | 获取 `[]byte` 类型的完整的 Header                                                                                                                                               |
| `func (h *RequestHeader) String() string`                                    | 获取完整的 Header                                                                                                                                                               |
| `func (h *RequestHeader) CopyTo(dst *RequestHeader)`                         | 获取 RequestHeader 的副本                                                                                                                                                       |
| `func (h *RequestHeader) VisitAll(f func(key, value []byte))`                | 遍历所有 Header 的键值并执行 f 函数                                                                                                                                             |
| `func (h *RequestHeader) VisitAllCustomHeader(f func(key, value []byte))`    | 遍历所有 Header 的键值并执行 f 函数，以下 key 除外：Content-Type, Content-Length, Cookie, Host, User-Agent）                                                                    |
| `func (h *RequestHeader) Len() int`                                          | 返回 Header 的数量                                                                                                                                                              |
| `func (h *RequestHeader) DisableNormalizing()`                               | 禁用 Header 名字的规范化 (首字母和破折号后第一个字母大写)                                                                                                                       |
| `func (h *RequestHeader) IsDisableNormalizing() bool`                        | 是否禁用 Header 名字的规范化，默认不禁用                                                                                                                                        |
| `func (h *RequestHeader) ResetSkipNormalize()`                               | 重置 Headers，除了 disableNormalizing 状态                                                                                                                                      |
| `func (h *RequestHeader) Reset()`                                            | 重置 Headers                                                                                                                                                                    |

## Body

```go
func (ctx *RequestContext) GetRawData() []byte
func (ctx *RequestContext) Body() ([]byte, error)
func (ctx *RequestContext) RequestBodyStream() io.Reader
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
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
h.Post("/pet", func(ctx context.Context, c *app.RequestContext) {
    data, err := c.Body() // data == []byte("{\"pet\":\"cat\"}") , err == nil
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    sr := c.RequestBodyStream()
    data, _ := io.ReadAll(sr) // data == []byte("abcdefg")
})
```

### MultipartForm

获取 `multipart.Form` 对象，(详情请参考 [multipart#Form](https://pkg.go.dev/mime/multipart#Form))

> 注意：此函数既可以获取普通值也可以获取文件，此处给出了获取普通值的示例代码，获取文件的示例代码可参考 [MultipartForm](#multipartform-1)。

函数签名:

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    form, err := c.MultipartForm()
    name := form.Value["name"][0] // name == "tom"
})
```

### PostForm

按名称检索 `multipart.Form.Value`，返回给定 name 的第一个值。

> 注意：该函数支持从 application/x-www-form-urlencoded 和 multipart/form-data 这两种类型的 content-type 中获取 value 值，且不支持获取文件值。

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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.PostForm("name") // name == "tom"
})
```

### DefaultPostForm

按名称检索 `multipart.Form.Value`，返回给定 name 的第一个值，如果不存在返回 defaultValue。

> 注意：该函数支持从 application/x-www-form-urlencoded 和 multipart/form-data 这两种类型的 content-type 中获取 value 值，且不支持获取文件值。

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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.PostForm("name", "jack") // name == "tom"
    age := c.PostForm("age", "10") // age == "10"
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    args := c.PostArgs()
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.FormValue("name") // name == []byte("tom"), get by QueryArgs
    age := c.FormValue("age") // age == []byte("10"), get by PostArgs
})

// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.FormValue("name") // name == []byte("tom"), get by MultipartForm
})
```

### SetFormValueFunc

若 [FormValue](#formvalue) 函数提供的默认获取 key 的值的方式不满足需求，用户可以使用该函数自定义获取 key 的值的方式。

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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    // only return multipart form value
    c.SetFormValueFunc(func(rc *app.RequestContext, s string) []byte {
        mf, err := rc.MultipartForm()
        if err == nil && mf.Value != nil {
            vv := mf.Value[s]
            if len(vv) > 0 {
                return []byte(vv[0])
            }
        }
        return nil
    })

    name := c.FormValue("name") // name == nil
    age := c.FormValue("age")   // age == []byte("10")
})
```

## 文件操作

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error)
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error
```

### MultipartForm

获取 `multipart.Form` 对象。(详情请参考 [multipart#Form](https://pkg.go.dev/mime/multipart#Form))

> 注意：此函数既可以获取普通值也可以获取文件，此处给出了获取文件值的示例代码，获取普通值的示例代码可参考 [MultipartForm](#multipartform)。

函数签名:

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
```

示例:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    form, err := c.MultipartForm()
    avatarFile := form.File["avatar"][0] // avatarFile.Filename == "abc.jpg"
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    avatarFile, err := c.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
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
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    avatarFile, err := c.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
    // save file
    c.SaveUploadedFile(avatarFile, avatarFile.Filename) // save file "abc.jpg"
})
```

## RequestContext 元数据存储

> 注意：RequestContext 在请求结束后会被回收，元数据会被置为 nil。如需异步使用，请使用 [Copy](#copy) 方法。

| 函数签名                                                                                    | 说明                                                            |
| :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------- |
| `func (ctx *RequestContext) Set(key string, value interface{})`                             | 在上下文中存储键值对                                            |
| `func (ctx *RequestContext) Value(key interface{}) interface{}`                             | 获取上下文键为 key 的值                                         |
| `func (ctx *RequestContext) Get(key string) (value interface{}, exists bool)`               | 获取上下文键为 key 的值以及 key 是否存在                        |
| `func (ctx *RequestContext) MustGet(key string) interface{}`                                | 获取上下文键为 key 的值，如果不存在会发生 panic                 |
| `func (ctx *RequestContext) GetString(key string) (s string)`                               | 获取上下文键为 key 的值，并转换为 `string` 类型                 |
| `func (ctx *RequestContext) GetBool(key string) (b bool)`                                   | 获取上下文键为 key 的值，并转换为 `bool` 类型                   |
| `func (ctx *RequestContext) GetInt(key string) (i int)`                                     | 获取上下文键为 key 的值，并转换为 `int` 类型                    |
| `func (ctx *RequestContext) GetInt32(key string) (i32 int32)`                               | 获取上下文键为 key 的值，并转换为 `int32` 类型                  |
| `func (ctx *RequestContext) GetInt64(key string) (i64 int64)`                               | 获取上下文键为 key 的值，并转换为 `int64` 类型                  |
| `func (ctx *RequestContext) GetUint(key string) (ui uint)`                                  | 获取上下文键为 key 的值，并转换为 `uint` 类型                   |
| `func (ctx *RequestContext) GetUint32(key string) (ui32 uint32)`                            | 获取上下文键为 key 的值，并转换为 `uint32` 类型                 |
| `func (ctx *RequestContext) GetUint64(key string) (ui64 uint64)`                            | 获取上下文键为 key 的值，并转换为 `uint64` 类型                 |
| `func (ctx *RequestContext) GetFloat32(key string) (f32 float32)`                           | 获取上下文键为 key 的值，并转换为 `float32` 类型                |
| `func (ctx *RequestContext) GetFloat64(key string) (f64 float64)`                           | 获取上下文键为 key 的值，并转换为 `float64` 类型                |
| `func (ctx *RequestContext) GetTime(key string) (t time.Time)`                              | 获取上下文键为 key 的值，并转换为 `time.Time` 类型              |
| `func (ctx *RequestContext) GetDuration(key string) (d time.Duration)`                      | 获取上下文键为 key 的值，并转换为 `time.Duration` 类型          |
| `func (ctx *RequestContext) GetStringSlice(key string) (ss []string)`                       | 获取上下文键为 key 的值，并转换为 `[]string` 类型               |
| `func (ctx *RequestContext) GetStringMap(key string) (sm map[string]interface{})`           | 获取上下文键为 key 的值，并转换为 `map[string]interface{}` 类型 |
| `func (ctx *RequestContext) GetStringMapString(key string) (sms map[string]string)`         | 获取上下文键为 key 的值，并转换为 `map[string]string` 类型      |
| `func (ctx *RequestContext) GetStringMapStringSlice(key string) (smss map[string][]string)` | 获取上下文键为 key 的值，并转换为 `map[string][]string` 类型    |
| `func (ctx *RequestContext) ForEachKey(fn func(k string, v interface{}))`                   | 为上下文中的每个键值对调用 fn                                   |

示例：

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
		c.Set("version1", "v1")
		v := c.Value("version1") // v == interface{}(string) "v1"

		c.Set("version2", "v2")
		v, exists := c.Get("version2") // v == interface{}(string) "v2", exists == true
		v, exists = c.Get("pet")       // v == interface{} nil, exists == false

		c.Set("version3", "v3")
		v := c.MustGet("version3") // v == interface{}(string) "v3"

		c.Set("version4", "v4")
		vString := c.GetString("version4") // vString == "v4"

		c.Set("isAdmin", true)
		vBool := c.GetBool("isAdmin") // vBool == true

		c.Set("age1", 20)
		vInt := c.GetInt("age1") // vInt == 20

		c.Set("age2", int32(20))
		vInt32 := c.GetInt32("age2") // vInt32 == 20

		c.Set("age3", int64(20))
		vInt64 := c.GetInt64("age3") // vInt64 == 20

		c.Set("age4", uint(20))
		vUInt := c.GetUint("age4") // vUInt == 20

		c.Set("age5", uint32(20))
		vUInt32 := c.GetUint32("age5") // vUInt32 == 20

		c.Set("age6", uint64(20))
		vUInt64 := c.GetUint64("age6") // vUInt64 == 20

		c.Set("age7", float32(20.1))
		vFloat32 := c.GetFloat32("age7") // vFloat32 == 20.1

		c.Set("age8", 20.1)
		vFloat64 := c.GetFloat64("age8") // vFloat64 == 20.1

		t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
		c.Set("birthday", t2022)
		vTime := c.GetTime("birthday") // vTime == t2022

		c.Set("duration", time.Minute)
		vDuration := c.GetDuration("duration") // vDuration == time.Minute

		c.Set("pet", []string{"cat", "dog"})
		vStringSlice := c.GetStringSlice("pet") // vStringSlice == []string{"cat", "dog"}

		c.Set("info1", map[string]interface{}{"name": "tom"})
		vStringMap := c.GetStringMap("info1") // vStringMap == map[string]interface{}{"name": "tom"}

		c.Set("info2", map[string]string{"name": "tom"})
		vStringMapString := c.GetStringMapString("info2")
		// vStringMapString == map[string]string{}{"name": "tom"}

		c.Set("smss", map[string][]string{"pets": {"cat", "dog"}})
		vStringMapStringSlice := c.GetStringMapStringSlice("smss")
		// vStringMapStringSlice == map[string][]string{"pets": {"cat", "dog"}}

		c.Set("duration", time.Minute)
		c.Set("version", "v1")
		c.ForEachKey(func(k string, v interface{}) {
			// 1. k == "duration", v == interface{}(time.Duration) time.Minute
			// 2. k == "version", v == interface{}(string) "v1"
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Next(ctx)
    v := c.GetString("version") // v == "v1"
}, func(ctx context.Context, c *app.RequestContext) {
    c.Set("version", "v1")
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
middleware1 := func(ctx context.Context, c *app.RequestContext) {
}

handler1 := func(ctx context.Context, c *app.RequestContext) {
    handlers := c.Handlers() // []Handler{middleware1, handler1}
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
middleware1 := func(ctx context.Context, c *app.RequestContext) {
    lastHandler := c.Handler() // lastHandler == handler1
}

handler1 := func(ctx context.Context, c *app.RequestContext) {
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
handler1 := func(ctx context.Context, c *app.RequestContext) {
    c.Set("current", "handler1")
}

handler := func(ctx context.Context, c *app.RequestContext) {
    hc := app.HandlersChain{c.Handlers()[0], handler1} // append handler1 into handlers chain
    c.SetHandlers(hc)
    c.Next(ctx)
    current := c.GetString("current") // current == "handler1"
    c.String(consts.StatusOK, current)
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
    h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
        hn := c.HandlerName() // hn == "main.main.func1"
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    index := c.GetIndex() // index == 0
}, func(ctx context.Context, c *app.RequestContext) {
    index := c.GetIndex() // index == 1
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Abort()
}, func(ctx context.Context, c *app.RequestContext) {
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Abort()
    isAborted := c.IsAborted() // isAborted == true
}, func(ctx context.Context, c *app.RequestContext) {
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

该函数的默认行为：若 `X-Forwarded-For` 或 `X-Real-IP` Header 中存在 ip，则从这两个 Header 中读 ip 并返回（优先级 `X-Forwarded-For` 大于 `X-Real-IP`），否则返回 remote address。

函数签名:

```go
func (ctx *RequestContext) ClientIP() string
```

示例:

```go
// X-Forwarded-For: 20.20.20.20, 30.30.30.30
// X-Real-IP: 10.10.10.10
h.Use(func(ctx context.Context, c *app.RequestContext) {
    ip := c.ClientIP() // 20.20.20.20
})
```

### SetClientIPFunc

若 [ClientIP](#clientip) 函数提供的默认方式不满足需求，用户可以使用该函数自定义获取客户端 ip 的方式。

用户可以自己实现自定义函数，也可以通过设置 `app.ClientIPOptions` 实现。

> 注意：在设置 `app.ClientIPOptions` 时，`TrustedCIDRs` 需用户自定义（若不设置则固定返回 remote address），代表可信任的路由。若 remote address 位于可信任的路由范围内，则会选择从 `RemoteIPHeaders` 中获取 ip，否则返回 remote address。

函数签名:

```go
func (ctx *RequestContext) SetClientIPFunc(f ClientIP)
```

示例:

```go
// POST http://example.com/user
// X-Forwarded-For: 30.30.30.30
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    // method 1
    customClientIPFunc := func(c *app.RequestContext) string {
			return "127.0.0.1"
	}
	c.SetClientIPFunc(customClientIPFunc)
	ip := c.ClientIP() // ip == "127.0.0.1"

    // method 2
    _, cidr, _ := net.ParseCIDR("127.0.0.1/32")
	opts := app.ClientIPOptions{
		RemoteIPHeaders: []string{"X-Forwarded-For", "X-Real-IP"},
		TrustedCIDRs:    []*net.IPNet{cidr},
	}
	c.SetClientIPFunc(app.ClientIPWithOption(opts))

	ip = c.ClientIP() // ip == "30.30.30.30"
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
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    ctx1 := c.Copy()
    go func(context *app.RequestContext) {
        // safely
    }(ctx1)
})
```
