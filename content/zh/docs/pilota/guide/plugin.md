---
title: "如何编写 Plugin？"
linkTitle: "如何编写 Plugin？"
weight: 1
description: >

---

## 为什么需要 Plugin

为 Pilota 根据 IDL 生成的 `Struct` 等类型增加一些自定义的 meta 信息。

比如增加`#[derive(serde::Serialize, serde::Deserialize])` 等

## 如何写一个 Plugin

### 实现 Plugin

```rust
#[derive(Clone, Copy)]
struct SerdePlugin;

impl pilota_build::Plugin for SerdePlugin {
    fn on_item(
        &mut self,
        cx: &mut pilota_build::Context,
        def_id: pilota_build::DefId,  // item 的 def_id
        item: std::sync::Arc<pilota_build::rir::Item>,
    ) {
        match &*item {
            pilota_build::rir::Item::Message(_)
            | pilota_build::rir::Item::Enum(_)
            | pilota_build::rir::Item::NewType(_) => cx.with_adjust(def_id, |adj| {
                // Adjust 的 add_attrs 方法可以为 def_id 对应的 Node 增加 Attribute，在之后的 Codegen 阶段会带上这些元信息生成代码
                adj.add_attrs(&[parse_quote!(#[derive(::serde::Serialize, ::serde::Deserialize)])])
            }),
            _ => {}
        };
        pilota_build::plugin::walk_item(self, cx, def_id, item)
    }
}
```

## 使用 Plugin

通过 Builder 提供的 `plugin` 方法传入即可

```rust
pilota_build::thrift().plugin(SerdePlugin).write()
```
