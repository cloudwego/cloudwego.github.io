---
title: "Binary"
date: 2024-01-06
weight: 1
keywords: ["Kitex", "Serialization", "Binary", "Thrift"]
description: Kitex uses the Binary protocol for serialization.
---

## Introduction

The [Binary](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md) protocol is a serialization protocol that encodes data in binary format. Widely used in the Thrift framework, it is the default serialization protocol for Kitex when working with Thrift.

It provides a high-performance, compact data transmission and storage solution, supporting cross-language communication. It is particularly suitable for large-scale distributed systems and remote procedure call scenarios.

## Usage

Specify the IDL type as Thrift when generating code (can also be left unspecified as it defaults to Thrift).

#### Client

```sh
kitex -type thrift ${service_name} ${idl_name}.thrift
```

#### Server

```sh
kitex -type thrift -service ${service_name} ${idl_name}.thrift
```

## Additional Information

Kitex have optimized Thrift's Binary protocol codec. For details of the optimization, please refer to the "Reference - High Performance Thrift Codec" chapter. If you want to close these optimizations, you can add the `-no-fast-api` argument when generating code.
