---
title: "Volo v0.2.1 版本发布"
linkTitle: "Release v0.2.1"
projects: ["Volo"]
date: 2022-10-26
description: >
---

- [[#61](https://github.com/cloudwego/volo/pull/61)] 优化了 Volo-Thrift 的代码，移除了一些不必要的泛型参数，简化代码。
- [[#63](https://github.com/cloudwego/volo/pull/63)] 跟进了 2022-10-20 后 nightly 编译器不再允许 TAIT elition lifetime 的问题。
- [[#73](https://github.com/cloudwego/volo/pull/73)] 绕过了 Rust 编译器的 #100013 issue: non-defining opaque type use in defining scope。
- [[#65](https://github.com/cloudwego/volo/pull/65)] feat: 升级 Volo-cli 的 clap 版本到 4.x。
- [[#72](https://github.com/cloudwego/volo/pull/72)] feat: 为 volo::net::Conn 支持了 writev 操作。
