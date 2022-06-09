---
title: "Middleware Overview"
date: 2022-05-23
weight: 2
description: >

---

## Server
|![middleware](/img/docs/hertz_middleware.png )|
|:--:|
|Figure 1: middleware call chain|

### Implement customized middleware

There are two ways to implement server side middleware:
- When the middleware only has pre-handle logic and there is no requirement to be in a function call stack with real handler, the `.Next` can be omitted.
- If there is other processing logic (post-handle) after the business handler, or there is a strong requirement for the function call chain (stack),
then the `.Next` must be called explicitly, see middleware C in Figure 1.

```go
// One way
func MyMiddleware() app.HandlerFunc {
   return func(ctx context.Context, c *app.RequestContext) {
      // pre-handle
      ...
   }
}

// The other way
func MyMiddleware() app.HandlerFunc {
   return func(ctx context.Context, c *app.RequestContext) {
      // pre-handle
      ...

      c.Next(ctx) // call the next middleware(handler)
      // post-handle
      ...

   }
}
```

If you want to terminate the middleware call quickly, you can use the following methods, noting that the current middleware will still execute.

- `Abort()`：terminate subsequent calls
- `AbortWithMsg(msg string, statusCode int)`：terminates subsequent calls and sets the body and status code for the Response
- `AbortWithStatus(code int)`：terminates subsequent calls and sets the status code

### Register customized middleware

```go
h := server.Default()
h.Use(MyMiddleware())
```

The Hertz framework currently supports middleware registration on Server, routing groups, and single routes, using the `Use` method.

### Activate default middleware

The Hertz framework already presets the commonly used Recover middleware, which can be registered by Default with `server.Default()`.

### Middlewares we provide
Hertz provides frequently-used middlewares such as BasicAuth, CORS, JWT, Swagger...If you need others, please make an issue.

## Client-side Middleware

### Implement customized middleware

The middleware implementation on the Client side is different from that on the Server side.
The Client side cannot get the index of the middleware to increase, so the Client middleware uses  nested functions to build the middleware in advance.
When implementing client-side customized middleware, you can refer to the following code.

```go
func MyMiddleware(next client.Endpoint) client.Endpoint {
    return func(ctx context.Context, req *protocol.Request, resp *protocol.Response) (err error) {
         // pre-handle
         ...
        err = next(ctx, req, resp)
        if err != nil {
            return
        }
        // post-handle
        ...
    }
}
```

Note: the `next` method must be executed to continue calls to the subsequent middleware. If you want to stop the middleware call, just return before `next`.

### Register customized middleware

Registering custom middleware is the same as on the server side.

```go
c, err := client.NewClient()
c.Use(MyMiddleware)
```
