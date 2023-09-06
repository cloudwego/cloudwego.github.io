---
title: 'hz 命令梳理'
date: 2023-02-21
weight: 7
keywords: ["hz 命令梳理", "New", "Update"]
description: "hz 命令梳理。"
---
## 命令行参数说明

#### Global

```console
$ hz --help
NAME:
   hz - A idl parser and code generator for Hertz projects

USAGE:
   hz [global options] command [command options] [arguments...]

VERSION:
   0.x.x

COMMANDS:
   new      Generate a new Hertz project
   update   Update an existing Hertz project
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help (default: false)
   --verbose      turn on verbose mode (default: false)
   --version, -v  print the version (default: false)
```

- New: 创建一个新的 Hertz 项目

<!---->

- update: 更新一个已存在的 Hertz 项目

### New

```console
$ hz help new
NAME:
   hz new - Generate a new Hertz project

USAGE:
   hz new [command options] [arguments...]

OPTIONS:
   --client_dir value                Specify the client path. If not specified, no client code is generated.
   --customize_layout value          Specify the layout template. ({{Template Profile}}:{{Rendering Data}})
   --customize_package value         Specify the package template. ({{Template Profile}}:)
   --exclude_file value, -E value    Specify the files that do not need to be updated.  (accepts multiple inputs)
   --handler_dir value               Specify the handler path.
   --idl value                       Specify the IDL file path. (.thrift or .proto)  (accepts multiple inputs)
   --json_enumstr                    Use string instead of num for json enums when idl is thrift. (default: false)
   --model_dir value                 Specify the model path.
   --module value, --mod value       Specify the Go module name to generate go.mod.
   --no_recurse                      Generate master model only. (default: false)
   --option_package value, -P value  Specify the package path. ({include_path}={import_path})  (accepts multiple inputs)
   --out_dir value                   Specify the project path.
   --proto_path value, -I value      Add an IDL search path for includes. (Valid only if idl is protobuf)  (accepts multiple inputs)
   --protoc value, -p value          Specify arguments for the protoc. ({flag}={value})                    (accepts multiple inputs)
   --service value                   Specify the service name.
   --snake_tag                       Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --thriftgo value, -t value        Specify arguments for the thriftgo. ({flag}={value})  (accepts mul)
```

- client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的 client，后续会提供更丰富的 client 代码能力

<!---->

- customize_layout: 自定义项目 layout 模板，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- exclude_file: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- handler_dir: 指定 handler 的生成路径，默认为 "biz/handler"

<!---->

- idl: idl 文件路径 (.thrift 或者.proto)

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num(透传给 thriftgo 的选项)

<!---->

- model_dir: 指定 model 的生成路径，默认为"biz/model"

<!---->

- module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

<!---->

- no_recurse: 只生成主 idl 的 model 代码

<!---->

- option_package/P: 指定包的路径，({include_path}={import_path})

<!---->

- out_dir: 指定项目生成路径

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- service: 服务名，为之后做服务发现等功能预留

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 omitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定

### Update

```console
$ hz help update
NAME:
   hz update - Update an existing Hertz project

USAGE:
   hz update [command options] [arguments...]

OPTIONS:
   --client_dir value                Specify the client path. If not specified, no client code is generated.
   --customize_package value         Specify the package template. ({{Template Profile}}:)
   --exclude_file value, -E value    Specify the files that do not need to be updated.  (accepts multiple inputs)
   --handler_dir value               Specify the handler path.
   --idl value                       Specify the IDL file path. (.thrift or .proto)  (accepts multiple inputs)
   --json_enumstr                    Use string instead of num for json enums when idl is thrift. (default: false)
   --model_dir value                 Specify the model path.
   --no_recurse                      Generate master model only. (default: false)
   --option_package value, -P value  Specify the package path. ({include_path}={import_path})  (accepts multiple inputs)
   --out_dir value                   Specify the project path.
   --proto_path value, -I value      Add an IDL search path for includes. (Valid only if idl is protobuf)  (accepts multiple inputs)
   --protoc value, -p value          Specify arguments for the protoc. ({flag}={value})                    (accepts multiple inputs)
   --snake_tag                       Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --thriftgo value, -t value        Specify arguments for the thriftgo. ({flag}={value})  (accepts multiple inputs)
   --unset_omitempty                 Remove 'omitempty' tag for generated struct. (default: false)
```

- client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的 client，后续会提供更丰富的 client 代码能力。注意：如果对同一套 idl 进行 update，需要 client_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

- customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/more-feature/template/) 。注意：对于已经存在的 handler 文件会按照默认模板新增 handler 函数，对于还未存在的 handler 文件，则会按照自定义模板来生成 handler。

<!---->

- exclude_file: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- handler_dir: 指定 handler 的生成路径，默认为 "biz/handler"；注意：如果对同一套 idl 进行 update，需要 handler_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

- idl: idl 文件路径 (.thrift 或者.proto)

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num(透传给 thriftgo 的选项)

<!---->

- model_dir: 指定 model 的生成路径，默认为 "biz/model"；注意：如果对同一套 idl 进行 update，需要 model_dir 的值与使用 new 的时候相同，否则会生成重复的 model 代码且导致 handler 引用不一致。

<!---->

- no_recurse: 只生成主 idl 的 model 代码

<!---->

- option_package/P: 指定包的路径，({include_path}={import_path})

<!---->

- out_dir: 指定项目生成路径

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 mitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定
