---
title: "Protobuf"
date: 2024-01-06
weight: 2
keywords: ["Kitex", "Serialization", "Protobuf"]
description: Kitex uses the Protobuf protocol for serialization.
---

## Introduction

Protobuf (Protocol Buffers) is a serialization protocol developed by Google. It utilizes a simple IDL (Interface Description Language) to define data structures and generates code in various languages for serialization and deserialization. Protobuf stores and transmits data in a compact format, supports forward and backward compatibility, and exhibits strong interoperability across different programming languages.

Kitex encapsulates a more efficient transmission protocol for Protobuf and provides a custom message format, which can be understood as Kitex-protobuf. It uses fastpd for Protobuf encoding and decoding, which has higher encoding and decoding performance. The disadvantage is that this protocol does not support streaming calls.

Additionally, when streaming methods are defined in the IDL, Kitex automatically switches to using gRPC as the transport protocol to support streaming calls.

## Usage

### Using the Custom Transport Protocol

Specify the IDL type as Protobuf when generating code (Kitex will prioritize using Kitex-protobuf).

#### Client

```sh
kitex -type protobuf -I idl/ idl/${proto_name}.proto
```

#### Server

```sh
kitex -type thrift -service ${service_name} ${idl_name}.thrift
```

### Using gRPC as the Transport Protocol

1. Generate gRPC code in the same way as before. By default, Kitex uses Kitex-protobuf as the transport protocol for Protobuf, and only switches to gRPC when streaming methods are defined in the IDL.
2. If there are no streaming methods but you want to specify gRPC as the protocol, configure the client as follows (server supports protocol detection without explicit configuration).

```go
// Use WithTransportProtocol to specify the transport
cli, err := service.NewClient(destService, client.WithTransportProtocol(transport.GRPC))
```

## Additional Information

- Only supports proto3; refer to https://developers.google.com/protocol-buffers/docs/gotutorial for syntax details.

- Unlike other languages, it is mandatory to define `go_package`, which will be enforced by the official pb tool in the future.

- `go_package` follows the same conventions as the `namespace` definition in Thrift. Only the package name needs to be specified, similar to Thrift's namespace. For example: `go_package = "pbdemo"`.

- Ensure that the protoc binary is downloaded and placed in the $PATH directory beforehand.
