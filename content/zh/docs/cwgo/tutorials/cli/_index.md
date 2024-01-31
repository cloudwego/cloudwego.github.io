---
title: "命令行工具"
linkTitle: "命令行工具"
weight: 1
description: >
---

cwgo 是 CloudWeGo 提供的用于生成代码的一个命令行工具。目前 cwgo 支持 thrift 和 protobuf 的 IDL，支持生成 MVC Layout、Server、Client 和 DB 的代码。

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
 ------------> gorm/gen

```

所以相对应工具的注意事项也需要遵守， 如生成 RPC 代码时 [kitex 的注意事项](/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)和生成 HTTP 代码时 [hz 的注意事项](/zh/docs/hertz/tutorials/toolkit/cautions/)。

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
   server    生成 RPC 或者 HTTP Server
   client    生成 RPC 或者 HTTP Client
   model     生成 DB Model
   fallback  回退到 kitex 或者 hz 工具

GLOBAL OPTIONS:
   --verbose      打开冗余日志模式
   --version, -v  打印工具版本
```

### Server 和 Client 命令

```console
--service    指定服务名称
--type       指定生成类型
--module     指定生成 module 名称
--idl        指定 IDL 文件路径
--out_dir    指定输出路径
--template   指定 layout 模板路径
--registry   指定服务注册组件
--proto_search_path 添加 IDL 搜索路径，只对 pb 生效
--pass value 传递给 hz 和 kitex 的参数
```

pass 参数说明：

如传递 `hz` 的 `handler_dir" 参数, 则应输入 --pass "--handler_dir ./handler"

传递给工具的参数
hz 参考[文档](/zh/docs/hertz/tutorials/toolkit/command/)，
kitex 参考[文档](/docs/kitex/tutorials/code-gen/code_generation/)。

### Model 命令

```console
--dsn         指定数据库 DSN
--db_type     指定数据库类型
--out_dir     指定输出文件夹，默认 biz/dao/query
--out_file    指定输出文件名，默认 gen.go
--tables      指定数据库表名称
--unittest    是否生成单测，默认不生成
--only_model  是否只生成 model 代码，默认关闭
--model_pkg   指定 model package 名
--nullable    当字段为 null 时，指定是否生成指针，默认关闭
--signable    是否检测整型列 unsigned 类型来调整生成相应的数据类型，默认不生成
--type_tag    是否给字段生成 gorm column type tag，默认不生成
--index_tag   是否给字段生成 gorm index tag，默认不生成
```

### 常用命令

Server

```shell
cwgo server --type {{RPC/HTTP}} --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

Client

```shell
cwgo client --type {{RPC/HTTP}} --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

Model

```shell
cwgo  model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```
