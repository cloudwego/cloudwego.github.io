---
title: 'Volo Release 0.9.0'
linkTitle: 'Release v0.9.0'
projects: ["Volo"]
date: 2024-01-04
description: >
---

In Volo 0.9.0, we mainly changed the default generated HashSet/HashMap type to AHashMap/AHashSet, which is expected to bring certain performance improvements. Additionally, with the release of [Rust 1.75](https://blog.rust-lang.org/2023/12/28/Rust-1.75.0.html), Volo is already available in stable rust.

## Break Change

### Modification of the default generated HashSet / HashMap type

In the new version of the generated code, the default generated HashMap/HashSet type is changed to AHashMap/AHashSet, which gives better performance than std map, refer to [ahash](https://github.com/tkaitchuck/aHash/blob/master/compare/readme.md). In user code, you can directly replace the original use of `std::collections::HashMap` with `pilota::AHashMap` or `ahash::AHashMap` according to the compiler error (pilota is essentially re-exported the AHashMap of ahash, so it is the same type).

### Remove Option from RpcInfo field type

In this version, we have removed the Option wrapper from the RpcInfo fields, which should be transparent to most users who have not written their own layers. If there are users who use cx to write layers, they can remove the Option processing directly.

### Added BasicError

In this version, the BasicError branch is added to the enumeration error type of volo-thrift, which is mainly used to store the errors within the framework itself. It is expected that this will not affect the vast majority of users. If the users have matched the error type, they will need to add the processing of BasicError.

### Remove max_frame_size method

max_frame_size in the volo-thrift client is not actually used due to interface changes during iteration and has been removed in this version. If the user needs to set max_frame_size, they can use the make_codec method to pass in a custom codec and use the [with_max_frame_size](https://github.com/cloudwego/volo/blob/main/volo-thrift/src/codec/default/framed.rs#L33) method in the MakeFramedCodec layer to set max_frame_size.

### Upgrade hyper to version 1.0

hyper removed hyper::Body in version 1.0 and introduced hyper::body::Incoming as the requested Body type. In volo-grpc, we have followed up on this change, and we expect that the vast majority of users who have not written their own layers will not be interested. If there are users who use the complete Service generics, just change `Service<ServerContext, Request<hyper::Body>>` to `Service<ServerContext, Request<hyper::body::Incoming>>`.


## Complete Release Note

For the complete Release Note, please refer to: [Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.8.0...volo-0.9.0)
