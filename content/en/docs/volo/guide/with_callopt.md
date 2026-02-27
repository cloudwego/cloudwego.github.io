---
title: "Specifying CallOpt During Invocation"
linkTitle: "Specifying CallOpt During Invocation"
weight: 1
description: >
---

To enhance the framework's flexibility and user-friendliness, Volo allows users on the client-side to use `CallOpt` to set certain request metadata for individual requests.

Taking Volo-Thrift as an example, the definition of `CallOpt` is as follows:

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

The `callee_tags `refer to some metadata of the remote endpoint, while `caller_tags` represent local metadata. These two TypeMaps are primarily intended for middleware extensions like service discovery, load balancing and routing.

The `address` denotes the downstream address. If set, in principle, it eliminates the need to go through service discovery and load balancing components.

Within the `config`, various request configurations can be set, such as RPC timeout duration.

We can specify `CallOpt` during a request using the following method:

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
