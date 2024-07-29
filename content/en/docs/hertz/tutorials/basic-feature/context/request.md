---
title: "Request"
date: 2023-07-11
weight: 1
keywords:
  [
    "RequestContext",
    "URI",
    "Header",
    "Body",
    "File Operation",
    "Metadata Store",
    "Handler",
    "Request",
    "Binding and validate",
    "ClientIP",
    "Concurrent Security",
  ]
description: "The functions related to the request in RequestContext."
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

Obtain the requested host address.

Function Signature:

```go
func (ctx *RequestContext) Host() []byte
```

Example Code:

```go
// GET http://example.com
h.GET("/", func(ctx context.Context, c *app.RequestContext) {
    host := c.Host() // host == []byte("example.com")
})
```

### FullPath

Get the complete path of the matched route, and return an empty string for the unmatched route.

Function Signature:

```go
func (ctx *RequestContext) FullPath() string
```

Example Code:

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

Set the value of FullPath.

> Note: FullPath is assigned during routing lookup, and usually you do not need to use SetFullPath to overwrite it.

Function Signature:

```go
func (ctx *RequestContext) SetFullPath(p string)
```

Example Code:

```go
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    c.SetFullPath("/v1/user/:name")
    fpath := c.FullPath() // fpath == "/v1/user/:name"
})
```

### Path

Obtain the path of the request.

> Note: When parameter routing occurs, `Path` provides the named path after parameter matching, while `FullPath` provides the original path.

Function Signature:

```go
func (ctx *RequestContext) Path() []byte
```

Example Code:

```go
// GET http://example.com/user/bar
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    path := c.Path() // path == []byte("/user/bar")
})
```

### Param

Obtain the value of routing parameters.

Function Signature:

```go
func (ctx *RequestContext) Param(key string) string
```

Example Code:

```go
// GET http://example.com/user/bar
h.GET("/user/:name", func(ctx context.Context, c *app.RequestContext) {
    name := c.Param("name") // name == "bar"
    id := c.Param("id") // id == ""
})
```

### Query

Get the value of the attribute specified in the route `Query String` parameter. If no empty string is returned.

Function Signature:

```go
func (ctx *RequestContext) Query(key string) string
```

Example Code:

```go
// GET http://example.com/user?name=bar
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name := c.Query("name") // name == "bar"
    id := ctx.Query("id") // id == ""
})
```

### DefaultQuery

Obtain the value of the specified attribute in the `Query String` parameter of the route, and if it does not return the default value set.

Function Signature:

```go
func (ctx *RequestContext) DefaultQuery(key, defaultValue string) string
```

Example Code:

```go
// GET http://example.com/user?name=bar&&age=
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name := ctx.DefaultQuery("name", "tom") // name == "bar"
    id := ctx.DefaultQuery("id", "123") // id == "123"
    age := ctx.DefaultQuery("age", "45") // age == ""
})
```

### GetQuery

Obtain the value of the specified attribute in the `Query String` parameter of the route and whether the attribute exists.

Function Signature:

```go
func (ctx *RequestContext) GetQuery(key string) (string, bool)
```

Example Code:

```go
// GET http://example.com/user?name=bar&&age=
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
    name, hasName := ctx.GetQuery("name") // name == "bar", hasName == true
    id, hasId := ctx.GetQuery("id") // id == "", hasId == false
    age, hasAge := ctx.GetQuery("age") // age == "", hasAge == true
})
```

### QueryArgs

Obtain the `Query String` parameter object for the route.

Function Signature:

```go
func (ctx *RequestContext) QueryArgs() *protocol.Args
```

### Args

The Args object provides the following methods to obtain/set `Query String` parameters.

| Function Signature                                     | Description                                                     |
| :----------------------------------------------------- | :-------------------------------------------------------------- |
| `func (a *Args) Set(key, value string)`                | Set the value of Args object key                                |
| `func (a *Args) Reset()`                               | Reset Args Object                                               |
| `func (a *Args) CopyTo(dst *Args)`                     | Copy Args object to dst                                         |
| `func (a *Args) Del(key string)`                       | Delete the key value pair of Args object key                    |
| `func (a *Args) DelBytes(key []byte)`                  | Delete key value pairs of Args object byte array type key       |
| `func (a *Args) Has(key string) bool`                  | Obtain whether the Args object has a key value pair for the key |
| `func (a *Args) String() string`                       | Convert Args object to Query String of string type              |
| `func (a *Args) QueryString() []byte`                  | Convert Args object to a Query String of byte array type        |
| `func (a *Args) ParseBytes(b []byte)`                  | Parsing byte arrays and storing key value pairs in Args object  |
| `func (a *Args) Peek(key string) []byte`               | Obtain the value of Args object key                             |
| `func (a *Args) PeekExists(key string) (string, bool)` | Obtain the value of Args object key and its existence           |
| `func (a *Args) PeekAll(key string) [][]byte`          | Obtain all values of Args object key                            |
| `func (a *Args) Len() int`                             | Obtain the number of Args object key-value pairs                |
| `func (a *Args) AppendBytes(dst []byte) []byte`        | Append Args object Query String to dst and return               |
| `func (a *Args) VisitAll(f func(key, value []byte))`   | Visit all key value pairs of Args object                        |
| `func (a *Args) WriteTo(w io.Writer) (int64, error)`   | Write Args object Query String to io.Writer                     |
| `func (a *Args) Add(key, value string)`                | Add Args object key as key value                                |

Example Code:

```go
// GET http://example.com/user?name=bar&&age=&&pets=dog&&pets=cat
h.GET("/user", func(ctx context.Context, c *app.RequestContext) {
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

Return the requested `URI` object.

Function Signature:

```go
func (ctx *RequestContext) URI() *protocol.URI
```

### URI Object

The URI object provides the following methods to obtain/set URI.

| Function Signature                                      | Description                                                                                                                                     |
| :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `func (u *URI) CopyTo(dst *URI)`                        | Copy a copy of the URI object to dst                                                                                                            |
| `func (u *URI) QueryArgs() *Args`                       | Get [Args](#args)                                                                                                                               |
| `func (u *URI) Hash() []byte`                           | Obtain Hash value, such as <http://example.com/user?baz=123#qwe> Hash is **qwe**                                                                |
| `func (u *URI) SetHash(hash string)`                    | Set Hash                                                                                                                                        |
| `func (u *URI) SetHashBytes(hash []byte)`               | Set Hash of type `[]byte`                                                                                                                       |
| `func (u *URI) Username() []byte`                       | Get Username                                                                                                                                    |
| `func (u *URI) SetUsername(username string)`            | Set Username                                                                                                                                    |
| `func (u *URI) SetUsernameBytes(username []byte)`       | Set Username of type `[]byte`                                                                                                                   |
| `func (u *URI) Password() []byte`                       | Get Password                                                                                                                                    |
| `func (u *URI) SetPassword(password string)`            | Set Password                                                                                                                                    |
| `func (u *URI) SetPasswordBytes(password []byte)`       | Set Password of type `[]byte`                                                                                                                   |
| `func (u *URI) QueryString() []byte`                    | Get `Query String`, such as <http://example.com/user?baz=123> `Query String` is **baz=123**                                                     |
| `func (u *URI) SetQueryString(queryString string)`      | Set `Query String`, note that after this method, use `RequestHeader.SetRequestURI` may overwrite the originally intended value                  |
| `func (u *URI) SetQueryStringBytes(queryString []byte)` | Set `Query String` of type `[]byte`, note that after this method, use `RequestHeader.SetRequestURI` may overwrite the originally intended value |
| `func (u *URI) Path() []byte`                           | Get Path, such as <http://example.com/user/he%20rtz> Path is **/user/he rtz**                                                                   |
| `func (u *URI) PathOriginal() []byte`                   | Get Unescaped Path, such as <http://example.com/user/he%20rtz> Path is **/user/he%20rtz**                                                       |
| `func (u *URI) SetPath(path string)`                    | Set Path                                                                                                                                        |
| `func (u *URI) SetPathBytes(path []byte)`               | Set Path of type `[]byte`                                                                                                                       |
| `func (u *URI) String() string`                         | Obtain the complete URI, such as <http://example.com/user?baz=123> complete URI is <http://example.com/user?baz=123>                            |
| `func (u *URI) FullURI() []byte`                        | Obtain the complete URI of type `[]byte`                                                                                                        |
| `func (u *URI) Scheme() []byte`                         | Obtain protocol, such as http                                                                                                                   |
| `func (u *URI) SetScheme(scheme string)`                | Set protocol                                                                                                                                    |
| `func (u *URI) SetSchemeBytes(scheme []byte)`           | Set protocol of type `[]byte`                                                                                                                   |
| `func (u *URI) Host() []byte`                           | Set Host, such as <http://example.com/user> Host is **example.com**                                                                             |
| `func (u *URI) SetHost(host string)`                    | Set Host                                                                                                                                        |
| `func (u *URI) SetHostBytes(host []byte)`               | Set Host of type `[]byte`                                                                                                                       |
| `func (u *URI) LastPathSegment() []byte`                | Obtain the last part of Path, for example, the last part of Path **/foo/bar/baz.html** is **baz.html**                                          |
| `func (u *URI) Update(newURI string)`                   | Update URI                                                                                                                                      |
| `func (u *URI) UpdateBytes(newURI []byte)`              | Update URI of type `[]byte`                                                                                                                     |
| `func (u *URI) Parse(host, uri []byte)`                 | Initialize URI                                                                                                                                  |
| `func (u *URI) AppendBytes(dst []byte) []byte`          | Assign the complete URI to dst and return dst                                                                                                   |
| `func (u *URI) RequestURI() []byte`                     | Get RequestURI, such as <http://example.com/user?baz=123> RequestURI is **/user?baz=123**                                                       |
| `func (u *URI) Reset()`                                 | Reset URI                                                                                                                                       |

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

Add or set the header with the key as key.

> Note: Add is usually used to set multiple headers for the same key. To set a single header for the same key, use [Set](#set). When used as a header for Content Type, Content Length, Connection, Cookie, Transfer Encoding, Host, User Agent, etc., using multiple Add will overwrite the old values.

Function Signature:

```go
func (h *RequestHeader) Add(key, value string)
```

Example Code:

```go
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
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

Set the Header key value.

> Note: Set is usually used to set a single header for the same key. To set multiple headers for the same key, use [Add](#add).

Function Signature:

```go
func (h *RequestHeader) Set(key, value string)
```

Example Code:

```go
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
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

Obtain the complete header of type `[]byte`.

Function Signature:

```go
func (h *RequestHeader) Header() []byte
```

Example Code:

```go
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
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

Obtain the complete header.

Function Signature:

```go
func (h *RequestHeader) String() string
```

Example Code:

```go
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
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

### VisitAll Header

Traverse the key values of all headers and execute the f function.

Function Signature:

```go
func (h *RequestHeader) VisitAll(f func(key, value []byte))
```

Example Code:

```go
hertz.GET("/example", func(ctx context.Context, c *app.RequestContext) {
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

Get the type of the request method.

Function Signature:

```go
func (ctx *RequestContext) Method() []byte
```

Example Code:

```go
// POST http://example.com/user
h.Any("/user", func(ctx context.Context, c *app.RequestContext) {
    method := ctx.Method() // method == []byte("POST")
})
```

### ContentType

Obtain the value of the request header `Content Type`.

Function Signature:

```go
func (ctx *RequestContext) ContentType() []byte
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: application/json
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    contentType := ctx.ContentType() // contentType == []byte("application/json")
})
```

### IfModifiedSince

Determine if the time has exceeded the value of the request header `If Modified Since`.

> Note: If the request header does not contain `If Modified Since`, it also returns true.

Function Signature:

```go
func (ctx *RequestContext) IfModifiedSince(lastModified time.Time) bool
```

Example Code:

```go
// POST http://example.com/user
// If-Modified-Since: Wed, 21 Oct 2023 07:28:00 GMT
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
    ifModifiedSince := ctx.IfModifiedSince(t2022) // ifModifiedSince == false

    t2024, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2024 07:28:00 GMT")
    ifModifiedSince = ctx.IfModifiedSince(t2024) // ifModifiedSince == true
})
```

### Cookie

Obtain the value of the key in the request header `Cookie`.

Function Signature:

```go
func (ctx *RequestContext) Cookie(key string) []byte
```

Example Code:

```go
// POST http://example.com/user
// Cookie: foo_cookie=choco; bar_cookie=strawberry
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    fCookie := ctx.Cookie("foo_cookie")     // fCookie == []byte("choco")
    bCookie := ctx.Cookie("bar_cookie")     // bCookie == []byte("strawberry")
    noneCookie := ctx.Cookie("none_cookie") // noneCookie == nil
})
```

### UserAgent

Obtain the value of the request header `User Agent`.

Function Signature:

```go
func (ctx *RequestContext) UserAgent() []byte
```

Example Code:

```go
// POST http://example.com/user
// User-Agent: Chrome/51.0.2704.103 Safari/537.36
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    ua := ctx.UserAgent() // ua == []byte("Chrome/51.0.2704.103 Safari/537.36")
})
```

### GetHeader

Obtain the value of the key in the request header.

Function Signature:

```go
func (ctx *RequestContext) GetHeader(key string) []byte
```

Example Code:

```go
// POST http://example.com/user
// Say-Hello: hello
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    customHeader := ctx.GetHeader("Say-Hello") // customHeader == []byte("hello")
})
```

### RequestHeader Object

Use `RequestContext.Request.Header` to obtain the RequestHeader object, which provides the following methods to obtain/set the request header.

| Function Signature                                                           | Description                                                                                                                                                                                                             |
| :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `func (h *RequestHeader) Method() []byte`                                    | Get Method                                                                                                                                                                                                              |
| `func (h *RequestHeader) SetMethod(method string)`                           | Set Method                                                                                                                                                                                                              |
| `func (h *RequestHeader) SetMethodBytes(method []byte)`                      | Set Method of type `[]byte`                                                                                                                                                                                             |
| `func (h *RequestHeader) IsGet() bool`                                       | Determine if Method is GET                                                                                                                                                                                              |
| `func (h *RequestHeader) IsHead() bool`                                      | Determine if Method is HEAD                                                                                                                                                                                             |
| `func (h *RequestHeader) IsPost() bool`                                      | Determine if Method is POST                                                                                                                                                                                             |
| `func (h *RequestHeader) IsPut() bool`                                       | Determine if Method is PUT                                                                                                                                                                                              |
| `func (h *RequestHeader) IsDelete() bool`                                    | Determine if Method is DELETE                                                                                                                                                                                           |
| `func (h *RequestHeader) IsConnect() bool`                                   | Determine if Method is CONNECT                                                                                                                                                                                          |
| `func (h *RequestHeader) IsOptions() bool`                                   | Determine if Method is OPTIONS                                                                                                                                                                                          |
| `func (h *RequestHeader) IsTrace() bool`                                     | Determine if Method is TRACE                                                                                                                                                                                            |
| `func (h *RequestHeader) IgnoreBody() bool`                                  | Determine whether to ignore Body (Method GET/HEAD ignores Body)                                                                                                                                                         |
| `func (h *RequestHeader) RequestURI() []byte`                                | Get RequestURI                                                                                                                                                                                                          |
| `func (h *RequestHeader) SetRequestURI(requestURI string)`                   | Set RequestURI                                                                                                                                                                                                          |
| `func (h *RequestHeader) SetRequestURIBytes(requestURI []byte)`              | Set RequestURI of type `[]byte`                                                                                                                                                                                         |
| `func (h *RequestHeader) SetProtocol(p string)`                              | Set protocol type, such as HTTP/1.0                                                                                                                                                                                     |
| `func (h *RequestHeader) GetProtocol() string`                               | Get protocol type, such as HTTP/1.1                                                                                                                                                                                     |
| `func (h *RequestHeader) IsHTTP11() bool`                                    | Determine if it is HTTP/1.1                                                                                                                                                                                             |
| `func (h *RequestHeader) SetNoHTTP11(b bool)`                                | Setting is not HTTP/1.1                                                                                                                                                                                                 |
| `func (h *RequestHeader) Host() []byte`                                      | Get Host                                                                                                                                                                                                                |
| `func (h *RequestHeader) SetHost(host string)`                               | Set Host                                                                                                                                                                                                                |
| `func (h *RequestHeader) SetHostBytes(host []byte)`                          | Set Host of type `[]byte`                                                                                                                                                                                               |
| `func (h *RequestHeader) ContentLength() int`                                | Get Content-Length                                                                                                                                                                                                      |
| `func (h *RequestHeader) ContentLengthBytes() []byte`                        | Get Content-Length of type `[]byte`                                                                                                                                                                                     |
| `func (h *RequestHeader) SetContentLength(contentLength int)`                | Set Content-Length                                                                                                                                                                                                      |
| `func (h *RequestHeader) SetContentLengthBytes(contentLength []byte)`        | Set Content-Length of type `[]byte`                                                                                                                                                                                     |
| `func (h *RequestHeader) InitContentLengthWithValue(contentLength int)`      | Initialize Content-Length                                                                                                                                                                                               |
| `func (h *RequestHeader) ContentType() []byte`                               | Get Content-Type                                                                                                                                                                                                        |
| `func (h *RequestHeader) SetContentTypeBytes(contentType []byte)`            | Set Content-Type                                                                                                                                                                                                        |
| `func (h *RequestHeader) SetNoDefaultContentType(b bool)`                    | Control the default sending behavior when Content Type is not specified, false sends the default Content Type value, true does not send Content Type                                                                    |
| `func (h *RequestHeader) UserAgent() []byte`                                 | Get User-Agent                                                                                                                                                                                                          |
| `func (h *RequestHeader) SetUserAgentBytes(userAgent []byte)`                | Set User-Agent                                                                                                                                                                                                          |
| `func (h *RequestHeader) ConnectionClose() bool`                             | Determine if it contains Connection: close                                                                                                                                                                              |
| `func (h *RequestHeader) SetConnectionClose(close bool)`                     | Set connectionClose                                                                                                                                                                                                     |
| `func (h *RequestHeader) ResetConnectionClose()`                             | Reset connectionClose to false and delete Connection Header                                                                                                                                                             |
| `func (h *RequestHeader) SetByteRange(startPos, endPos int)`                 | Set Range (Range: bytes=startPos-endPos)                                                                                                                                                                                |
| `func (h *RequestHeader) SetMultipartFormBoundary(boundary string)`          | Set the boundary for Content-Type=multipart/form data                                                                                                                                                                   |
| `func (h *RequestHeader) MultipartFormBoundary() []byte`                     | Get the value of boundary                                                                                                                                                                                               |
| `func (h *RequestHeader) Trailer() *Trailer`                                 | Get Trailer                                                                                                                                                                                                             |
| `func (h *RequestHeader) Cookie(key string) []byte`                          | Obtain the value of Cookie key as key                                                                                                                                                                                   |
| `func (h *RequestHeader) SetCookie(key, value string)`                       | Set Cookie Key Values                                                                                                                                                                                                   |
| `func (h *RequestHeader) DelCookie(key string)`                              | Delete the cookie whose key is key                                                                                                                                                                                      |
| `func (h *RequestHeader) DelAllCookies()`                                    | Delete all Cookies                                                                                                                                                                                                      |
| `func (h *RequestHeader) FullCookie() []byte`                                | Get all Cookies                                                                                                                                                                                                         |
| `func (h *RequestHeader) Cookies() []*Cookie`                                | Get all Cookie objects                                                                                                                                                                                                  |
| `func (h *RequestHeader) VisitAllCookie(f func(key, value []byte))`          | Traverse the key values of all cookies and execute the f function                                                                                                                                                       |
| `func (h *RequestHeader) Peek(key string) []byte`                            | Obtain the value of key for type `[]byte`                                                                                                                                                                               |
| `func (h *RequestHeader) Get(key string) string`                             | Obtain the value of key as key                                                                                                                                                                                          |
| `func (h *RequestHeader) PeekArgBytes(key []byte) []byte`                    | Obtain the value of key as key                                                                                                                                                                                          |
| `func (h *RequestHeader) PeekAll(key string) [][]byte`                       | Obtain all values of key for type `[]byte` (used to obtain multiple values with the same key)                                                                                                                           |
| `func (h *RequestHeader) GetAll(key string) []string`                        | Obtain all values with key as key                                                                                                                                                                                       |
| `func (h *RequestHeader) PeekIfModifiedSinceBytes() []byte`                  | Get If-Modified-Since                                                                                                                                                                                                   |
| `func (h *RequestHeader) PeekContentEncoding() []byte`                       | Get Content-Encoding                                                                                                                                                                                                    |
| `func (h *RequestHeader) PeekRange() []byte`                                 | Get Range                                                                                                                                                                                                               |
| `func (h *RequestHeader) HasAcceptEncodingBytes(acceptEncoding []byte) bool` | Determine whether Accept-Encoding exists and whether Accept-Encoding includes acceptEncoding                                                                                                                            |
| `func (h *RequestHeader) RawHeaders() []byte`                                | Get original Header                                                                                                                                                                                                     |
| `func (h *RequestHeader) SetRawHeaders(r []byte)`                            | Set original Header                                                                                                                                                                                                     |
| `func (h *RequestHeader) Add(key, value string)`                             | Set the header key value to set multiple headers for the same key, but the key will overwrite the following headers: Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, User-Agent              |
| `func (h *RequestHeader) InitBufValue(size int)`                             | Initialize buffer size                                                                                                                                                                                                  |
| `func (h *RequestHeader) GetBufValue() []byte`                               | Get the value of the buffer                                                                                                                                                                                             |
| `func (h *RequestHeader) SetCanonical(key, value []byte)`                    | Set the Header key value, assuming that the key is in canonical form                                                                                                                                                    |
| `func (h *RequestHeader) Set(key, value string)`                             | Set the header key value to set a single header for the same key                                                                                                                                                        |
| `func (h *RequestHeader) SetBytesKV(key, value []byte)`                      | Set the header key value of type `[]byte` to set a single header for the same key                                                                                                                                       |
| `func (h *RequestHeader) DelBytes(key []byte)`                               | Delete key value pairs with key in the header                                                                                                                                                                           |
| `func (h *RequestHeader) AddArgBytes(key, value []byte, noValue bool)`       | Add Header key value (different from `Add`, the key must not be normalized and will not undergo special processing when it is Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, or User-Agent) |
| `func (h *RequestHeader) SetArgBytes(key, value []byte, noValue bool)`       | Set Header key value (different from `Set`, The key must not be normalized and will not undergo special processing when it is Content-Type, Content-Length, Connection, Cookie, Transfer-Encoding, Host, or User-Agent) |
| `func (h *RequestHeader) AppendBytes(dst []byte) []byte`                     | Attach the complete header to the dst and return                                                                                                                                                                        |
| `func (h *RequestHeader) Header() []byte`                                    | Obtain the complete header of type `[]byte`                                                                                                                                                                             |
| `func (h *RequestHeader) String() string`                                    | Obtain the complete header                                                                                                                                                                                              |
| `func (h *RequestHeader) CopyTo(dst *RequestHeader)`                         | Obtain a copy of RequestHeader                                                                                                                                                                                          |
| `func (h *RequestHeader) VisitAll(f func(key, value []byte))`                | Traverse the key values of all headers and execute the f function                                                                                                                                                       |
| `func (h *RequestHeader) VisitAllCustomHeader(f func(key, value []byte))`    | Traverse the key values of all headers and execute the f function, except for Content-Type, Content-Length, Cookie, Host, User-Agent                                                                                    |
| `func (h *RequestHeader) Len() int`                                          | Return the number of key value pairs in the header                                                                                                                                                                      |
| `func (h *RequestHeader) DisableNormalizing()`                               | Disable the normalization of header name (capitalize the first letter and the first letter after the Em dash)                                                                                                           |
| `func (h *RequestHeader) IsDisableNormalizing() bool`                        | Whether to disable standardized for header name, default not disabled                                                                                                                                                   |
| `func (h *RequestHeader) ResetSkipNormalize()`                               | Reset Headers except for disableNormalizing status                                                                                                                                                                      |
| `func (h *RequestHeader) Reset()`                                            | Reset Headers                                                                                                                                                                                                           |

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

Obtain the requested body data and return an error if an error occurs.

Function Signature:

```go
func (ctx *RequestContext) Body() ([]byte, error)
```

Example Code:

```go
// POST http://example.com/pet
// Content-Type: application/json
// {"pet":"cat"}
h.Post("/pet", func(ctx context.Context, c *app.RequestContext) {
    data, err := ctx.Body() // data == []byte("{\"pet\":\"cat\"}") , err == nil
})
```

### RequestBodyStream

Obtain the requested BodyStream.

Function Signature:

```go
func (ctx *RequestContext) RequestBodyStream() io.Reader
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: text/plain
// abcdefg
h := server.Default(server.WithStreamBody(true))
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    sr := ctx.RequestBodyStream()
    data, _ := io.ReadAll(sr) // data == []byte("abcdefg")
})
```

### MultipartForm

Obtain the `multipart.Form` object. (For more information, please refer to [multipart#Form](https://pkg.go.dev/mime/multipart#Form))

> Note: This function can obtain both ordinary values and files. Here is an example code for obtaining ordinary values. The example code for obtaining files can be found in [MultipartForm](#multipartform-1).

Function Signature:

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    form, err := ctx.MultipartForm()
    name := form.Value["name"][0] // name == "tom"
})
```

### PostForm

Retrieve `multipart.Form.Value` by name and return the first value of the given name.

> Note: This function supports obtaining values from content-type of application/x-www form urlencoded and multipart/form data, and does not support obtaining file values.

Function Signature:

```go
func (ctx *RequestContext) PostForm(key string) string
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := ctx.PostForm("name") // name == "tom"
})
```

### DefaultPostForm

Retrieve `multipart.Form.Value` by name and return the first value of the given name. If it does not exist, return defaultValue.

> Note: This function supports obtaining values from content-type of application/x-www form urlencoded and multipart/form data, and does not support obtaining file values.

Function Signature:

```go
func (ctx *RequestContext) DefaultPostForm(key, defaultValue string) string
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := ctx.PostForm("name", "jack") // name == "tom"
    age := ctx.PostForm("age", "10") // age == "10"
})
```

### PostArgs

Obtain the `application/x-www form urlencoded` parameter object. (For more information, please refer to [Args](#args))

Function Signature:

```go
func (ctx *RequestContext) PostArgs() *protocol.Args
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: application/x-www-form-urlencoded
// name=tom&pet=cat&pet=dog
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
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

Obtain the values of keys in the following order.

1. Obtain values from [QueryArgs](#queryargs).
2. Obtain values from [PostArgs](#postars).
3. Obtain values from [MultipartForm](#multipartform).

Function Signature:

```go
func (ctx *RequestContext) FormValue(key string) []byte
```

Example Code:

```go
// POST http://example.com/user?name=tom
// Content-Type: application/x-www-form-urlencoded
// age=10
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := ctx.FormValue("name") // name == []byte("tom"), get by QueryArgs
    age := ctx.FormValue("age") // age == []byte("10"), get by PostArgs
})

// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="name"
// tom
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    name := ctx.FormValue("name") // name == []byte("tom"), get by MultipartForm
})
```

### SetFormValueFunc

If the default method provided by the [FormValue](#formvalue) function to obtain the value of the key does not meet the requirements, users can use this function to customize the method of obtaining the value of the key.

Function Signature:

```go
func (ctx *RequestContext) SetFormValueFunc(f FormValueFunc)
```

Example Code:

```go
// POST http://example.com/user?name=tom
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="age"
// 10
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
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

## File Operation

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error)
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error
```

### MultipartForm

Obtain the `multipart.Form` object. (For more information, please refer to [multipart#Form](https://pkg.go.dev/mime/multipart#Form))

> Note: This function can obtain both ordinary values and files. Here is an example code for obtaining file values. The example code for obtaining ordinary values can be found in [MultipartForm](#multipartform).

Function Signature:

```go
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    form, err := ctx.MultipartForm()
    avatarFile := form.File["avatar"][0] // avatarFile.Filename == "abc.jpg"
})
```

### FormFile

Retrieve `multipart.Form.File` by name and return the first `multipart.FileHeader` of the given name. (For more information, please refer to [multipart#FileHeader](https://pkg.go.dev/mime/multipart#FileHeader))

Function Signature:

```go
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error)
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    avatarFile, err := ctx.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
})
```

### SaveUploadedFile

Save the multipart file to disk.

Function Signature:

```go
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error
```

Example Code:

```go
// POST http://example.com/user
// Content-Type: multipart/form-data;
// Content-Disposition: form-data; name="avatar"; filename="abc.jpg"
h.Post("/user", func(ctx context.Context, c *app.RequestContext) {
    avatarFile, err := ctx.FormFile("avatar") // avatarFile.Filename == "abc.jpg", err == nil
    // save file
    ctx.SaveUploadedFile(avatarFile, avatarFile.Filename) // save file "abc.jpg"
})
```

## RequestContext Metadata Store

> Note: RequestContext will be reclaimed after the request ends, and the metadata will be set to nil. To use asynchronously, please use the [Copy](#copy) method.

| Function Signature                                                                          | Description                                                                                       |
| :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| `func (ctx *RequestContext) Set(key string, value interface{})`                             | Store key value pairs in requestContext                                                           |
| `func (ctx *RequestContext) Value(key interface{}) interface{}`                             | Gets the value of the requestContext key as key                                                   |
| `func (ctx *RequestContext) Get(key string) (value interface{}, exists bool)`               | Obtain the value of the requestContext key as key and whether the key exists                      |
| `func (ctx *RequestContext) MustGet(key string) interface{}`                                | Obtain the value of the requestContext key as key. If it does not exist, a panic will occur       |
| `func (ctx *RequestContext) GetString(key string) (s string)`                               | Obtain the value of the requestContext key as key and convert it to type `string`                 |
| `func (ctx *RequestContext) GetBool(key string) (b bool)`                                   | Obtain the value of the requestContext key as key and convert it to type `bool`                   |
| `func (ctx *RequestContext) GetInt(key string) (i int)`                                     | Obtain the value of the requestContext key as key and convert it to type `int`                    |
| `func (ctx *RequestContext) GetInt32(key string) (i32 int32)`                               | Obtain the value of the requestContext key as key and convert it to type `int32`                  |
| `func (ctx *RequestContext) GetInt64(key string) (i64 int64)`                               | Obtain the value of the requestContext key as key and convert it to type `int64`                  |
| `func (ctx *RequestContext) GetUint(key string) (ui uint)`                                  | Obtain the value of the requestContext key as key and convert it to type `uint`                   |
| `func (ctx *RequestContext) GetUint32(key string) (ui32 uint32)`                            | Obtain the value of the requestContext key as key and convert it to type `uint32`                 |
| `func (ctx *RequestContext) GetUint64(key string) (ui64 uint64)`                            | Obtain the value of the requestContext key as key and convert it to type `uint64`                 |
| `func (ctx *RequestContext) GetFloat32(key string) (f32 float32)`                           | Obtain the value of the requestContext key as key and convert it to type `float32`                |
| `func (ctx *RequestContext) GetFloat64(key string) (f64 float64)`                           | Obtain the value of the requestContext key as key and convert it to type `float64`                |
| `func (ctx *RequestContext) GetTime(key string) (t time.Time)`                              | Obtain the value of the requestContext key as key and convert it to type `time.Time`              |
| `func (ctx *RequestContext) GetDuration(key string) (d time.Duration)`                      | Obtain the value of the requestContext key as key and convert it to type `time.Duration`          |
| `func (ctx *RequestContext) GetStringSlice(key string) (ss []string)`                       | Obtain the value of the requestContext key as key and convert it to type `[]string`               |
| `func (ctx *RequestContext) GetStringMap(key string) (sm map[string]interface{})`           | Obtain the value of the requestContext key as key and convert it to type `map[string]interface{}` |
| `func (ctx *RequestContext) GetStringMapString(key string) (sms map[string]string)`         | Obtain the value of the requestContext key as key and convert it to type `map[string]string`      |
| `func (ctx *RequestContext) GetStringMapStringSlice(key string) (smss map[string][]string)` | Obtain the value of the requestContext key as key and convert it to type `map[string][]string`    |
| `func (ctx *RequestContext) ForEachKey(fn func(k string, v interface{}))`                   | Call fn for each key value pair in the context                                                    |

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
		ctx.Set("version1", "v1")
		v := ctx.Value("version1") // v == interface{}(string) "v1"

		ctx.Set("version2", "v2")
		v, exists := ctx.Get("version2") // v == interface{}(string) "v2", exists == true
		v, exists = ctx.Get("pet")       // v == interface{} nil, exists == false

		ctx.Set("version3", "v3")
		v := ctx.MustGet("version3") // v == interface{}(string) "v3"

		ctx.Set("version4", "v4")
		vString := ctx.GetString("version4") // vString == "v4"

		ctx.Set("isAdmin", true)
		vBool := ctx.GetBool("isAdmin") // vBool == true

		ctx.Set("age1", 20)
		vInt := ctx.GetInt("age1") // vInt == 20

		ctx.Set("age2", int32(20))
		vInt32 := ctx.GetInt32("age2") // vInt32 == 20

		ctx.Set("age3", int64(20))
		vInt64 := ctx.GetInt64("age3") // vInt64 == 20

		ctx.Set("age4", uint(20))
		vUInt := ctx.GetUint("age4") // vUInt == 20

		ctx.Set("age5", uint32(20))
		vUInt32 := ctx.GetUint32("age5") // vUInt32 == 20

		ctx.Set("age6", uint64(20))
		vUInt64 := ctx.GetUint64("age6") // vUInt64 == 20

		ctx.Set("age7", float32(20.1))
		vFloat32 := ctx.GetFloat32("age7") // vFloat32 == 20.1

		ctx.Set("age8", 20.1)
		vFloat64 := ctx.GetFloat64("age8") // vFloat64 == 20.1

		t2022, _ := time.Parse(time.RFC1123, "Wed, 21 Oct 2022 07:28:00 GMT")
		ctx.Set("birthday", t2022)
		vTime := ctx.GetTime("birthday") // vTime == t2022

		ctx.Set("duration", time.Minute)
		vDuration := ctx.GetDuration("duration") // vDuration == time.Minute

		ctx.Set("pet", []string{"cat", "dog"})
		vStringSlice := ctx.GetStringSlice("pet") // vStringSlice == []string{"cat", "dog"}

		ctx.Set("info1", map[string]interface{}{"name": "tom"})
		vStringMap := ctx.GetStringMap("info1") // vStringMap == map[string]interface{}{"name": "tom"}

		ctx.Set("info2", map[string]string{"name": "tom"})
		vStringMapString := ctx.GetStringMapString("info2")
		// vStringMapString == map[string]string{}{"name": "tom"}

		ctx.Set("smss", map[string][]string{"pets": {"cat", "dog"}})
		vStringMapStringSlice := ctx.GetStringMapStringSlice("smss")
		// vStringMapStringSlice == map[string][]string{"pets": {"cat", "dog"}}

		ctx.Set("duration", time.Minute)
		ctx.Set("version", "v1")
		ctx.ForEachKey(func(k string, v interface{}) {
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

Execute the next handler, which is typically used in middleware handlers.

Function Signature:

```go
func (ctx *RequestContext) Next(c context.Context)
```

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Next(ctx)
    v := ctx.GetString("version") // v == "v1"
}, func(ctx context.Context, c *app.RequestContext) {
    c.Set("version", "v1")
})
```

### Handlers

Get handlers chain.

Function Signature:

```go
func (ctx *RequestContext) Handlers() HandlersChain
```

Example Code:

```go
middleware1 := func(ctx context.Context, c *app.RequestContext) {
}

handler1 := func(ctx context.Context, c *app.RequestContext) {
    handlers := ctx.Handlers() // []Handler{middleware1, handler1}
}

h.POST("/user", middleware1, handler1)
```

### Handler

Obtain the last handler of the handlers chain. Generally speaking, the last handler is the main handler.

Function Signature:

```go
func (ctx *RequestContext) Handler() HandlerFunc
```

Example Code:

```go
middleware1 := func(ctx context.Context, c *app.RequestContext) {
    lastHandler := ctx.Handler() // lastHandler == handler1
}

handler1 := func(ctx context.Context, c *app.RequestContext) {
}

h.POST("/user", middleware1, handler1)
```

### SetHandlers

Set handlers chain.

Function Signature:

```go
func (ctx *RequestContext) SetHandlers(hc HandlersChain)
```

Example Code:

```go
handler1 := func(ctx context.Context, c *app.RequestContext) {
    c.Set("current", "handler1")
}

handler := func(ctx context.Context, c *app.RequestContext) {
    hc := app.HandlersChain{ctx.Handlers()[0], handler1} // append handler1 into handlers chain
    ctx.SetHandlers(hc)
    c.Next(ctx)
    current := ctx.GetString("current") // current == "handler1"
    ctx.String(consts.StatusOK, current)
}

h.POST("/user", handler)
```

### HandlerName

Get the function name of the last handler.

Function Signature:

```go
func (ctx *RequestContext) HandlerName() string
```

Example Code:

```go
package main

func main() {
    h := server.New()
    h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
        hn := ctx.HandlerName() // hn == "main.main.func1"
    })
}
```

### GetIndex

Obtain the index of the currently executing handler in the handlers chain.

Function Signature:

```go
func (ctx *RequestContext) GetIndex() int8
```

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    index := ctx.GetIndex() // index == 0
}, func(ctx context.Context, c *app.RequestContext) {
    index := ctx.GetIndex() // index == 1
})
```

### Abort

Terminate subsequent handler execution.

Function Signature:

```go
func (ctx *RequestContext) Abort()
```

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Abort()
}, func(ctx context.Context, c *app.RequestContext) {
    // will not execute
})
```

### IsAborted

Obtain whether the subsequent handler execution status has been terminated.

Function Signature:

```go
func (ctx *RequestContext) IsAborted() bool
```

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    c.Abort()
    isAborted := ctx.IsAborted() // isAborted == true
}, func(ctx context.Context, c *app.RequestContext) {
    // will not execute
})
```

## Binding and validate

(For more information, please refer to [binding-and-validate](/docs/hertz/tutorials/basic-feature/binding-and-validate))

```go
func (ctx *RequestContext) Bind(obj interface{}) error
func (ctx *RequestContext) Validate(obj interface{}) error
func (ctx *RequestContext) BindAndValidate(obj interface{}) error
```

## Get ClientIP

```go
func (ctx *RequestContext) ClientIP() string
func (ctx *RequestContext) SetClientIPFunc(f ClientIP)
```

### ClientIP

Obtain the address of the client IP.

The default behavior of this function: If there is an ip in the `X-Forwarded-For` or `X-Real-IP` headers, read the ip from these two headers and return it (priority `X-Forwarded-For` greater than `X-Real-IP`), otherwise return remote address.

Function Signature:

```go
func (ctx *RequestContext) ClientIP() string
```

Example Code:

```go
// X-Forwarded-For: 20.20.20.20, 30.30.30.30
// X-Real-IP: 10.10.10.10
h.Use(func(ctx context.Context, c *app.RequestContext) {
    ip := ctx.ClientIP() // 20.20.20.20
})
```

### SetClientIPFunc

If the default method provided by the [ClientIP](#clientip) function does not meet the requirements, users can use this function to customize the way to obtain the client ip.

Users can implement custom functions themselves or by setting `app.ClientIPOptions`.

> Note: When setting `app.ClientIPOptions`, `TrustedCIDRs` requires user customization(if not set, fixed return to remote address), representing trusted routes. If the remote address is within the trusted routing range, it will choose to obtain the ip from `RemoteIPHeaders`, otherwise it will return the remote address.

Function Signature:

```go
func (ctx *RequestContext) SetClientIPFunc(f ClientIP)
```

Example Code:

```go
// POST http://example.com/user
// X-Forwarded-For: 30.30.30.30
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    // method 1
    customClientIPFunc := func(ctx *app.RequestContext) string {
			return "127.0.0.1"
	}
	ctx.SetClientIPFunc(customClientIPFunc)
	ip := ctx.ClientIP() // ip == "127.0.0.1"

    // method 2
    _, cidr, _ := net.ParseCIDR("127.0.0.1/32")
	opts := app.ClientIPOptions{
		RemoteIPHeaders: []string{"X-Forwarded-For", "X-Real-IP"},
		TrustedCIDRs:    []*net.IPNet{cidr},
	}
	ctx.SetClientIPFunc(app.ClientIPWithOption(opts))

	ip = ctx.ClientIP() // ip == "30.30.30.30"
})
```

## Concurrent Security

```go
func (ctx *RequestContext) Copy() *RequestContext
```

### Copy

Copy a copy of RequestContext to provide secure access to the coroutine.

Function Signature:

```go
func (ctx *RequestContext) Copy() *RequestContext
```

Example Code:

```go
h.POST("/user", func(ctx context.Context, c *app.RequestContext) {
    ctx1 := ctx.Copy()
    go func(context *app.RequestContext) {
        // safely
    }(ctx1)
})
```
