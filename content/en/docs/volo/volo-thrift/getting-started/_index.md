---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 1
keywords: ["Volo", "Thrift", "Tutorial", "Install"]
description: "This document covers the preparation of the development environment, quick start and basic tutorials of Volo-Thrift."
---

## Part 1. Create a Thrift Server

Volo-Thrift is an RPC framework so that the bottom layer requires two major functions: Serialization and Transport.

IDL is short for `Interface Definition Language`.

### 1.1 Why IDL

If we want to do RPC, we need to know what interface is for the server, what parameters to pass, and what the return value is,
just like two people talking to each other, we need to make sure we are speaking the same language and doing the same thing.

At this time, we need to use IDL to specify the protocol for both sides, just like when writing code, we need to know the function signature while calling a function.

Thrift IDL is a full-stack RPC solution for cross-language. You can see the syntax of Thrift IDL in [thrift-missing-guide](https://diwakergupta.github.io/thrift-missing-guide/) or [Thrift interface description language](http://thrift.apache.org/docs/idl).

### 1.2 Write IDL

To create a Thrift project, we need to write a Thrift IDL first.

In your working directory, execute the following command:

```bash
mkdir volo-example && cd volo-example
```

```bash
mkdir idl && touch idl/volo_example.thrift
```

Subsequently, use your favorite text editor to enter the following content:

```thrift
namespace rs volo.example

struct Item {
    1: required i64 id,
    2: required string title,
    3: required string content,

    10: optional map<string, string> extra,
}

struct GetItemRequest {
    1: required i64 id,
}

struct GetItemResponse {
    1: required Item item,
}

service ItemService {
    GetItemResponse GetItem (1: GetItemRequest req),
}
```

After saving and exiting, we execute the following command:

```bash
volo init volo-example idl/volo_example.thrift
```

**Here we use the `init` command, followed by the name of our project, which means we need to generate template code. At the end, you need to specify an IDL used by the server.**

If you only need to add an IDL (such as the client IDL) without generating a template, do as follows:

```bash
volo idl add idl/volo_example.thrift
```

| What's more, the volo tool also supports downloading IDL from git and then generating code, such as:

```bash
volo idl add -g git@github.com:org/repo.git -r main /path/to/your/idl.thrift
```

| You may directly enter volo to see the detailed usage ~ next back to the topic ~

At this point, our entire directory structure looks like this:

```bash
.
├── Cargo.toml
├── idl
│   └── volo_example.thrift
├── rust-toolchain.toml
├── src
│   ├── bin
│   │   └── server.rs
│   └── lib.rs
└── volo-gen
    ├── Cargo.toml
    ├── build.rs
    ├── src
    │   └── lib.rs
    └── volo.yml
```

Then we open `src/lib.rs` and add the method implementation to the `impl` block. The resulting code should look like this:

```rust
pub struct S;

impl volo_gen::volo::example::ItemService for S {
    // This is the part of the code we need to add
    async fn get_item(
        &self,
        _req: volo_gen::volo::example::GetItemRequest,
    ) -> core::result::Result<volo_gen::volo::example::GetItemResponse, volo_thrift::AnyhowError>
    {
        Ok(Default::default())
    }
}
```

Then execute:

```bash
cargo update && cargo build
```

At this point, you will find `volo_gen.rs` file under [OUT_DIR Directory](https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts).

Then execute the following command to get our server running:

```bash
cargo run --bin server
```

At this point, we have our server running!

## Part 2. Create a Client

In the previous section, we wrote a server, now let's write a client and call the server.

First, create a file called `src/bin/client.rs` and type the following:

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
tracing-subscriber = "0.3"

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
cargo run --bin server
```

Finally, we go back to the current directory and execute the following command, and we can see that the execution is successful:

```bash
cargo run --bin client
```

## Part 3. Add a Middleware

Next, let's look at how to add middleware to Volo.

For example, if we need a middleware that prints out the received requests, the returned responses and the elapsed time, we could write a Service in `lib.rs`:

```rust
#[derive(Clone)]
pub struct LogService<S>(S);

#[volo::service]
impl<Cx, Req, S> volo::Service<Cx, Req> for LogService<S>
where
    Req: std::fmt::Debug + Send + 'static,
    S: Send + 'static + volo::Service<Cx, Req> + Sync,
    S::Response: std::fmt::Debug,
    S::Error: std::fmt::Debug,
    Cx: Send + 'static,
{
    async fn call(&self, cx: &mut Cx, req: Req) -> Result<S::Response, S::Error> {
        let now = std::time::Instant::now();
        tracing::debug!("Received request {:?}", &req);
        let resp = self.0.call(cx, req).await;
        tracing::debug!("Sent response {:?}", &resp);
        tracing::info!("Request took {}ms", now.elapsed().as_millis());
        resp
    }
}
```

Then we wrap a Layer around the Service:

```rust
pub struct LogLayer;

impl<S> volo::Layer<S> for LogLayer {
    type Service = LogService<S>;

    fn layer(self, inner: S) -> Self::Service {
        LogService(inner)
    }
}
```

Finally, we add this Layer to client and server:

```rust
use volo_example::LogLayer;

// client.rs
static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
    let addr: SocketAddr = "[::1]:8080".parse().unwrap();
    volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
        .layer_outer(LogLayer)
        .address(addr)
        .build()
};

// server.rs
volo_gen::volo::example::ItemServiceServer::new(S)
    .layer_front(LogLayer)
    .run(addr)
    .await
    .unwrap();
```

At this point, at the INFO log level, it prints out how long the request took;
At the DEBUG logging level, it also types the details of the request and response.

## Part 4. What's Next?

Congratulations, you've read this far! At this point, we've basically learned how to use Volo, and we're ready to use Volo to kick off our Rust journey

Next, you may need to select the right components, put them together, and interface with your system.

The related ecosystem maintained by Volo will be located in: https://github.com/volo-rs, we are working to build our ecosystem, and welcome everyone to join us ~

If there is a dire lack of components, you are welcomed to raise an issue in: https://github.com/cloudwego/volo, we will support it as soon as possible.

In the meantime, welcome to join our Lark user group and share your experience with us about Volo.

<div  align="center">
<img src="/img/docs/feishu_group_volo.png" width="400" alt="Volo_feishu" />
</div>
<br/><br/>

Looking forward to your unique work created with Volo.
