---
title: "Static-FS"
date: 2024-09-02
weight: 5
keywords:
  [
    "文件传输"
  ]
description: "Volo-HTTP Static-FS"
---

Volo-HTTP 提供了 `ServeDir` 函数用于注册静态文件

```rust
use volo_http::server::{
    route::{get, Router},
    utils::ServeDir,
};

async fn file_router() -> Router {
    Router::new()
        .route("/", get(|| async {"Hello, World!"}))
        .nest_service("/static/", ServeDir::new("."))
}
```

其中 `ServeDir::new` 的参数可指定路径进行传输

`"."` 表示传输当前命令执行路径的所有文件
