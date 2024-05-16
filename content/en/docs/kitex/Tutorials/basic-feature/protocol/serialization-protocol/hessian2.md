---
title: "Hessian2"
date: 2024-01-06
weight: 3
keywords: ["Kitex", "Serialization", "Hessian2"]
description: Kitex uses the Hessian2 protocol for serialization.
---

## Introduction

Hessian2 is a binary serialization protocol primarily used for remote invocation and data transfer in Java applications. It supports various data types, including primitive types, custom objects, and collections, employing a compact encoding method to provide efficient performance.

The Hessian2 protocol is used for interoperability between Kitex and Dubbo. While not a core serialization protocol natively supported by Kitex, it is supported by extension libraries.

## Usage

Specify the Hessian2 protocol when generating code (its IDL type should be thrift, but it can be left unspecified as the default).

#### Client

- **Generate Code**

  ```sh
  kitex -protocol Hessian2 -I idl/ idl/${idl_name}.thrift
  ```

- **Client Initialization**

  ```go
  cli, err := service.NewClient(destService,
    // Configure DubboCodec
    client.WithCodec(dubbo.NewDubboCodec(
      // Specify the Dubbo Interface to be invoked
      dubbo.WithJavaClassName("JavaInterfaceName"),
    )),
  )
  ```

#### Server

- **Generate Code**

  ```sh
  kitex -protocol Hessian2 -service ${service_name} -I idl/ idl/${idl_name}.thrift
  ```

- **Server Initialization**

  ```go
  svr := service.NewServer(destService,
    // Configure DubboCodec
    server.WithCodec(dubbo.NewDubboCodec(
      // Configure the Java Interface corresponding to the Kitex service. Other Dubbo and Kitex clients can invoke this name.
      dubbo.WithJavaClassName("JavaInterfaceName"),
    )),
  )
  ```

## Additional Information

- To ensure interoperability with Dubbo Java, add the `JavaClassName` annotation to each struct defined in the IDL, with the value being the corresponding Java class name.

- DubboCodec provides extensive compatibility and support for Kitex-Dubbo interoperability. For details, please refer to https://github.com/kitex-contrib/codec-dubbo/blob/main/README.md.
