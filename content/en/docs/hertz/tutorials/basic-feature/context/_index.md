---
title: "RequestContext"
date: 2025-04-22
weight: 5
keywords:
  [
    "RequestContext",
    "HTTP",
    "Context Passing",
    "Metadata Storage",
    "Concurrency Safety",
    "Goroutine Safety",
  ]
description: "Functions related to the request context."
---

Request Context `RequestContext` is a context used to save HTTP requests and set HTTP responses. It provides many convenient API interfaces to help users develop.

Hertz provides both a standard `context.Context` and a `RequestContext` as input parameters for the `HandlerFunc` design. Function signature is:

```go
type HandlerFunc func(ctx context.Context, c *RequestContext)
```

## Context Passing and Concurrency Safety


### Metadata Storage

Both `context.Context` and `RequestContext` have the ability to store key-value pairs.

`context.Context` is passed as context between middleware and various functions. It's a general, standardized parameter and goroutine-safe. It is recommended to use `context.Context` for context data passing.

`*RequestContext` provides a lighter way than `context.Context`, allowing intermediate data to be stored using `Get` and `Set` methods. However, note that `*RequestContext` will be recycled and reused when the request ends. You need to ensure that the usage of `*RequestContext` does not exceed the lifecycle of the handler. Asynchronous background goroutines are not allowed, as detailed in the next section.

### Goroutine Safety

Since `*RequestContext` is recycled and reused when the request ends, please do not pass it to background asynchronous goroutines for any operations.

If necessary, you can explicitly call the `Exile()` method to mark it as non-recyclable, or use `Copy()` to generate a copy for background use.

For quick troubleshooting, you can set the environment variable `HERTZ_DISABLE_REQUEST_CONTEXT_POOL=1` to disable this behavior. However, it is still recommended to use the `Exile()` or `Copy()` methods on demand.

Most methods of `*RequestContext` are not goroutine-safe. Before version `v0.9.7`, **any Header related method** was not goroutine-safe, including most **read and write** methods, such as the common `Peek` read method. In version `v0.9.7` and later, header read methods have been optimized to ensure goroutine concurrent read safety. However, if there are asynchronous background goroutines, you still need to refer to the instructions in the previous subsection.
