---
title: "Pilota"
linkTitle: "Pilota"
weight: 8
keywords: ["Pilota", "Thrift", "Protobuf", "Plugin"]
Description: Pilota 是一个使用纯 Rust 编写的 Thrift 和 Protobuf 实现，具有高性能和高扩展性。
---

## Pilota 支持的注解

**目前注解仅对 Thrift IDL 做了支持。**

### pilota.name

可以通过 `pilota.name` 来指定生成 rust 代码的别名，比如：

```thrift
const string id = "id" (pilota.name="LANG_ID");
/// 会使用 LANG_ID 生成对应的结构
// pub const LANG_ID: &'static str = "id";

struct Test {
    1: required string ID,
    2: required string Id (pilota.name="hello"), // 会生用 hello 代替 id 来作为 Rust 结构的字段名
}
```

### pilota.rust_type

目前 thrift 的 string 会默认生成性能更好的 FastStr，但是 FastStr 并不支持修改（但是可以 to_string 后修改）。如果需要使用原生的 String 类型，需要加上 pilota.rust_type = "string" 的注解：

```thrift
struct A {
    1: required string faststr,
    2: required string string(pilota.rust_type = "string"),
}
```

### pilota.rust_wrapper_arc

可以对为指定的字段类型增加 Arc wrapper。如果该字段为 list map set 等容器类型，那么则会为容器的最里层类型增加 Arc wrapper。

```thrift
struct TEST {
    1: required A Name2(pilota.rust_wrapper_arc="true"), // 会生成 Arc<A>
    2: required list<list<A>> Name2(pilota.rust_wrapper_arc="true"), // 会生成 Vec<Vec<Arc<A>>>
    3: required map<i32, list<A>> Name3(pilota.rust_wrapper_arc="true"), // 会生成 Map<i32, Vec<Arc<A>>>
}

service TestService {
    TEST(pilota.rust_wrapper_arc="true") test(1: TEST req(pilota.rust_wrapper_arc="true"));
}
```

## 如何编写 Plugin

### 为什么需要 Plugin

为 Pilota 根据 IDL 生成的 `Struct` 等类型增加一些自定义的 meta 信息。

比如增加`#[derive(serde::Serialize, serde::Deserialize])` 等

### 如何写一个 Plugin

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

### 如何使用 Plugin

通过 Builder 提供的 `plugin` 方法传入即可

```rust
pilota_build::thrift().plugin(SerdePlugin).write()
```
