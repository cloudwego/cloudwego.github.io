---
title: "Volo 0.5.0 版本发布"
linkTitle: "Release v0.5.0"
projects: ["Volo"]
date: 2023-06-02
description: >
---

Volo 0.5.0 版本中，除了常规 bugfix 之外，还有一些新的 feature 引入。

## Pilota-build compile 接口变动

如果有需要自己编译 idl 的用户，在这个版本中需要适配一下新的`compile`接口，参数改动很简单，如下：

```rust
xxx.compile(
    &["idl/collector.proto"],
    pilota_build::Output::File(out_dir),
);
```

只需要在原先的`out_dir`上加一个`pilota_build::Output::File`即可。

## Thrift 编解码接口变动

`Pilota`中`InputProtocol`接口改为使用`Bytes`而不是`BytesMut`，以接受更多类型的参数。

## 一致性哈希 LB 支持

感谢 @[my-vegetable-has-exploded](https://github.com/my-vegetable-has-exploded) 在 [#182](https://github.com/cloudwego/volo/pull/182) 中为我们支持了一致性哈希 LB。

## 返回 Arc<Resp>

新版本中，我们支持了在 Resp 类型外增加 Arc wrapper，具体使用可以参考：https://github.com/cloudwego/pilota/pull/159

## unsafe-codec

新版本支持了使用 unsafe 的方式来优化 codec 性能，针对比如 list<i64> 这种类型的编解码均有大约 20 倍的性能提升，其它类型也有一定提升；带来的问题是，恶意构造的 thrift payload 可能会导致 ub（coredump），因此我们没有默认开启。

如果用户能够信任 Thrift Payload（比如内网），那么可以通过 unsafe-codec 这个 feature 来开启。

## 减少 happy path 上的 Box 数量

新版本中，我们优化了 happy path 上需要使用的 Box 数量，性能理论上会有一些轻微提升。

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.4.2...volo-0.5.0)
