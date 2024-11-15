---
title: "Context Management"
linkTitle: "Context"
weight: 4
---

# `certain_map`

In a service-oriented architecture, managing the context data that flows between different services is a critical aspect of the system design. The [`certain_map`](https://docs.rs/certain-map/latest/certain_map/) crate provides a powerful way to define and work with typed context data, ensuring the existence of required information at compile-time.

## The Problem `certain_map` Solves

When building modular services, it's common to have indirect data dependencies between components. For example, a downstream service may require information that was originally provided in an upstream request, but the intermediate services don't directly use that data. Traditionally, this would involve passing all potentially relevant data through the request/response types, which can quickly become unwieldy and error-prone.

Alternatively, you might use a `HashMap` to manage the context data, but this approach has a significant drawback: you cannot ensure at compile-time that the required key-value pairs have been set when the data is read. This can lead to unnecessary error handling branches or even panics in your program.

## How `certain_map` Helps

The `certain_map` crate solves this problem by providing a a typed-map-like struct that ensures the existence of specific items at compile-time. When you define a `Context` struct using `certain_map`, the compiler will enforce that certain fields are present, preventing runtime errors and simplifying the implementation of your services.

Here's an example of how you might set up the context for your project:

```rust
certain_map::certain_map! {
    #[derive(Debug, Clone)]
    #[empty(EmptyContext)]
    #[full(FullContext)]
    pub struct Context {
        peer_addr: PeerAddr,
        remote_addr: Option<RemoteAddr>,
    }
}
```

In this example, the `Context` struct has two fields: `peer_addr` of type `PeerAddr`, and `remote_addr` of type `Option<RemoteAddr>`. The `#[empty(EmptyContext)]` and `#[full(FullContext)]` attributes define the type aliases for the empty and full versions of the context, respectively.

The key benefits of using `certain_map` for your context management are:

1. **Compile-time Guarantees**: The compiler will ensure that the necessary fields are present in the `Context` struct, preventing runtime errors and simplifying the implementation of your services.

2. **Modularity and Composability**: By defining a clear context structure, you can more easily compose services together, as each service can specify the context data it requires using trait bounds.

3. **Flexibility**: The `certain_map` crate provides a set of traits (`ParamSet`, `ParamRef`, `ParamTake`, etc.) that allow you to easily manipulate the context data, such as adding, removing, or modifying fields.

4. **Reduced Boilerplate**: Instead of manually creating and managing structs to hold the context data, the `certain_map` crate generates the necessary code for you, reducing the amount of boilerplate in your project.

## Using `certain_map` in Your Services

Once you've defined your `Context` struct, you can use it in your services to ensure that the required data is available. For example, consider the following `UpstreamHandler` service:

```rust
impl<CX, B> Service<(Request<B>, CX)> for UpstreamHandler
where
    CX: ParamRef<PeerAddr> + ParamMaybeRef<Option<RemoteAddr>>,
    B: Body<Data = Bytes, Error = HttpError>,
    HttpError: From<B::Error>,
{
    type Response = ResponseWithContinue<HttpBody>;
    type Error = Infallible;

    async fn call(&self, (mut req, ctx): (Request<B>, CX)) -> Result<Self::Response, Self::Error> {
        add_xff_header(req.headers_mut(), &ctx);
        #[cfg(feature = "tls")]
        if req.uri().scheme() == Some(&http::uri::Scheme::HTTPS) {
            return self.send_https_request(req).await;
        }
        self.send_http_request(req).await
    }
}
```

In this example, the `UpstreamHandler` service expects the `Context` to contain the `PeerAddr` and optionally the `RemoteAddr`. The trait bounds `ParamRef<PeerAddr>` and `ParamMaybeRef<Option<RemoteAddr>>` ensure that these fields are available at compile-time, preventing potential runtime errors.

By using `certain_map` to manage your context data, you can improve the modularity, maintainability, and robustness of your service-oriented architecture.