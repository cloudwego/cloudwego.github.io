---
title: "FAQ"
linkTitle: "FAQ"
weight: 4
description: >

---

## High memory usage

### unclosed client connection

If the Client side initiates a large number of connections without closing them, in extreme cases, there will be a great waste of resources, and with the increase of time, the memory utilization rate may be high.

**Solution**

Configure `idleTimeout` reasonably, and Hertz Server will turn off the connection after timeout to ensure the stability of the server side. The default configuration is 3 minutes.

### Oversized request/response

1. If the request and response are very large, and some other sending modes such as stream and chunk are not used, all the data will enter the memory, causing great pressure on the memory.
2. The streaming under netpoll network library is false streaming. Because netpoll uses LT trigger mode, when the data arrives, it will trigger netpoll to read the data; In terms of interface design, the Reader' interface is not implemented. In order to realize the streaming ability, Hertz encapsulates netpoll as Reader, but its own data still enters the memory uncontrollably, so it may cause memory pressure in the case of extremely large streaming requests.

**Solution**

In the scenario of large request, use the combination of `streaming + go net`.

## Troubleshoot common error codes

If the framework reports the following error code, it can be checked according to the possible reasons. If there is an error code other than the following, it is not typed by the framework. It is necessary for the user to find out whether to set the error code by himself or by some middleware.

### 404

1. The wrong port is accessed, and the debug port is commonly accessed.
   1. Solution: Distinguish the listening port of framework service from the listening port of debug server, and the default is `xxx`.
2. There is no match to the route.
   1. Check whether all expected routes are registered normally according to the startup log.
   2. Check whether the access method is correct.
   3. Check whether some configuration items are open, such as `xxx`.

### 417

Server returns `false` after executing the custom `ContinueHandler` (the server actively rejects the subsequent body of `100 Continue`).

### 500

1. throw panic in middleware or `handlerFunc`
   1. Solution: Specific problems of panic stack information positioning.
2. fs scenario path carries `/../`, and unexpected files may be accessed. The serverr-side app log is accompanied by an error log: `cannot serve path with'/../'atposition% d due to security reasons:% q`.
   1. Solution: Check whether there is an illegal request.

## Context usage guide

### Description

Hertz also provides a standard `context.Context` and a request context as parameters of functions in the design of `HandlerFunc`.
`Handler/middleware` function signature is:

```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

### Metadata storage aspect

Both contexts have the ability to store values. The simple basis for choosing which one to use is that the life cycle of the stored value should match the selected context.

**Specific details**

`ctx` is mainly used to store the variables at the request level, which will be collected after the request is finished. It is characterized by high query efficiency (the bottom layer is `map`), unsafe coordination, and no `context.Context` interface.
`c` is passed between middleware`/handler` as context. Have all the semantics of `context.Context`, and the process is safe. All `context.Context` interfaces are required as the places to participate, just pass `c` directly.

In addition, hertz also provides the `ctx.Copy()` interface when faced with the situation that `ctx` must be delivered asynchronously, so that the service can obtain a copy of the protocol security.
