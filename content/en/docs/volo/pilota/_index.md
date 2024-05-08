---
title: "Pilota"
linkTitle: "Pilota"
weight: 7
keywords: ["Pilota", "Thrift", "Protobuf", "Plugin"]
Description: Pilota is a Thrift and Protobuf implementation in pure rust with high performance and extensibility.
---

## Pilota Supported Annotations

**Currently, annotations are only supported for thrift idl.**

### pilota.name

You can use `pilota.name` to specify an alias for generating rust code, for example:

```thrift
const string id = "id" (pilota.name="LANG_ID");
// will use LANG_ID to generate the corresponding structure
// pub const LANG_ID: &'static str = "id";

struct Test {
     1: required string ID,
     2: required string Id (pilota.name="hello"), // hello will be used instead of id as the field name of the Rust structure
}
```

### pilota.rust_type

Currently thrift's string will generate FastStr with better performance by default, but FastStr does not support modification (but it can be modified after to_string). If you need to use the native String type, you need to add `pilota.rust_type = "string"` annotation:

```thrift
struct A {
     1: required string faststr,
     2: required string string(pilota. rust_type = "string"),
}
```

### pilota.rust_wrapper_arc

Arc wrapper can be added to the specified field type. If the field is a container type such as list map set, then an Arc wrapper will be added to the innermost type of the container.

```thrift
struct TEST {
     1: required A Name2(pilota.rust_wrapper_arc="true"), // will generate Arc<A>
     2: required list<list<A>> Name2(pilota.rust_wrapper_arc="true"), // will generate Vec<Vec<Arc<A>>>
     3: required map<i32, list<A>> Name3(pilota.rust_wrapper_arc="true"), // will generate Map<i32, Vec<Arc<A>>>
}

service TestService {
    TEST(pilota.rust_wrapper_arc="true") test(1: TEST req(pilota.rust_wrapper_arc="true"));
}
```

## How to write a Plugin

### Why Plugin is needed

Add some customized meta information for Pilota according to IDL generated `Struct` and other types.

For example, in order to add `#[derive(serde::Serialize, serde::Deserialize])`.

### How to write a Plugin

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

### Plugin Usage

Pass the `plugin` method provided by the Builder.

```rust
pilota_build::thrift().plugin(SerdePlugin).write()
```
