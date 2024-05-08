---
title: "Volo Release 0.3.2"
linkTitle: "Release 0.3.2"
projects: ["Volo"]
date: 2023-02-07
description: >
---

In Volo 0.3.2 version, in addition to general bugfixes, there are many improvements.
In particular, it is very much appreciated that there are community contributors who have brought us important features.

## Trait support for Thrift asynchronous codec

[@ii64](https://github.com/ii64) brought us the definition of Thrift asynchronous codec Trait in [#123](https://github.com/cloudwego/volo/pull/123) as well as the implementation of Binary and Apache Compact Protocol.
Before that he also contributed the underlying implementation of codec to Pilota!

## Support for gRPC graceful shutdown

[@iGxnon](https://github.com/iGxnon) brought us support for gRPC graceful shutdown in [#127](https://github.com/cloudwego/volo/pull/127)!

## Version update for metainfo and faststr

In this release, we updated the versions of metainfo and faststr so that metainfo also supports faststr to minimize memory allocation and copy in as many scenarios as possible to optimize performance.

faststr is a string library we modify with reference to smol_str, which implements a zero-cost clone of immutable string.

In addition, FastStr has an incompatible change: previously it implemented `From` for all `AsRef<str>`, but doing so causes the additional memory allocation and copy overhead when using `into` directly.
In the new version of 0.2, we only implement `From` for `'static str`、`String`、`Arc<str>`、`Arc<String>`.
There's no overhead for these four types to use `into` to convert to FastStr, in a form that avoids memory allocation and copy problems inadvertently brought on by the user.

The old version of `From` essentially called `FastStr::new(s)`, so if there was an incompatibility problem, you could simply call `FastStr::new` explicitly instead.

## Pilota supports FastStr generation for Protobuf codec

By supporting FastStr generation for Protobuf codec in Pilota, we can bring our performance optimization capabilities to PB and gRPC.

After upgrading, we need to use `use pilota::prost::message::Message;` instead of `use prost::Message;` introduced previously.

## Full Release Notes

For the full Release Notes, please refer to: [Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.3.0...volo-0.3.2)
