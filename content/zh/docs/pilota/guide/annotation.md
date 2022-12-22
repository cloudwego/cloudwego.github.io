---
title: "Pilota 支持的注解"
linkTitle: "pilota-annotation"
weight: 1
description: >
---

**目前注解仅对 thrift idl 做了支持。**

## pilota.name

可以通过 pilota.name 来指定生成 rust 代码的别名，比如：

```thrift
const string id = "id" (pilota.name="LANG_ID");
/// 会使用 LANG_ID 生成对应的结构
// pub const LANG_ID: &'static str = "id";

struct Test {
    1: required string ID,
    2: required string Id (pilota.name="hello"), // 会生用 hello 代替 id 来作为 Rust 结构的字段名
}
```

## pilota.rust_type

目前 thrift 的 string 会默认生成性能更好的 FastStr，但是 FastStr 并不支持修改（但是可以 to_string 后修改）。如果需要使用原生的 String 类型，需要加上 pilota.rust_type = "string" 的注解：

```thrift
struct A {
    1: required string faststr,
    2: required string string(pilota.rust_type = "string"),
}
```

## pilota.rust_wrapper_arc

可以对为指定的字段类型增加 Arc wrapper。如果该字段为 list map set 等容器类型，那么则会为容器的最里层类型增加 Arc wrapper。

```thrift
struct TEST {
    1: required A Name2(pilota.rust_wrapper_arc="true"), // 会生成 Arc<A>
    2: required list<list<A>> Name2(pilota.rust_wrapper_arc="true"), // 会生成 Vec<Vec<Arc<A>>>
    3: required map<i32, list<A>> Name3(pilota.rust_wrapper_arc="true"), // 会生成 Map<i32, Vec<Arc<A>>>
}
```
