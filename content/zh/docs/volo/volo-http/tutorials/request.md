---
title: "路由请求"
date: 2024-09-02
weight: 3
keywords:
  [
    "路由",
    "路由请求",
    "参数",
    "WebSocket"
  ]
description: "Volo-HTTP 路由请求参数提取"
---

## 路由参数的提取

Volo-HTTP 的 handler 可以接受多个 extractor 作为参数, 例如:

```rust
use volo_http::Address;

async fn who_am_i(peer: Address) -> String {
    format!("You are `{peer}`")
}

async fn post_something(data: String) -> string {
    format!("data: `{data}`")
}
```

除此之外，handler 可以使用 `json`, `form`, `query` 等可以被反序列化的对象作为参数

这里使用了 Rust 模式匹配的特性来接收参数:

```rust
use volo_http::{
    http::StatusCode,
    server::{
        extract::{Form, Query},
        route::{get, Router},
    },
};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Login {
    username: String,
    password: String,
}

fn process_login(info: Login) -> Result<String, StatusCode> {
    if info.username == "admin" && info.password == "password" {
        Ok("Login Success!".to_string())
    } else {
        Err(StatusCode::IM_A_TEAPOT)
    }
}

// test with:
//     curl "http://localhost:8080/user/login?username=admin&password=admin"
//     curl "http://localhost:8080/user/login?username=admin&password=password"
async fn get_with_query(Query(info): Query<Login>) -> Result<String, StatusCode> {
    process_login(info)
}

// test with:
//     curl http://localhost:8080/user/login -X POST -d 'username=admin&password=admin'
//     curl http://localhost:8080/user/login -X POST -d 'username=admin&password=password'
async fn post_with_form(Form(info): Form<Login>) -> Result<String, StatusCode> {
    process_login(info)
}

pub fn user_login_router() -> Router {
    Router::new().route("/user/login", get(get_with_query).post(post_with_form))
}
```

## 什么是 `extractor`?

可以作为 handler 参数的类型都实现了 `FromContext` 或 `FromRequest`, 这种类型我们通常称为 `extractor`。

其中，`FromContext` 不会消费请求的 body，即 POST 等方法传入的数据，

而 `FromRequest` 会消费请求的 body，所以 handler 的参数中最多只能有一个实现了 `FromRequest` 的类型。

## 默认实现了 `extractor` 的类型

**`FromContext`**
- `Address`
- `Uri`
- `Method`
- `Option<T>`
- `Result<T, T::Rejection>`
- `Query<T>`
- `WebSocketUpgrade`

**`FromRequest`**
- `Option<T>`
- `Result<T, T::Rejection>`
- `ServerRequest<B>`
- `Vec<u8>`
- `Bytes`
- `String`
- `FastStr`
- `MaybeInvalid<T>`
- `Form<T>`

## 为自己的类型实现 extractor

我们可以将自己的类型作为 handler 的参数直接接收，这需要为自己的类型实现 `FromContext` 或 `FromRequest`。

例如，我们可能会从请求的 header 中获取 LogID，这种情况下可以定义一个类型，然后为其实现 `FromContext`:

```rust
use std::convert::Infallible;

use volo_http::{
    context::ServerContext,
    http::request::Parts,
    server::extract::FromContext,
};

const LOGID_KEY: &str = "x-logid";

pub enum LogID {
    ID(String),
    None,
}

impl FromContext for LogID {
    type Rejection = Infallible;

    async fn from_context(
        _: &mut ServerContext,
        parts: &mut Parts,
    ) -> Result<Self, Self::Rejection> {
        let id = match parts.headers.get(LOGID_KEY) {
            Some(log_id) => LogID::ID(log_id.to_str().unwrap().to_owned()),
            None => LogID::None,
        };

        Ok(id)
    }
}
```

实现了 LogID 这个类型后，就可以将其作为 extractor，直接使用 handler 接收了:

```rust
async fn show_logid(id: LogID) -> String {
    match id {
        LogID::ID(s) => format!("{s}"),
        LogID::None => "LogID not found".to_owned(),
    }
}

pub fn logid_router() -> Router {
    Router::new().route("/extract/logid", get(print_logid))
}
```

需要注意的一点是，在实现一个 handler 时，对于 `Uri`, `Method`, `Address` 等这一类通过 `FromContext` 提取，
不会消费 Body 等类型可以在 handler 的参数中任意排列，
但由于 Body 只能被消费一次，所以通过 `FromRequest` 提取的如 `String`, `Bytes`, `From`, `Json` 等类型，
**只能放在 handler 最后一个参数的位置**。
