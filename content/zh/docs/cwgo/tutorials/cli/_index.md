---
title: "命令行工具"
linkTitle: "命令行工具"
weight: 1
description: >
---

cwgo 是 CloudWeGo 提供的用于生成代码的一个命令行工具。目前 cwgo 支持 thrift 和 protobuf 的 IDL，支持生成 MVC Layout、Server、Client、DB 和 DOC 的代码，支持命令行自动补全。

## 依赖与运行模式

cwgo 工具并不直接生成代码，而是构造好模板后调用相应工具的生成函数。

```console
cwgo
 |
 | HTTP server / client
 |-----------> hz
 | RPC server / client
 |-----------> kitex
 | DB
 |------------> gorm/gen
 | DOC
 |------------> thriftgo/protoc
```

所以相对应工具的注意事项也需要遵守， 如生成 RPC 代码时 [kitex 的注意事项](/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9) 和生成 HTTP 代码时 [hz 的注意事项](/zh/docs/hertz/tutorials/toolkit/cautions/)。

## 使用

cwgo 支持静态命令行生成方式。并且**弱化了 new 和 update** 的概念，更新时直接输入之前的指令即可。

### 命令说明

```shell
$ cwgo -h
NAME:
   cwgo - All in one tools for CloudWeGo

USAGE:
   cwgo [global options] command [command options] [arguments...]

COMMANDS:
   server     生成 RPC 或者 HTTP Server
   client     生成 RPC 或者 HTTP Client
   model      生成 DB CURD 代码
   doc        生成文档类数据库的 CURD 代码
   completion 生成命令行自动补全脚本
   fallback   回退到 kitex 或者 hz 工具

GLOBAL OPTIONS:
   --verbose      打开冗余日志模式
   --version, -v  打印工具版本
   --help,    -h  帮助命令
```
