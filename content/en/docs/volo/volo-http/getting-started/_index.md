---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords: ["Volo", "Http", "Tutorial", "Install"]
description: "This document covers the preparation of the development environment, quick start and basic tutorials of Volo-HTTP."
---

## Preparing the Development Environment

1. If you have not set up a Rust development environment before, you can refer to [Install Rust](https://www.rust-lang.org/tools/install).
2. It is recommended that you use the latest version of Rust, or ensure that Rustc >= 1.80.0.
3. If you have not installed `volo-cli`, please refer to [Quick Start](https://www.cloudwego.io/zh/docs/volo/cli/getting-started/).

## Create Server

> The following example `volo-cli` version is **0.10.3**, volo-http version is **0.2.14**.

1. Create http project scaffolding using Volo-Cli.

   ```bash
   mkdir -p volo-http-example
   cd volo-http-example
   volo http init volo-http-example
   ```

   The directory structure after the scaffold is created is as follows.

   ```bash
   $ tree
   .
   ├── Cargo.toml
   └── src
       ├── bin
       │   └── server.rs
       └── lib.rs
   ```

   `src/lib.rs` content is:

   ```rust
   use volo_http::server::route::{get, Router};

   async fn index_handler() -> &'static str {
       "It Works!\n"
   }

   pub fn example_router() -> Router {
        Router::new().route("/", get(index_handler))
   }
   ```

   As we can see, when the server is started, requesting the `/` path using the `GET` method expects an `It Works!` response

2. Run `cargo run` to start the server, after you see `Listening on [::]:8080` in the terminal, it means the Server is running successfully.

   We can use `curl` to verify

   ```bash
   $ curl -v http://localhost:8080/
   * Host localhost:8080 was resolved.
   * IPv6: ::1
   * IPv4: 127.0.0.1
   *   Trying [::1]:8080...
   * Connected to localhost (::1) port 8080
   > GET / HTTP/1.1
   > Host: localhost:8080
   > User-Agent: curl/8.6.0
   > Accept: */*
   >
   < HTTP/1.1 200 OK
   < content-length: 10
   < date: Sun, 01 Sep 2024 16:52:55 GMT
   <
   It Works!
   * Connection #0 to host localhost left intact
   ```

## What's Next?

Congratulations, you've read this far! At this point, we've basically learned how to use Volo, and we're ready to use Volo to kick off our Rust journey

Next, you may need to select the right components, put them together, and interface with your system.

The related ecosystem maintained by Volo will be located in: https://github.com/volo-rs, we are working to build our ecosystem, and welcome everyone to join us ~

If there is a dire lack of components, you are welcomed to raise an issue in: https://github.com/cloudwego/volo, we will support it as soon as possible.

In the meantime, welcome to join our Lark user group and share your experience with us about Volo.

<div align="center">
<img src="/img/docs/feishu_group_volo.png" width="400" alt="Volo_feishu" />
</div>
<br/><br/>

Looking forward to your unique work created with Volo.
