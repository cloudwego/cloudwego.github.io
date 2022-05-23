---
title: "错误处理"
date: 2022-05-23
weight: 5
description: >

---

## 错误类型

为了更高效的处理错误，Hertz 针对错误类型做了如下预定义：

```go
// binding 过程的错误
ErrorTypeBind ErrorType = 1 << iota
// rendering 过程的错误
ErrorTypeRender
// Hertz内部错误，业务无需感知
ErrorTypePrivate
// 相对于Private来说，需要外部感知的错误
ErrorTypePublic
// 其他错误
ErrorTypeAny
```

建议按照错误类别定义相应的错误。

## 相关接口

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
```

## ErrorChain

除了针对错误定义的约定以外，框架同时提供 ErrorChain（错误链）能力。顾名思义，能够方便业务将一次请求处理上所遇到的所有错误绑定到错误链上，可以方便后续（一般是在中间件中）对所有错误进行统一处理。
对应的 API 为：`RequestContext.Error(err)`，调用该 API 会将 err 绑到对应的请求上下文上之上。

获取请求上下文已绑定的所有错误的方式：`RequestContext.Errors`（ErrorChain）。ErrorChain 目前提供的 API：

```text
ByType：按错误类型返回对应的子错误链
Errors：将错误链转换为标准错误数组
JSON：将所有错误转换为json对象
Last： 返回最后（最新）的一个错误
String：可读性强的文本展示所有错误
```
