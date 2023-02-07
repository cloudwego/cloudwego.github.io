---
title: "Volo 0.3.2 版本发布"
linkTitle: "Volo Release 0.3.2"
date: 2023-02-07
description: >
---

Volo 0.3.2 版本中，除了常规 bugfix 之外，还有多处改进。尤其是，有社区贡献者为我们带来了重要的 feature，非常感谢他们。

## Thrift 异步编解码 Trait 支持

[@ii64](https://github.com/ii64) 在 [#123](https://github.com/cloudwego/volo/pull/123) 中为我们带来了 Thrift 异步编解码 Trait 的定义和 Binary、Apache Compact Protocol 的实现，在此之前他还为 Pilota 贡献了编解码的底层实现！

## gRPC graceful shutdown 支持

[@iGxnon](https://github.com/iGxnon) 在 [#127](https://github.com/cloudwego/volo/pull/127) 中为我们带来了 gRPC graceful shutdown 的支持！

## metainfo 与 faststr 版本更新

在这个版本中，我们更新了 metainfo 和 faststr 的版本，使得 metainfo 也支持了 faststr，以在尽可能多的场景下减少内存分配和拷贝，以优化性能。

faststr 是我们参考 smol_str 改进的一个 string 库，实现了 immutable string 的零开销 clone。

同时 FastStr 有一个不兼容变更：之前是为所有`AsRef<str>`实现了`From`，但是这样做会导致直接使用`into`会带来额外的内存分配和拷贝开销。在新的 0.2 版本中，我们只为 `'static str`、`String`、`Arc<str>`、`Arc<String>`四种类型实现了`From`，这四种类型 into 到 FastStr 是零开销的，通过这种形式避免用户不经意间带来的内存分配和拷贝问题。

旧版本的`From`本质上就是调用了`FastStr::new(s)`，因此出现不兼容问题的话，直接改为显式调用`FastStr::new`即可。

## Pilota 中 Protobuf 编解码支持生成 FastStr

通过在 Pilota 中支持为 Protobuf 编解码生成 FastStr，我们可以将我们的性能优化能力带到 PB 和 gRPC 中。

升级后，需要把原先引入的`use prost::Message;`改为`use pilota::prost::message::Message;`即可。

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.3.0...volo-0.3.2)
