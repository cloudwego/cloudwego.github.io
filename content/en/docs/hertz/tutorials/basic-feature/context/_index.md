---
title: "RequestContext"
date: 2023-07-11
weight: 5
description: >
---

Request Context `RequestContext` is a context used to save HTTP requests and set HTTP responses. It provides many convenient API interfaces to help users develop.

Hertz provides both a standard `context.Context` and a `RequestContext` as input parameters for the `HandlerFunc` design. Function signature is:

```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

## Context Passing and Concurrency Security

### Metadata Storage

Both contexts have the ability to store values, and there is a simple basis for choosing which context to use: the lifecycle of the stored value and the chosen context should match.
 
`ctx` is mainly used to store request level variables, which are reclaimed upon completion of the request. It's characteristics are high query efficiency (with the underlying `map`), unsafe coroutines, and no implementation of the `context.Context` interface.

`c` is passed as a context between middleware `/handler`. it is coroutine security. For all places that require the `context.Context` interface as input parameters, simply pass `c` directly.

### concurrent security

In addition, if there are scenarios where `ctx` is passed asynchronously or used concurrently, hertz also provides the `ctx.Copy()` interface, which makes it easy for the business to get a coprocess-safe copy.
