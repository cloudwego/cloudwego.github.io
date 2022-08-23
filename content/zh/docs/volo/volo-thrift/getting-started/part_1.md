---
title: "Part 1. 安装命令行工具"
linkTitle: "安装命令行工具"
weight: 1
description: >

---

Volo 提供了同名的命令行工具，用来初始化项目、管理 IDL 等。我们可以先通过以下命令来安装 Volo：

```bash
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
    -v, --verbose    Turn on the verbose mode.
    -V, --version    Print version information

SUBCOMMANDS:
    help    Print this message or the help of the given subcommand(s)
    idl     manage your idl
    init    init your project
```
