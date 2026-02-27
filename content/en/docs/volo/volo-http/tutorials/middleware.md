---
title: "Middleware"
date: 2024-09-02
weight: 5
keywords:
  [
    "Middleware",
  ]
description: "Volo-HTTP middleware"
---

## Using Middleware

In Volo-HTTP, middleware is usually implemented as a `Layer`, but there are some built-in middleware in Volo-HTTP, too.

For example, we use the built-in `TimeoutLayer`.

```rust
use std::net::SocketAddr;
use std::time::Duration;
use volo::net::Address;
use volo_http::{
    context::ServerContext,
    http::StatusCode,
    server::{layer::TimeoutLayer, route::get},
    Router, Server,
};

fn index_handler() -> &'static str {
    "Hello, World!"
}

fn timeout_handler(_: &ServerContext) -> (StatusCode, &'static str) {
    (StatusCode::INTERNAL_SERVER_ERROR, "Timeout!\n")
}

#[volo::main]
async fn main() {
    let app = Router::new()
        .route("/", get(index_handler))
        .layer(TimeoutLayer::new(Duration::from_secs(1), timeout_handler));

    let addr = "[::]:8080".parse::<SocketAddr>().unwrap();
    let addr = Address::from(addr);

    Server::new(app).run(addr).await.unwrap();
}
```

## Writing a Middleware

In Volo-HTTP, there are also functions provided that facilitate middleware implementation, such as `from_fn` and `map_response`.

Both can receive a function to be used as middleware, but the difference is that the
- `from_fn` receives a Request and returns a Response, in which it can either call an inner service or return a Response directly.
- `map_response` acts on Response, receives Response and returns the processed Response.

### `from_fn`

Functions used by `from_fn` can extract parameters of a specific type via extractor.

But in the end, the `cx`, `req` and `next` parameters must be appended and the inner service is invoked via `next.run(cx, req).await`.

Here we take `from_fn` as an example of a middleware implementation for logging the time spent on a single request:

```rust
use std::net::SocketAddr;
use std::time::{Duration, Instant};

use volo_http::{
    context::ServerContext,
    http::Uri,
    request::ServerRequest,
    response::ServerResponse,
    server::{
        middleware::{self, Next},
        route::get,
        IntoResponse,
    },
    Address, Router, Server,
};

fn index_handler() -> &'static str {
    "Hello, World!"
}

pub async fn trace_request(
    peer: Address,
    uri: Uri,
    cx: &mut ServerContext,
    req: ServerRequest,
    next: Next,
) -> ServerResponse {
    let start = Instant::now();
    let ret = next.run(cx, req).await.into_response();
    let status = ret.status();
    let cost = Instant::now().duration_since(start);
    tracing::info!("`{peer}` request `{uri}`, response {status}, cost {cost:?}");
    ret
}

#[volo::main]
async fn main() {
    let app = Router::new()
        .route("/", get(index_handler))
        .layer(middleware::from_fn(trace_request));

    let addr = "[::]:8080".parse::<SocketAddr>().unwrap();
    let addr = Address::from(addr);

    Server::new(app).run(addr).await.unwrap();
}

```

Or you can return early for a specific request, e.g. if we implement a ~~deficient~~ middleware that has a 50% chance of rejecting the current request.

```rust
// You should add `rand = "0.8"` in `Cargo.toml` for using `rand::random`

pub async fn random_reject(
    cx: &mut ServerContext,
    req: ServerRequest,
    next: Next,
) -> ServerResponse {
    if rand::random() {
        return StatusCode::FORBIDDEN.into_response();
    }
    next.run(cx, req).await.into_response()
}
```

This form can be used in scenarios such as authentication, if the request is not allowed to be accessed by the service,
you can directly return a specific Response, without the need to execute the subsequent Service.

### `map_response`

`map_response` works on Response, receives Response and returns the processed Response.

This way you can do some general logic with the Response, such as appending cross-domain headers or setting cookies.

Since we implement the `IntoResponse` trait for the following types.
- `((HeaderName, HeaderValue), Response)`
- `([(HeaderName, HeaderValue); N], Response`)

We can be easily accomplished in `map_response` to appending headers to a Response, etc. with the following code:

```rust
use std::net::SocketAddr;
use volo::net::Address;
use volo_http::{
    response::ServerResponse,
    server::{middleware, IntoResponse, Router},
    Server,
};

pub async fn append_header(resp: ServerResponse) -> impl IntoResponse {
    (("Header", "Value"), resp)
}

pub async fn append_headers(resp: ServerResponse) -> impl IntoResponse {
    (
        [
            ("Header1", "Value1"),
            ("Header2", "Value2"),
            ("Header3", "Value3"),
        ],
        resp,
    )
}

#[volo::main]
async fn main() {
    let app = Router::new()
        /* ...... */
        .layer(middleware::map_response(append_header))
        .layer(middleware::map_response(append_headers));

    let addr = "[::]:8080".parse::<SocketAddr>().unwrap();
    let addr = Address::from(addr);

    Server::new(app).run(addr).await.unwrap();
}
```

We can notice that the return value type of `append_header(s)` is `impl IntoResponse`.
but actually, the return value types for each of these two functions are:
- `((&'static str, &'static str), ServerResponse)`
- `([(&'static str, &'static str); 3], ServerResponse)`

But these two types are more troublesome to write, so you can directly use the `impl IntoResponse` way to achieve,
as long as the return value type to ensure that the implementation of the `IntoResponse` that can be

Note that even if the return value type is `impl IntoResponse`, you still need to make sure that the return value in the function is of the same type.
Because using this approach also requires a type-specific return value, we just leave it up to the compiler to derive it.
