---
title: "Part 1. 安装命令行工具"
linkTitle: "安装命令行工具"
weight: 1
description: >

---

Volo 提供了同名的命令行工具，用来初始化项目、管理 IDL 等。目前 Volo 工具需要使用 nightly rust 安装，我们可以通过以下命令来安装 Volo：

```bash
$ rustup default nightly
$ cargo install volo-cli
```

随后，我们输入：
```bash
$ volo help
```

就能看到类似以下输出啦：
```bash
USAGE:
    volo [OPTIONS] <SUBCOMMAND>

OPTIONS:
    -h, --help       Print help information
    -n, --entry-name <ENTRY_NAME>    The entry name, defaults to 'default'. [default: default]
    -v, --verbose    Turn on the verbose mode.
    -V, --version    Print version information

SUBCOMMANDS:
    help    Print this message or the help of the given subcommand(s)
    idl     manage your idl
    init    init your project
```
