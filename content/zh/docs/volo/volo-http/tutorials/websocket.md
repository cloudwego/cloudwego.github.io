---
title: "WebSocket"
date: 2024-09-02
weight: 6
keywords:
  [
    "WebSocket",
  ]
description: "Volo-HTTP WebSocket"
---

Volo-HTTP 支持 WebSocket 协议

## 编写 handler

由于 Volo-HTTP 内置的 `WebSocket` 类型实现了 `FromContext`, 所以我们可以直接在 handler 里面添加 WebSocket extractor

下面是一个简单的 WebSocket handler 示例，它会回显收到的文本消息：

```rust
use volo_http::{
    response::ServerResponse,
    server::{
        route::get,
        utils::{Message, WebSocket, WebSocketUpgrade},
    },
    Router,
};

async fn handle_socket(mut socket: WebSocket) {
    while let Some(Ok(msg)) = socket.next().await {
        match msg {
            Message::Text(_) => {
                socket.send(msg).await.unwrap();
            }
            _ => {}
        }
    }
}

async fn ws_handler(ws: WebSocketUpgrade) -> ServerResponse {
    ws.on_upgrade(handle_socket)
}

async fn ws_router() -> Router {
    Router::new().route("/ws", get(ws_handler));
}
```

## WebSocket 设置

可以通过 `Config` 结构体来配置 WebSocket 的选项，例如传输配置和协议支持。

### 传输设置

具体配置请参考 `tokio_tungstenite::tungstenite::protocol::WebSocketConfig`

```rust
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig as WebSocketTransConfig;
use volo_http::server::utils::WebSocketConfig;

let config = WebSocketConfig::new().set_transport(WebSocketTransConfig {
    write_buffer_size: 128 * 1024, 
    ..<_>::default()
});
```

### 设置支持的协议

```rust
use volo_http::server::utils::WebSocketConfig; 

let config = WebSocketConfig::new().set_protocols(["graphql-ws", "graphql-transport-ws"]);
```

## 错误处理

在处理 WebSocket 连接时，可能会遇到各种错误，例如连接升级失败。可以通过**提供自定义的错误处理回调**来处理这些错误。

```rust
use std::collections::HashMap;

use volo_http::{
    response::ServerResponse,
    server::utils::{WebSocket, WebSocketConfig, WebSocketUpgrade},
};

async fn ws_handler(ws: WebSocketUpgrade) -> ServerResponse {
    ws.on_failed_upgrade(|error| unimplemented!())
        .on_upgrade(|socket| async {}) 
}
```