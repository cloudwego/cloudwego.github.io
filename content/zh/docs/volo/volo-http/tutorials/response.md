---
title: "路由响应"
date: 2024-09-02
weight: 4
keywords:
  [
    "路由",
    "响应",
  ]
description: "Volo-HTTP 路由响应"
---

## 路由响应

`Volo-HTTP` 的 handler 也可以返回任意 `impl IntoResponse` 的类型, 例如:

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

## handler response 使用技巧

handler 除了传入的参数可以自定义以外, 返回值类型也是可以自定义的, 如:

```rust
async fn ping() {}
async fn hello_world() -> &'static str { "Hello, World" }
async fn teapot() -> StatusCode { StatusCode::IM_A_TEAPOT }
```

以上三个函数都是合法的 handler，因为这些返回值类型都实现了 `IntoResponse` 这一 trait。

在框架中，`Form`, `Json` 等类型也默认实现了 `IntoResponse`，并且可以在响应时添加 Content-Type。

### 使用 Json 作为应答

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

### 复合 Response 类型

`IntoResponse` 这一 trait 不仅支持 String, Json 等类型，还有一些其他的方式可以使用, 如:

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

使用 `Result<&'static str, StatusCode>` 作为返回值类型，  
可以在返回 Ok 时使用 str 的内容作为 `Response`，
在返回 Err 时使用 `StatusCode` 作为 `Response` 的状态码，并返回一个空的实现。

而使用 `(StatusCode, String)` 可以将该 `String` 作为 `Response` 的 Body，并将 `Response` 的状态码设为 `StatusCode` 的值。

## 为自己的类型实现 IntoResponse

对于自定义的类型，可以通过实现 `IntoResponse` 的方式作为 handler 的返回值，下面给一个例子。

在业务逻辑中，我们经常会定义一些自己内部的错误类型或者错误码，
由于框架对 `Result<T, E>` 也实现了 `IntoResponse`，
所以我们可以通过对错误实现 `IntoResponse` 的方式方便地编写 handler:

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

以上代码的响应格式非常不规范，**仅供功能展示使用**，在实际的业务中请根据需求使用统一的响应格式
