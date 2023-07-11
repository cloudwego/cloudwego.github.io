---
title: "RequestContext"
date: 2023-07-11
weight: 4
description: >
---

Request Context `RequestContext` is a context used to save HTTP requests and set HTTP responses. It provides many convenient API interfaces to help users develop.

## Context Passing and Concurrency Security

### Description

Hertz provides both a standard `context.Context` and a requestContext as input parameters for the `HandlerFunc` design. Function signature is:

```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

### Metadata Storage

Both contexts have the ability to store values, and there is a simple basis for choosing which context to use: the lifecycle of the stored value and the chosen context should match.

#### Details
 
`ctx` is mainly used to store request level variables, which are reclaimed upon completion of the request. It's characteristics are high query efficiency (with the underlying `map`), unsafe coroutines, and no implementation of the `context.Context` interface.

`c` is passed as a context between middleware `/handler`. Having all the semantics of `context.Context`, coroutine security. For all places that require the `context.Context` interface as input parameters, simply pass `c` directly.

In addition, if there is a scenario of asynchronous transmission of `ctx`, hertz also provides the `ctx.Copy()` interface, making it easy for businesses to obtain a secure copy of the protocol.