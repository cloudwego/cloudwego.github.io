---
title: "Logging Extension"
date: 2021-08-26
weight: 7
description: >
---

## Customized Logger Implementation

The client module and server module of Kitex both have a `WithLogger` option to serve the purpose of injecting customized logger implementations. Middlewares and the other parts of the framework will use it to output logs.

By default, the framework uses `klog.DefaultLogger()`.

## Logging in a Middleware

When you create a middleware and wish to write some logs in it using the logger provided by the framework while getting along with the logger injected by the `WithLogger` option, just inject the middleware with `WithMiddlewareBuilder` instead of the `WithMiddleware` option.

The `endpoint.MiddlewareBuilder` injected by the `WithMiddlewareBuilder` will be invoked with a `context.Context` argument that carries the logger being injected. The latter can be retrieved by `ctx.Value(endpoint.CtxLoggerKey)`.

```go
func MyMiddlewareBuilder(mwCtx context.Context) endpoint.Middleware { // middleware builder

    logger := mwCtx.Value(endpoint.CtxLoggerKey).(klog.FormatLogger)  // get the logger

    return func(next endpoint.Endpoint) endpoint.Endpoint {           // middleware
        return func(ctx context.Context, request, response interface{}) error {

            err := next(ctx, request, response)

            logger.Debugf("This is a log message from MyMiddleware! err: %v", err)

            return err
        }
    }
}
```

## Redirecting the Output of the Default Logger

The `klog.SetOutput` can be used to redirect the output of the default logger provided by the pkg/klog package.

Note that this function does not affect those customized implementations injected using `WithLogger` options.
