---
title: "快速开始"
linkTitle: "快速开始"
weight: 1
keywords: ["Volo", "cli", "快速开始", "安装"]
description: "Volo-Cli 开发环境准备、快速上手与基础教程。"
---

## Part 1. 安装命令行工具

volo 框架提供了同名的命令行工具，提供以下功能服务端项目骨架生成，桩代码生成管理等

```bash
cargo install volo-cli
```

> 需要 rust 版本 >= 1.75.0

随后，我们输入：

```bash
volo help
```

就能看到类似以下输出啦：

```bash
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



