---
title: "在调用时指定 CallOpt"
linkTitle: "在调用时指定 CallOpt"
weight: 1
description: >
---

为了增加框架的灵活性和易用性，Volo 允许用户在 Client 端使用 `CallOpt` 针对单个请求设置一些请求的元信息。

以 Volo-Thrift 为例，`CallOpt` 定义如下：

```rust
pub struct CallOpt {
    /// Sets the callee tags for the call.
    pub callee_tags: TypeMap,
    /// Sets the address for the call.
    pub address: Option<Address>,
    pub config: Config,
    /// Sets the caller tags for the call.
    pub caller_tags: TypeMap,
}
```

其中 `callee_tags` 指代的是对端的一些元信息，`caller_tags` 指代的是本地的元信息，这两个 TypeMap 主要是给服务发现、负载均衡、路由等中间件扩展使用的。

`address` 代表下游的地址，如果设置了，原则上就不需要经过服务发现和负载均衡等组件了。

`config` 中可以设置一些请求的配置，比如 RPC 超时时间等。

我们可以通过下述方法来在请求时指定 `CallOpt`：

```rust
lazy_static! {
    static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
        let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
        volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example-item")
            .layer_outer(LogLayer)
            .address(addr)
            .build()
    };
}

#[volo::main]
async fn main() {
    let callopt = CallOpt::default();
    let req = volo_gen::volo::example::GetItemRequest { id: 1024 };
    let resp = CLIENT.clone().with_callopt(callopt).get_item(req).await;
    match resp {
        Ok(info) => tracing::info!("{:?}", info),
        Err(e) => tracing::error!("{:?}", e),
    }
}
```
