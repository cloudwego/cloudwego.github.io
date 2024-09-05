---
title: "Response"
date: 2024-09-02
weight: 4
keywords:
  [
    "Response",
  ]
description: "Volo-HTTP Response"
---

## Routing Responses

The `Volo-HTTP` handler can also return any `impl IntoResponse` type, for example:

```rust
use volo_http::{
    http::StatusCode
};

// 默认返回 `StatusCode::OK`
async fn ping() {}

// ref: [RFC2324](https://datatracker.ietf.org/doc/html/rfc2324)
async fn who_are_you() -> StatusCode {
    StatusCode::IM_A_TEAPOT
}
```

## Handler Response Tips

handler In addition to customizable parameters, the return value type can also be customized, such as:

```rust
async fn ping() {}
async fn hello_world() -> &'static str { "Hello, World" }
async fn teapot() -> StatusCode { StatusCode::IM_A_TEAPOT }
```

All three of these functions are legitimate handlers, since all of these return value types implement the `IntoResponse` trait.

In the framework, types such as `Form`, `Json`, etc. also implement `IntoResponse` by default and can add a Content-Type to the response.

### Use Json for Response

```rust
use volo_http::{
    json::Json,
    server::{
        route::{get, post, Router},
        IntoResponse,
    },
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Person {
    name: String,
    age: u8,
    phones: Vec<String>,
}

// test with:
//     curl http://localhost:8080/json/get
async fn json_get() -> Json<Person> {
    Json(Person {
        name: "Foo".to_string(),
        age: 25,
        phones: vec!["Bar".to_string(), "114514".to_string()],
    })
}

// test with:
//     curl http://localhost:8080/json/post \
//         -X POST \
//         -H "Content-Type: application/json" \
//         -d '{"name":"Foo", "age": 25, "phones":["Bar", "114514"]}'
async fn json_post(Json(request): Json<Person>) -> String {
    let first_phone = request
        .phones
        .first()
        .map(|p| p.as_str())
        .unwrap_or("no number");
    format!(
        "{} is {} years old, {}'s first phone number is `{}`\n",
        request.name, request.age, request.name, first_phone
    )
}

pub fn json_test_router() -> Router {
    Router::new()
        .route("/json/get", get(json_get))
        .route("/json/post", post(json_post))
}
```

### Compound Response Types

The `IntoResponse` trait not only supports String, Json, etc., but there are other ways to use it, such as:

```rust
async fn return_result() -> Result<&'static str, StatusCode> {
    if rand::random() {
        Ok("It Works!\n")
    } else {
        Err(StatusCode::IM_A_TEAPOT)
    }
}

async fn return_with_status_code() -> (StatusCode, String) {
    (StatusCode::NOT_FOUND, "Not Found!\n".to_owned())
}

pub fn response_router() -> Router {
    Router::new()
        .route("/response/result", get(return_result))
        .route("/response/status", get(return_with_status_code))
}
```

Using `Result<&'static str, StatusCode>` as the return value type.  
You can use the contents of str as the `Response` when returning Ok, `StatusCode` when returning Err, and return the status code of the `Response`.
When returning Err, use `StatusCode` as the status code for `Response` and return an empty implementation.

With `(StatusCode, String)` you can use the `String` as the Body of the `Response` and set the status code of the `Response` to the value of `StatusCode`.

## Implementing IntoResponse for Your Own Types

For custom types, you can implement `IntoResponse` as the return value of the handler, here is an example.

In business logic, we often define our own internal error types or error codes.
Since the framework implements `IntoResponse` for `Result<T, E>`, we can implement `IntoResponse` for errors.
We can easily write handlers by implementing `IntoResponse` for errors:

```rust
use volo_http::{
    server::{IntoResponse},
    http::{StatusCode},
    response::ServerResponse,
    PathParams,
};

#[derive(PartialEq, Eq)]
pub struct ErrorCode(usize);

impl ErrorCode {
    pub const INVALID_USER_ID: Self = Self(1);
    pub const INVALID_VIDEO_ID: Self = Self(2);
}

impl IntoResponse for ErrorCode {
    fn into_response(self) -> ServerResponse {
        match self {
            Self::INVALID_USER_ID => "Invalid User ID".into_response(),
            Self::INVALID_VIDEO_ID => StatusCode::BAD_REQUEST.into_response(),
            Self(code) => format!("Unknown error code {code}").into_response()
        }
    }
}

async fn handler(
    PathParams((uid, vid)): PathParams<(String, String)>,
) -> Result<String, ErrorCode>
{
    if uid == "admin" {
        return Err(ErrorCode::INVALID_USER_ID);
    }
    if vid == "-1" {
        return Err(ErrorCode::INVALID_VIDEO_ID);
    }
    Ok(format!("uid: {uid}, vid: {vid}"))
}
```

The response format of the above code is very irregular, **Functional demonstration use only**, in the actual business, please use a unified response format according to the needs of the
