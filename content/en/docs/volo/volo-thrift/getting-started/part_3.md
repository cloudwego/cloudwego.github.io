---
title: "Part 3. Create a Client"
linkTitle: "Create a Client"
weight: 3
description: >

---

In the previous section, we wrote a server, now let's write a client and call the server.

First, create a file called `src/bin/client.rs` and type the following:

```rust
use lazy_static::lazy_static;
use std::net::SocketAddr;

lazy_static! {
    static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
        let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
        volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
            .address(addr)
            .build()
    };
}

#[volo::main]
async fn main() {
    let req = volo_gen::volo::example::GetItemRequest { id: 1024 };
    let resp = CLIENT.clone().get_item(req).await;
    match resp {
        Ok(info) => tracing::info!("{:?}", info),
        Err(e) => tracing::error!("{:?}", e),
    }
}
```

Then add the required dependencies to the `Cargo.toml` file, which looks like this:

```toml
[package]
name = "volo-example"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
anyhow = "1"
async-trait = "0.1"
lazy_static = "1"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"

pilota = "*"
volo =  "*"        # we recommend to use the latest framework version for new features and bug fixes
volo-thrift =  "*"  # we recommend to use the latest framework version for new features and bug fixes

volo-gen = { path = "./volo-gen" }

[profile.release]
opt-level = 3
debug = true
debug-assertions = false
overflow-checks = false
lto = true
panic = 'unwind'
incremental = false
codegen-units = 1
rpath = false

[workspace]
members = ["volo-gen"]
resolver = "2"
```

Then, **create a new terminal** and run the following command to start our server:

```bash
$ cargo run --bin server
```

Finally, we go back to the current directory and execute the following command, and we can see that the execution is successful
(at this time, there is no log output, because no subscriber is set for the tracing, you can choose the corresponding library by yourself) :

```bash
$ cargo run --bin client
```
