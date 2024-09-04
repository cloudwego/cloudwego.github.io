---
title: Static-FS
date: 2024-09-02
weight: 5
keywords:
  [
    "File Transfer"
  ]
description: “Volo-HTTP Static-FS”
---

Volo-HTTP provides the `ServeDir` function for registering static files.

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

where the `ServeDir::new` parameter specifies the path to be transmitted

`”.” ` means transferring all files in the current command execution path.