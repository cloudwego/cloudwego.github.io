---
title: "Part 1. Install the CLI Tool"
linkTitle: "Install the CLI Tool"
weight: 1
description: >

---

Volo provides CLI tools of the same name for initializing projects, managing IDLs, and more. To install Volo tool, you need to switch to `nightly` channel and run the following command:

```bash
$ rustup default nightly
$ cargo install volo-cli
```

Then run:

```bash
$ volo help
```

You should see something like the following:
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
