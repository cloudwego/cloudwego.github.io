---
title: "错误处理"
linkTitle: "错误处理"
weight: 3
date: 2024-02-18
keywords: ["RPC 异常", "业务异常", "最佳实践"]
description: "除了框架默认提供的 RPC 异常，Kitex 还提供了业务异常供用户设置，本文主要介绍 RPC 异常与业务异常的最佳实践。"
---

## 概念说明

### RPC 异常

RPC 异常是指 RPC 链路上产生的错误，如超时/无下游实例等，这类异常会返回相应的 RPC 错误码 ，通常是由框架抛出。RPC 异常不应该包含业务 handler 内抛出的错误，因为这不属于 RPC 链路异常，而是业务本身的异常。因此，Kitex 还提供了业务异常供用户设置。

### 业务异常

任何在 handler 内处理时遇到的异常，应该使用业务异常来封装，否则会被识别为 RPC 异常从而可能触发 RPC 链路异常报警。业务异常允许用户传递更加丰富的错误信息，它可以作为业务逻辑的一部分，如校验用户 ID 合法性等场景。传递业务异常的字段与错误码是隔离的，因此用户无需考虑状态码冲突问题。

## 如何使用业务异常

传递业务异常可基于 Kitex 自 v0.4.3 版本提供的业务异常功能，参考 [Kitex 业务异常文档](/zh/docs/kitex/tutorials/basic-feature/bizstatuserr/)。

### 其他方式传递业务异常

用户还可以通过在 IDL 里定义 Exception，返回 Thrift Exception。可以通过断言的方式判断是否自定义 Exception，如 `e, ok := err.(*xxx.YourException)`

## Kitex 内部错误（RPC 异常）

kitex 的关于错误的定义在以下包目录中：

`kitex/pkg/kerrors`：

￮ kitex 核心所依赖的错误定义，支持 `errors.Is` 和 `errors.Unwrap`

￮ kitex 定义的 `basic error types` 可以用 `WithCause` 来添加详细原因。

### 判断是否 Kitex 内部错误

可以通过 `kerrors` 包提供的 `IsKitexError` 直接进行判断

```Go
 import "github.com/cloudwego/kitex/pkg/kerrors"
 ...
 isKitexErr := kerrors.IsKitexError(kerrors.ErrInternalException) // 返回 true
```

### 判断具体错误类型

可以通过 errors.Is 进行判断，其中详细错误可以通过详细错误判断，如：

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // 返回 kerrors.ErrNoResolver
...
isKitexErr := errors.Is(err, kerrors.ErrNoResolver) // 返回 true
```

也可以通过基本错误进行判断，如：

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // 返回 kerrors.ErrNoResolver
...
isKitexErr := errors.Is(err, kerrors.ErrInternalException) // 返回 true
```

特别的，timeout 错误可以通过 `kerrors` 包提供的 `IsTimeoutError `进行判断

### 获取详细错误信息

`kerrors` 中所有的具体错误类型都是 `kerrors` 包下的 `DetailedError`，故而可以通过 `errors.As ` 获取到实际的 `DetailedError`，如：

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // 返回 kerrors.ErrNoResolver
...
var de *kerrors.DetailedError
ok := errors.As(err, &de) // 返回 true
if de.ErrorType() == kerrors.ErrInternalException {} // 返回 true
```

`DetailedError` 提供了下述方法用于获取更详细的信息：

1. `ErrorType() error` ，用于获取基本错误类型
2. `Stack() string` ，用于获取堆栈信息（目前仅 `ErrPanic` 会带上）

## 错误码

> **注意：以下错误码对应的是RPC请求失败的场景**

错误码具有定制性，各公司内部基本都有各种错误码的实践，此处仅介绍 Thrift 原生错误码。

### Thrift 错误码

该类别对应 thrift 框架原生的 `Application Exception` 错误，该类错误会被 Kitex 框架包装成 `Remote or network error`。

关于调用端上报的错误码

￮ < v0.2.0：调用端上报错误码 119

￮ >= v0.2.0：上报下面对应的错误码

（该变更是为了能统一服务端返回的错误码处理，的确存在服务端会透传一些错误码需要被客户端感知，统一为 119 存在不合理性）

| **错误码** | **名称**                    | **含义**       |
| ---------- | --------------------------- | -------------- |
| 0          | UnknownApplicationException | 未知错误       |
| 1          | UnknownMethod               | 未知方法       |
| 2          | InvalidMessageTypeException | 无效的消息类型 |
| 3          | WrongMethodName             | 错误的方法名字 |
| 4          | BadSequenceID               | 错误的包序号   |
| 5          | MissingResult               | 返回结果缺失   |
| 6          | InternalError               | 内部错误       |
| 7          | ProtocolError               | 协议错误       |
