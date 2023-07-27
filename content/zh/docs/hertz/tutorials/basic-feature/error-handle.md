---
title: "错误处理"

date: 2022-05-23
weight: 10
description: >

---

## 错误

在 Hertz 中，定义了如下的错误结构体：

```go
type Error struct {
   Err  error
   Type ErrorType
   Meta interface{}
}
```

其中 `Err` 为标准错误，`Type` 为自定义错误类型，`Meta` 为错误元数据。

### 错误类型

为了更高效的处理错误，Hertz 针对错误类型做了如下预定义：

```go
// binding 过程的错误
ErrorTypeBind ErrorType = 1 << iota
// rendering 过程的错误
ErrorTypeRender
// Hertz 内部错误，业务无需感知
ErrorTypePrivate
// 相对于 Private 来说，需要外部感知的错误
ErrorTypePublic
// 其他错误
ErrorTypeAny
```

建议按照错误类别定义相应的错误。

### 自定义错误

使用如下接口自定义错误：

```go
// shortcut for creating a public *Error from string
func NewPublic(err string) *Error {
   return New(errors.New(err), ErrorTypePublic, nil)
}

// shortcut for creating a private *Error from string
func NewPrivate(err string) *Error {
   return New(errors.New(err), ErrorTypePrivate, nil)
}

func New(err error, t ErrorType, meta interface{}) *Error {
   return &Error{
      Err:  err,
      Type: t,
      Meta: meta,
   }
}

func Newf(t ErrorType, meta interface{}, format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), t, meta)
}

func NewPublicf(format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), ErrorTypePublic, nil)
}

func NewPrivatef(format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), ErrorTypePrivate, nil)
}

```

### 相关方法

| 函数签名                         | 描述                                             |
| -------------------------------- | ------------------------------------------------ |
| SetType(flags ErrorType) *Error  | 将 `Error` 的 `ErrorType` 设置为给定的 `flags`   |
| Error() string                   | 实现标准 `error` 接口                            |
| Unwrap() error                   | 抛出错误                                         |
| SetMeta(data interface{}) *Error | 设置元数据                                       |
| IsType(flags ErrorType) bool     | 判断 `Error` 的 `ErrorType` 是否为给定的 `flags` |
| JSON() interface{}               | 将错误转换为 `json` 对象                           |

## ErrorChain

除了针对错误定义的约定以外，框架同时提供 ErrorChain（错误链）能力。顾名思义，能够方便业务将一次请求处理上所遇到的所有错误绑定到错误链上，可以方便后续（一般是在中间件中）对所有错误进行统一处理。

### 相关方法

| 函数签名                         | 描述                                   |
| -------------------------------- | -------------------------------------- |
| String() string                  | 返回一个可读性强的文本用于展示所有错误 |
| Errors() []string                | 将错误链转换为标准错误数组             |
| ByType(typ ErrorType) ErrorChain | 按给定的错误类型返回对应的子错误链     |
| Last() *Error                    | 返回最后（最新）的一个错误             |
| JSON() interface{}               | 将所有错误转换为 `json` 对象               |

### 如何使用

对应的 API 为：`RequestContext.Error(err)`，调用该 API 会将 err 绑到对应的请求上下文上之上。

获取请求上下文已绑定的所有错误的方式：`RequestContext.Errors`。

```go
// 运行此代码并打开游览器访问 localhost:8080/error
package main

import (
	"context"
	"errors"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.New(server.WithHostPorts(":8080"))

	h.GET("/error", handle1, handle2, handle3)

	h.Spin()
}

func handle1(_ context.Context, c *app.RequestContext) {
	_ = c.Error(errors.New("first err"))
}

func handle2(_ context.Context, c *app.RequestContext) {
	_ = c.Error(errors.New("second err"))
}

func handle3(_ context.Context, c *app.RequestContext) {
    c.JSON(consts.StatusOK, c.Errors.Errors())
}
```
