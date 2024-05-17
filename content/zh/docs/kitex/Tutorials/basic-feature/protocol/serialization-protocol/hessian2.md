---
title: "Hessian2"
date: 2024-01-06
weight: 3
keywords: ["Kitex", "序列化", "Hessian2"]
description: Kitex 使用 Hessian2 协议序列化。
---

## 介绍

Hessian2 是一种二进制序列化协议，主要用于在 Java 应用中进行远程调用和数据传输。它支持多种数据类型，包括基本类型、自定义对象和集合，采用紧凑的编码方式，提供了较好的性能。

Hessian2 协议用于 Kitex 与 Dubbo 互通，该协议并非 Kitex 核心支持的序列化协议，但在拓展库对其进行了支持。

## 使用方法

生成代码时指定 Hessian2 协议（其 IDL 类型应为 thrift，但作为默认选项可以不指定）。

#### 客户端

- **生成代码**

  ```sh
  kitex -protocol Hessian2 -I idl/ idl/${idl_name}.thrift
  ```

- **Client 初始化**

  ```go
  cli, err := service.NewClient(destService,
    // 配置 DubboCodec
    client.WithCodec(dubbo.NewDubboCodec(
      // 指定想要调用的 Dubbo Interface
      dubbo.WithJavaClassName("JavaInterfaceName"),
    )),
  )
  ```

#### 服务端

- **生成代码**

  ```sh
  kitex -protocol Hessian2 -service ${service_name} -I idl/ idl/${idl_name}.thrift
  ```

- **Server 初始化**

  ```go
  svr := service.NewServer(destService,
    // 配置 DubboCodec
    server.WithCodec(dubbo.NewDubboCodec(
      // 配置 Kitex 服务所对应的 Java Interface. 其他 dubbo 客户端和 kitex 客户端可以通过这个名字进行调用。
      dubbo.WithJavaClassName("JavaInterfaceName"),
    )),
  )
  ```

## 补充

- 如需与 Dubbo Java 互通，IDL 中定义的每个结构体都应添加注解 `JavaClassName`，值为对应的 Java 类名称。

- DubboCodec 在 Kitex 与 Dubbo 互通上做了很多兼容支持，细节请参考 https://github.com/kitex-contrib/codec-dubbo/blob/main/README.md。
