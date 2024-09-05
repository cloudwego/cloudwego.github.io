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

Volo-HTTP supports the WebSocket protocol

## Write handler

Since Volo-HTTP's built-in `WebSocket` type implements `FromContext`, we can add a WebSocket extractor directly to the handler.

The following is a simple example of a WebSocket handler that displays the received text message:

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

## WebSocket Settings

Options for WebSocket such as transport configuration and protocol support can be configured via the `Config` structure.

### Transport settings

See `tokio_tungstenite::tungstenite::protocol::WebSocketConfig` for details.

```rust
use tokio_tungstenite::tungstenite::protocol::WebSocketConfig as WebSocketTransConfig;
use volo_http::server::utils::WebSocketConfig;

let config = WebSocketConfig::new().set_transport(WebSocketTransConfig {
    write_buffer_size: 128 * 1024, 
    ..<_>::default()
});
```

### Set supported protocols

```rust
use volo_http::server::utils::WebSocketConfig; 

let config = WebSocketConfig::new().set_protocols(["graphql-ws", "graphql-transport-ws"]);
```

## Error Handling

When processing a WebSocket connection, various errors may be encountered, such as a connection upgrade failure. 
These errors can be handled by **providing custom error handling callbacks**.

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