---
title: "路由"
date: 2024-09-02
weight: 2
keywords:
  [
    "路由",
    "路由组",
    "静态路由",
    "参数路由",
    "路由优先级",
  ]
description: "Volo-HTTP 提供的路由功能"
---

## 路由注册

路由的 handler 可以使用 `get`, `post` 等函数创建。

在 `volo_http::route` 包中可导入对应函数， 如 `get` 则通过 `volo_http::route::get` 导入

首先, 我们需要一个简单的 handler:

```rust
async fn foo_handler() -> &'static str {
    "Hello, World!\n"
}
```

每条路由都需要对应一个相对路径 (path) 和一个方法 (method) 。这里我们以路由到 `"/foo"` 路径的 GET 方法为例,

可以通过以下的方式，在创建一个 `Router` 后使用 `route` 方法创建:

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new().route("/foo", get(foo_handler))
}
```

可以对 `get` 得到的 `MethodRouter` 进行链式调用，为其设置其他 method 的 handler:

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new()
        .route("/foo", get(foo_handoer).post(foo_handler))
}
```

也可以通过对 `Router` 的链式调用来创建更多的路由规则:

```rust
use volo_http::server::route::{get, Router};

pub fn test_router() -> Router {
    Router::new()
        .route("/foo", get(foo_handler))
        .route("/bar", post(bar_handler))
}
```

创建完成后, 可以将该路由 `merge` 到主路由中:

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

## 路由方法

使用如 `use volo_http::server::route::get` 导入路由为 GET 的方法

目前支持的路由方法有:

- `options`
- `get`
- `post`
- `put`
- `delete`
- `head`
- `trace`
- `connect`
- `trace`

## 路由类型

`Volo-HTTP` 支持丰富的路由类型用于实现复杂的路由匹配功能，包括静态路由、动态路由 (命名参数、通配参数) 。

路由的优先级: 静态路由 > 命名参数路由 > 通配参数路由

### 静态路由

```rust
use volo_http::server::route::{get, Router};

async fn index_handler() -> &'static str {
    "Hello, World"
}

async fn index_router() -> Router {
    Router::new().route("/", get(index));
}
```

### 命名参数路由

Volo-HTTP 支持使用 `{id}` 这样的命名参数设置路由, 并且命名参数只匹配单个路径段

如果设置 `/user/{id}` 路由，则匹配情况如下:

| **路径**              | **是否匹配** | **参数值** |
|:--------------------|:--------:|:-------:|
| `/user/100`         |    匹配    |   100   |
| `/user/101/profile` |   不匹配    |    -    |
| `/user/`            |   不匹配    |    -    |

当然 Volo-HTTP 也是支持多个命名参数的，如 `/{platform}/user/{id}`

**代码示例**:

```rust
use volo::FastStr;
use volo_http::server::{
    param::PathParamsMap,
    route::{get, Router},
};

async fn param_handler(map: PathParamsMap) -> FastStr {
    // 注意: 生产环境下不推荐使用 `unwarp` 方法, 这里仅供作为教程使用
    map.get("id").unwarp().clone()
}

async fn param_router() -> Router {
    Router::new().route("/user/{id}", get(param_handler))
}
```

### 通配参数路由

Volo-HTTP 支持使用 `*path` 这样的通配参数设置路由, 并且通配参数回匹配所有内容。

**注意: 通配参数需放在路由的末尾。**

如果我们设置 `/src/{*path}` 路由，匹配情况如下：

| **路径**                    | **是否匹配** |      **参数值**       |
|:--------------------------|:--------:|:------------------:|
| `/src/`                   |   不匹配    |         -          |
| `/src/somefile.rs`        |    匹配    |    somefile.rs     | 
| `/src/subdir/somefile.rs` |    匹配    | subdir/somefile.rs |

**代码示例**:

```rust
use volo::FastStr;
use volo_http::server::{
    param::PathParamsMap,
    route::{get, Router},
};

async fn param_handler(map: PathParamsMap) -> FastStr {
    // 注意: 生产环境下不推荐使用 `unwarp` 方法, 这里仅供作为教程使用
    map.get("path").unwarp().clone()
}

async fn param_router() -> Router {
    Router::new().route("/src/{*path}", get(param_handler))
}
```

### 路由参数取值

- `PathParamsMap`

  提供一个路由参数的 `AHashmap`

  ```rust
  use volo_http::param::PathParamsMap;

  async fn param_handler(map: PathParamsMap) -> FastStr {
      // 注意: 生产环境下不推荐使用 `unwarp` 方法, 这里仅供作为教程使用
      map.get("id").unwarp().clone()
  }
  ```

- `PathParams`
  
  用户可使用模式匹配特性自定义路由参数取值

  ```rust
  use volo_http::param::PathParams;

  async fn param_handler(PathParams(id): PathParams<String>) -> String {
      id
  }
  ```

## 路由组

Volo-HTTP 提供了路由 `nest` 的能力, 用于支持**路由分组**的功能。

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

我们可使用给定的 url 前缀路径来作为给定路由的路由前缀, 然后并合并到当前的路由中

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
    // 这里的路由路径如下:
    // /user/{uid}/name
    // /user/{uid}/post/{tid}
    // /post/name
    // /post/{tid}
}
```

## fallback

Volo-HTTP 提供了 fallback 功能用于处理请求 url 或 method 不匹配的情况，**默认 fallback** 会返回状态码 `404 Not Found`。

**注意**：
- 调用 `merge` 方法中的路由中由于不能确定覆盖哪一个 **router fallback**, 因此只能设置一个 **router fallback**，否则会在调用 `merge` 方法时产生 **panic**；

- 调用 `nest` 方法时不会对 `fallback` 进行覆盖。

### url

**代码示例**:

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

## 使用 `Service` 作为路由

路由可以使用传统的 `Service` 实现, 上文中提到的使用 handler 的方式也会转化为 `Service` 来运行,
但需要通过 `get_service` 来为 GET 方法创建路由:

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

对于这种比较简单的 `Service`，也可以不定义结构体，通过 `service_fn` 直接使用函数实现：

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

最终运行的效果预期与 `json_get` 和 `json_post` 一致