---
title: "Request"
date: 2024-09-02
weight: 3
keywords:
  [
    "Route",
    "Request",
    "Parameter",
    "WebSocket"
  ]
description: "Volo-HTTP Request parameters extraction"
---

## Extraction of Routing Parameters

Volo-HTTP's handler can take multiple extractors as arguments, e.g.,

```rust
use volo_http::Address;

async fn who_am_i(peer: Address) -> String {
    format!("You are `{peer}`")
}

async fn post_something(data: String) -> string {
    format!("data: `{data}`")
}
```

In addition to this, handlers can take deserializable objects such as `json`, `form`, `query`, etc. as arguments.

The Rust pattern matching feature is used here to receive parameters: `json`, `form`, `query`, and so on.

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

## What is `extractor`?

The types that can be used as handler arguments implement `FromContext` or `FromRequest`, which are often referred to as `extractor`.

Where `FromContext` doesn't consume the body of the request, i.e. the data passed in by methods such as POST,

Whereas `FromRequest` consumes the body of the request, so the handler can only have at most one parameter of a type that implements `FromRequest`.

## Types that Implement `extractor` By Default

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

## Implementing Extractors for Your Own Types

We can receive our own types directly as arguments to a handler, which requires implementing `FromContext` or `FromRequest` for our own types.

For example, we might get the LogID from the header of a request, in which case we can define a type and implement `FromContext` for it:

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

Once you have implemented the LogID type, you can use it as an extractor and receive it directly using a handler:

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

One thing to note is that when implementing a handler, the types `Uri`, `Method`, `Address`, etc. are extracted via `FromContext`.
Types such as Body are not consumed, and can be listed in any of the handler's parameters.
However, since Body can only be consumed once, types such as `String`, `Bytes`, `From`, `Json`, etc. extracted by `FromRequest`
**So it can only be placed in the last parameter of the handler**.
