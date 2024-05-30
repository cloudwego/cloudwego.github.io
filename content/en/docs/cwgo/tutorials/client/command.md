---
title: "commands"
linkTitle: "commands"
weight: 1
description: >
---

## Basic commands

Use `cwgo client -h` to view the help command for generating client code.

```sh
NAME:
   cwgo client - generate RPC or HTTP client

                 Examples:
                   # Generate RPC client code
                   cwgo client --type RPC --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}

                   # Generate HTTP client code
                   cwgo client --type HTTP --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}


USAGE:
   cwgo client [command options] [arguments...]

OPTIONS:
   --service value                                                              Specify the server name.(Not recommended)
   --server_name value                                                          Specify the server name.
   --type value                                                                 Specify the generate type. (RPC or HTTP) (default: "RPC")
   --module value, --mod value                                                  Specify the Go module name to generate go.mod.
   --idl value                                                                  Specify the IDL file path. (.thrift or .proto)
   --template --template https://github.com/***/cwgo_template.git               Specify the template path. Currently cwgo supports git templates, such as --template https://github.com/***/cwgo_template.git
   --branch value                                                               Specify the git template's branch, default is main branch.
   --registry value                                                             Specify the registry, default is None
   --proto_search_path value, -I value [ --proto_search_path value, -I value ]  Add an IDL search path for includes. (Valid only if idl is protobuf)
   --pass value [ --pass value ]                                                pass param to hz or kitex
   --verbose                                                                    Turn on verbose mode. (default: false)
   --help, -h                                                                   show help (default: false)
```

## Attention
- service is not recommended and will be removed from v0.2.0

## Specification

- service: Specify the service name for functions such as service registration and discovery(Not recommended)
- server_name: Specify the service name for functions such as service registration and discovery
- type: Specify the generation type, support parameters RPC and HTTP, default to RPC
- module/mod: Specify the go mod name, which must be specified outside of GOPATH. In GOPATH, the default name is the path relative to GOPATH
- idl: Specify the main IDL file path
- template: Specify a custom template that supports local and git reading. Please refer to the usage for details [Template Extension](/docs/cwgo/tutorials/templete-extension/)
- branch: Specify the git template's branch, default is main branch.
- registry: The specified service registration component is currently only useful for RPC types and supports parameters ZK, NACOS, ETCD, and POLARIS
- proto_search_path/I: Add IDL search path, only effective for pb
- pass: The parameters passed to hz and kitex, such as the `handler dir` parameter passed to `hz`, should be entered as --pass "--handler_dir ./handler". Parameters passed to the tool, hz reference [doc](/docs/hertz/tutorials/toolkit/command/), kitex reference [doc](/docs/kitex/tutorials/code-gen/code_generation/)
- verbose: Turn on redundant logging mode
- help: help command
