---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords: ["Volo", "cli", "Tutorial", "Install"]
description: "This document covers the preparation of the development environment, quick start and basic tutorials of Volo-HTTP."
---

Volo provides CLI tools of the same name, and it provide functions as follows:

1. Server-side scaffold generation

   support generate HTTP or RPC server-side scaffold by IDL like Thrift, Protobuf

2. Stub management

3. Old version migration

## Part 1. Install Cli tool

```bash
cargo install volo-cli
```

Need rustc version >= 1.80.0

Then, we type:

```bash
volo help
```

and we can see the output as follows:

```plain
Usage: volo [OPTIONS] <COMMAND>

Commands:
  init     init your thrift or grpc project
  http     manage your http project
  repo     manage your repo
  idl      manage your idl
  migrate  migrate your config from old version
  help     Print this message or the help of the given subcommand(s)

Options:
  -v, --verbose...               Turn on the verbose mode.
  -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
  -h, --help                     Print help
  -V, --version                  Print version
```

## Part 2. Generate RPC code

To create a RPC project, we need to write an IDL first. Let's take Thrift for example.


Create a new Thrift IDL in the project directory:

`vim idl/rpc_example.thrift`

```thrift
namespace rs volo.rpc.example

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

Execute the following command:

`volo init volo-rpc-example idl/rpc_example.thrift`

At this point, our entire catalog is structured as follows:

```plain
.
├── Cargo.toml
├── idl
│   └── rpc_example.thrift
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

## Part 2. Generate HTTP code

Execute the following command:

`volo http init volo-http-example`

At this point, our entire catalog is structured as follows:

```bash
$ tree
.
├── Cargo.toml
└── src
    ├── bin
    │   └── server.rs
    └── lib.rs
```
