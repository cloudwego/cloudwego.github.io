---
title: "Part 3. 编写 Client 端"
linkTitle: "编写 Client 端"
weight: 3
description: >

---

上一节中，我们编写完成了 server 端，现在让我们来编写我们的 client 端并调用我们的 server 端。

首先，创建一个文件 `src/bin/client.rs`，输入以下内容：

```rust
use lazy_static::lazy_static;
use std::net::SocketAddr;

lazy_static! {
    static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
        let addr: SocketAddr = "[::1]:8080".parse().unwrap();
        volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
            .address(addr)
            .build()
    };
}

#[volo::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let req = volo_gen::volo::example::GetItemRequest { id: 1024 };
    let resp = CLIENT.get_item(req).await;
    match resp {
        Ok(info) => tracing::info!("{:?}", info),
        Err(e) => tracing::error!("{:?}", e),
    }
}
```

然后，在 `Cargo.toml` 文件中加入所需的依赖，加入后的文件如下：

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
prost = "0.11"
tracing-subscriber = "0.3"

pilota = "*"
volo =  "*"        # we recommend to use the latest framework version for new features and bug fixes
volo-grpc =  "*"  # we recommend to use the latest framework version for new features and bug fixes

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

接着，**新建一个 terminal**，执行以下命令，把我们的 server 端跑起来：

```bash
$ cargo run --bin server
```

最后，我们再回到当前目录，执行以下命令，即可看到执行成功：

```bash
$ cargo run --bin client
```

大功告成！
