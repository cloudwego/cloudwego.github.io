---
title: "Fastpb"
date: 2022-08-26
weight: 4
description: >
---

### Version Requirements

kitex version >= v0.4.0

# Overview

[Fastpb][Fastpb] is a [protobuf][protobuf] enhancement plugin developed by ByteDance.
It uses the new generated code and API to complete the [protobuf][protobuf] encoding and decoding process.
Compared to the official sdk, it avoids go-reflect and thus has better performance.

Performance comparison with the official [protobuf][protobuf] please [refer to here][fastpb-benchmark].
More [Fastpb][Fastpb] details [see here][Fastpb].

# Usage (enabled by default)

[Kitex][Kitex] integrates [Fastpb][Fastpb] by default. When using the `kitex` command-tool to generate code,
an additional `xx.pb.fast.go` file will be added next to the official generated code file `xx.pb.go` for [Fastpb][Fastpb] faster codec.

# How to Disable ?

When using the `kitex` command line to generate code, add `-no-fast-api` to disable Fastpb.

Deleting the `xx.pb.fast.go` files can also disable Fastpb. After deleting these files,
the Kitex framework will automatically adapt to the official sdk for encoding/decoding.


[Fastpb]: https://github.com/cloudwego/fastpb

[Kitex]: https://github.com/cloudwego/kitex

[protobuf]: https://github.com/golang/protobuf

[fastpb-benchmark]: https://github.com/cloudwego/fastpb#performance
