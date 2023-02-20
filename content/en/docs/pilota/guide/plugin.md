---
title: "How to write a Plugin？"
linkTitle: "How to write a Plugin？"
weight: 1
description: >

---

## Why Plugin is needed

Add some customized meta information for Pilota according to IDL generated `Struct` and other types.

For example, in order to add `#[derive(serde::Serialize, serde::Deserialize])`.

## How to write a Plugin

### Plugin Implementation

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
                // Adjust's add_attrs method can add attributes to the Node corresponding to def_id,
                // which will be used to generate code later in the Codegen phase
                adj.add_attrs(&[parse_quote!(#[derive(::serde::Serialize, ::serde::Deserialize)])])
            }),
            _ => {}
        };
        pilota_build::plugin::walk_item(self, cx, def_id, item)
    }
}
```

## Plugin Usage

Pass the `plugin` method provided by the Builder.

```rust
pilota_build::thrift().plugin(SerdePlugin).write()
```
