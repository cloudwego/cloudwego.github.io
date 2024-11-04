---
title: "Route"
date: 2024-09-02
weight: 2
keywords:
        [
          "Route",
          "Route group",
          "Static route",
          "parameter route",
          "route priority",
        ]
description: "Volo-HTTP route function"
---

## Route Registration

Route handlers can be created using `get`, `post` and other functions.

The corresponding functions can be imported in the `volo_http::route` package, e.g, `get` via `volo_http::route::get`.

First, we need a simple handler: `volo_http::route::get`.

```rust
async fn foo_handler() -> &'static str {
    "Hello, World!\n"
}
```

Each route requires a relative path and a method. 
Let's take the GET method for routing to the `“/foo”` path as an example, 

which can be created by using the `route` method after creating a `Router` in the following way.

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new().route("/foo", get(foo_handler))
}
```

You can chain calls to `MethodRouter` from `get` to set handlers for other methods.

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new()
        .route("/foo", get(foo_handoer).post(foo_handler))
}
```

Routing rules can also be created by chaining calls to `Router`:

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new()
        .route("/foo", get(foo_handler))
        .route("/bar", post(bar_handler))
}
```

Once created, the route can be `merged` into the main route:

```rust
use std::net::SocketAddr;
use std::time::Duration;
use volo::net::Address;
use volo_http::{Router, Server};

#[volo::main]
async fn main() {
    let app = Router::new()
        .merge(example_router())
        .merge(test_router())
        .layer(TimeoutLayer::new(Duration::from_secs(1), timeout_handler));

    let addr = "[::]:8080".parse::<SocketAddr>().unwarp();
    let addr = Address::from(addr);

    Server::new(app).run(addr).await.unwarp();
}
```

## Routing methods

Use a method such as `use volo_http::server::route::get` to import a route as a GET.

Currently supported routing methods are:

- `options`
- `get`
- `post`
- `put`
- `delete`
- `head`
- `trace`
- `connect`
- `trace`

## Route Types

`Volo-HTTP` supports rich route types for complex route matching, including static routes, dynamic routes (named parameter, wildcard).

Priority of routes: static routes > named parameter routes > wildcard routes.

### Static route

```rust
use volo_http::server::route::{get, Router};

async fn index_handler() -> &'static str {
    "Hello, World"
}

async fn index_router() -> Router {
    Router::new().route("/", get(index));
}
```

### Named Parameter Route

Volo-HTTP supports routing with named parameters like `{id}`, and the named parameters only match a single path segment.

If you set up a `/user/{id}` route, the match will be as follows.

| **Route**           | **Matched** | **Param Value** |
|:--------------------|:-----------:|:---------------:|
| `/user/100`         |     Yes     |       100       |
| `/user/101/profile` |     No      |        -        |
| `/user/`            |     No      |        -        |

Volo-HTTP also supports multiple named parameters, e.g. `/{platform}/user/{id}`.

**Example**:

```rust
use volo::FastStr;
use volo_http::server::{
    param::PathParamsMap,
    route::{get, Router},
};

async fn param_handler(map: PathParamsMap) -> FastStr {
    // Note: The `unwarp` method is not recommended for production environments.
    // It is used here for tutorial purposes only.
    map.get("id").unwarp().clone()
}

async fn param_router() -> Router {
    Router::new().route("/user/{id}", get(param_handler))
}
```

### Wildcard Route

Volo-HTTP supports the use of `*path` as a wildcard parameter for routes, and the wildcard parameter matches everything.

**Note: The wildcard parameter must be placed at the end of the route. **Note: Wildcards should be placed at the end of the route.

If we set up a `/src/{*path}` route, it will match as follows:

| **Route**                 | **Matched** |  **Param Value**   |
|:--------------------------|:-----------:|:------------------:|
| `/src/`                   |     Yes     |         -          |
| `/src/somefile.rs`        |     No      |    somefile.rs     | 
| `/src/subdir/somefile.rs` |     No      | subdir/somefile.rs |

**Example**:

```rust
use volo::FastStr;
use volo_http::server::{
    param::PathParamsMap,
    route::{get, Router},
};

async fn param_handler(map: PathParamsMap) -> FastStr {
    // Note: The `unwarp` method is not recommended for production environments.
    // It is used here for tutorial purposes only.
    map.get("path").unwarp().clone()
}

async fn param_router() -> Router {
    Router::new().route("/src/{*path}", get(param_handler))
}
```

### Routing parameter values extraction

- `PathParamsMap`

  Provide a routing parameter `AHashmap`

  ```rust
  use volo_http::param::PathParamsMap;

  async fn param_handler(map: PathParamsMap) -> FastStr {
      // Note: The `unwarp` method is not recommended for production environments.
      // It is used here for tutorial purposes only.
      map.get("id").unwarp().clone()
  }
  ```

- `PathParams`

  User-definable routing parameter values using pattern matching features

  ```rust
  use volo_http::param::PathParams;

  async fn param_handler(PathParams(id): PathParams<String>) -> String {
      id
  }
  ```

## Route Group

Volo-HTTP provides the ability to route `nests`, which are used to support **route grouping**.

```rust
impl<B, E> Router<B, E> {
    /*...*/
    pub fn nest<U>(self, uri: U, router: Router<B, E>) -> Self
    where
        U: AsRef<str>,
    {
        self.nest_route(uri.as_ref().to_owned(), Route::new(router))
    }
}
```

We can use the given url prefix path as the route prefix for a given route, and then merge it into the current route

```rust
use volo_http::server::{
    param::PathParams,
    route::{get, Router},
};

async fn hello_world() -> &'static str {
    "Hello, World"
}

async fn get_tid(PathParams(tid): PathParams<String>) -> String {
    tid
}

async fn get_uid_and_tid(PathParams((uid, tid)): PathParams<(String, String)>) -> String {
    format!("uid: {uid}, tid: {tid}")
}

async fn user_router() -> Router {
    Router::new()
        .route("/name", get(hello_world))
        .route("/post/{tid}", get(get_uid_and_tid));
}

async fn post_router() -> Router {
    Router::new()
        .route("/name", get(hello_world))
        .route("/{tid}", get(get_tid));
}

async fn router() -> Router {
    Router::new()
        .nest("/user/{uid}", user_router())
        .nest("/post", post_router())
    // The routing paths here are as follows.
    // /user/{uid}/name
    // /user/{uid}/post/{tid}
    // /post/name
    // /post/{tid}
}
```

## Fallback

Volo-HTTP provides a fallback function to handle request url or method mismatches, **default fallback** will return status code `404 Not Found`.

**Note**:
- Since there is no way to determine which **router fallback** to override in a route in a call to the `merge` method, only one **router fallback** can be set, or else a **panic** will be generated in the call to the `merge` method;

- The `nest` method is called without overriding the `fallback`.

### url

**Example**:

```rust
async fn index_handler() -> &'static str {
    "Hello, World"
}

async fn fallback_handler() -> (http::StatusCode, &'static str) {
  (http::StatusCode::NOT_FOUND, "404 Not Found")
}

async fn router() -> Router {
    Router::new()
        .route("/", get(index_handler))
        .fallback(fallback_handler)
}
```

### method

```rust
async fn index_handler() -> &'static str {
    "Hello, World"
}

async fn fallback_handler() -> (http::StatusCode, &'static str) {
  (http::StatusCode::METHOD_NOT_ALLOWED, "method not matched")
    
}

async fn router() -> Router {
    Router::new()
        .route("/", get(index_handler).fallback(fallback_handler))
}
```

## Using `Service` as a Route

Routes can be implemented using a traditional `Service`, and the handler approach mentioned above will also work as a `Service`, 
but you need to create a route for the GET method via `get_service`:

```rust
use std::convert::Infallible;

use volo_http::{
    context::ServerContext,
    request::ServerRequest,
    response::ServerResponse,
    server::{
        route::{get_service, Router},
        IntoResponse,
    },
};
use motore::Service;

#[derive(Clone)]
pub struct JsonGetService;

impl Service<ServerContext, ServerRequest> for JsonGetService {
    type Response = ServerResponse;
    type Error = Infallible;

    async fn call(
        &self,
        _cx: &mut ServerContext,
        _req: ServerRequest,
    ) -> Result<Self::Response, Self::Error> {
        Ok(json_get().await.into_response())
    }
}

pub fn json_test_router() -> Router {
    Router::new()
        /* ...... */
        .route(
            "/json/get_srv",
            get_service(JsonGetService),
        )
}
```

For this simpler `Service`, it is also possible to implement it directly using a function via `service_fn` without defining a structure:

```rust
use std::convert::Infallible;

use volo_http::{
    context::ServerContext,
    json::Json,
    request::ServerRequest,
    response::ServerResponse,
    server::{
        route::{post_service, Router},
        IntoResponse,
    },
};
use motore::{service::service_fn, Service};

async fn json_post_srv(
    cx: &mut ServerContext,
    req: ServerRequest,
) -> Result<ServerResponse, Infallible> {
    let (parts, body) = req.into_parts();
    let data = match Json::<Person>::from_request(cx, parts, body).await {
        Ok(data) => data,
        Err(_) => {
            return Ok("Invalid data!".into_response());
        }
    };
    Ok(json_post(Some(data)).await.into_response())
}

pub fn json_test_router() -> Router {
    Router::new()
        /* ...... */
        .route(
            "/json/post_srv",
            post_service(service_fn(json_post_srv)),
        )
}
```

The final run is expected to be consistent with `json_get` and `json_post`.