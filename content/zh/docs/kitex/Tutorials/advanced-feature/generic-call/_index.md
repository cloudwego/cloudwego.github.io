---
title: "泛化调用"
date: 2021-09-26
weight: 1
keywords: ["Kitex", "Generic Call"]
description: Kitex 支持 Thrift 与 Protobuf 泛化调用，无需将维护编译 IDL 生成的代码，通常用于网关，接口测试平台等场景。
---

在传统的 RPC 调用中，客户端通常需要依赖于服务端 IDL，即其定义的服务接口、参数结构、数据类型等信息，基于 IDL 生成代码后发起 RPC 调用。但是，对于 API 网关、接口测试平台这类通用型的平台服务，有成千上万的服务接入，让平台依赖所有服务的 IDL 生成代码去发起 RPC 调用是不现实的。在此背景下，RPC 泛化调用出现了，即提供一种泛化接口，接受如 JSON、Map 此类数据，转化为 RPC 协议规定的数据格式后发起调用。
