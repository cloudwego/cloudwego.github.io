---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
keywords: ["Volo", "cli", "快速开始", "安装"]
description: "Volo-Cli 开发环境准备、快速上手与基础教程。"
---

Volo 框架提供了同名的命令行工具，提供以下功能:

1. 服务端骨架生成

   支持通过 Thrift, Protobuf 的 IDL 生成 HTTP 或 RPC 服务端项目的骨架

2. 桩代码管理

3. 旧版本迁移

## Part 1. 安装命令行工具

```bash
cargo install volo-cli
```

需要 rust 版本 >= 1.80.0

随后，我们输入：

```bash
volo help
```

就能看到类似以下输出啦：

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

## Part 2. 生成 rpc 代码

为了创建一个 RPC 项目, 我们需要先编写一个 IDL, 这里以 Thrift 为例

在项目目录下新建一个 Thrift IDL

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

执行以下命令：

`volo init volo-rpc-example idl/rpc_example.thrift`

这时候，我们整个目录的结构如下：

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

## Part 2. 生成 http 代码

执行以下命令:

`volo http init volo-http-example`

这时候, 我们整个目录的结构如下:

```bash
$ tree
.
├── Cargo.toml
└── src
    ├── bin
    │   └── server.rs
    └── lib.rs
```
