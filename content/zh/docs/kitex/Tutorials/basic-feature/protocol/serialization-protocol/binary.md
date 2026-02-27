---
title: "Binary"
date: 2024-01-06
weight: 1
keywords: ["Kitex", "序列化", "Binary", "Thrift"]
description: Kitex 使用 Binary 协议序列化。
---

## 介绍

[Binary](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md) 协议是一种以二进制格式编码数据的序列化协议，被广泛用于 Thrift 框架，是 Kitex 对于 Thrift 的默认序列化协议。

它提供了高性能、紧凑的数据传输和存储解决方案，支持跨语言通信，特别适用于大规模分布式系统和远程过程调用场景。

## 使用方法

生成代码时指定 IDL 类型为 Thrift（也可以不指定，默认就是 Thrift）。

#### 客户端

```sh
kitex -type thrift ${service_name} ${idl_name}.thrift
```

#### 服务端

```sh
kitex -type thrift -service ${service_name} ${idl_name}.thrift
```

## 补充

Kitex 针对 Binary 协议编解码进行了优化，具体优化细节参考 “Reference - 高性能 Thrift 编解码 " 篇章，假如想要关闭这些优化，生成代码时可以加上 `-no-fast-api` 参数。
