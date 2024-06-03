---
title: "命令梳理"
linkTitle: "命令梳理"
weight: 1
description: >
---

## 基础命令

使用 `cwgo server -h` 查看生成 server 代码的帮助命令。

```sh
NAME:
   cwgo server - generate RPC or HTTP server

                 Examples:
                   # Generate RPC server code
                   cwgo server --type RPC --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}

                   # Generate HTTP server code
                   cwgo server --type HTTP --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}


USAGE:
   cwgo server [command options] [arguments...]

OPTIONS:
   --service value                                                              Specify the server name.(Not recommended)
   --server_name value                                                          Specify the server name.
   --type value                                                                 Specify the generate type. (RPC or HTTP) (default: "RPC")
   --module value, --mod value                                                  Specify the Go module name to generate go.mod.
   --idl value                                                                  Specify the IDL file path. (.thrift or .proto)
   --template --template https://github.com/***/cwgo_template.git               Specify the template path. Currently cwgo supports git templates, such as --template https://github.com/***/cwgo_template.git
   --branch value                                                               Specify the git template's branch, default is main branch.
   --registry value                                                             Specify the registry, default is None.
   --proto_search_path value, -I value [ --proto_search_path value, -I value ]  Add an IDL search path for includes.
   --pass value [ --pass value ]                                                Pass param to hz or Kitex.
   --verbose                                                                    Turn on verbose mode. (default: false)
   --hex                                                                        Add HTTP listen for Kitex. (default: false)
   --help, -h                                                                   show help (default: false)
```
## 注意
- service 不建议使用，将在v0.2.0下架

## 详细参数
- service:指定服务名称，用于服务注册、服务发现等功能(不建议使用)
- server_name:服务名称，用于服务注册、服务发现等功能
- type：指定生成类型，支持参数 RPC、HTTP，默认为 RPC
- module/mod：指定 go mod 名称，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字
- idl：指定主 IDL 文件路径
- template：指定自定义模板，支持本地和 git 读取，用法详见 [模板扩展](/zh/docs/cwgo/tutorials/templete-extension/)
- branch: 指定 git 模板读取的分支，默认为主分支
- registry：指定服务注册组件，目前仅对 RPC 类型有用, 支持参数 ZK、NACOS、ETCD、POLARIS
- proto_search_path/I：添加 IDL 搜索路径，只对 pb 生效
- pass：传递给 hz 和 kitex 的参数，如传递 `hz` 的 `handler_dir` 参数, 则应输入 --pass "--handler_dir ./handler"。传递给工具的参数，hz 参考[文档](/zh/docs/hertz/tutorials/toolkit/command/)，kitex 参考[文档](/zh/docs/kitex/tutorials/code-gen/code_generation/)
- hex：同一个端口同时启用 HTTP 和 RPC 服务，用法示例详见 [hex 用法示例](https://github.com/cloudwego/hertz-examples/tree/main/hex)
- verbose：打开冗余日志模式
- help：帮助命令
