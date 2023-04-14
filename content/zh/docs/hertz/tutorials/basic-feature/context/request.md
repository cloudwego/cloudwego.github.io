---
title: "请求"
date: 2023-04-14
weight: 4
description: >
---


## URI

```go
// TODO: API 说明
func (ctx *RequestContext) Host() []byte 
func (ctx *RequestContext) Param(key string) string
func (ctx *RequestContext) Query(key string) string
func (ctx *RequestContext) DefaultQuery(key, defaultValue string) string
func (ctx *RequestContext) GetQuery(key string) (string, bool) 
func (ctx *RequestContext) FullPath() string 
func (ctx *RequestContext) SetFullPath(p string)
func (ctx *RequestContext) URI() *protocol.URI 
func (ctx *RequestContext) QueryArgs() *protocol.Args
```

### Host

函数签名:

```go
func (ctx *RequestContext) Host() []byte 
```

说明:

示例:

```go
```

### Param...SetFullPath (TODO)

### URI

函数签名:

```go
func (ctx *RequestContext) URI() *protocol.URI 
```

说明:

示例:

```go
```

#### protocol.URI

```go
   func (u *URI) CopyTo(dst *URI) 
   func (u *URI) QueryArgs() *Args 
   func (u *URI) Hash() []byte 
   func (u *URI) SetHash(hash string) 
   func (u *URI) SetHashBytes(hash []byte) 
   func (u *URI) Username() []byte 
   func (u *URI) SetUsername(username string) 
   func (u *URI) SetUsernameBytes(username []byte) 
   func (u *URI) Password() []byte 
   func (u *URI) SetPassword(password string) 
   func (u *URI) SetPasswordBytes(password []byte) 
   func (u *URI) QueryString() []byte 
   func (u *URI) SetQueryString(queryString string) 
   func (u *URI) SetQueryStringBytes(queryString []byte) 
   func (u *URI) Path() []byte 
   func (u *URI) SetPath(path string) 
   func (u *URI) String() string 
   func (u *URI) SetPathBytes(path []byte) 
   func (u *URI) PathOriginal() []byte 
   func (u *URI) Scheme() []byte 
   func (u *URI) SetScheme(scheme string) 
   func (u *URI) SetSchemeBytes(scheme []byte) 
   func (u *URI) Reset() 
   func (u *URI) Host() []byte 
   func (u *URI) SetHost(host string) 
   func (u *URI) SetHostBytes(host []byte) 
   func (u *URI) LastPathSegment() []byte 
   func (u *URI) Update(newURI string) 
   func (u *URI) UpdateBytes(newURI []byte) 
   func (u *URI) Parse(host, uri []byte) 
   func (u *URI) AppendBytes(dst []byte) []byte 
   func (u *URI) RequestURI() []byte 
   func (u *URI) FullURI() []byte 
```

### QueryArgs

函数签名:

```go
func (ctx *RequestContext) QueryArgs() *protocol.Args
```

说明:

示例:

```go
```

#### protocol.Args

```go
func (a *Args) Set(key, value string) 
func (a *Args) Reset() 
func (a *Args) CopyTo(dst *Args) 
func (a *Args) Del(key string) 
func (a *Args) DelBytes(key []byte) 
func (a *Args) Has(key string) bool 
func (a *Args) String() string 
func (a *Args) QueryString() []byte 
func (a *Args) ParseBytes(b []byte) 
func (a *Args) Peek(key string) []byte 
func (a *Args) PeekExists(key string) (string, bool) 
func (a *Args) Len() int 
func (a *Args) AppendBytes(dst []byte) []byte 
func (a *Args) VisitAll(f func(key, value []byte)) 
func (a *Args) WriteTo(w io.Writer) (int64, error) 
func (a *Args) Add(key, value string) 
```

## Header

```go
// TODO: API 说明
func (ctx *RequestContext) IsGet() bool 
func (ctx *RequestContext) IsHead() bool
func (ctx *RequestContext) IsPost() bool
func (ctx *RequestContext) Method() []byte
func (ctx *RequestContext) Path() []byte 
func (ctx *RequestContext) NotModified()
func (ctx *RequestContext) IfModifiedSince(lastModified time.Time) bool 
func (ctx *RequestContext) ContentType() []byte
func (ctx *RequestContext) Cookie(key string) []byte
func (ctx *RequestContext) UserAgent() []byte
func (ctx *RequestContext) GetHeader(key string) []byte
// TODO: RequestContext.Request.Header 
```

## Body

```go
// TODO: API 说明
func (ctx *RequestContext) GetRawData() []byte
func (ctx *RequestContext) Body() ([]byte, error) 
func (ctx *RequestContext) FormFile(name string) (*multipart.FileHeader, error) 
func (ctx *RequestContext) SaveUploadedFile(file *multipart.FileHeader, dst string) error 
func (ctx *RequestContext) RequestBodyStream() io.Reader
func (ctx *RequestContext) MultipartForm() (*multipart.Form, error)
func (ctx *RequestContext) PostArgs() *protocol.Args
func (ctx *RequestContext) PostForm(key string) string
func (ctx *RequestContext) DefaultPostForm(key, defaultValue string) string 
func (ctx *RequestContext) GetPostForm(key string) (string, bool) 
```

## 其他

```go
// TODO: 综合类型 可能需要重新分类
func (ctx *RequestContext) FormValue(key string) []byte 
func (ctx *RequestContext) SetFormValueFunc(f FormValueFunc) 
func (ctx *RequestContext) BindAndValidate(obj interface{}) error 
func (ctx *RequestContext) Bind(obj interface{}) error 
func (ctx *RequestContext) Validate(obj interface{}) error 
func (ctx *RequestContext) ResetWithoutConn() 
func (ctx *RequestContext) Reset() 
func (ctx *RequestContext) Finished() <-chan struct{} 
func (ctx *RequestContext) GetRequest() (dst *protocol.Request) 
func (ctx *RequestContext) Copy() *RequestContext 
func (ctx *RequestContext) Error(err error) *errors.Error 

// TODO: Handler
func (ctx *RequestContext) Next(c context.Context) 
func (ctx *RequestContext) Handler() HandlerFunc 
func (ctx *RequestContext) Handlers() HandlersChain 
func (ctx *RequestContext) SetHandlers(hc HandlersChain) 
func (ctx *RequestContext) HandlerName() string 
func (ctx *RequestContext) GetIndex() int8 
func (ctx *RequestContext) Abort() 
func (ctx *RequestContext) IsAborted() bool 

// TODO: 上下文建值存取
func (ctx *RequestContext) ForEachKey(fn func(k string, v interface{}))
func (ctx *RequestContext) Value(key interface{}) interface{}
func (ctx *RequestContext) Set(key string, value interface{})
func (ctx *RequestContext) Get(key string) (value interface{}, exists bool)

// TODO: 类型转换
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

// TODO: Trace
func (ctx *RequestContext) GetTraceInfo() traceinfo.TraceInfo 
func (ctx *RequestContext) SetTraceInfo(t traceinfo.TraceInfo) 
func (ctx *RequestContext) IsEnableTrace() bool 
func (ctx *RequestContext) SetEnableTrace(enable bool) 

// TODO: Conn
func (ctx *RequestContext) SetConn(c network.Conn) 
func (ctx *RequestContext) GetConn() network.Conn 
func (ctx *RequestContext) GetReader() network.Reader 
func (ctx *RequestContext) GetWriter() network.Writer 
func (ctx *RequestContext) RemoteAddr() net.Addr 
func (ctx *RequestContext) ClientIP() string 
func (ctx *RequestContext) SetClientIPFunc(f ClientIP) 

// TODO: Hijack
func (ctx *RequestContext) Flush() error 
func (ctx *RequestContext) SetHijackHandler(h HijackHandler) 
func (ctx *RequestContext) GetHijackHandler() HijackHandler 
func (ctx *RequestContext) Hijack(handler HijackHandler) 
func (ctx *RequestContext) Hijacked() bool 

```

### TODO 其他-子分类
