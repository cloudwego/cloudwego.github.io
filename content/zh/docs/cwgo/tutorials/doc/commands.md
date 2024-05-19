---
title: "命令梳理"
linkTitle: "命令梳理"
weight: 1
description: >
---

## 基础命令

使用 `cwgo doc -h` 查看使用详情：

```sh
NAME:
   cwgo doc - generate doc model

              Examples:
                # Generate doc model code
                cwgo doc --name mongodb --idl {{path/to/IDL_file.thrift}}


USAGE:
   cwgo doc [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                                  Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                                  Specify the Go module name to generate go.mod.
   --out_dir value                                                              Specify output directory, default is current dir.
   --model_dir value                                                            Specify model output directory, default is biz/doc/model.
   --dao_dir value                                                              Specify dao output directory, default is biz/doc/dao.
   --name value                                                                 Specify specific doc name, default is mongodb.
   --proto_search_path value, -I value [ --proto_search_path value, -I value ]  Add an IDL search path for includes.
   --thriftgo value, -t value [ --thriftgo value, -t value ]                    Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]                        Specify arguments for the protoc. ({flag}={value})
   --verbose                                                                    Turn on verbose mode, default is false. (default: false)
   --help, -h                                                                   show help (default: false)
```

## 详细参数

- idl 指定生成代码所需使用的主 idl 路径

- module/-mod 指定 go mod 名称，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

- out_dir 指定代码输出目录, 默认为命令执行目录

- model_dir 指定 thriftgo 或 protoc 生成的 model 代码目录, 默认为 biz/doc/model

- dao_dir 指定生成的 doc curd 代码目录, 默认为 biz/doc/dao

- name 指定生成代码的文档型数据库名称, 默认为 mongodb, 目前仅支持 mongodb

- proto_search_path/-I 指定 idl 搜索目录, idl type 为 proto 时使用

- thriftgo/-t 透传给 thriftgo 的参数

- protoc/-p 透传给 protoc 的参数

- verbose 默认为 false, 指定为 true 后会输出更详细的日志内容

- help/-h 帮助命令
