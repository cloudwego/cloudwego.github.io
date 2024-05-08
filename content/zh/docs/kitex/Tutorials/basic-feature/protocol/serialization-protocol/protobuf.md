---
title: "Protobuf"
date: 2024-01-06
weight: 2
keywords: ["Kitex", "序列化", "Protobuf"]
description: Kitex 使用 Protobuf 协议序列化。
---

## 介绍

Protobuf（Protocol Buffers）是由 Google 开发的一种序列化协议。它使用简单的 IDL 来定义数据结构，生成相应语言的代码进行序列化和反序列化。Protobuf 以一种较为紧凑的格式存储和传输数据，支持向前和向后兼容性，且在不同语言之间的交互性强。

Kitex 为 Protobuf 封装了更高效的传输协议，并提供了一种自定义的消息格式，可以理解为 Kitex-protobuf。它通过 fastpd 进行 Protobuf 编解码，拥有更高的编解码性能。缺点是该协议不支持 streaming 调用。

此外，当 IDL 中定义了 streaming 方法，Kitex 将采用 gRPC 作为传输协议，以支持 streaming 调用。

## 使用方法

### 使用自定义的传输协议

生成代码时指定 IDL 类型为 Protobuf（Kitex 将优先使用 Kitex-protobuf）。

#### 客户端

```sh
kitex -type protobuf -I idl/ idl/${proto_name}.proto
```

#### 服务端

```sh
kitex -type thrift -service ${service_name} ${idl_name}.thrift
```

### 使用 gRPC 作为传输协议

1. gRPC 的生成代码方式与前者一致，但在默认情况下，Kitex 会使用 Kitex-protobuf 作为 Protobuf 的传输协议，只有 IDL 文件中定义了 streaming 方法，才会走 gRPC 协议，否则走 Kitex Protobuf。
2. 如果没有 streaming 方法，又想指定 gRPC 协议，需要 client 初始化做如下配置（server 支持协议探测无需配置）。

```go
// 使用 WithTransportProtocol 指定 transport
cli, err := service.NewClient(destService, client.WithTransportProtocol(transport.GRPC))
```

## 补充

- 只支持 proto3，语法参考 https://developers.google.com/protocol-buffers/docs/gotutorial。

- 相较其他语言，必须定义 go_package ，以后 pb 官方也会将此作为必须约束。

- go_package 和 thrift 的 namespace 定义一样，不用写完整的路径，只需指定包名，相当于 thrift 的 namespace，如：go_package = “pbdemo”。

- 提前下载好 protoc 二进制放在 $PATH 目录下。
