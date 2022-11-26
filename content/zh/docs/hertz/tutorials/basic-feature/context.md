---
title: "context"
date: 2022-11-26
weight: 2
description: >

---

请求上下文 `RequestContext` 是用于保存 HTTP 请求和设置 HTTP 响应的上下文，它提供了许多方便的 API 接口帮助用户开发

## 上下文传递与并发安全

### 说明
Hertz 在 `HandlerFunc` 设计上，同时提供了一个标准 `context.Context` 和一个请求上下文作为函数的入参。
`handler/middleware` 函数签名为：
```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

### 元数据存储方面
两个上下文都有储值能力，使用时具体选择哪一个的简单依据：所储存值的生命周期和所选择的上下文要匹配。

**具体细节**

`ctx` 主要用来存储请求级别的变量,请求结束就回收了，特点是查询效率高（底层是 `map`），协程不安全，且未实现 `context.Context` 接口。
`c` 作为上下文在中间件 `/handler` 之间传递。拥有 `context.Context` 的所有语义，协程安全。所有需要 `context.Context` 接口作为入参的地方，直接传递 `c` 即可。

除此之外，如果面对一定要异步传递 `ctx` 的场景，hertz 也提供了 `ctx.Copy()` 接口，方便业务能够获取到一个协程安全的副本。


## 请求

### URI

#### Query 参数

使用 `ctx.Query` 查询 URL Query 的参数。参数不存在则返回空字符串。

示例:
```go
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
    	ctx.String(200, ctx.Query("key"))
    })

```

使用 `ctx.QueryArgs()` 获取 URI Query 参数对象， 它提供了 Peek、VisitAll、QueryString 等方法。

```go
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
            args := ctx.QueryArgs()
            
            // use Peek 
            key := string(args.Peek("key"))
            fmt.Println(key)
            
            // use VisitAll
            res := utils.H{}
            args.VisitAll(func(key, value []byte) {
                res[string(key)] = string(value)
            })
            ctx.JSON(consts.StatusOK, res)
        })
```

#### 客户端 IP

使用 `ctx.ClientIP()` 获取客户端 IP 的地址

示例:
```go
	h.POST("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.RemoteAddr()
		ctx.JSON(consts.StatusOK, ctx.ClientIP())
	})
```

#### URI 对象

使用 `ctx.URI` 获取 URI 对象，它主要提供了 Host、Path、PathOriginal 等方法用于获取和设置 URI 的参数。

|  方法名称   | 描述  |
|  ----  | ----  |
| `QueryArgs`  | 获取 `Query` 参数 |
| `QueryString`  | 获取 `Query` 参数的字符串 |
| `Path`  | 获取 `URI` 的 `Path`(经过转义) |
| `SetPath`  | 设置 `URI` 的 `Path` |
| `PathOriginal`  | 获取 `URI` 的 `Path`(未转义) |
| `SetScheme`  | 设置 `URI` 的 `Schema` |
| `Schema`  | 获取 `URI` 的 `Schema` |
| `Reset`  | 清除 `URI` |
| `Host`  | 获取 `URI` 的 `HOST` |
| `SetHost`  | 设置 `URI` 的 `HOST` |
| `Update`  | 更新 `URI` |
| `FullURI`  | 返回完整的 `URI` 字符串，格式为 {Scheme}://{Host}{RequestURI}#{Hash} |


### 路由参数获取
使用 `ctx.Param` 获取参数路由或通配路由的参数。

示例:
```go
     router.GET("/user/:id", func(c *hertz.RequestContext) {
         // a GET request to /user/john
         id := c.Param("id") // id == "john"
     })
```

### Post 表单参数

使用 `ctx.PostForm` 从 urlencoded 表单或 multipart 表单中获取参数。

示例:

```go
	h.POST("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, ctx.PostForm("key"))
	})
```

#### Urlencoded 表单

使用 `ctx.PostArgs()` 获取 Post 的 urlencoded form 对象,它提供了 Peek、VisitAll、QueryString 等方法。

```go
    h.POST("/ping", func(c context.Context, ctx *app.RequestContext) {
            args := ctx.PostArgs()
            
            // use Peek 
            key := string(args.Peek("key"))
            fmt.Println(key)
            
            // use VisitAll
            res := utils.H{}
            args.VisitAll(func(key, value []byte) {
                res[string(key)] = string(value)
            })
            ctx.JSON(consts.StatusOK, res)
        })
```

#### Multipart 表单&操作文件.

使用 `ctx.MultipartForm()` 获取 multipart form 对象，用于获取参数或文件。

使用 `ctx.FormFile` 获取单个上传文件，使用 `ctx.SaveUploadedFile` 保存文件。

示例:
```go
	engine.POST("/", func(c context.Context, ctx *app.RequestContext) {
		// multiple files.
		form, _ := ctx.MultipartForm()
		files := form.File["files"]
		for _, file := range files {
			// save files.
			ctx.SaveUploadedFile(file, filepath.Base(file.Filename))
		}
		// single file.
		file1, _ := ctx.FormFile("file_1")
		ctx.SaveUploadedFile(file1, filepath.Base(file1.Filename))
		ctx.String(consts.StatusOK, fmt.Sprintf("%d files uploaded!", len(files)+2))
	})
```

### Header

#### 获取请求中的 Header 参数
使用 `ctx.GetHeader()` 从请求头中获取获取参数.

```go
	h.POST("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, ctx.GetHeader("key"))
	})
```

#### 获取请求中所有 Header 参数
使用 `ctx.Request.Header.VisitAll` 获取请求中所有 header 参数.

```go
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		headers := make(map[string]string)
		ctx.Request.Header.VisitAll(func(key, value []byte) {
			headers[string(key)] = string(value)
		})
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
```


#### 设置 Header
使用 `ctx.Request.Header.Add` 或 `ctx.Request.Header.Add` 设置请求的 header,区别是 `Set` 是覆盖写而 `Add` 则不是。

```go
	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.Request.Header.Set("key", "value")
		ctx.Request.Header.Add("key1", "value1")
		ctx.Request.Header.Add("key1", "value2")
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
```

#### Header 对象

上面展示了常见的请求 header 方法，下面会列举请求 header 对象所提供的方法。 

使用 `ctx.Request.Header` 获取 request header 对象，它提供了 ContentType、ContentLength、RequestURI、SetCookie 等方法，更多的方式可以详看[代码](https://github.com/cloudwego/hertz/blob/develop/pkg/protocol/header.go) 。

|  方法名称   | 描述  |
|  ----  | ----  |
| `IsHTTP11`  | 是否是 HTTP/1.1 的请求 |
| `SetProtocol`  | 设置 HTTP 协议 |
| `GetProtocol`  | 获取 HTTP 协议 |
| `ContentLength`  | 获取 `Content-Length` |
| `SetHost`  | 设置 header 的 `Host` 字段 |
| `Host`  | 获取 header 的 `Host` 字段 |
| `UserAgent`  | 获取 `UserAgent` |
| `RequestURI`  | 获取请求的 URI 字符串 |
| `Reset`  | 重置请求头 |
| `SetByteRange`  | 设置 `Range: bytes=startPos-endPos` 请求头|
| `DelBytes`  | 删除指定请求的 header |
| `CopyTo`  | 拷贝请求头 |
| `Peek`  | 根据请求头 `Key` 获取请求的 `Value`|
| `SetContentTypeBytes`  | 设置 `Content-Type` 的 header |
| `ContentType`  | 获取 `Content-Type` 的 header |
| `SetContentLength`  | 设置 `Content-Length` 的 header |
| `Method`  | 获取 `HTTP Method` |
| `SetCookie`  | 设置 `Cookie` |
| `Cookie`  | 获取 `Cookie` |
| `FullCookie`  | 获取完整的 `Cookie` header 字段 |
| `DelCookie`  | 删除指定的 `Cookie` |
| `DelAllCookies`  | 删除所有的 `Cookie` |
| `VisitAllCookie`  |  遍历所有 `Cookie` |
| `DisableNormalizing`  | 禁用 Header 的归一化 |


## 响应
