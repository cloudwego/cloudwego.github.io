---
title: "命令行工具"
linkTitle: "命令行工具"
weight: 1
description: >

---

cwgo 是 CloudWeGo 提供的用于生成代码的一个命令行工具。目前 cwgo 支持 thrift 和 protobuf 的 IDL，支持生成 MVC Layout、Server、Client 和 DB 的代码。

# 依赖与运行模式

cwgo 工具并不直接生成代码，而是构造好模板后调用相应工具的生成函数。

```
cwgo 
 |
 | HTTP server / client
 |-----------> hz
 | RPC server / client
 |-----------> kitex
 | DB
 ------------> gorm/gen
 
```

所以相对应工具的注意事项也需要遵守， 如生成 RPC 代码时 [kitex 的注意事项](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)和生成 HTTP 代码时 [hz 的注意事项](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/usage/cautions/)。

# 使用

cwgo 支持交互式命令行和静态命令行两种生成方式。并且**弱化了 new 和 update** 的概念，更新时直接输入之前的指令即可。

## 交互式命令行

交互式命令行支持一次调用生成所有代码，如 Server、Client、DB，满足大部分用户的需求，用户只需要根据提示输入信息即可。

语法：`cwgo init`

执行 `cwgo init` 后，会首先询问需要生成的项目类型，支持多选，如下图所示，选择了 server 和 client

![generate_type](/img/docs/cwgo_generate_type.png)

敲回车后，会依次询问 server 和 client 的信息。步骤如下

1.  选择服务类型，RPC 还是 HTTP。单选。

1.  输入服务名称。必填。

1.  输入 go module 名称。在 GOPATH 外为必填，在 GOPATH 内不需要填。

1.  输入 idl 路径。必填。

1.  是否使用默认配置去生成项目

    1.  默认配置：无服务发现组件，无其他参数
    1.  非默认配置：选择服务发现组件；输入传递给生成工具的参数

client 询问的问题和 server 大致相同，区别是会首先询问生成的 client 的数量，之后循环输入每一个 client 的信息。

db 询问的信息为：

1.  选择数据库类型。单选
1.  输入数据库 DSN。必填
1.  选择是否使用默认配置去生成项目。如选择否，则会要求输入传递给生成工具的参数

对于传递给工具的参数，hz 参考[文档](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/usage/command/)，kitex 参考[文档](https://www.cloudwego.io/docs/kitex/tutorials/code-gen/code_generation/)。

## 静态命令行

### 命令说明

```
$ cwgo -h
NAME:
   cwgo - All in one tools for CloudWeGo

USAGE:
   cwgo [global options] command [command options] [arguments...]

COMMANDS:
   init      交互式命令行
   server    生成 RPC 或者 HTTP Server
   client    生成 RPC 或者 HTTP Client
   model     生成 DB Model
   fallback  回退到 kitex 或者 hz 工具

GLOBAL OPTIONS:
   --verbose      打开冗余日志模式
   --version, -v  打印工具版本
```

### Server 和 Client 命令

```
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
hz 参考[文档](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/usage/command/)，
kitex 参考[文档](https://www.cloudwego.io/docs/kitex/tutorials/code-gen/code_generation/)。

### Model 命令

```
--dsn         指定数据库 DSN
--db_type     指定数据库类型
--out_dir     指定输出文件夹，默认 biz/dao/query
--out_file    指定输出文件名，默认 gen.go
--tables      指定数据库表名称
--unittest    是否生成单测，默认不生成
--only_model  是否只生成 model 代码，默认关闭
--model_pkg   指定 model package 名
--nullable    当字段为 null 时，指定是否生成指针，默认关闭
--type_tag    是否给字段生成 gorm column type tag，默认不生成  
--index_tag   是否给字段生成 gorm index tag，默认不生成          
```

## 常用命令

Server

```
cwgo server --type {{RPC/HTTP}} --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

Client

```
cwgo client --type {{RPC/HTTP}} --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

Model

```
cwgo  model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```
