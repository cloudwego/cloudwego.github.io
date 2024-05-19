---
title: "Hertz Release v0.6.0"
linkTitle: "Release v0.6.0"
projects: ["Hertz"]
date: 2023-03-02
description: >
---

In version 0.6.0 of Hertz, in addition to regular iterative optimization, we also brought several important features.

## HTTP Trailer support

In Hertz v0.6.0, we support encoding and parsing of HTTP Trailer.

> https://github.com/cloudwego/hertz-examples/tree/main/trailer

- Write Trailer

```go
// server
func handler(c context.Context, ctx *app.RequestContext){
    ctx.Response.Header.Trailer().Set("Hertz", "Good")
}

// client
req.Header.Trailer().Set("Hertz", "Good")
```

- Read Trailer

```go
// server
func handler(c context.Context, ctx *app.RequestContext){
    ctx.Request.Header.Trailer().Get("Hertz")
}

// client
resp.Header.Trailer().Get("Hertz")
```

## HTTP/1.1 supports for Response Writer hijacking

In Hertz v0.6.0, we extended the HTTP/1.1 write request approach. Based on the original write request flow, we support users to hijack the Response Writer in the business handler/middleware to achieve a more flexible write request approach.</br>
In simple terms, all the original "underlying write" logic is unified behind the handler/middleware return, which has two obvious limitations.

1. The user has no control over the timing of the request flush to the other end
2. For the scenario of incremental data generation & real-time writing to the peer by chunk, the usage is relatively complicated and restrictive on top of the old architecture

Based on this, we extend a Writer that provides the ability to flush request headers and request bodies on its own, while providing support for users to send chunk data on demand. See https://github.com/cloudwego/hertz/pull/610 for a detailed implementation.

### Major Changes

1. Added an interface definition that extends Writer, `Writers` that implement this interface can be used to hijack Response Writer:

   ```go
   type ExtWriter interface {
           io.Writer
           Flush() error

           // Finalize will be called by framework before the writer is released.
           // Implementations must guarantee that Finalize is safe for multiple calls.
           Finalize() error
   }
   ```

2. Provides a `Chunk Writer` that implements the above interface (you can refer to this for similar requirements): `chunkedBodyWrite`
3. HTTP/1.1 does the corresponding processing (skipping the default write request logic) for Response write operations where the Writer has been hijacked, and finally calls the `Finalize()` method of the `ExtWriter` interface to complete a request write back

### Usage

As above, Hertz provides a default `ExtWriter` implementation to meet the user's active flush needs in the handler/middleware, and it is very simple to use.

```go
h.GET("/flush/chunk", func(c context.Context, ctx *app.RequestContext) {
        // Hijack the writer of response
        ctx.Response.HijackWriter(resp.NewChunkedBodyWriter(&ctx.Response, ctx.GetWriter()))

        for i := 0; i < 10; i++ {
                ctx.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
                ctx.Flush()                                                                 // nolint: errcheck
                time.Sleep(200 * time.Millisecond)
        }
})
```

## Scaffolding Tool Usage Optimization & Best Practices

In hz v0.6.0, we have made a number of optimizations to the organization of the generated code, allowing for a more flexible code organization

### Major Optimization

- The `new` command supports the "router_dir" option and works with the existing "handler_dir" and "model_dir" to fully customize the path to the IDL generation product; it also persists these custom options in the ".hz" file, which can be read automatically during `update`, reducing the complexity of the command
- Add the ability to search up the "go.mod" file so that hertz can share the same "go module" with other projects when it is a subproject
- Add the ability to reference third-party IDL products in the "handler", so that IDL products can be maintained separately in the third-party repository and not stored in the project directory, further enhancing IDL management capabilities

### Best Practices

We have rewritten "[biz-demo/easy-note](https://github.com/cloudwego/biz-demo/pull/26)" with "hz v0.6.0" to take advantage of the following hz features

- Generate hertz client call code for accessing "api server" based on IDL using the capabilities of "hz client"
- Reorganize the "api server" code with custom "router_dir", "handler_dir", and "model_dir" options, and remove the "biz" directory restriction
- Use the ability to "search up go.mod" so that "api server" can share the same "go module" as a subproject of "easy-note"
- Use the ability of "handler to refer to third-party IDL products" and the ability of "hz model" to store IDL products separately in the "easy-note" project and not in the "api server" subproject

## Full Release Note

The complete Release Note can refer to:

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.6.0
- Hz(scaffolding): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.6.0
