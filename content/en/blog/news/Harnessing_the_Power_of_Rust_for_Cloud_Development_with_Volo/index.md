---
date: 2024-01-18
title: "Harnessing the Power of Rust for Cloud Development with Volo"
projects: ["CloudWeGo"]
linkTitle: "Harnessing the Power of Rust for Cloud Development with Volo"
keywords:
  [
    "CloudWeGo",
    "middleware",
    "Volo",
    "rust",
    "microservice framework",
    "ByteDance Open Source",
    "ByteDance",
    "open source",
    "cloud native",
    "open source",
    "kubernetes",
    "gRPC",
    "microservices",
    "rpc",
    "thrift",
  ]
description: "Volo is a Rust framework for cloud development. This guide provides insights into leveraging Volo with its speed and efficiency in your projects."
author: <a href="https://github.com/yy2so" target="_blank">Yacine Si Tayeb</a>, <a href="https://github.com/GuangmingLuo" target="_blank">Guangming Luo</a>
---

![Image](/img/blog/Harnessing_the_Power_of_Rust_for_Cloud_Development_with_Volo/1.jpeg)

## I. Introduction

Every tool in the [CloudWeGo](https://www.cloudwego.io) open-source ecosystem has been developed with the aim of simplifying and revolutionizing how developers navigate the cloud environment. An essential part of this ecosystem is [Volo](/docs/volo/), a Rust RPC framework designed to provide a seamless and efficient communication infrastructure.

This guide aims to provide in-depth insights into leveraging Volo in your projects. Built with [Rust](https://www.rust-lang.org), Volo brings unique features and advantages into the mix.

## II. The Power of Rust-Based Volo in the Real World

As a part of the CloudWeGo family, Volo can make a significant impact in real-world applications. Its high-speed processing capabilities, when combined with the safety and concurrency advantages of Rust, can provide an efficient backbone to high-performance web services and applications.

The beauty of Rust, which Volo encapsulates, is its ability to push beyond the performance boundaries typically associated with languages such as Go. While Go is highly efficient, it does reach a performance ceiling that may not lend itself to deep optimization. However, once a finely optimized Go service is rewritten in Rust, the benefits spring into view.

Here, CPU gains generally rise above 30%, some even reaching over 50%. In some cases, a fourfold increase in CPU gains is observed. Memory gains are even more pronounced, regularly topping 50% and in some cases reaching as high as 90%.

Beyond performance, Rust addresses the unpredictable jitter issues brought about by [Go's garbage collection (GC)](https://tip.golang.org/doc/gc-guide). In doing so, it helps businesses significantly reduce timeout/error rates, decrease P99 latency, and improve the service level agreements (SLA) of their offerings.

Consider the infrastructure of an online marketplace's back-end. Volo can facilitate seamless interactions between the users, the product database, and third-party services, making them more efficient and reliable.

Another use case could be in the gaming industry, where Volo can help manage player data, game state, and real-time multiplayer interactions with low-latency and high reliability.

Rust and Go are not adversaries but rather allies that complement each other, leveraging their respective strengths to compensate for any weaknesses. For applications where ultimate performance, low latency, memory bottlenecks, and stability are of paramount importance, even if it comes at the cost of some iteration speed loss, Rust is the go-to choice.

These applications can fully benefit from Rust's, and by extension Volo's, unrivaled performance optimization and security. However, when performance sensitivity takes a backseat to high I/O operations, and when rapid development and iteration receives priority over stability, Go becomes the preferred choice.

Rust's vast applicability doesn't stop at server-side business and architectural domains. Its exploratory and implementation journey extends to areas such as internal safety, kernel development, AI, frontend, and client-side development. As such, Volo, with its Rust foundation, carries this adaptability and flexibility, ready to conquer diverse domains and real-world challenges.

## III. Getting Started With CloudWeGo

CloudWeGo provides a robust set of tools to work with, one of which is Volo. Here's how you can kickstart your journey with Volo within the CloudWeGo ecosystem.

### Volo

#### Prerequisites

If you don’t have the Rust development environment set up, please follow [Install Rust](https://www.rust-lang.org/tools/install) to download Rustup and install Rust. Volo supports Linux, macOS, and Windows systems by default.

#### Install the CLI tool

Volo provides CLI tools of the same name for initializing projects, managing IDLs, and more. To install Volo tool, run the following command: `cargo install volo-cli`.

Then run: `volo help`

You should see something similar to the following:

```
USAGE:
    volo [OPTIONS] <SUBCOMMAND
OPTIONS:
    -h, --help       Print help information
    -n, --entry-name <ENTRY_NAME    The entry name, defaults to 'default'. [default: default]
    -v, --verbose    Turn on the verbose mode.
    -V, --version    Print version information
SUBCOMMANDS: help    Print this message or the help of the given subcommand(s)
    idl     manage your idl
```

## IV. Creating A Sample Project With CloudWeGo

When starting a new project with Volo, the following steps can guide you through the development of basic components.

### Thrift project

**1. Write IDL**

To create a Thrift project, we need to write a Thrift IDL first. In your working directory, execute the following command:

```
mkdir volo-example && cd volo-example
mkdir idl && vim idl/volo_example.thrift
```

Then, enter the following content:

```
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
Init the server project
volo init volo-example idl/volo_example.thrift
```

**Note:** Here we use the `init` command, followed by the name of our project, which means we need to generate template code. At the end, you need to specify an IDL used by the server.

At this point, our entire directory structure looks like this:

```.
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

**2. Add logic code**

Open `src/lib.rs` and add the method implementation to the impl block:

```pub struct S;

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

**3. Execute**

```
cargo update && cargo build
```

At this point, you will find `volo_gen.rs` file under `OUT_DIR Directory`. Then execute the following command to get our server running:

```
cargo run --bin server
```

We now have our server running!

### gRPC project

**1. Write IDL**

To create a gRPC project, we need to write a protobuf IDL first. In your working directory, execute the following command:

```
mkdir volo-example && cd volo-example
mkdir idl && vim idl/volo_example.proto
```

Then, enter the following content:

```
syntax = "proto3";
package volo.example;

message Item {
    int64 id = 1;
    string title = 2;
    string content = 3;

    map<string, string> extra = 10;
}

message GetItemRequest {
    int64 id = 1;
}

message GetItemResponse {
    Item item = 1;
}

service ItemService {
    rpc GetItem(GetItemRequest) returns (GetItemResponse);
}
```

**2. Init the server project**

```
volo init --includes=idl volo-example idl/volo_example.proto
```

**Note:** Here we use the `init` command, followed by the name of our project, which means we need to generate template code. At the end, you need to specify an IDL used by the server.

At this point, our entire directory structure looks like this:

```.
├── Cargo.toml
├── idl
│   └── volo_example.proto
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

**3. Add logic code**

Open `src/lib.rs` and add the method implementation to the impl block:

```pub struct S;

impl volo_gen::volo::example::ItemService for S {
    // This is the part of the code we need to add
    async fn get_item(
        &self,
        _req: volo_grpc::Request<volo_gen::volo::example::GetItemRequest>,
    ) -> core::result::Result<volo_grpc::Response<volo_gen::volo::example::GetItemResponse>, volo_grpc::Status>
    {
        Ok(volo_grpc::Response::new(Default::default()))
    }
}
```

**4. Execute**

```
cargo update && cargo build
```

At this point, you will find `volo_gen.rs` file under `OUT_DIR Directory`. Then execute the following command to get our server running:

```
cargo run --bin server
```

If you followed the above steps, you'll now have your server running!

## V. Troubleshooting Tips & FAQ

Like any technology, working with Volo might come up with its own set of challenges. Here are some tips to handle common issues:

**- Compilation Errors:** If you encounter any compilation errors, it's recommended to double-check your Rust environment and Volo setup. Ensure that you have the latest stable version of Rust and that Volo is correctly installed and updated to the latest version.

**- Runtime Issues:** If your Volo application runs into issues during runtime, investigate the error messages and logs. Volo errors are designed to be descriptive and should guide you towards the problem source.

**- Why is the code generated by `volo-cli` separately split into the volo-gen crate?**

This separation is because Rust's compilation operates on a crate-by-crate basis. Creating the generated code as a separate crate allows for better utilization of the compile cache (idl generally doesn't change frequently).

**- How compatible is it with Kitex?**

Volo is fully compatible with [Kitex](/blog/2024/01/10/mastering-golang-microservices-a-practical-guide-embrace-high-performance-with-kitex-and-hertz/), including functionalities like metadata transmission.

## VI. Conclusion

This guide provided a comprehensive look into Volo, a powerful Rust-based component of the CloudWeGo ecosystem. With an understanding of how to set up and use Volo in your projects, you're now equipped to harness the speed and efficiency that Volo brings to your cloud development tasks.

As you continue to explore [CloudWeGo](https://www.cloudwego.io), keep integrating its powerful features into your projects, and see the transformative impact it can have on your software development process.

Stay curious, keep learning, and don't hesitate to dive deeper into the boundless potential of CloudWeGo. Happy coding!
