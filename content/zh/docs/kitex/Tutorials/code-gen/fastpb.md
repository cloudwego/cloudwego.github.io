---
title: "Fastpb"
date: 2022-08-26
weight: 4
description: >
---

### 版本要求

kitex version >= v0.4.0

# 概述

[Fastpb][Fastpb] 是字节跳动研发的 [protobuf][protobuf] 增强插件，使用新的生成代码和 API 来完成 [protobuf][protobuf] 的编解码过程，相比于官方库规避了反射，具有更好的性能。

和官方 [protobuf][protobuf] 的性能对比 [参考这里][fastpb-benchmark]。
更多 [Fastpb][Fastpb] 信息 [参考这里][Fastpb]。

# 使用 (默认开启)

[Kitex][Kitex] 默认集成了 [Fastpb][Fastpb]，使用 `kitex` 命令生成代码时，会在官方的生成代码文件 `xx.pb.go` 旁边额外增加一份 `xx.pb.fast.go`
文件，用于 [Fastpb][Fastpb] 快速编解码。

# 如何关闭

在使用 `kitex` 命令行生成代码时，加上  `-no-fast-api`  参数，即可关闭 Fastpb。

删除 `xx.pb.fast.go` 文件也可以实质上关闭 Fastpb 能力，删除文件后，Kitex 框架会自动适配为官方库编解码。


[Fastpb]: https://github.com/cloudwego/fastpb

[Kitex]: https://github.com/cloudwego/kitex

[protobuf]: https://github.com/golang/protobuf

[fastpb-benchmark]: https://github.com/cloudwego/fastpb#performance
