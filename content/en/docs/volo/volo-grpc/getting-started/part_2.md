---
title: "Part 2. Create a gRPC Server"
linkTitle: "Create a gRPC Server"
weight: 2
description: >

---

Volo-gRPC is an RPC framework so that the bottom layer requires two major functions: Serialization and Transport.

IDL is short for `Interface Definition Language`.

## Why IDL

If we want to do RPC, we need to know what interface is for the server, what parameters to pass, and what the return value is, 
just like two people talking to each other, we need to make sure we are speaking the same language and doing the same thing.

At this time, we need to use IDL to specify the protocol for both sides, just like when writing code, we need to know the function signature while calling a function.

Protobuf IDL is a full-stack RPC solution for cross-language, the specific syntax can be seen in [protocol-buffers/docs/proto3](https://developers.google.com/protocol-buffers/docs/proto3).

## Write IDL

To create a gRPC project, we need to write a protobuf IDL at first.

In your working directory, execute the following command:

```bash
$ mkdir volo-example
$ cd volo-example
$ mkdir idl
$ vim idl/volo_example.proto
```

Then, enter the following content:

```protobuf
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

After saving and exiting, we execute the following command:

```bash
$ volo init --includes=idl volo-example idl/volo_example.proto
```

**Here we use the `init` command, followed by the name of our project, which means we need to generate template code. At the end, you need to specify an IDL used by the server.**

If you only need to add an IDL (such as the client IDL) without generating a template, do as follows:

```bash
$ volo idl add idl/volo_example.proto
```

| What's more, the volo tool also supports downloading IDL from git and then generating code, such as:

```bash
$ volo idl add -g git@github.com:org/repo.git -r main /path/to/your/idl.proto
```

| You may directly enter volo to see the detailed usage ~ next back to the topic ~

At this point, our entire directory structure looks like this:

```bash
.
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

Then we open `src/lib.rs` and add the method implementation to the `impl` block. The resulting code should look like this:

```rust
pub struct S;

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

Then execute:

```bash
$ cargo update
$ cargo build
```

At this point, You will find `volo_gen.rs` file under [OUT_DIR Directory](https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts).

Then execute the following command to get our server running:

```bash
$ cargo run --bin server
```

At this point, we have our server running!
