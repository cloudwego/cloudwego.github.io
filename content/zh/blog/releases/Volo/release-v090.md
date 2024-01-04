---
title: 'Volo 0.9.0 版本发布'
linkTitle: 'Release v0.9.0'
projects: ["Volo"]
date: 2024-01-04
description: >
---

Volo 0.9.0 版本中，我们主要将默认生成的 HashSet/HashMap 类型修改为了 AHashMap/AHashSet, 预期会带来一定的性能提升。此外，随着 [Rust 1.75](https://blog.rust-lang.org/2023/12/28/Rust-1.75.0.html) 的发布，Volo 已经可以在 stable rust 中使用了。

## Break Change

### 默认生成的 HashSet / HashMap 类型修改

在新版生成代码中，默认生成的 HashMap/HashSet 类型修改为了 AHashMap/AHashSet，这相比 std 的 map 会带来更高的性能，参考 [ahash](https://github.com/tkaitchuck/aHash/blob/master/compare/readme.md)。在用户代码中，可以根据编译器报错，将原来使用 `std::collections::HashMap` 的地方，直接替换为 `pilota::AHashMap` 或者 `ahash::AHashMap` 即可（pilota 本质上是 re-export 了 ahash 的 AHashMap, 所以是同一个类型）。

### RpcInfo 字段类型去掉 Option

在这个版本中，我们将 RpcInfo 的字段去掉了 Option 包装，预计对绝大多数没有自己写 layer 的用户无感。如果有使用到 cx 写 layer 的用户，可以直接去掉对 Option 的处理即可。

### 新增 BasicError

在这个版本中，volo-thrift 错误返回的枚举类型中新增了 BasicError 分支, 主要用于存放框架内部自身的错误。预计对绝大多数用户没有影响，如果用户有对错误类型进行 match 的地方，需要新增对 BasicError 的处理。

### 去除 max_frame_size 方法

volo-thrift client 中的 max_frame_size 由于迭代中接口变更，并没有被实际用到，在这个版本中已经删除。如果用户有需求设置 max_frame_size, 可以使用 make_codec 方法传入自定义的 codec，并在 MakeFramedCodec 那一层中使用 [with_max_frame_size](https://github.com/cloudwego/volo/blob/main/volo-thrift/src/codec/default/framed.rs#L33) 方法设置 max_frame_size。

### hyper 升级到 1.0 版本

hyper 在 1.0 版本中移除了 hyper::Body，并引入了 hyper::body::Incoming 用作请求的 Body 类型。在 volo-grpc 中，我们跟进了这一改动，预计对绝大多数没有自己写 layer 的用户无感。如果有使用到完整 Service 泛型的用户，将 `Service<ServerContext, Request<hyper::Body>>` 修改为 `Service<ServerContext, Request<hyper::body::Incoming>>` 即可。


## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.8.0...volo-0.9.0)
