---
title: "中间件"
date: 2024-09-02
weight: 5
keywords:
  [
    "中间件",
  ]
description: "Volo-HTTP 中间件"
---

## 使用中间件

在 Volo-HTTP 中, 中间件一般是作为 `Layer` 实现的, Volo-HTTP 中也有一些内置的中间件,

比如我们使用内置的 `TimeoutLayer`: 

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

## 编写一个中间件

在 Volo-HTTP 中, 也提供了一些便于实现中间件的功能, 如 `from_fn` 和 `map_response`。

两者都可以接收一个函数来作为中间件，不过区别是，
- `from_fn` 接收 Request 并返回 Response, 在其函数中可以调用内层服务, 也可以直接返回 Response
- `map_response` 作用于 Response, 接收 Response 并返回处理过的 Response

### `from_fn`

`from_fn` 使用的函数可以通过 extractor 提取特定类型的参数,

但最后一定要附加 `cx`, `req` 和 `next` 这三个参数，并通过 `next.run(cx, req).await` 来调用内层的服务。

这里我们以 `from_fn` 为例，实现一个用于记录单个请求耗时的中间件:

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

或者也可以对特定请求提前返回, 比如我们实现一个~~缺德~~的中间件，有 50% 的几率会拒绝当前的请求:

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

这种形式可以用于鉴权等场景, 如果请求不允许被访问该服务, 可以直接返回一个特定的 Response, 而无需执行后续的 Service。

### `map_response`

`map_response` 作用于 Response, 接收 Response 并返回处理过的 Response

这种方式可以对 Response 进行一些通用逻辑的处理，比如追加跨域相关的 headers 或者设置 Cookies 等

由于我们为以下类型实现了 `IntoResponse` 这个 trait:
- `((HeaderName, HeaderValue), Response)`
- `([(HeaderName, HeaderValue); N], Response`)

可以在 `map_response` 中借助以下形式方便地实现为 Response 追加 headers 等功能:

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

注意到 `append_header(s)` 的返回值类型是 `impl IntoResponse`
其实这两个函数的返回值类型分别是：
- `((&'static str, &'static str), ServerResponse)`
- `([(&'static str, &'static str); 3], ServerResponse)`

但是这两个类型写起来比较麻烦, 所以可以直接使用 `impl IntoResponse` 的方式实现, 只要保证返回值类型实现了 `IntoResponse` 即可

需要注意的是，即使返回值类型直接写了 `impl IntoResponse`, 但也需要保证函数中的返回值是同一个类型, 
因为使用这种方式也需要一个特定类型的返回值, 只是我们将这个工作交给编译器来推导了。
